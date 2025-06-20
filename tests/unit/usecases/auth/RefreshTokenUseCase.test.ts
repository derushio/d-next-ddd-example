import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { RefreshTokenUseCase } from '@/layers/application/usecases/auth/RefreshTokenUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { container } from '@/layers/infrastructure/di/container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
  createAutoMockLogger,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase;
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

    // UseCaseインスタンスをDIコンテナから取得
    refreshTokenUseCase = container.resolve(RefreshTokenUseCase);
  });

  describe('execute', () => {
    const validInput = {
      refreshToken: 'valid_refresh_token_123',
    };

    it('should successfully refresh token', async () => {
      // Act
      const result = await refreshTokenUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          success: true,
          accessToken: expect.stringMatching(/^access_\d+_\d+/),
          refreshToken: expect.stringMatching(/^refresh_\d+_\d+/),
          expiresIn: 3600,
        });
      }

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        'リフレッシュトークン処理開始',
        { refreshToken: '***' },
      );
      expect(mockLogger.info).toHaveBeenCalledWith('リフレッシュトークン成功');
    });

    it('should return failure when refresh token is empty', async () => {
      // Arrange
      const emptyTokenInput = {
        refreshToken: '',
      };

      // Act
      const result = await refreshTokenUseCase.execute(emptyTokenInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'リフレッシュトークンエラー: トークンが空',
      );
    });

    it('should return failure when refresh token is null', async () => {
      // Arrange
      const nullTokenInput = {
        refreshToken: null as any,
      };

      // Act
      const result = await refreshTokenUseCase.execute(nullTokenInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'リフレッシュトークンエラー: トークンが空',
      );
    });

    it('should return failure when refresh token is only whitespace', async () => {
      // Arrange
      const whitespaceTokenInput = {
        refreshToken: '   \t\n   ',
      };

      // Act
      const result = await refreshTokenUseCase.execute(whitespaceTokenInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'リフレッシュトークンエラー: トークンが空',
      );
    });

    it('should generate unique tokens on each call', async () => {
      // Act
      const result1 = await refreshTokenUseCase.execute(validInput);
      const result2 = await refreshTokenUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result1)).toBe(true);
      expect(isSuccess(result2)).toBe(true);

      if (isSuccess(result1) && isSuccess(result2)) {
        // トークンが異なることを確認
        expect(result1.data.accessToken).not.toBe(result2.data.accessToken);
        expect(result1.data.refreshToken).not.toBe(result2.data.refreshToken);
        
        // トークンのフォーマットを確認
        expect(result1.data.accessToken).toMatch(/^access_\d+_\d+/);
        expect(result1.data.refreshToken).toMatch(/^refresh_\d+_\d+/);
        expect(result2.data.accessToken).toMatch(/^access_\d+_\d+/);
        expect(result2.data.refreshToken).toMatch(/^refresh_\d+_\d+/);
        
        // expiresInは固定値
        expect(result1.data.expiresIn).toBe(3600);
        expect(result2.data.expiresIn).toBe(3600);
      }
    });

    it('should handle special characters in refresh token', async () => {
      // Arrange
      const specialCharTokenInput = {
        refreshToken: 'special!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
      };

      // Act
      const result = await refreshTokenUseCase.execute(specialCharTokenInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          success: true,
          accessToken: expect.stringMatching(/^access_\d+_\d+/),
          refreshToken: expect.stringMatching(/^refresh_\d+_\d+/),
          expiresIn: 3600,
        });
      }

      // ログ出力の確認（特殊文字でも処理される）
      expect(mockLogger.info).toHaveBeenCalledWith(
        'リフレッシュトークン処理開始',
        { refreshToken: '***' },
      );
      expect(mockLogger.info).toHaveBeenCalledWith('リフレッシュトークン成功');
    });

    it('should mask refresh token in logs for security', async () => {
      // Arrange
      const sensitiveTokenInput = {
        refreshToken: 'super_secret_refresh_token_with_sensitive_data',
      };

      // Act
      await refreshTokenUseCase.execute(sensitiveTokenInput);

      // Assert
      // リフレッシュトークンがログでマスクされていることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        'リフレッシュトークン処理開始',
        { refreshToken: '***' },
      );
      
      // 実際のトークン値がログに出力されていないことを確認
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'リフレッシュトークン処理開始',
        { refreshToken: sensitiveTokenInput.refreshToken },
      );
    });
  });
});