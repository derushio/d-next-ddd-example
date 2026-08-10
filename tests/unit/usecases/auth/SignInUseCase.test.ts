import { userFactory } from '@tests/utils/factories/userFactory';
import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import type { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import type { IHashService } from '@/layers/infrastructure/services/HashService';

describe('SignInUseCase', () => {
  let signInUseCase: SignInUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<IUserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;
  let mockLoginAttemptService: MockProxy<ILoginAttemptService>;
  let mockRateLimitService: MockProxy<IRateLimitService>;

  beforeEach(() => {
    const mocks = createDefaultMocks({
      userRepository: true,
      userDomainService: true,
      hashService: true,
      logger: true,
      loginAttemptService: true,
      rateLimitService: true,
    });
    mockUserRepository = mocks.mockUserRepository;
    mockUserDomainService = mocks.mockUserDomainService;
    mockHashService = mocks.mockHashService;
    mockLogger = mocks.mockLogger;
    mockLoginAttemptService = mocks.mockLoginAttemptService;
    mockRateLimitService = mocks.mockRateLimitService;
    registerMockServices({
      userRepository: mockUserRepository,
      userDomainService: mockUserDomainService,
      hashService: mockHashService,
      logger: mockLogger,
      loginAttemptService: mockLoginAttemptService,
      rateLimitService: mockRateLimitService,
    });

    // UseCaseインスタンスをDIコンテナから取得
    signInUseCase = resolve('SignInUseCase');
  });

  describe('execute', () => {
    const validInput = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should successfully sign in user', async () => {
      // Arrange
      const mockUser = userFactory.build(
        {},
        { transient: { emailValue: validInput.email } },
      );

      // モックの設定
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(true);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          user: {
            id: mockUser.id.value,
            name: mockUser.name,
            email: mockUser.email.value,
          },
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).toHaveBeenCalledWith(
        validInput.password,
        mockUser.passwordHash,
      );
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン試行開始', {
        email: validInput.email,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン成功', {
        userId: mockUser.id.value,
      });
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      // タイミング攻撃対策: ユーザーが存在しない場合でもcompareHashが呼ばれる
      mockHashService.compareHash.mockResolvedValue(false);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      // タイミング攻撃対策: ダミーハッシュとの比較が行われる
      expect(mockHashService.compareHash).toHaveBeenCalled();
    });

    it('should return failure when password is incorrect', async () => {
      // Arrange
      const mockUser = userFactory.build(
        {},
        { transient: { emailValue: validInput.email } },
      );

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(false);

      // Act
      const result = await signInUseCase.execute(validInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // アカウントロックアウト機能により、残り試行回数が表示される
        expect(result.error.message).toContain(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).toHaveBeenCalledWith(
        validInput.password,
        mockUser.passwordHash,
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database connection failed');
        expect(result.error.code).toBe('UNEXPECTED_ERROR');
      }

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });
  });
});
