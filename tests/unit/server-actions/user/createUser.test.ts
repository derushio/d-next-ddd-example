import 'reflect-metadata';

import { createUser } from '@/app/server-actions/user/createUser';
import { failure, success } from '@/layers/application/types/Result';
import {
  createAutoMockLogger,
} from '@tests/utils/mocks/autoMocks';

import type { MockProxy } from 'vitest-mock-extended';

// resolve()のモック - hoisting対応
vi.mock('@/layers/infrastructure/di/resolver', () => ({
  resolve: vi.fn(),
}));

// Next.js revalidatePathのモック - hoisting対応
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('createUser Server Action', () => {
  let mockLogger: MockProxy<any>;
  let mockCreateUserUseCase: MockProxy<any>;

  beforeEach(async () => {
    mockLogger = createAutoMockLogger();
    mockCreateUserUseCase = {
      execute: vi.fn(),
    };

    // resolve()のモック設定
    const { resolve } = await import('@/layers/infrastructure/di/resolver');
    vi.mocked(resolve).mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'Logger':
          return mockLogger;
        case 'CreateUserUseCase':
          return mockCreateUserUseCase;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful user creation', () => {
    it('should successfully create user with valid data', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(
        success(mockUser)
      );

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        success: true,
        user: mockUser,
      });

      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成処理開始', {
        action: 'createUser',
        timestamp: expect.any(String),
      });

      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー作成成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      const { revalidatePath } = await import('next/cache');
      expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/users');
    });
  });

  describe('Validation errors', () => {
    it('should return validation error for empty name', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          name: ['名前を入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成: バリデーションエラー',
        {
          errors: {
            name: ['名前を入力してください'],
          },
        }
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'invalid-email');
      formData.append('password', 'password123');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          email: ['有効なメールアドレスを入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成: バリデーションエラー',
        {
          errors: {
            email: ['有効なメールアドレスを入力してください'],
          },
        }
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation error for short password', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', '123');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ユーザー作成: バリデーションエラー',
        {
          errors: {
            password: ['パスワードは8文字以上で入力してください'],
          },
        }
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation errors for missing fields', async () => {
      // Arrange
      const formData = new FormData();
      // 空のFormData

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('name');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(Array.isArray(result.errors?.name)).toBe(true);
      expect(Array.isArray(result.errors?.email)).toBe(true);
      expect(Array.isArray(result.errors?.password)).toBe(true);
      expect(result.errors?.name?.length).toBeGreaterThan(0);
      expect(result.errors?.email?.length).toBeGreaterThan(0);
      expect(result.errors?.password?.length).toBeGreaterThan(0);

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation errors for multiple invalid fields', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', 'invalid-email');
      formData.append('password', '123');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          name: ['名前を入力してください'],
          email: ['有効なメールアドレスを入力してください'],
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('UseCase failures', () => {
    it('should handle email already exists from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'existing@example.com');
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockResolvedValue(
        failure('このメールアドレスは既に登録されています', 'EMAIL_ALREADY_EXISTS')
      );

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'このメールアドレスは既に登録されています',
        code: 'EMAIL_ALREADY_EXISTS',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('ユーザー作成失敗', {
        error: 'このメールアドレスは既に登録されています',
        code: 'EMAIL_ALREADY_EXISTS',
      });

      const { revalidatePath } = await import('next/cache');
      expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
    });

    it('should handle invalid name from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockResolvedValue(
        failure('名前が無効です', 'INVALID_NAME')
      );

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: '名前が無効です',
        code: 'INVALID_NAME',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('ユーザー作成失敗', {
        error: '名前が無効です',
        code: 'INVALID_NAME',
      });
    });

    it('should handle invalid password from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockResolvedValue(
        failure('パスワードが無効です', 'INVALID_PASSWORD')
      );

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'パスワードが無効です',
        code: 'INVALID_PASSWORD',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('ユーザー作成失敗', {
        error: 'パスワードが無効です',
        code: 'INVALID_PASSWORD',
      });
    });

    it('should handle email validation error from UseCase', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'a'.repeat(300) + '@example.com'); // 長すぎるメール
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockResolvedValue(
        failure('メールアドレスが長すぎます（254文字以内である必要があります）', 'EMAIL_TOO_LONG')
      );

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'メールアドレスが長すぎます（254文字以内である必要があります）',
        code: 'EMAIL_TOO_LONG',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('ユーザー作成失敗', {
        error: 'メールアドレスが長すぎます（254文字以内である必要があります）',
        code: 'EMAIL_TOO_LONG',
      });
    });
  });

  describe('System errors', () => {
    it('should handle unexpected errors from UseCase execution', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const unexpectedError = new Error('Database connection failed');
      mockCreateUserUseCase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー作成処理中に予期しないエラーが発生',
        {
          error: 'Database connection failed',
          stack: expect.any(String),
        }
      );

      const { revalidatePath } = await import('next/cache');
      expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors without Error object', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockRejectedValue('String error');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー作成処理中に予期しないエラーが発生',
        {
          error: 'Unknown error',
          stack: undefined,
        }
      );
    });

    it('should handle resolve() service resolution errors', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const { resolve } = await import('@/layers/infrastructure/di/resolver');
      vi.mocked(resolve).mockImplementation((serviceName: string) => {
        if (serviceName === 'Logger') return mockLogger;
        if (serviceName === 'CreateUserUseCase') {
          throw new Error('Service not found');
        }
        throw new Error(`Unknown service: ${serviceName}`);
      });

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        error: 'システムエラーが発生しました',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ユーザー作成処理中に予期しないエラーが発生',
        {
          error: 'Service not found',
          stack: expect.any(String),
        }
      );
    });
  });

  describe('FormData handling', () => {
    it('should handle null values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      // FormData.get()がnullを返すケース（値が設定されていない）

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('name');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(Array.isArray(result.errors?.name)).toBe(true);
      expect(Array.isArray(result.errors?.email)).toBe(true);
      expect(Array.isArray(result.errors?.password)).toBe(true);
      expect(result.errors?.name?.length).toBeGreaterThan(0);
      expect(result.errors?.email?.length).toBeGreaterThan(0);
      expect(result.errors?.password?.length).toBeGreaterThan(0);

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle empty string values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', '');
      formData.append('password', '');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toEqual({
        errors: {
          name: ['名前を入力してください'],
          email: ['有効なメールアドレスを入力してください'],
          password: ['パスワードは8文字以上で入力してください'],
        },
      });

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only values from FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', '   ');
      formData.append('email', '   ');
      formData.append('password', '   ');

      // Act
      const result = await createUser(formData);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(Array.isArray(result.errors?.email)).toBe(true);
      expect(Array.isArray(result.errors?.password)).toBe(true);
      expect(result.errors?.email?.length).toBeGreaterThan(0);
      expect(result.errors?.password?.length).toBeGreaterThan(0);
      // nameフィールドは空白文字でも最小長1文字を満たすため、バリデーション通過の可能性あり

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('Next.js integration', () => {
    it('should call revalidatePath after successful user creation', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(
        success(mockUser)
      );

      // Act
      await createUser(formData);

      // Assert
      const { revalidatePath } = await import('next/cache');
      expect(vi.mocked(revalidatePath)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/users');
    });

    it('should not call revalidatePath when user creation fails', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'existing@example.com');
      formData.append('password', 'password123');

      mockCreateUserUseCase.execute.mockResolvedValue(
        failure('このメールアドレスは既に登録されています', 'EMAIL_ALREADY_EXISTS')
      );

      // Act
      await createUser(formData);

      // Assert
      const { revalidatePath } = await import('next/cache');
      expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
    });
  });

  describe('Logging verification', () => {
    it('should log all successful user creation steps', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(
        success(mockUser)
      );

      // Act
      await createUser(formData);

      // Assert - ログが適切に出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'ユーザー作成処理開始', {
        action: 'createUser',
        timestamp: expect.any(String),
      });
      expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'ユーザー作成成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(
        success(mockUser)
      );

      // Act
      await createUser(formData);

      // Assert - ログにパスワードが含まれていないことを確認
      const logCalls: LoggerMockCall[] = mockLogger.info.mock.calls;
      logCalls.forEach(([message, meta]) => {
        expect(JSON.stringify(meta)).not.toContain('password123');
      });
    });
  });
});