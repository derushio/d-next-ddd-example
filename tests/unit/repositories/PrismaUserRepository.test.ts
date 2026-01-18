import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/di/container';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { beforeEach, describe, expect, it } from 'vitest';
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
      const userId = new UserId('testuseridcuid2abc12');
      const mockUserData = {
        id: 'testuseridcuid2abc12',
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
      expect(result?.id.value).toBe('testuseridcuid2abc12');
      expect(result?.email.value).toBe('test@example.com');
      expect(result?.name).toBe('Test User');
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'testuseridcuid2abc12' },
      });
    });

    it('存在しないユーザーIDの場合nullを返す', async () => {
      // Arrange
      const userId = new UserId('nonexistentidcuid12');
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
        id: 'testuseridcuid2abc12',
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
      expect(result?.email.value).toBe('test@example.com');
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
        id: user.id.value,
        email: user.email.value,
        name: user.name,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      // Act
      await userRepository.save(user);

      // Assert
      expect(mockPrismaClient.user.upsert).toHaveBeenCalledWith({
        where: { id: user.id.value },
        update: {
          name: user.name,
          email: user.email.value,
          updatedAt: user.updatedAt,
        },
        create: {
          id: user.id.value,
          email: user.email.value,
          name: user.name,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    });
  });

  describe('update', () => {
    it('既存ユーザーを正常に更新できる', async () => {
      // Arrange
      const user = User.reconstruct(
        new UserId('existinguseridcuid12'),
        new Email('old@example.com'),
        'Old Name',
        'hashed-password',
        new Date('2023-01-01'),
        new Date('2023-01-01'),
      );

      // プロフィール更新（immutableパターンのため新しいインスタンスを取得）
      const updatedUser = user.updateProfile(
        new Email('new@example.com'),
        'New Name',
      );

      mockPrismaClient.user.update.mockResolvedValue({
        id: updatedUser.id.value,
        email: updatedUser.email.value,
        name: updatedUser.name,
        passwordHash: updatedUser.passwordHash,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });

      // Act
      await userRepository.update(updatedUser);

      // Assert
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'existinguseridcuid12' },
        data: {
          name: 'New Name',
          email: 'new@example.com',
          updatedAt: updatedUser.updatedAt,
        },
      });
    });

    it('存在しないユーザーの更新時にエラーが発生する', async () => {
      // Arrange
      const user = User.reconstruct(
        new UserId('nonexistentidcuid12'),
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
      const userId = new UserId('testuseridcuid2abc12');
      mockPrismaClient.user.delete.mockResolvedValue({
        id: 'testuseridcuid2abc12',
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
        where: { id: 'testuseridcuid2abc12' },
      });
    });
  });
});
