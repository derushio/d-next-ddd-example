import { userFactory } from '@tests/utils/factories/userFactory';
import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ResetPasswordUseCase } from '@/layers/application/usecases/auth/ResetPasswordUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

describe('ResetPasswordUseCase', () => {
  let resetPasswordUseCase: ResetPasswordUseCase;
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
    resetPasswordUseCase = resolve('ResetPasswordUseCase');
  });

  describe('execute', () => {
    const validInput = {
      email: 'john@example.com',
    };

    it('should successfully process reset password for existing user', async () => {
      // Arrange
      const mockUser = userFactory.build(
        {},
        { transient: { emailValue: validInput.email } },
      );

      // モックの設定
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
        });
      }

      // Email VOバリデーション後にリポジトリが呼ばれることを確認
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'パスワードリセット処理開始',
        { email: validInput.email },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'パスワードリセット処理完了',
        {
          email: validInput.email,
          userId: mockUser.id.value,
        },
      );
    });

    it('should return success even when user not found (for security)', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
        });
      }

      // セキュリティ上、ユーザーが存在しない場合もログに残す
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'パスワードリセット: ユーザーが見つかりません',
        { email: validInput.email },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'パスワードリセット処理完了',
        {
          email: validInput.email,
          userId: undefined,
        },
      );
    });

    it('should return failure for invalid email format', async () => {
      // Arrange
      const invalidEmailInput = {
        email: 'invalid-email-format',
      };

      // Act - Zodバリデーションがエラーをスロー
      const result = await resetPasswordUseCase.execute(invalidEmailInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
      }

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should return failure for empty email', async () => {
      // Arrange
      const emptyEmailInput = {
        email: '',
      };

      // Act - Zodバリデーションがエラーをスロー
      const result = await resetPasswordUseCase.execute(emptyEmailInput);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should return consistent success response on multiple calls', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result1 = await resetPasswordUseCase.execute(validInput);
      const result2 = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
        });
        expect(result2.value).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
        });
      }
    });
  });
});
