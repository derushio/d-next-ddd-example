import { container } from '@/layers/infrastructure/di/container';
import { resolve } from '@/layers/infrastructure/di/resolver';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';

import {
  createTestSession,
  createTestUser,
  setupMockReturnValues,
  setupTestEnvironment,
} from '@tests/utils/helpers/testHelpers';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { beforeEach, describe, expect, it } from 'vitest';

describe('PrismaSessionRepository', () => {
  let sessionRepository: PrismaSessionRepository;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    // テスト間でコンテナをクリア
    container.clearInstances();

    // モックの作成
    mockPrismaClient = createMockPrismaClient();

    // PrismaSessionRepositoryを直接インスタンス化してテストする
    sessionRepository = new PrismaSessionRepository(mockPrismaClient);
  });

  describe('create', () => {
    it('should create session successfully', async () => {
      // Arrange
      const sessionData = {
        userId: 'user-1',
        accessTokenHash: 'access_token_hash_123',
        accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
        resetTokenHash: 'reset_token_hash_456',
        resetTokenExpireAt: new Date('2024-01-02T00:00:00Z'),
      };
      const expectedSession = createTestSession(sessionData);

      setupMockReturnValues(mockPrismaClient.userSession, {
        create: expectedSession,
      });

      // Act
      const result = await sessionRepository.create(sessionData);

      // Assert
      expect(result).toEqual(expectedSession);
      expect(mockPrismaClient.userSession.create).toHaveBeenCalledWith({
        data: sessionData,
        include: {
          User: true,
        },
      });
    });

    it('should handle database error on create', async () => {
      // Arrange
      const sessionData = {
        userId: 'user-1',
        accessTokenHash: 'access_token_hash_123',
        accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
        resetTokenHash: 'reset_token_hash_456',
        resetTokenExpireAt: new Date('2024-01-02T00:00:00Z'),
      };
      const dbError = new Error('Database connection failed');

      setupMockReturnValues(mockPrismaClient.userSession, {
        create: dbError,
      });

      // Act & Assert
      await expect(sessionRepository.create(sessionData)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle foreign key constraint violation', async () => {
      // Arrange
      const sessionData = {
        userId: 'nonexistent-user',
        accessTokenHash: 'access_token_hash_123',
        accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
        resetTokenHash: 'reset_token_hash_456',
        resetTokenExpireAt: new Date('2024-01-02T00:00:00Z'),
      };
      const constraintError = new Error(
        'Foreign key constraint failed on the field: userId',
      );

      setupMockReturnValues(mockPrismaClient.userSession, {
        create: constraintError,
      });

      // Act & Assert
      await expect(sessionRepository.create(sessionData)).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });
  });

  describe('findFirst', () => {
    it('should find session by condition successfully', async () => {
      // Arrange
      const condition = { userId: 'user-1', id: 'session-1' };
      const expectedSession = createTestSession({
        userId: condition.userId,
        id: condition.id,
        user: createTestUser({ id: condition.userId }),
      });

      setupMockReturnValues(mockPrismaClient.userSession, {
        findFirst: expectedSession,
      });

      // Act
      const result = await sessionRepository.findFirst(condition);

      // Assert
      expect(result).toEqual(expectedSession);
      expect(mockPrismaClient.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: condition.userId,
          id: condition.id,
        },
        orderBy: {
          accessTokenExpireAt: 'desc',
        },
        include: {
          User: true,
        },
      });
    });

    it('should return null when session not found', async () => {
      // Arrange
      const condition = {
        userId: 'nonexistent-user',
        id: 'nonexistent-session',
      };

      setupMockReturnValues(mockPrismaClient.userSession, {
        findFirst: null,
      });

      // Act
      const result = await sessionRepository.findFirst(condition);

      // Assert
      expect(result).toBeNull();
      expect(mockPrismaClient.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: condition.userId,
          id: condition.id,
        },
        orderBy: {
          accessTokenExpireAt: 'desc',
        },
        include: {
          User: true,
        },
      });
    });

    it('should handle database error on findFirst', async () => {
      // Arrange
      const condition = { userId: 'user-1', id: 'session-1' };
      const dbError = new Error('Database query failed');

      setupMockReturnValues(mockPrismaClient.userSession, {
        findFirst: dbError,
      });

      // Act & Assert
      await expect(sessionRepository.findFirst(condition)).rejects.toThrow(
        'Database query failed',
      );
    });
  });
});
