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
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '../../utils/mocks/autoMocks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('CreateUserUseCase with Auto Mocks', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    container.clearInstances();

    // 自動生成されたモックを作成
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

    createUserUseCase = container.resolve(CreateUserUseCase);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('execute', () => {
    const validInput = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'validPassword123',
    };

    it('should create user successfully', async () => {
      // Arrange
      const mockUser = User.create(
        new Email('test@example.com'),
        'Test User',
        'hashedPassword',
      );

      // 自動生成されたモックの設定（メソッドが全部存在する✨）
      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await createUserUseCase.execute(validInput);

      // Assert - 自動生成だから型安全✨
      expect(result).toEqual({
        id: expect.any(String),
        name: validInput.name,
        email: validInput.email,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        validInput.password,
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成完了', {
        userId: expect.any(String),
        email: validInput.email,
      });
    });

    it('should throw error when email is invalid', async () => {
      // Arrange
      const invalidEmailInput = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'validPassword123',
      };

      // Act & Assert - Email Value Objectでエラーが発生
      await expect(
        createUserUseCase.execute(invalidEmailInput),
      ).rejects.toThrow('メールアドレスの形式が正しくありません');
    });

    it('should throw error when validation fails', async () => {
      // Arrange
      const validationError = new DomainError(
        'バリデーションエラー',
        'VALIDATION_ERROR',
      );
      mockUserDomainService.validateUserData.mockRejectedValue(validationError);

      // Act & Assert
      await expect(createUserUseCase.execute(validInput)).rejects.toThrow(
        validationError,
      );

      expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
        validInput.name,
        validInput.email,
      );
    });

    it('should throw error when save fails', async () => {
      // Arrange
      mockUserDomainService.validateUserData.mockResolvedValue(undefined);
      mockHashService.generateHash.mockResolvedValue('hashedPassword');
      const saveError = new Error('Database error');
      mockUserRepository.save.mockRejectedValue(saveError);

      // Act & Assert
      await expect(createUserUseCase.execute(validInput)).rejects.toThrow(
        'Database error',
      );

      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
    });
  });
});
