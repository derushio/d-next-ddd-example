import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { container } from '@/layers/infrastructure/di/container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('PrismaUserRepository', () => {
  let userRepository: PrismaUserRepository;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    // テスト間でコンテナをクリア
    container.clearInstances();

    // PrismaClientは複雑な構造のため手動モックを使用
    mockPrismaClient = createMockPrismaClient();
    mockLogger = createAutoMockLogger();

    // PrismaUserRepositoryを直接インスタンス化してテストする
    userRepository = new PrismaUserRepository(mockPrismaClient, mockLogger);
  });

  describe('findById', () => {
    it('ユーザーIDでユーザーを正常に取得できる', async () => {
      // Arrange
      const userId = new UserId('test-user-id');
      const mockUserData = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-10'),
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUserData);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.getId().toString()).toBe('test-user-id');
      expect(result?.getEmail().toString()).toBe('test@example.com');
      expect(result?.getName()).toBe('Test User');
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
    });

    it('存在しないユーザーIDの場合nullを返す', async () => {
      // Arrange
      const userId = new UserId('non-existent-id');
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを正常に取得できる', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const mockUserData = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-10'),
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUserData);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.getEmail().toString()).toBe('test@example.com');
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('存在しないメールアドレスの場合nullを返す', async () => {
      // Arrange
      const email = new Email('notfound@example.com');
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('新規ユーザーを正常に保存できる', async () => {
      // Arrange
      const user = User.create(
        new Email('test@example.com'),
        'Test User',
        'hashed-password',
      );

      mockPrismaClient.user.upsert.mockResolvedValue({
        id: user.getId().toString(),
        email: user.getEmail().toString(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      });

      // Act
      await userRepository.save(user);

      // Assert
      expect(mockPrismaClient.user.upsert).toHaveBeenCalledWith({
        where: { id: user.getId().toString() },
        update: {
          name: user.getName(),
          email: user.getEmail().toString(),
          updatedAt: user.getUpdatedAt(),
        },
        create: {
          id: user.getId().toString(),
          email: user.getEmail().toString(),
          name: user.getName(),
          passwordHash: user.getPasswordHash(),
          createdAt: user.getCreatedAt(),
          updatedAt: user.getUpdatedAt(),
        },
      });
    });
  });

  describe('update', () => {
    it('既存ユーザーを正常に更新できる', async () => {
      // Arrange
      const user = User.reconstruct(
        new UserId('existing-user-id'),
        new Email('old@example.com'),
        'Old Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      // プロフィール更新
      user.updateProfile(new Email('new@example.com'), 'New Name');

      mockPrismaClient.user.update.mockResolvedValue({
        id: user.getId().toString(),
        email: user.getEmail().toString(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      });

      // Act
      await userRepository.update(user);

      // Assert
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-user-id' },
        data: {
          name: 'New Name',
          email: 'new@example.com',
          updatedAt: user.getUpdatedAt(),
        },
      });
    });

    it('存在しないユーザーの更新時にエラーが発生する', async () => {
      // Arrange
      const user = User.reconstruct(
        new UserId('non-existent-id'),
        new Email('test@example.com'),
        'Test User',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      const dbError = new Error('Record to update not found');
      mockPrismaClient.user.update.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.update(user)).rejects.toThrow(
        '更新対象のユーザーが見つかりません',
      );
    });
  });

  describe('delete', () => {
    it('ユーザーを正常に削除できる', async () => {
      // Arrange
      const userId = new UserId('test-user-id');
      mockPrismaClient.user.delete.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await userRepository.delete(userId);

      // Assert
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
    });
  });
});
