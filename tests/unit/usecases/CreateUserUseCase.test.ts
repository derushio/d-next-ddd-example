import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import type { IHashService } from '@/layers/infrastructure/services/HashService';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<IUserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    const mocks = createDefaultMocks({
      userRepository: true,
      userDomainService: true,
      hashService: true,
      logger: true,
    });
    mockUserRepository = mocks.mockUserRepository;
    mockUserDomainService = mocks.mockUserDomainService;
    mockHashService = mocks.mockHashService;
    mockLogger = mocks.mockLogger;

    registerMockServices({
      userRepository: mockUserRepository,
      userDomainService: mockUserDomainService,
      hashService: mockHashService,
      logger: mockLogger,
    });

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

      // モックの設定
      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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

      // Assert - Zodバリデーションでエラーが発生（DB lookupの前）
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }

      // Zodバリデーションで弾かれるため、ドメインサービスやHashServiceは呼ばれない
      expect(mockUserDomainService.validateUserData).not.toHaveBeenCalled();
      expect(mockHashService.generateHash).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
