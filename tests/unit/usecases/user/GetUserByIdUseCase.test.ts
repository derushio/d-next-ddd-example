import { userFactory } from '@tests/utils/factories/userFactory';
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
import type { GetUserByIdUseCase } from '@/layers/application/usecases/user/GetUserByIdUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

describe('GetUserByIdUseCase', () => {
  let getUserByIdUseCase: GetUserByIdUseCase;
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
    getUserByIdUseCase = resolve('GetUserByIdUseCase');
  });

  describe('execute', () => {
    const validInput = {
      userId: 'testuseridcuid2abc12',
    };

    it('should successfully get user by id', async () => {
      // Arrange
      const mockUser = User.reconstruct(
        new UserId('testuseridcuid2abc12'),
        new Email('test@example.com'),
        'Test User',
        'hashed-password',
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-01-02T00:00:00Z'),
      );
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: 'testuseridcuid2abc12',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-02T00:00:00Z'),
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー個別取得開始', {
        userId: 'testuseridcuid2abc12',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー個別取得完了', {
        userId: 'testuseridcuid2abc12',
        email: 'test@example.com',
        name: 'Test User',
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
      const result = await getUserByIdUseCase.execute(invalidInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザーIDが指定されていません');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      // リポジトリメソッドが呼び出されていないことを確認
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
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
      const result = await getUserByIdUseCase.execute(invalidInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );

      // 警告ログの確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー個別取得失敗: ユーザーが見つかりません',
        { userId: 'testuseridcuid2abc12' },
      );
    });

    it('should return failure when repository findById fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection error');
      mockUserRepository.findById.mockRejectedValue(repositoryError);

      // Act
      const result = await getUserByIdUseCase.execute(validInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database connection error');
        expect(result.error.code).toBe('USER_FETCH_FAILED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('testuseridcuid2abc12'),
      );

      // エラーログの確認
      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー個別取得失敗', {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザー取得権限がありません');
        expect(result.error.code).toBe('FETCH_PERMISSION_DENIED');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
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
      const result = await getUserByIdUseCase.execute(invalidUserIdInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('User IDの形式が正しくありません');
        // DomainErrorの元のエラーコードが保持される
        expect(result.error.code).toBe('INVALID_USER_ID_FORMAT');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 予期しないエラーの場合は一般的なエラーメッセージ
        expect(result.error.code).toBe('USER_FETCH_FAILED');
      }
    });

    it('should correctly convert User entity to response format', async () => {
      // Arrange - 異なる日時で詳細なテスト
      const specificUserId = 'specificuseridcuid12';
      const specificUser = User.reconstruct(
        new UserId(specificUserId),
        new Email('specific@example.com'),
        'Specific User Name',
        'hashed-password',
        new Date('2022-12-01T10:30:00Z'),
        new Date('2023-06-15T14:45:30Z'),
      );

      const specificInput = {
        userId: specificUserId,
      };

      // 認証ユーザーを変更
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: specificUserId,
          email: 'specific@example.com',
          name: 'Specific User',
        }),
      );
      mockUserRepository.findById.mockResolvedValue(specificUser);

      // Act
      const result = await getUserByIdUseCase.execute(specificInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: specificUserId,
          name: 'Specific User Name',
          email: 'specific@example.com',
          createdAt: new Date('2022-12-01T10:30:00Z'),
          updatedAt: new Date('2023-06-15T14:45:30Z'),
        });
      }
    });

    it('should handle user with different email domain', async () => {
      // Arrange - 別のドメインのメールアドレスでのテスト
      const domainTestUserId = 'domaintestidcuid1234';
      const userWithDifferentDomain = userFactory.build(
        { name: 'Company User' },
        {
          transient: {
            emailValue: 'user@company.org',
            passwordHash: 'hashed-password',
          },
        },
      );

      const domainTestInput = {
        userId: domainTestUserId,
      };

      // 認証ユーザーを変更
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: domainTestUserId,
          email: 'user@company.org',
          name: 'Company User',
        }),
      );
      mockUserRepository.findById.mockResolvedValue(userWithDifferentDomain);

      // Act
      const result = await getUserByIdUseCase.execute(domainTestInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe('user@company.org');
        expect(result.value.name).toBe('Company User');
      }
    });
  });
});
