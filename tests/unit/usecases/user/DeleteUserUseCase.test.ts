import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { ok } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import type { DeleteUserUseCase } from '@/layers/application/usecases/user/DeleteUserUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

describe('DeleteUserUseCase', () => {
  let deleteUserUseCase: DeleteUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;
  let mockGetCurrentUserUseCase: MockProxy<GetCurrentUserUseCase>;

  // テスト用の認証済みユーザー情報
  const authenticatedUser = {
    id: 'testuseridcuid2abc12',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    const mocks = createDefaultMocks({ userRepository: true, logger: true });
    mockUserRepository = mocks.mockUserRepository;
    mockLogger = mocks.mockLogger;
    mockGetCurrentUserUseCase = mock<GetCurrentUserUseCase>();

    // 認証成功をデフォルトに設定
    mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
      ok(authenticatedUser),
    );

    registerMockServices(
      { userRepository: mockUserRepository, logger: mockLogger },
      [[INJECTION_TOKENS.GetCurrentUserUseCase, mockGetCurrentUserUseCase]],
    );

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    deleteUserUseCase = resolve('DeleteUserUseCase');
  });

  describe('execute', () => {
    const validInput = {
      userId: 'testuseridcuid2abc12',
    };

    const createMockUser = () => {
      return User.reconstruct(
        new UserId('testuseridcuid2abc12'),
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await deleteUserUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          deletedUserId: 'testuseridcuid2abc12',
          deletedAt: expect.any(Date),
        });
        expect(result.value.deletedAt).toBeInstanceOf(Date);
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除開始', {
        userId: 'testuseridcuid2abc12',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除実行前情報', {
        userId: 'testuseridcuid2abc12',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: expect.any(Date),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー削除完了', {
        userId: 'testuseridcuid2abc12',
        email: 'test@example.com',
        deletedAt: expect.any(Date),
      });
    });

    it('should return failure for empty userId', async () => {
      // Arrange
      const emptyUserId = '';
      const invalidInput = {
        userId: emptyUserId,
      };

      // 認証ユーザーを空のIDに変更（認可チェックを通過させる）
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: emptyUserId,
          email: 'test@example.com',
          name: 'Test User',
        }),
      );

      // Act
      const result = await deleteUserUseCase.execute(invalidInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      // リポジトリメソッドが呼び出されていないことを確認
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should return failure for whitespace-only userId', async () => {
      // Arrange
      const whitespaceUserId = '   ';
      const invalidInput = {
        userId: whitespaceUserId,
      };

      // 認証ユーザーを空白のIDに変更（認可チェックを通過させる）
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: whitespaceUserId,
          email: 'test@example.com',
          name: 'Test User',
        }),
      );

      // Act
      const result = await deleteUserUseCase.execute(invalidInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );
      expect(mockUserRepository.delete).not.toHaveBeenCalled();

      // 警告ログの確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー削除失敗: ユーザーが見つかりません',
        { userId: 'testuseridcuid2abc12' },
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database delete error');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );

      // エラーログの確認
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー削除失敗', {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database connection error');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザー削除権限がありません');
        expect(result.error.code).toBe('DELETE_PERMISSION_DENIED');
      }

      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );
    });

    it('should handle invalid UserId creation error', async () => {
      // Arrange - UserId作成時にErrorが発生するケース
      const invalidUserId = 'ab'; // 短すぎるID（7文字未満）
      const invalidUserIdInput = {
        userId: invalidUserId,
      };

      // 認証ユーザーを短いIDに変更（認可チェックを通過させる）
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: invalidUserId,
          email: 'test@example.com',
          name: 'Test User',
        }),
      );

      // Act
      const result = await deleteUserUseCase.execute(invalidUserIdInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('User IDの形式が正しくありません');
        // DomainErrorの元のエラーコードが保持される
        expect(result.error.code).toBe('INVALID_USER_ID_FORMAT');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('string error');
        expect(result.error.code).toBe('USER_DELETE_FAILED');
      }

      // エラーログの確認（stack情報なし）
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー削除失敗', {
        error: 'string error',
        stack: undefined,
      });
    });
  });
});
