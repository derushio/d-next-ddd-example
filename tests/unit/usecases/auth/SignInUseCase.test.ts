import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/layers/infrastructure/di/container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('SignInUseCase', () => {
  let signInUseCase: SignInUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<IUserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockUserDomainService = createAutoMockUserDomainService();
    mockHashService = createAutoMockHashService();
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(
      INJECTION_TOKENS.UserRepository,
      mockUserRepository,
    );
    container.registerInstance(
      INJECTION_TOKENS.UserDomainService,
      mockUserDomainService,
    );
    container.registerInstance(INJECTION_TOKENS.HashService, mockHashService);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得
    signInUseCase = container.resolve(SignInUseCase);
  });

  describe('execute', () => {
    const validInput = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should successfully sign in user', async () => {
      // Arrange
      const mockUser = User.create(
        new Email(validInput.email),
        'John Doe',
        'hashed_password_123',
      );

      // モックの設定
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(true);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          user: {
            id: mockUser.getId().toString(),
            name: mockUser.getName(),
            email: mockUser.getEmail().toString(),
          },
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).toHaveBeenCalledWith(
        validInput.password,
        mockUser.getPasswordHash(),
      );
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン試行開始', {
        email: validInput.email,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン成功', {
        userId: mockUser.getId().toString(),
      });
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when password is incorrect', async () => {
      // Arrange
      const mockUser = User.create(
        new Email(validInput.email),
        'John Doe',
        'hashed_password_123',
      );

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(false);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).toHaveBeenCalledWith(
        validInput.password,
        mockUser.getPasswordHash(),
      );
    });

    it('should return failure for invalid email format', async () => {
      // Arrange
      const invalidEmailInput = {
        ...validInput,
        email: 'invalid-email',
      };

      // Act
      const result = await signInUseCase.execute(invalidEmailInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスの形式が正しくありません',
        );
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure for empty password', async () => {
      // Arrange
      const emptyPasswordInput = {
        ...validInput,
        password: '',
      };

      // Act
      const result = await signInUseCase.execute(emptyPasswordInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('パスワードを入力してください');
        expect(result.error.code).toBe('EMPTY_PASSWORD');
      }

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when repository throws error', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('サインイン処理中にエラーが発生しました');
        expect(result.error.code).toBe('UNEXPECTED_ERROR');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });
  });
});