import { createGetAuthMockHelpers } from '@tests/utils/mocks/commonMocks';
import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';

// getAuth関数をモック化
vi.mock('@/layers/infrastructure/persistence/nextAuth', () => ({
  getAuth: vi.fn(),
}));

describe('GetCurrentUserUseCase', () => {
  let getCurrentUserUseCase: GetCurrentUserUseCase;
  let mockLogger: MockProxy<ILogger>;
  let getAuthHelpers: ReturnType<typeof createGetAuthMockHelpers>;
  let mockGetAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mocks = createDefaultMocks({ logger: true });
    mockLogger = mocks.mockLogger;
    registerMockServices({ logger: mockLogger });

    // getAuth関数のモック取得
    getAuthHelpers = createGetAuthMockHelpers();
    mockGetAuth = vi.mocked(getAuth);

    getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  });

  describe('execute', () => {
    it('正常系: 認証済みユーザー情報を正常に取得する', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const authData = getAuthHelpers.getAuthenticatedUserData({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      mockGetAuth.mockResolvedValue(authData);

      // Act
      const result = await getCurrentUserUseCase.execute();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        });
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        '現在のユーザー情報取得開始',
        expect.objectContaining({
          action: 'getCurrentUser',
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ユーザー情報取得成功',
        expect.objectContaining({
          action: 'getCurrentUser',
          userId: 'user-123',
          email: 'test@example.com',
        }),
      );
    });

    it('正常系: 未認証の場合は失敗結果を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const authData = getAuthHelpers.getUnauthenticatedData();
      mockGetAuth.mockResolvedValue(authData);

      // Act
      const result = await getCurrentUserUseCase.execute();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証が必要です');
        expect(result.error.code).toBe('UNAUTHENTICATED');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ユーザー未認証または必要な情報が不足',
        expect.objectContaining({
          action: 'getCurrentUser',
          result: 'unauthenticated',
        }),
      );
    });

    it('正常系: ユーザー情報が不完全な場合は失敗結果を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const authData = getAuthHelpers.getIncompleteUserData({
        email: 'test@example.com',
        name: 'Test User',
      });
      mockGetAuth.mockResolvedValue(authData);

      // Act
      const result = await getCurrentUserUseCase.execute();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証が必要です');
        expect(result.error.code).toBe('UNAUTHENTICATED');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ユーザー未認証または必要な情報が不足',
        expect.objectContaining({
          action: 'getCurrentUser',
          result: 'unauthenticated',
        }),
      );
    });

    it('異常系: getAuthでエラーが発生した場合は失敗結果を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const error = getAuthHelpers.getErrorInstance('認証エラー');
      mockGetAuth.mockRejectedValue(error);

      // Act
      const result = await getCurrentUserUseCase.execute();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証エラー');
        expect(result.error.code).toBe('USER_INFO_FETCH_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー情報取得エラー',
        expect.objectContaining({
          error: '認証エラー',
          stack: expect.any(String),
        }),
      );
    });
  });

  describe('requireAuthentication', () => {
    it('正常系: 認証済みユーザー情報を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const authData = getAuthHelpers.getAuthenticatedUserData({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      mockGetAuth.mockResolvedValue(authData);

      // Act
      const result = await getCurrentUserUseCase.requireAuthentication();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        });
      }
    });

    it('異常系: 未認証の場合は失敗結果を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const authData = getAuthHelpers.getUnauthenticatedData();
      mockGetAuth.mockResolvedValue(authData);

      // Act
      const result = await getCurrentUserUseCase.requireAuthentication();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証が必要です');
        expect(result.error.code).toBe('UNAUTHENTICATED');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証が必要な処理で未認証ユーザーがアクセス',
        expect.objectContaining({
          action: 'requireAuthentication',
          error: '認証が必要です',
        }),
      );
    });

    it('異常系: getAuthでエラーが発生した場合は失敗結果を返す', async () => {
      // Arrange - 共通モックのヘルパーメソッドを使用
      const error = getAuthHelpers.getErrorInstance('認証エラー');
      mockGetAuth.mockRejectedValue(error);

      // Act
      const result = await getCurrentUserUseCase.requireAuthentication();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証エラー');
        expect(result.error.code).toBe('USER_INFO_FETCH_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー情報取得エラー',
        expect.objectContaining({
          error: '認証エラー',
          stack: expect.any(String),
        }),
      );
    });
  });
});
