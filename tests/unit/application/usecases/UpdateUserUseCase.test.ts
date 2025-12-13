import {
  UpdateUserRequest,
  UpdateUserUseCase,
} from '@/layers/application/usecases/UpdateUserUseCase';
import { isFailure, isSuccess, success } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import {
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';

describe('UpdateUserUseCase', () => {
  let updateUserUseCase: UpdateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;
  let mockLogger: MockProxy<ILogger>;
  let mockGetCurrentUserUseCase: MockProxy<GetCurrentUserUseCase>;

  // テスト用の認証済みユーザー情報
  const authenticatedUser = {
    id: 'existing-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockUserDomainService = createAutoMockUserDomainService();
    mockLogger = createAutoMockLogger();
    mockGetCurrentUserUseCase = mock<GetCurrentUserUseCase>();

    // 認証成功をデフォルトに設定
    mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
      success(authenticatedUser),
    );

    updateUserUseCase = new UpdateUserUseCase(
      mockUserRepository,
      mockUserDomainService,
      mockLogger,
      mockGetCurrentUserUseCase,
    );
  });

  describe('execute', () => {
    it('ユーザープロフィールを正常に更新できる', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('old@example.com'),
        'Old Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        email: 'new@example.com',
        name: 'New Name',
      };


      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.email).toBe('new@example.com');
        expect(result.data.name).toBe('New Name');
        expect(result.data.id).toBe('existing-user-id');
      }
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('existing-user-id'),
      );
      expect(mockUserDomainService.isEmailDuplicate).toHaveBeenCalledWith(
        new Email('new@example.com'),
      );
      // 更新されたユーザーが渡されていることを確認（時間の具体的な値は除外）
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
      const calledUser = mockUserRepository.update.mock.calls[0][0];
      expect(calledUser.id.value).toBe('existing-user-id');
      expect(calledUser.email.value).toBe('new@example.com');
      expect(calledUser.name).toBe('New Name');
      expect(calledUser.passwordHash).toBe('hashed-password');
      expect(calledUser.createdAt).toEqual(new Date('2023-01-01'));
      expect(calledUser.updatedAt).toBeInstanceOf(Date);
    });

    it('名前のみ更新できる', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('test@example.com'),
        'Old Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.email).toBe('test@example.com'); // 変更されない
        expect(result.data.name).toBe('New Name');
      }
      expect(mockUserDomainService.isEmailDuplicate).not.toHaveBeenCalled();
    });

    it('メールアドレスのみ更新できる', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('old@example.com'),
        'Test Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        email: 'new@example.com',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.email).toBe('new@example.com');
        expect(result.data.name).toBe('Test Name'); // 変更されない
      }
    });

    it('存在しないユーザーIDでエラーを返す', async () => {
      // Arrange
      const nonExistentUserId = 'non-existent-id';
      const request: UpdateUserRequest = {
        userId: nonExistentUserId,
        name: 'New Name',
      };

      // 認証ユーザーを存在しないIDに変更（認可チェックを通過させる）
      mockGetCurrentUserUseCase.requireAuthentication.mockResolvedValue(
        success({ id: nonExistentUserId, email: 'test@example.com', name: 'Test User' }),
      );
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('重複するメールアドレスでエラーを返す', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('old@example.com'),
        'Test Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        email: 'duplicate@example.com',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserDomainService.isEmailDuplicate.mockResolvedValue(true);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'このメールアドレスは既に使用されています',
        );
        expect(result.error.code).toBe('EMAIL_DUPLICATE');
      }
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('無効な名前でドメインエラーを適切に処理する', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('test@example.com'),
        'Valid Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        name: '', // 無効な名前
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('名前は空文字列にできません');
        expect(result.error.code).toBe('INVALID_NAME');
      }
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('無効なメールアドレスでドメインエラーを適切に処理する', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('test@example.com'),
        'Test Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        email: 'invalid-email', // 無効なメールアドレス
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('メールアドレスの形式が正しくありません');
        expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      }
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('リポジトリエラーを適切に処理する', async () => {
      // Arrange
      const existingUser = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('test@example.com'),
        'Test Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const request: UpdateUserRequest = {
        userId: 'existing-user-id',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザー更新に失敗しました');
        expect(result.error.code).toBe('UNEXPECTED_ERROR');
      }
    });
  });
});
