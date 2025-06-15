import {
  UpdateUserRequest,
  UpdateUserUseCase,
} from '@/layers/application/usecases/UpdateUserUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

import {
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('UpdateUserUseCase', () => {
  let updateUserUseCase: UpdateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockUserDomainService = createAutoMockUserDomainService();

    updateUserUseCase = new UpdateUserUseCase(
      mockUserRepository,
      mockUserDomainService,
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
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('new@example.com');
      expect(result.user?.name).toBe('New Name');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        new UserId('existing-user-id'),
      );
      expect(mockUserDomainService.isEmailDuplicate).toHaveBeenCalledWith(
        new Email('new@example.com'),
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(existingUser);
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
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com'); // 変更されない
      expect(result.user?.name).toBe('New Name');
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
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('new@example.com');
      expect(result.user?.name).toBe('Test Name'); // 変更されない
    });

    it('存在しないユーザーIDでエラーを返す', async () => {
      // Arrange
      const request: UpdateUserRequest = {
        userId: 'non-existent-id',
        name: 'New Name',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await updateUserUseCase.execute(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('ユーザーが見つかりません');
      expect(result.error?.code).toBe('USER_NOT_FOUND');
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
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        'このメールアドレスは既に使用されています',
      );
      expect(result.error?.code).toBe('EMAIL_DUPLICATE');
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
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('名前は空文字列にできません');
      expect(result.error?.code).toBe('INVALID_NAME');
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
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('ユーザー更新に失敗しました');
      expect(result.error?.code).toBe('UNEXPECTED_ERROR');
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
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('ユーザー更新に失敗しました');
      expect(result.error?.code).toBe('UNEXPECTED_ERROR');
    });
  });
});
