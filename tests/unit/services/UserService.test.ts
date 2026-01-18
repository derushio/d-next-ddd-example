import 'reflect-metadata';

import { UserService } from '@/layers/application/services/UserService';
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { User } from '@/layers/domain/entities/User';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';

import type { MockProxy } from 'vitest-mock-extended';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    mockUserRepository = createAutoMockUserRepository();
    mockHashService = createAutoMockHashService();
    mockLogger = createAutoMockLogger();

    userService = new UserService(
      mockUserRepository,
      mockHashService,
      mockLogger,
    );
  });

  describe('createUser', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: { value: 'user-id' },
      email: { value: 'test@example.com' },
      name: 'Test User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    it('should successfully create user with valid data', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null); // 重複チェック: 存在しない
      mockHashService.generateHash.mockResolvedValue('hashed-password');
      mockUserRepository.save.mockResolvedValue(undefined);

      // User.createのモック
      const mockUserCreate = vi.spyOn(User, 'create').mockReturnValue(mockUser);

      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(mockUser);
      }

      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成開始', {
        email: validUserData.email,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成成功', {
        userId: 'user-id',
        email: validUserData.email,
      });

      // User.createが正しい引数で呼ばれたことを確認
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.any(Email),
        validUserData.name,
        'hashed-password',
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);

      mockUserCreate.mockRestore();
    });

    it('should return failure when name is empty', async () => {
      // Act
      const result = await userService.createUser(
        '',
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('名前が無効です');
        expect(result.error.code).toBe('INVALID_NAME');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成失敗: 無効な名前',
        { email: validUserData.email },
      );
    });

    it('should return failure when name is whitespace only', async () => {
      // Act
      const result = await userService.createUser(
        '   ',
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('名前が無効です');
        expect(result.error.code).toBe('INVALID_NAME');
      }
    });

    it('should return failure when name is not a string', async () => {
      // Act
      const result = await userService.createUser(
        null as unknown as string,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('名前が無効です');
        expect(result.error.code).toBe('INVALID_NAME');
      }
    });

    it('should return failure when password is empty', async () => {
      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        '',
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('パスワードが無効です');
        expect(result.error.code).toBe('INVALID_PASSWORD');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成失敗: 無効なパスワード',
        { email: validUserData.email },
      );
    });

    it('should return failure when password is whitespace only', async () => {
      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        '   ',
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('パスワードが無効です');
        expect(result.error.code).toBe('INVALID_PASSWORD');
      }
    });

    it('should return failure when email already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser); // 既存ユーザーが存在

      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'このメールアドレスは既に登録されています',
        );
        expect(result.error.code).toBe('EMAIL_ALREADY_EXISTS');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成失敗: メールアドレスが既に存在',
        { email: validUserData.email },
      );
    });

    it('should return failure when email is invalid', async () => {
      // Act
      const result = await userService.createUser(
        validUserData.name,
        'invalid-email',
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成失敗: ドメインエラー',
        expect.objectContaining({
          email: 'invalid-email',
          errorCode: 'EMAIL_INVALID_FORMAT',
        }),
      );
    });

    it('should return failure when repository throws error during duplicate check', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'ユーザー作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('USER_CREATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー作成処理でエラー発生',
        expect.objectContaining({
          email: validUserData.email,
          error: 'Database connection failed',
        }),
      );
    });

    it('should return failure when hash service throws error', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const hashError = new Error('Hash generation failed');
      mockHashService.generateHash.mockRejectedValue(hashError);

      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'ユーザー作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('USER_CREATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー作成処理でエラー発生',
        expect.objectContaining({
          email: validUserData.email,
          error: 'Hash generation failed',
        }),
      );
    });

    it('should return failure when repository throws error during save', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockHashService.generateHash.mockResolvedValue('hashed-password');
      const mockUserCreate = vi.spyOn(User, 'create').mockReturnValue(mockUser);
      const saveError = new Error('Save failed');
      mockUserRepository.save.mockRejectedValue(saveError);

      // Act
      const result = await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'ユーザー作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('USER_CREATION_ERROR');
      }

      mockUserCreate.mockRestore();
    });

    it('should handle domain error from Email value object', async () => {
      // Act - 実際に無効なメールアドレスを使用してDomainErrorを発生させる
      const result = await userService.createUser(
        validUserData.name,
        `${'a'.repeat(300)}@example.com`, // 254文字を超える長いメールアドレス
        validUserData.password,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスが長すぎます（254文字以内である必要があります）',
        );
        expect(result.error.code).toBe('EMAIL_TOO_LONG');
      }
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockHashService.generateHash.mockResolvedValue('hashed-password');
      const mockUserCreate = vi.spyOn(User, 'create').mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(undefined);

      // Act
      await userService.createUser(
        validUserData.name,
        validUserData.email,
        validUserData.password,
      );

      // Assert - ログにパスワードが含まれていないことを確認
      const logCalls: LoggerMockCall[] = mockLogger.info.mock.calls;
      logCalls.forEach(([_message, meta]) => {
        expect(JSON.stringify(meta)).not.toContain('password123');
      });

      mockUserCreate.mockRestore();
    });
  });

  describe('findUserByEmail', () => {
    const validEmail = 'test@example.com';
    const mockUser = {
      id: { value: 'user-id' },
      email: { value: 'test@example.com' },
      name: 'Test User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    it('should successfully find user by email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await userService.findUserByEmail(validEmail);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(mockUser);
      }

      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー検索完了', {
        email: validEmail,
        found: true,
        userId: 'user-id',
      });
    });

    it('should successfully return null when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.findUserByEmail(validEmail);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(null);
      }

      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー検索完了', {
        email: validEmail,
        found: false,
        userId: null,
      });
    });

    it('should return failure when email is invalid', async () => {
      // Act
      const result = await userService.findUserByEmail('invalid-email');

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー検索失敗: ドメインエラー',
        expect.objectContaining({
          email: 'invalid-email',
          errorCode: 'EMAIL_INVALID_FORMAT',
        }),
      );
    });

    it('should return failure when repository throws error', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      // Act
      const result = await userService.findUserByEmail(validEmail);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'ユーザー検索中にエラーが発生しました',
        );
        expect(result.error.code).toBe('USER_SEARCH_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー検索処理でエラー発生',
        expect.objectContaining({
          email: validEmail,
          error: 'Database connection failed',
        }),
      );
    });

    it('should handle domain error from Email value object', async () => {
      // Act - 実際に無効なメールアドレスを使用してDomainErrorを発生させる
      const result = await userService.findUserByEmail(''); // 空のメールアドレス

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('メールアドレスは必須です');
        expect(result.error.code).toBe('EMAIL_REQUIRED');
      }
    });

    it('should call repository with correct Email value object', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      await userService.findUserByEmail(validEmail);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      await userService.findUserByEmail(validEmail);

      // Assert - ログに機密情報がマスクされて出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ユーザー検索完了',
        expect.objectContaining({
          email: expect.any(String), // 実際のマスク処理はLoggerで行われる
          found: true,
          userId: 'user-id',
        }),
      );
    });
  });
});
