import { userPrismaDataFactory } from '@tests/utils/factories';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';

describe('PrismaUserRepository', () => {
  let userRepository: PrismaUserRepository;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    // PrismaClientは複雑な構造のため手動モックを使用
    mockPrismaClient = createMockPrismaClient();
    mockLogger = createAutoMockLogger();

    // PrismaUserRepositoryを直接インスタンス化してテストする
    userRepository = new PrismaUserRepository(mockPrismaClient, mockLogger);
  });

  describe('findById', () => {
    it('ユーザーIDでユーザーを正常に取得できる', async () => {
      // Arrange
      const mockUserData = userPrismaDataFactory.build();
      const userId = new UserId(mockUserData.id);

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUserData);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.id.value).toBe(mockUserData.id);
      expect(result?.email.value).toBe(mockUserData.email);
      expect(result?.name).toBe(mockUserData.name);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserData.id },
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

    it('DB接続エラー時はDomainErrorをthrowする', async () => {
      // Arrange
      const userId = new UserId('testuserid12345678901');
      const dbError = new Error('Database connection failed');
      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findById(userId)).rejects.toThrow(
        'ユーザーの検索に失敗しました',
      );
    });

    it('DB接続エラー時はDomainError型がthrowされる', async () => {
      // Arrange
      const userId = new UserId('testuserid12345678901');
      const dbError = new Error('Network timeout');
      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findById(userId)).rejects.toBeInstanceOf(
        DomainError,
      );
    });
  });

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを正常に取得できる', async () => {
      // Arrange
      const mockUserData = userPrismaDataFactory.build({
        email: 'test@example.com',
      });
      const email = new Email(mockUserData.email);

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

    it('DB接続エラー時はDomainErrorをthrowする', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const dbError = new Error('Database connection failed');
      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findByEmail(email)).rejects.toThrow(
        'ユーザーの検索に失敗しました',
      );
    });

    it('DB接続エラー時はDomainError型がthrowされる', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const dbError = new Error('Query timeout');
      mockPrismaClient.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findByEmail(email)).rejects.toBeInstanceOf(
        DomainError,
      );
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

      const dbError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '5.0.0', meta: {} },
      );
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
      const mockUserData = userPrismaDataFactory.build();
      const userId = new UserId(mockUserData.id);
      mockPrismaClient.user.delete.mockResolvedValue(mockUserData);

      // Act
      await userRepository.delete(userId);

      // Assert
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserData.id },
      });
    });
  });
});
