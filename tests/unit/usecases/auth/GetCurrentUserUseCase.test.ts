import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { container } from '@/layers/infrastructure/di/container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { createAutoMockLogger } from '../../../utils/mocks/autoMocks';
import {
  createGetAuthMockHelpers,
  setupGetAuthMock,
} from '../../../utils/mocks/commonMocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

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
    container.clearInstances();

    // 自動生成されたモックを作成
    mockLogger = createAutoMockLogger();
    getAuthHelpers = createGetAuthMockHelpers();

    // DIコンテナにモックを登録
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // getAuth関数のモック取得
    mockGetAuth = vi.mocked(getAuth);

    getCurrentUserUseCase = container.resolve(GetCurrentUserUseCase);
  });

  afterEach(() => {
    container.clearInstances();
    vi.clearAllMocks();
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
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        });
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        '現在のユーザー情報取得開始',
        expect.objectContaining({
          action: 'getCurrentUser',
          timestamp: expect.any(String),
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
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
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
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
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
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザー情報の取得に失敗しました');
        expect(result.error.code).toBe('USER_INFO_FETCH_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー情報取得エラー',
        expect.objectContaining({
          action: 'getCurrentUser',
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
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
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
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('認証が必要です');
        expect(result.error.code).toBe('UNAUTHENTICATED');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '認証が必要な処理で未認証ユーザーがアクセス',
        expect.objectContaining({
          action: 'requireAuthentication',
          timestamp: expect.any(String),
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
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザー情報の取得に失敗しました');
        expect(result.error.code).toBe('USER_INFO_FETCH_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー情報取得エラー',
        expect.objectContaining({
          action: 'getCurrentUser',
          error: '認証エラー',
        }),
      );
    });
  });
});
