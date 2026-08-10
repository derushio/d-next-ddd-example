import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { SignOutUseCase } from '@/layers/application/usecases/auth/SignOutUseCase';

describe('SignOutUseCase', () => {
  let signOutUseCase: SignOutUseCase;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    const mocks = createDefaultMocks({ logger: true });
    mockLogger = mocks.mockLogger;
    registerMockServices({ logger: mockLogger });

    // UseCaseインスタンスをDIコンテナから取得
    signOutUseCase = resolve('SignOutUseCase');
  });

  describe('execute', () => {
    const validInput = {
      userId: 'user-123',
    };

    it('should successfully sign out user', () => {
      // Act
      const result = signOutUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          message: 'サインアウトしました',
        });
      }

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト処理開始', {
        userId: validInput.userId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト成功', {
        userId: validInput.userId,
      });
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it('should handle empty userId', () => {
      // Arrange
      const emptyUserIdInput = {
        userId: '',
      };

      // Act
      const result = signOutUseCase.execute(emptyUserIdInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          message: 'サインアウトしました',
        });
      }

      // ログ出力の確認（空のuserIdでも処理される）
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト処理開始', {
        userId: '',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト成功', {
        userId: '',
      });
    });

    it('should handle special characters in userId', () => {
      // Arrange
      const specialCharInput = {
        userId: 'user-特殊文字-123!@#$%',
      };

      // Act
      const result = signOutUseCase.execute(specialCharInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          message: 'サインアウトしました',
        });
      }

      // ログ出力の確認
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト処理開始', {
        userId: specialCharInput.userId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインアウト成功', {
        userId: specialCharInput.userId,
      });
    });
  });
});
