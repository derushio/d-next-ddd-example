import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { DeleteUserUseCase } from '@/layers/application/usecases/user/DeleteUserUseCase';
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

describe('DeleteUserUseCase', () => {
  let deleteUserUseCase: DeleteUserUseCase;
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
    deleteUserUseCase = resolve('DeleteUserUseCase');
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
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );
    };

    it('should successfully delete a user', async () => {
      // Arrange
      const mockUser = createMockUser();
      const deletedAt = new Date();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          deletedUserId: 'test-user-id',
          deletedAt: expect.any(Date),
        });
        expect(result.data.deletedAt).toBeInstanceOf(Date);
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除開始', {
        userId: 'test-user-id',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除実行前情報', {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: expect.any(Date),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除完了', {
        userId: 'test-user-id',
        email: 'test@example.com',
        deletedAt: expect.any(Date),
      });
    });

    it('should return failure for empty userId', async () => {
      // Arrange
      const invalidInput = {
        userId: '',
      };

      // Act
      const result = await deleteUserUseCase.execute(invalidInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      // リポジトリメソッドが呼び出されていないことを確認
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should return failure for whitespace-only userId', async () => {
      // Arrange
      const invalidInput = {
        userId: '   ',
      };

      // Act
      const result = await deleteUserUseCase.execute(invalidInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
      expect(mockUserRepository.delete).not.toHaveBeenCalled();

      // 警告ログの確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー削除失敗: ユーザーが見つかりません',
        { userId: 'test-user-id' },
      );
    });

    it('should return failure when repository delete fails', async () => {
      // Arrange
      const mockUser = createMockUser();
      const deleteError = new Error('Database delete error');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockRejectedValue(deleteError);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Database delete error');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );

      // エラーログの確認
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー削除失敗', {
        userId: 'test-user-id',
        error: 'Database delete error',
        stack: expect.any(String),
      });
    });

    it('should return failure when repository findById fails', async () => {
      // Arrange
      const findError = new Error('Database connection error');
      mockUserRepository.findById.mockRejectedValue(findError);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Database connection error');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle DomainError appropriately', async () => {
      // Arrange
      const mockUser = createMockUser();
      const domainError = new DomainError(
        'ユーザー削除権限がありません',
        'DELETE_PERMISSION_DENIED',
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockRejectedValue(domainError);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザー削除権限がありません');
        expect(result.error.code).toBe('DELETE_PERMISSION_DENIED');
      }

      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('test-user-id'),
      );
    });

    it('should handle invalid UserId creation error', async () => {
      // Arrange - UserId作成時にErrorが発生するケース
      const invalidUserIdInput = {
        userId: 'ab', // 短すぎるID（7文字未満）
      };

      // Act
      const result = await deleteUserUseCase.execute(invalidUserIdInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'User IDの形式が正しくありません',
        );
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      // UserIdの作成でエラーが発生するため、リポジトリメソッドは呼ばれない
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle unknown error type', async () => {
      // Arrange
      const mockUser = createMockUser();
      const unknownError = 'string error'; // Error型ではない異常なエラー

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockRejectedValue(unknownError);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーの削除に失敗しました');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      // エラーログの確認（stack情報なし）
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー削除失敗', {
        userId: 'test-user-id',
        error: 'Unknown error',
        stack: undefined,
      });
    });
  });
});