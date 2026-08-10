import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { User } from '@/layers/domain/entities/User';
import { UserSession } from '@/layers/domain/entities/UserSession';
import { SessionId } from '@/layers/domain/value-objects/SessionId';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';

describe('PrismaSessionRepository', () => {
  let sessionRepository: PrismaSessionRepository;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockLogger: MockProxy<ILogger>;

  // テスト用のCUID2形式のID
  const testUserId = 'testuserid1234567890abc';
  const testSessionId = 'testsessionid12345678';

  beforeEach(() => {
    // モックの作成
    mockPrismaClient = createMockPrismaClient();
    mockLogger = createAutoMockLogger();

    // PrismaSessionRepositoryを直接インスタンス化してテストする
    sessionRepository = new PrismaSessionRepository(
      mockPrismaClient,
      mockLogger,
    );
  });

  describe('create', () => {
    it('should create session successfully', async () => {
      // Arrange
      const userId = new UserId(testUserId);
      const userSessionEntity = UserSession.create(
        userId,
        'access_token_hash_123',
        new Date('2024-12-31T23:59:59Z'),
        'reset_token_hash_456',
        new Date('2025-01-02T00:00:00Z'),
      );

      const prismaResult = {
        id: userSessionEntity.id.value,
        userId: testUserId,
        accessTokenHash: 'access_token_hash_123',
        accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
        resetTokenHash: 'reset_token_hash_456',
        resetTokenExpireAt: new Date('2025-01-02T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        User: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      };

      mockPrismaClient.userSession.create.mockResolvedValue(prismaResult);

      // Act
      const result = await sessionRepository.create(userSessionEntity);

      // Assert
      expect(result.session).toBeInstanceOf(UserSession);
      expect(result.user).toBeInstanceOf(User);
      expect(result.session.id.value).toBe(userSessionEntity.id.value);
      expect(result.session.userId.value).toBe(testUserId);
      expect(mockPrismaClient.userSession.create).toHaveBeenCalledWith({
        data: {
          id: userSessionEntity.id.value,
          userId: testUserId,
          accessTokenHash: 'access_token_hash_123',
          accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
          resetTokenHash: 'reset_token_hash_456',
          resetTokenExpireAt: new Date('2025-01-02T00:00:00Z'),
        },
        include: {
          User: true,
        },
      });
    });

    it('should handle database error on create', async () => {
      // Arrange
      const userId = new UserId(testUserId);
      const userSessionEntity = UserSession.create(
        userId,
        'access_token_hash_123',
        new Date('2024-12-31T23:59:59Z'),
        'reset_token_hash_456',
        new Date('2025-01-02T00:00:00Z'),
      );
      const dbError = new Error('Database connection failed');

      mockPrismaClient.userSession.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(sessionRepository.create(userSessionEntity)).rejects.toThrow(
        'セッションの作成に失敗しました',
      );
    });

    it('should handle foreign key constraint violation', async () => {
      // Arrange
      const userId = new UserId('nonexistentuseridabc12');
      const userSessionEntity = UserSession.create(
        userId,
        'access_token_hash_123',
        new Date('2024-12-31T23:59:59Z'),
        'reset_token_hash_456',
        new Date('2025-01-02T00:00:00Z'),
      );
      const constraintError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: userId',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'userId' },
        },
      );

      mockPrismaClient.userSession.create.mockRejectedValue(constraintError);

      // Act & Assert
      await expect(sessionRepository.create(userSessionEntity)).rejects.toThrow(
        '存在しないユーザーです',
      );
    });
  });

  describe('findById', () => {
    it('should find session by id successfully', async () => {
      // Arrange
      const condition = {
        id: new SessionId(testSessionId),
      };
      const prismaResult = {
        id: testSessionId,
        userId: testUserId,
        accessTokenHash: 'access_token_hash_123',
        accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
        resetTokenHash: 'reset_token_hash_456',
        resetTokenExpireAt: new Date('2025-01-02T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        User: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      };

      mockPrismaClient.userSession.findUnique.mockResolvedValue(prismaResult);

      // Act
      const result = await sessionRepository.findById(condition);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.session).toBeInstanceOf(UserSession);
      expect(result?.user).toBeInstanceOf(User);
      expect(result?.session.id.value).toBe(testSessionId);
      expect(result?.session.userId.value).toBe(testUserId);
      expect(mockPrismaClient.userSession.findUnique).toHaveBeenCalledWith({
        where: {
          id: testSessionId,
        },
        include: {
          User: true,
        },
      });
    });

    it('should return null when session not found', async () => {
      // Arrange
      const condition = {
        id: new SessionId('nonexistentsessionid'),
      };

      mockPrismaClient.userSession.findUnique.mockResolvedValue(null);

      // Act
      const result = await sessionRepository.findById(condition);

      // Assert
      expect(result).toBeNull();
      expect(mockPrismaClient.userSession.findUnique).toHaveBeenCalledWith({
        where: {
          id: condition.id.value,
        },
        include: {
          User: true,
        },
      });
    });

    it('should handle database error on findById', async () => {
      // Arrange
      const condition = {
        id: new SessionId(testSessionId),
      };
      const dbError = new Error('Database query failed');

      mockPrismaClient.userSession.findUnique.mockRejectedValue(dbError);

      // Act & Assert - findByIdでDB接続エラーが発生した場合はDomainErrorをthrowする
      await expect(sessionRepository.findById(condition)).rejects.toThrow(
        'セッションの検索に失敗しました',
      );
    });
  });
});
