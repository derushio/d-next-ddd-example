import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { ResetPasswordUseCase } from '@/layers/application/usecases/auth/ResetPasswordUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('ResetPasswordUseCase', () => {
  let resetPasswordUseCase: ResetPasswordUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<IUserDomainService>;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockUserDomainService = createAutoMockUserDomainService();
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(
      INJECTION_TOKENS.UserRepository,
      mockUserRepository,
    );
    container.registerInstance(
      INJECTION_TOKENS.UserDomainService,
      mockUserDomainService,
    );
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得
    resetPasswordUseCase = container.resolve(ResetPasswordUseCase);
  });

  describe('execute', () => {
    const validInput = {
      email: 'john@example.com',
    };

    it('should successfully process reset password for existing user', async () => {
      // Arrange
      const mockUser = User.create(
        new Email(validInput.email),
        'John Doe',
        'hashed_password',
      );

      // モックの設定
      mockUserDomainService.validateEmail.mockResolvedValue(undefined);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
          resetToken: expect.stringMatching(/^reset_\d+_\d+/),
        });
      }

      // モック呼び出しの確認
      expect(mockUserDomainService.validateEmail).toHaveBeenCalledWith(
        validInput.email,
      );
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
      mockUserDomainService.validateEmail.mockResolvedValue(undefined);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          success: true,
          message: 'パスワードリセットメールを送信しました',
          resetToken: expect.stringMatching(/^reset_\d+_\d+/),
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

    it('should return failure when email validation fails', async () => {
      // Arrange
      const validationError = new DomainError(
        '有効なメールアドレスを入力してください',
        'INVALID_EMAIL_FORMAT',
      );
      mockUserDomainService.validateEmail.mockImplementation(() => {
        throw validationError;
      });

      // Act
      const result = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
        expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
      }

      expect(mockUserDomainService.validateEmail).toHaveBeenCalledWith(
        validInput.email,
      );
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should return failure for invalid email format', async () => {
      // Arrange
      const invalidEmailInput = {
        email: 'invalid-email-format',
      };

      const validationError = new Error('バリデーションエラー');
      mockUserDomainService.validateEmail.mockImplementation(() => {
        throw validationError;
      });

      // Act
      const result = await resetPasswordUseCase.execute(invalidEmailInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
        expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'パスワードリセット失敗: バリデーションエラー',
        {
          email: invalidEmailInput.email,
          error: 'バリデーションエラー',
        },
      );
    });

    it('should generate unique reset tokens', async () => {
      // Arrange
      mockUserDomainService.validateEmail.mockResolvedValue(undefined);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result1 = await resetPasswordUseCase.execute(validInput);
      const result2 = await resetPasswordUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result1)).toBe(true);
      expect(isSuccess(result2)).toBe(true);

      if (isSuccess(result1) && isSuccess(result2)) {
        // トークンが異なることを確認
        expect(result1.data.resetToken).not.toBe(result2.data.resetToken);
        // トークンのフォーマットを確認
        expect(result1.data.resetToken).toMatch(/^reset_\d+_\d+/);
        expect(result2.data.resetToken).toMatch(/^reset_\d+_\d+/);
      }
    });

    it('should handle empty email', async () => {
      // Arrange
      const emptyEmailInput = {
        email: '',
      };

      const validationError = new Error('メールアドレスが必要です');
      mockUserDomainService.validateEmail.mockImplementation(() => {
        throw validationError;
      });

      // Act
      const result = await resetPasswordUseCase.execute(emptyEmailInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
        expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
      }

      expect(mockUserDomainService.validateEmail).toHaveBeenCalledWith('');
    });
  });
});
