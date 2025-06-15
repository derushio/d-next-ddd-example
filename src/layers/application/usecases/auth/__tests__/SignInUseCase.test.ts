import type { ILogger } from '@/layers/infrastructure/services/Logger';
import { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import type { User } from '@/layers/infrastructure/persistence/prisma/generated';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SignInUseCase', () => {
  let signInUseCase: SignInUseCase;
  let mockUserRepository: IUserRepository;
  let mockUserDomainService: IUserDomainService;
  let mockLogger: ILogger;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Mock Repository
    mockUserRepository = {
      create: vi.fn(),
      findByEmail: vi.fn(),
    };

    // Mock Domain Service
    mockUserDomainService = {
      validateUserData: vi.fn(),
      validateEmail: vi.fn(),
      validatePassword: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
    };

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    signInUseCase = new SignInUseCase(
      mockUserRepository,
      mockUserDomainService,
      mockLogger,
    );
  });

  describe('正常系', () => {
    it('有効な認証情報でサインインが成功する', async () => {
      // Arrange
      const signInRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockUserDomainService.verifyPassword).mockResolvedValue(true);

      // Act
      const result = await signInUseCase.execute(signInRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });

      expect(mockUserDomainService.validateEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserDomainService.validatePassword).toHaveBeenCalledWith(
        'password123',
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserDomainService.verifyPassword).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン試行開始', {
        email: 'test@example.com',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('サインイン成功', {
        userId: 'user-123',
      });
    });
  });

  describe('異常系', () => {
    it('メールアドレスのバリデーションエラーでサインインが失敗する', async () => {
      // Arrange
      const signInRequest = {
        email: 'invalid-email',
        password: 'password123',
      };

      vi.mocked(mockUserDomainService.validateEmail).mockImplementation(() => {
        throw new Error('有効なメールアドレスを入力してください');
      });

      // Act & Assert
      await expect(signInUseCase.execute(signInRequest)).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      );

      expect(mockUserDomainService.validateEmail).toHaveBeenCalledWith(
        'invalid-email',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'サインイン失敗: バリデーションエラー',
        expect.objectContaining({
          email: 'invalid-email',
          error: '有効なメールアドレスを入力してください',
        }),
      );
    });

    it('パスワードのバリデーションエラーでサインインが失敗する', async () => {
      // Arrange
      const signInRequest = {
        email: 'test@example.com',
        password: 'short',
      };

      vi.mocked(mockUserDomainService.validatePassword).mockImplementation(
        () => {
          throw new Error('パスワードは8文字以上で入力してください');
        },
      );

      // Act & Assert
      await expect(signInUseCase.execute(signInRequest)).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      );

      expect(mockUserDomainService.validatePassword).toHaveBeenCalledWith(
        'short',
      );
    });

    it('ユーザーが存在しない場合にサインインが失敗する', async () => {
      // Arrange
      const signInRequest = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(signInUseCase.execute(signInRequest)).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'サインイン失敗: ユーザーが見つかりません',
        { email: 'nonexistent@example.com' },
      );
    });

    it('パスワードが正しくない場合にサインインが失敗する', async () => {
      // Arrange
      const signInRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockUserDomainService.verifyPassword).mockResolvedValue(false);

      // Act & Assert
      await expect(signInUseCase.execute(signInRequest)).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      );

      expect(mockUserDomainService.verifyPassword).toHaveBeenCalledWith(
        'wrongpassword',
        'hashed-password',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'サインイン失敗: パスワード不正',
        { userId: 'user-123' },
      );
    });
  });
});
