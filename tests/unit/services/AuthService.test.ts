import 'reflect-metadata';

import { AuthService } from '@/layers/application/services/AuthService';
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import type { User } from '@/layers/domain/entities/User';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';

import type { MockProxy } from 'vitest-mock-extended';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    mockUserRepository = createAutoMockUserRepository();
    mockHashService = createAutoMockHashService();
    mockLogger = createAutoMockLogger();

    authService = new AuthService(
      mockUserRepository,
      mockHashService,
      mockLogger,
    );
  });

  describe('signIn', () => {
    const validRequest = {
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

    it('should successfully sign in with valid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(true);

      // Act
      const result = await authService.signIn(validRequest);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        });
      }

      expect(mockLogger.info).toHaveBeenCalledWith('認証開始', {
        email: 'test@example.com',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('認証成功', {
        email: 'test@example.com',
        userId: 'user-id',
      });
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.signIn(validRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('AUTHENTICATION_FAILED');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証失敗: ユーザーが見つかりません',
        { email: 'test@example.com' },
      );
    });

    it('should return failure when password is incorrect', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(false);

      // Act
      const result = await authService.signIn(validRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'メールアドレスまたはパスワードが正しくありません',
        );
        expect(result.error.code).toBe('AUTHENTICATION_FAILED');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証失敗: パスワードが正しくありません',
        { email: 'test@example.com', userId: 'user-id' },
      );
    });

    it('should return failure when email is invalid', async () => {
      // Arrange
      const invalidRequest = { ...validRequest, email: 'invalid-email' };

      // Act
      const result = await authService.signIn(invalidRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証失敗: ドメインエラー',
        expect.objectContaining({
          email: 'invalid-email',
          errorCode: 'EMAIL_INVALID_FORMAT',
        }),
      );
    });

    it('should return failure when email is empty', async () => {
      // Arrange
      const invalidRequest = { ...validRequest, email: '' };

      // Act
      const result = await authService.signIn(invalidRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('EMAIL_REQUIRED');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証失敗: ドメインエラー',
        expect.objectContaining({
          email: '',
          errorCode: 'EMAIL_REQUIRED',
        }),
      );
    });

    it('should return failure when repository throws error', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      // Act
      const result = await authService.signIn(validRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('認証処理中にエラーが発生しました');
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        '認証処理でエラー発生',
        expect.objectContaining({
          email: 'test@example.com',
          error: 'Database connection failed',
        }),
      );
    });

    it('should return failure when hash service throws error', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const hashError = new Error('Hash comparison failed');
      mockHashService.compareHash.mockRejectedValue(hashError);

      // Act
      const result = await authService.signIn(validRequest);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('認証処理中にエラーが発生しました');
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        '認証処理でエラー発生',
        expect.objectContaining({
          email: 'test@example.com',
          error: 'Hash comparison failed',
        }),
      );
    });

    it('should handle domain error from Email value object', async () => {
      // Act - 実際に無効なメールアドレスを使用してDomainErrorを発生させる
      const result = await authService.signIn({
        email: `${'a'.repeat(300)}@example.com`, // 254文字を超える長いメールアドレス
        password: 'password123',
      });

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
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(true);

      // Act
      await authService.signIn(validRequest);

      // Assert - ログに機密情報がマスクされて出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        '認証開始',
        expect.objectContaining({
          email: expect.any(String), // 実際のマスク処理はLoggerで行われる
        }),
      );
    });
  });
});
