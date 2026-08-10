import 'reflect-metadata';

import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { createUser } from '@/app/server-actions/user/createUser';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { err, ok } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import type { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';

// resolve()のモック - hoisting対応
vi.mock('@/di/resolver', () => ({
  resolve: vi.fn(),
}));

// Next.js revalidateTagのモック - hoisting対応
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('createUser Server Action', () => {
  let mockLogger: MockProxy<ILogger>;
  let mockCreateUserUseCase: MockProxy<CreateUserUseCase>;
  let mockGetCurrentUserUseCase: MockProxy<GetCurrentUserUseCase>;

  const mockCurrentUser = {
    id: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const validInput = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    mockLogger = createAutoMockLogger();
    mockCreateUserUseCase = mock<CreateUserUseCase>();
    mockGetCurrentUserUseCase = mock<GetCurrentUserUseCase>();

    // デフォルト: 認証成功
    mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
      ok(mockCurrentUser),
    );

    // resolve()のモック設定
    const { resolve } = await import('@/di/resolver');
    vi.mocked(resolve).mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'Logger':
          return mockLogger;
        case 'CreateUserUseCase':
          return mockCreateUserUseCase;
        case 'GetCurrentUserUseCase':
          return mockGetCurrentUserUseCase;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    });
  });

  describe('Successful user creation', () => {
    it('should successfully create user with valid data', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateUserUseCase.execute.mockResolvedValue(ok(mockUser));

      // Act
      const result = await createUser(validInput);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });

      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('createUser started');

      expect(mockLogger.info).toHaveBeenCalledWith('createUser 成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('users', 'default');
    });
  });

  describe('Authentication', () => {
    it('should return error when user is not authenticated', async () => {
      // Arrange
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        err({ message: '認証が必要です', code: 'UNAUTHENTICATED' }),
      );

      // Act
      const result = await createUser(validInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: '認証が必要です',
        code: 'UNAUTHENTICATED',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('createUser: 認証失敗', {
        error: '認証が必要です',
        code: 'UNAUTHENTICATED',
      });

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();

      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should return validation error for empty name', async () => {
      // Arrange
      const input = {
        name: '',
        email: 'test@example.com',
        password: 'password123',
      };

      // Act
      const result = await createUser(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          name: ['名前を入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'createUser: バリデーションエラー',
        {
          fieldErrors: {
            name: ['名前を入力してください'],
          },
        },
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const input = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      // Act
      const result = await createUser(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          email: ['有効なメールアドレスを入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'createUser: バリデーションエラー',
        {
          fieldErrors: {
            email: ['有効なメールアドレスを入力してください'],
          },
        },
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation error for short password', async () => {
      // Arrange
      const input = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123',
      };

      // Act
      const result = await createUser(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          password: ['新しいパスワードは8文字以上で入力してください'],
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'createUser: バリデーションエラー',
        {
          fieldErrors: {
            password: ['新しいパスワードは8文字以上で入力してください'],
          },
        },
      );

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return validation errors for multiple invalid fields', async () => {
      // Arrange
      const input = { name: '', email: 'invalid-email', password: '123' };

      // Act
      const result = await createUser(input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          name: expect.arrayContaining(['名前を入力してください']),
          email: expect.arrayContaining([
            '有効なメールアドレスを入力してください',
          ]),
          password: expect.arrayContaining([
            '新しいパスワードは8文字以上で入力してください',
          ]),
        },
      });

      expect(mockCreateUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('UseCase failures', () => {
    it('should handle email already exists from UseCase', async () => {
      // Arrange
      const input = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(
        err({
          message: 'このメールアドレスは既に登録されています',
          code: 'EMAIL_ALREADY_EXISTS',
        }),
      );

      // Act
      const result = await createUser(input);

      // Assert
      // EMAIL_ALREADY_EXISTS は resultToActionResult の mapActionErrorCode で CONFLICT にマッピングされる
      expect(result).toEqual({
        success: false,
        error: 'このメールアドレスは既に登録されています',
        code: 'CONFLICT',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('createUser 失敗', {
        error: 'このメールアドレスは既に登録されています',
        code: 'EMAIL_ALREADY_EXISTS',
      });

      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
    });

    it('should handle invalid name from UseCase', async () => {
      // Arrange
      mockCreateUserUseCase.execute.mockResolvedValue(
        err({ message: '名前が無効です', code: 'INVALID_NAME' }),
      );

      // Act
      const result = await createUser(validInput);

      // Assert
      // INVALID_NAME は resultToActionResult の mapActionErrorCode で VALIDATION_ERROR にマッピングされる
      expect(result).toEqual({
        success: false,
        error: '名前が無効です',
        code: 'VALIDATION_ERROR',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('createUser 失敗', {
        error: '名前が無効です',
        code: 'INVALID_NAME',
      });
    });

    it('should handle invalid password from UseCase', async () => {
      // Arrange
      mockCreateUserUseCase.execute.mockResolvedValue(
        err({ message: 'パスワードが無効です', code: 'INVALID_PASSWORD' }),
      );

      // Act
      const result = await createUser(validInput);

      // Assert
      // INVALID_PASSWORD は resultToActionResult の mapActionErrorCode で VALIDATION_ERROR にマッピングされる
      expect(result).toEqual({
        success: false,
        error: 'パスワードが無効です',
        code: 'VALIDATION_ERROR',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('createUser 失敗', {
        error: 'パスワードが無効です',
        code: 'INVALID_PASSWORD',
      });
    });

    it('should handle email validation error from UseCase', async () => {
      // Arrange
      // UseCase がドメインレベルのメールアドレス検証で失敗するケース（Zodでは検出できないエラー）
      mockCreateUserUseCase.execute.mockResolvedValue(
        err({
          message:
            'メールアドレスが長すぎます（254文字以内である必要があります）',
          code: 'EMAIL_TOO_LONG',
        }),
      );

      // Act
      const result = await createUser({
        name: 'Test User',
        email: 'valid@example.com',
        password: 'password123',
      });

      // Assert
      expect(result).toMatchObject({
        success: false,
        code: 'EMAIL_TOO_LONG',
      });
    });
  });

  describe('System errors', () => {
    it('should handle unexpected errors from UseCase execution', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockCreateUserUseCase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await createUser(validInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Database connection failed',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'createUser failed',
        expect.objectContaining({ error: 'Database connection failed' }),
      );

      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors without Error object', async () => {
      // Arrange
      mockCreateUserUseCase.execute.mockRejectedValue('String error');

      // Act
      const result = await createUser(validInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'String error',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('createUser failed', {
        error: 'String error',
      });
    });

    it('should handle resolve() service resolution errors', async () => {
      // Arrange
      const { resolve } = await import('@/di/resolver');
      vi.mocked(resolve).mockImplementation((serviceName: string) => {
        if (serviceName === 'Logger') return mockLogger;
        if (serviceName === 'GetCurrentUserUseCase')
          return mockGetCurrentUserUseCase;
        if (serviceName === 'CreateUserUseCase') {
          throw new Error('Service not found');
        }
        throw new Error(`Unknown service: ${serviceName}`);
      });

      // Act
      const result = await createUser(validInput);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Service not found',
        code: 'SYSTEM_ERROR',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'createUser failed',
        expect.objectContaining({ error: 'Service not found' }),
      );
    });
  });

  describe('Next.js integration', () => {
    it('should call revalidateTag after successful user creation', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateUserUseCase.execute.mockResolvedValue(ok(mockUser));

      // Act
      await createUser(validInput);

      // Assert
      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('users', 'default');
    });

    it('should not call revalidateTag when user creation fails', async () => {
      // Arrange
      mockCreateUserUseCase.execute.mockResolvedValue(
        err({
          message: 'このメールアドレスは既に登録されています',
          code: 'EMAIL_ALREADY_EXISTS',
        }),
      );

      // Act
      await createUser({
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      });

      // Assert
      const { revalidateTag } = await import('next/cache');
      expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
    });
  });

  describe('Logging verification', () => {
    it('should log all successful user creation steps', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateUserUseCase.execute.mockResolvedValue(ok(mockUser));

      // Act
      await createUser(validInput);

      // Assert - ログが適切に出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledWith('createUser started');
      expect(mockLogger.info).toHaveBeenCalledWith('createUser 成功', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateUserUseCase.execute.mockResolvedValue(ok(mockUser));

      // Act
      await createUser(validInput);

      // Assert - ログにパスワードが含まれていないことを確認
      const logCalls = mockLogger.info.mock.calls;
      for (const [_message, meta] of logCalls) {
        if (meta) {
          expect(JSON.stringify(meta)).not.toContain('password123');
        }
      }
    });
  });
});
