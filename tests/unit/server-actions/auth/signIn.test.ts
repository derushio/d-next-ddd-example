import 'reflect-metadata';

import { signIn } from '@/app/server-actions/auth/signIn';
import { failure, success } from '@/layers/application/types/Result';
import type { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';

import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

// resolve()のモック - hoisting対応
vi.mock('@/di/resolver', () => ({
  resolve: vi.fn(),
}));

describe('signIn Server Action', () => {
  let mockLogger: MockProxy<ILogger>;
  let mockSignInUseCase: MockProxy<SignInUseCase>;

  beforeEach(async () => {
    mockLogger = createAutoMockLogger();
    mockSignInUseCase = mock<SignInUseCase>();

    // resolve()のモック設定
    const { resolve } = await import('@/di/resolver');
    vi.mocked(resolve).mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'Logger':
          return mockLogger;
        case 'SignInUseCase':
          return mockSignInUseCase;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful sign in', () => {
    it('should successfully sign in with valid credentials', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockSignInUseCase.execute.mockResolvedValue(success({ user: mockUser }));

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        success: true,
        user: mockUser,
      });

      expect(mockSignInUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('サインイン処理開始', {
        action: 'signIn',
        timestamp: expect.any(String),
      });

      expect(mockLogger.info).toHaveBeenCalledWith('サインイン成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('Validation errors', () => {
    it('should return validation error for invalid email', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'invalid-email');
      formData.append('password', 'password123');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          email: ['有効なメールアドレスを入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'サインイン: バリデーションエラー',
        {
          errors: {
            email: ['有効なメールアドレスを入力してください'],
          },
        },
      );

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation error for short password', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', '123');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'サインイン: バリデーションエラー',
        {
          errors: {
            password: ['パスワードは8文字以上で入力してください'],
          },
        },
      );

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation errors for missing fields', async () => {
      // Arrange
      const formData = new FormData();
      // 空のFormData

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(Array.isArray(result.errors?.email)).toBe(true);
      expect(Array.isArray(result.errors?.password)).toBe(true);
      expect(result.errors?.email?.length).toBeGreaterThan(0);
      expect(result.errors?.password?.length).toBeGreaterThan(0);

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation errors for multiple invalid fields', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'invalid-email');
      formData.append('password', '123');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          email: ['有効なメールアドレスを入力してください'],
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('UseCase failures', () => {
    it('should handle authentication failure from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'wrongpassword');

      mockSignInUseCase.execute.mockResolvedValue(
        failure(
          'メールアドレスまたはパスワードが正しくありません',
          'AUTHENTICATION_FAILED',
        ),
      );

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'メールアドレスまたはパスワードが正しくありません',
        code: 'AUTHENTICATION_FAILED',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('サインイン失敗', {
        error: 'メールアドレスまたはパスワードが正しくありません',
        code: 'AUTHENTICATION_FAILED',
      });
    });

    it('should handle user not found from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'nonexistent@example.com');
      formData.append('password', 'password123');

      mockSignInUseCase.execute.mockResolvedValue(
        failure('ユーザーが見つかりません', 'USER_NOT_FOUND'),
      );

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('サインイン失敗', {
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND',
      });
    });

    it('should handle email validation error from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', `${'a'.repeat(300)}@example.com`); // 長すぎるメール
      formData.append('password', 'password123');

      mockSignInUseCase.execute.mockResolvedValue(
        failure(
          'メールアドレスが長すぎます（254文字以内である必要があります）',
          'EMAIL_TOO_LONG',
        ),
      );

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'メールアドレスが長すぎます（254文字以内である必要があります）',
        code: 'EMAIL_TOO_LONG',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('サインイン失敗', {
        error: 'メールアドレスが長すぎます（254文字以内である必要があります）',
        code: 'EMAIL_TOO_LONG',
      });
    });
  });

  describe('System errors', () => {
    it('should handle unexpected errors from UseCase execution', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const unexpectedError = new Error('Database connection failed');
      mockSignInUseCase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'サインイン処理中に予期しないエラーが発生',
        {
          error: 'Database connection failed',
          stack: expect.any(String),
        },
      );
    });

    it('should handle unexpected errors without Error object', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockSignInUseCase.execute.mockRejectedValue('String error');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'サインイン処理中に予期しないエラーが発生',
        {
          error: 'Unknown error',
          stack: undefined,
        },
      );
    });

    it('should handle resolve() service resolution errors', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const { resolve } = await import('@/di/resolver');
      vi.mocked(resolve).mockImplementation((serviceName: string) => {
        if (serviceName === 'Logger') return mockLogger;
        if (serviceName === 'SignInUseCase') {
          throw new Error('Service not found');
        }
        throw new Error(`Unknown service: ${serviceName}`);
      });

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'サインイン処理中に予期しないエラーが発生',
        {
          error: 'Service not found',
          stack: expect.any(String),
        },
      );
    });
  });

  describe('FormData handling', () => {
    it('should handle null values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      // FormData.get()がnullを返すケース（値が設定されていない）

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(Array.isArray(result.errors?.email)).toBe(true);
      expect(Array.isArray(result.errors?.password)).toBe(true);
      expect(result.errors?.email?.length).toBeGreaterThan(0);
      expect(result.errors?.password?.length).toBeGreaterThan(0);

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle empty string values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', '');
      formData.append('password', '');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          email: ['有効なメールアドレスを入力してください'],
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', '   ');
      formData.append('password', '   ');

      // Act
      const result = await signIn(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          email: ['有効なメールアドレスを入力してください'],
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockSignInUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('Logging verification', () => {
    it('should log all successful sign in steps', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockSignInUseCase.execute.mockResolvedValue(success({ user: mockUser }));

      // Act
      await signIn(formData);

      // Assert - ログが適切に出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'サインイン処理開始', {
        action: 'signIn',
        timestamp: expect.any(String),
      });
      expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'サインイン成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockSignInUseCase.execute.mockResolvedValue(success({ user: mockUser }));

      // Act
      await signIn(formData);

      // Assert - ログにパスワードが含まれていないことを確認
      const logCalls: LoggerMockCall[] = mockLogger.info.mock.calls;
      logCalls.forEach(([_message, meta]) => {
        expect(JSON.stringify(meta)).not.toContain('password123');
      });
    });
  });
});
