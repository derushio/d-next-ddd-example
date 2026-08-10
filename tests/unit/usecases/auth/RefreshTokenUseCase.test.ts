import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { RefreshTokenUseCase } from '@/layers/application/usecases/auth/RefreshTokenUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    const mocks = createDefaultMocks({ userRepository: true, logger: true });
    mockUserRepository = mocks.mockUserRepository;
    mockLogger = mocks.mockLogger;
    registerMockServices({
      userRepository: mockUserRepository,
      logger: mockLogger,
    });

    // UseCaseインスタンスをDIコンテナから取得
    refreshTokenUseCase = resolve('RefreshTokenUseCase');
  });

  describe('execute', () => {
    const validInput = {
      refreshToken: 'valid_refresh_token_123',
    };

    it('should successfully refresh token', async () => {
      // Act
      const result = await refreshTokenUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          success: true,
          accessToken: expect.stringMatching(/^access_[0-9a-f]+/),
          refreshToken: expect.stringMatching(/^refresh_[0-9a-f]+/),
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }
    });

    it('should return failure when refresh token is null', async () => {
      // Arrange
      const nullTokenInput = {
        refreshToken: null as unknown as string,
      };

      // Act
      const result = await refreshTokenUseCase.execute(nullTokenInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }
    });

    it('should return failure when refresh token is only whitespace', async () => {
      // Arrange
      const whitespaceTokenInput = {
        refreshToken: '   \t\n   ',
      };

      // Act
      const result = await refreshTokenUseCase.execute(whitespaceTokenInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('リフレッシュトークンが無効です');
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
      }
    });

    it('should generate unique tokens on each call', async () => {
      // Act
      const result1 = await refreshTokenUseCase.execute(validInput);
      const result2 = await refreshTokenUseCase.execute(validInput);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // トークンが異なることを確認
        expect(result1.value.accessToken).not.toBe(result2.value.accessToken);
        expect(result1.value.refreshToken).not.toBe(result2.value.refreshToken);

        // トークンのフォーマットを確認
        expect(result1.value.accessToken).toMatch(/^access_[0-9a-f]+/);
        expect(result1.value.refreshToken).toMatch(/^refresh_[0-9a-f]+/);
        expect(result2.value.accessToken).toMatch(/^access_[0-9a-f]+/);
        expect(result2.value.refreshToken).toMatch(/^refresh_[0-9a-f]+/);

        // expiresInは固定値
        expect(result1.value.expiresIn).toBe(3600);
        expect(result2.value.expiresIn).toBe(3600);
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
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          success: true,
          accessToken: expect.stringMatching(/^access_[0-9a-f]+/),
          refreshToken: expect.stringMatching(/^refresh_[0-9a-f]+/),
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
