import { isFailure, isSuccess } from '@/layers/application/types/Result';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/layers/infrastructure/di/container';
import { resolve } from '@/layers/infrastructure/di/resolver';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

import { setupTestEnvironment } from '../../utils/helpers/testHelpers';
import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '../../utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;
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

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    createUserUseCase = resolve('CreateUserUseCase');
  });

  describe('execute', () => {
    const validInput = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should successfully create a user', async () => {
      // Arrange
      const hashedPassword = 'hashed_password_123';
      const mockUser = User.create(
        new Email(validInput.email),
        validInput.name,
        hashedPassword,
      );

      // モックの設定
      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          id: expect.any(String),
          name: validInput.name,
          email: validInput.email,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      }

      // モック呼び出しの確認
      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        validInput.password,
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成開始', {
        name: validInput.name,
        email: validInput.email,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成完了', {
        userId: expect.any(String),
        email: validInput.email,
      });
    });

    it('should return failure for validation failure', async () => {
      // Arrange
      const validationError = new DomainError(
        '有効なメールアドレスを入力してください',
        'INVALID_EMAIL_FORMAT',
      );
      mockUserDomainService.validateUserData.mockRejectedValue(validationError);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('有効なメールアドレスを入力してください');
        expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
      }

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
      expect(mockHashService.generateHash).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return failure when password hashing fails', async () => {
      // Arrange
      const hashError = new Error('Hashing failed');
      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockRejectedValue(hashError);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Hashing failed');
        expect(result.error.code).toBe('USER_CREATION_FAILED');
      }

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        validInput.password,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return failure when user save fails', async () => {
      // Arrange
      const hashedPassword = 'hashed_password_123';
      const saveError = new Error('Database error');

      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockRejectedValue(saveError);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Database error');
        expect(result.error.code).toBe('USER_CREATION_FAILED');
      }

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        validInput.password,
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
    });

    it('should return failure for email validation error during User.create', async () => {
      // Arrange
      const invalidEmailInput = {
        ...validInput,
        email: 'invalid-email',
      };
      const hashedPassword = 'hashed_password_123';

      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue(hashedPassword);

      // Act
      const result = await createUserUseCase.execute(invalidEmailInput);

      // Assert - Email Value Objectでエラーが発生
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('メールアドレスの形式が正しくありません');
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        invalidEmailInput.name,
        invalidEmailInput.email,
      );
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        invalidEmailInput.password,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
