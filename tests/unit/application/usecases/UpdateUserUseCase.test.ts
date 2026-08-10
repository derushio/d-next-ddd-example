import { userFactory } from '@tests/utils/factories/userFactory';
import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { ok } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import type {
  UpdateUserRequest,
  UpdateUserUseCase,
} from '@/layers/application/usecases/user/UpdateUserUseCase';
import { User } from '@/layers/domain/entities/User';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

describe('UpdateUserUseCase', () => {
  let updateUserUseCase: UpdateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<IUserDomainService>;
  let mockLogger: MockProxy<ILogger>;
  let mockGetCurrentUserUseCase: MockProxy<GetCurrentUserUseCase>;

  // テスト用の認証済みユーザー情報
  const authenticatedUser = {
    id: 'existinguseridcuid12',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    const mocks = createDefaultMocks({
      userRepository: true,
      userDomainService: true,
      logger: true,
    });
    mockUserRepository = mocks.mockUserRepository;
    mockUserDomainService = mocks.mockUserDomainService;
    mockLogger = mocks.mockLogger;
    mockGetCurrentUserUseCase = mock<GetCurrentUserUseCase>();

    // 認証成功をデフォルトに設定
    mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
      ok(authenticatedUser),
    );

    registerMockServices(
      {
        userRepository: mockUserRepository,
        userDomainService: mockUserDomainService,
        logger: mockLogger,
      },
      [[INJECTION_TOKENS.GetCurrentUserUseCase, mockGetCurrentUserUseCase]],
    );

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    updateUserUseCase = resolve('UpdateUserUseCase');
  });

  describe('execute', () => {
    it('ユーザープロフィールを正常に更新できる', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existinguseridcuid12'),
        new Email('old@example.com'),
        'Old Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        email: 'new@example.com',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe('new@example.com');
        expect(result.value.name).toBe('New Name');
        expect(result.value.id).toBe('existinguseridcuid12');
      }
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('existinguseridcuid12'),
      );
      expect(mockUserDomainService.isEmailDuplicate).toHaveBeenCalledWith(
        new Email('new@example.com'),
      );
      // 更新されたユーザーが渡されていることを確認（時間の具体的な値は除外）
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
      const calledUser = mockUserRepository.update.mock.calls[0]?.[0];
      expect(calledUser).toBeDefined();
      if (calledUser) {
        expect(calledUser.id.value).toBe('existinguseridcuid12');
        expect(calledUser.email.value).toBe('new@example.com');
        expect(calledUser.name).toBe('New Name');
        expect(calledUser.passwordHash).toBe('hashed-password');
        expect(calledUser.createdAt).toEqual(new Date('2023-01-01'));
        expect(calledUser.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('名前のみ更新できる', async () => {
      // Arrange
      const existingUser = userFactory.build(
        { name: 'Old Name' },
        {
          transient: {
            emailValue: 'test@example.com',
            passwordHash: 'hashed-password',
          },
        },
      );

      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe('test@example.com'); // 変更されない
        expect(result.value.name).toBe('New Name');
      }
      expect(mockUserDomainService.isEmailDuplicate).not.toHaveBeenCalled();
    });

    it('メールアドレスのみ更新できる', async () => {
      // Arrange
      const existingUser = userFactory.build(
        { name: 'Test Name' },
        {
          transient: {
            emailValue: 'old@example.com',
            passwordHash: 'hashed-password',
          },
        },
      );

      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        email: 'new@example.com',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe('new@example.com');
        expect(result.value.name).toBe('Test Name'); // 変更されない
      }
    });

    it('存在しないユーザーIDでエラーを返す', async () => {
      // Arrange
      const nonExistentUserId = 'nonexistentidcuid12';
      const request: UpdateUserRequest = {
        userId: nonExistentUserId,
        name: 'New Name',
      };

      // 認証ユーザーを存在しないIDに変更（認可チェックを通過させる）
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        ok({
          id: nonExistentUserId,
          email: 'test@example.com',
          name: 'Test User',
        }),
      );
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('重複するメールアドレスでエラーを返す', async () => {
      // Arrange
      const existingUser = userFactory.build(
        { name: 'Test Name' },
        {
          transient: {
            emailValue: 'old@example.com',
            passwordHash: 'hashed-password',
          },
        },
      );

      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        email: 'duplicate@example.com',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(true);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'このメールアドレスは既に使用されています',
        );
        expect(result.error.code).toBe('EMAIL_DUPLICATE');
      }
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('無効な名前でドメインエラーを適切に処理する', async () => {
      // Arrange
      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        name: '', // 無効な名前
      };

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('名前を入力してください');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
      // Zodバリデーションで弾かれるため findById は呼ばれない
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('無効なメールアドレスでドメインエラーを適切に処理する', async () => {
      // Arrange
      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        email: 'invalid-email', // 無効なメールアドレス
      };

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          '有効なメールアドレスを入力してください',
        );
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
      // Zodバリデーションで弾かれるため findById は呼ばれない
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('リポジトリエラーを適切に処理する', async () => {
      // Arrange
      const existingUser = userFactory.build(
        { name: 'Test Name' },
        {
          transient: {
            emailValue: 'test@example.com',
            passwordHash: 'hashed-password',
          },
        },
      );

      const request: UpdateUserRequest = {
        userId: 'existinguseridcuid12',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database error');
        expect(result.error.code).toBe('UNEXPECTED_ERROR');
      }
    });
  });
});
