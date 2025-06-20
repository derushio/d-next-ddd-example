import { isSuccess } from '@/layers/application/types/Result';
import { SignOutUseCase } from '@/layers/application/usecases/auth/SignOutUseCase';
import { container } from '@/layers/infrastructure/di/container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('SignOutUseCase', () => {
  let signOutUseCase: SignOutUseCase;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得
    signOutUseCase = container.resolve(SignOutUseCase);
  });

  describe('execute', () => {
    const validInput = {
      userId: 'user-123',
    };

    it('should successfully sign out user', async () => {
      // Act
      const result = await signOutUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
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

    it('should handle empty userId', async () => {
      // Arrange
      const emptyUserIdInput = {
        userId: '',
      };

      // Act
      const result = await signOutUseCase.execute(emptyUserIdInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
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

    it('should handle special characters in userId', async () => {
      // Arrange
      const specialCharInput = {
        userId: 'user-特殊文字-123!@#$%',
      };

      // Act
      const result = await signOutUseCase.execute(specialCharInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
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