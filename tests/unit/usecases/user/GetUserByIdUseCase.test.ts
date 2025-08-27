import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { GetUserByIdUseCase } from '@/layers/application/usecases/user/GetUserByIdUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/layers/infrastructure/di/container';
import { resolve } from '@/layers/infrastructure/di/resolver';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
  createAutoMockLogger,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('GetUserByIdUseCase', () => {
  let getUserByIdUseCase: GetUserByIdUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(
      INJECTION_TOKENS.UserRepository,
      mockUserRepository,
    );
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    getUserByIdUseCase = resolve('GetUserByIdUseCase');
  });

  describe('execute', () => {
    const validInput = {
      userId: 'test-user-id',
    };

    const createMockUser = () => {
      return User.reconstruct(
        new UserId('test-user-id'),
        new Email('test@example.com'),
        'Test User',
        'hashed-password',
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-01-02T00:00:00Z'),
      );
    };

    it('should successfully get user by id', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-02T00:00:00Z'),
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー個別取得開始', {
        userId: 'test-user-id',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー個別取得完了', {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return failure for empty userId', async () => {
      // Arrange
      const invalidInput = {
        userId: '',
      };

      // Act
      const result = await getUserByIdUseCase.execute(invalidInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      // リポジトリメソッドが呼び出されていないことを確認
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should return failure for whitespace-only userId', async () => {
      // Arrange
      const invalidInput = {
        userId: '   ',
      };

      // Act
      const result = await getUserByIdUseCase.execute(invalidInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );

      // 警告ログの確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー個別取得失敗: ユーザーが見つかりません',
        { userId: 'test-user-id' },
      );
    });

    it('should return failure when repository findById fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection error');
      mockUserRepository.findById.mockRejectedValue(repositoryError);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Database connection error');
        expect(result.error.code).toBe('USER_FETCH_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );

      // エラーログの確認
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー個別取得失敗', {
        userId: 'test-user-id',
        error: 'Database connection error',
        stack: expect.any(String),
      });
    });

    it('should handle DomainError appropriately', async () => {
      // Arrange
      const domainError = new DomainError(
        'ユーザー取得権限がありません',
        'FETCH_PERMISSION_DENIED',
      );
      mockUserRepository.findById.mockRejectedValue(domainError);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザー取得権限がありません');
        expect(result.error.code).toBe('FETCH_PERMISSION_DENIED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
    });

    it('should handle invalid UserId creation error', async () => {
      // Arrange - UserId作成時にErrorが発生するケース
      const invalidUserIdInput = {
        userId: 'ab', // 短すぎるID（7文字未満）
      };

      // Act
      const result = await getUserByIdUseCase.execute(invalidUserIdInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'User IDの形式が正しくありません',
        );
        expect(result.error.code).toBe('USER_FETCH_FAILED');
      }

      // UserIdの作成でエラーが発生するため、リポジトリメソッドは呼ばれない
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle unknown error type', async () => {
      // Arrange
      const unknownError = 'string error'; // Error型ではない異常なエラー
      mockUserRepository.findById.mockRejectedValue(unknownError);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーの取得に失敗しました');
        expect(result.error.code).toBe('USER_FETCH_FAILED');
      }

      // エラーログの確認（stack情報なし）
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー個別取得失敗', {
        userId: 'test-user-id',
        error: 'Unknown error',
        stack: undefined,
      });
    });

    it('should correctly convert User entity to response format', async () => {
      // Arrange - 異なる日時で詳細なテスト
      const specificUser = User.reconstruct(
        new UserId('specific-user-id'),
        new Email('specific@example.com'),
        'Specific User Name',
        'hashed-password',
        new Date('2022-12-01T10:30:00Z'),
        new Date('2023-06-15T14:45:30Z'),
      );

      const specificInput = {
        userId: 'specific-user-id',
      };

      mockUserRepository.findById.mockResolvedValue(specificUser);

      // Act
      const result = await getUserByIdUseCase.execute(specificInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          id: 'specific-user-id',
          name: 'Specific User Name',
          email: 'specific@example.com',
          createdAt: new Date('2022-12-01T10:30:00Z'),
          updatedAt: new Date('2023-06-15T14:45:30Z'),
        });
      }
    });

    it('should handle user with different email domain', async () => {
      // Arrange - 別のドメインのメールアドレスでのテスト
      const userWithDifferentDomain = User.reconstruct(
        new UserId('domain-test-id'),
        new Email('user@company.org'),
        'Company User',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const domainTestInput = {
        userId: 'domain-test-id',
      };

      mockUserRepository.findById.mockResolvedValue(userWithDifferentDomain);

      // Act
      const result = await getUserByIdUseCase.execute(domainTestInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.email).toBe('user@company.org');
        expect(result.data.name).toBe('Company User');
      }
    });
  });
});