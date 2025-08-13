import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { GetUsersUseCase } from '@/layers/application/usecases/user/GetUsersUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { generateUserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/layers/infrastructure/di/container';
import { resolve } from '@/layers/infrastructure/di/resolver';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '../../../utils/helpers/testHelpers';
import {
  createAutoMockLogger,
  createAutoMockUserRepository,
} from '../../../utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('GetUsersUseCase', () => {
  let getUsersUseCase: GetUsersUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  // テスト用のユーザーデータ
  const createTestUser = (id: string, name: string, email: string) => {
    const now = new Date();
    return User.reconstruct(
      generateUserId(),
      new Email(email),
      name,
      'hashed_password',
      new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1日前
      now,
    );
  };

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(
      INJECTION_TOKENS.UserRepository,
      mockUserRepository,
    );
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    getUsersUseCase = resolve('GetUsersUseCase');
  });

  describe('execute', () => {
    const testUsers = [
      createTestUser('1', 'John Doe', 'john@example.com'),
      createTestUser('2', 'Jane Smith', 'jane@example.com'),
      createTestUser('3', 'Bob Johnson', 'bob@example.com'),
    ];

    it('should successfully get users with default parameters', async () => {
      // Arrange
      const totalCount = 3;
      mockUserRepository.findByCriteria.mockResolvedValue(testUsers);
      mockUserRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.users).toHaveLength(3);
        expect(result.data.totalCount).toBe(totalCount);
        expect(result.data.currentPage).toBe(1);
        expect(result.data.totalPages).toBe(1);
        expect(result.data.hasNextPage).toBe(false);
        expect(result.data.hasPreviousPage).toBe(false);
        
        // ユーザーデータの変換確認
        expect(result.data.users[0]).toEqual({
          id: expect.any(String),
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findByCriteria).toHaveBeenCalledWith({
        searchQuery: undefined,
        minLevel: undefined,
        isActive: undefined,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(mockUserRepository.count).toHaveBeenCalledWith(undefined);
      expect(mockLogger.info).toHaveBeenCalledWith('ユーザー一覧取得開始', {
        request: {},
      });
    });

    it('should successfully get users with search query', async () => {
      // Arrange
      const filteredUsers = [testUsers[0]]; // John Doe のみ
      const searchQuery = 'John';
      const totalCount = 1;

      mockUserRepository.findByCriteria.mockResolvedValue(filteredUsers);
      mockUserRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await getUsersUseCase.execute({ searchQuery });

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.users).toHaveLength(1);
        expect(result.data.users[0].name).toBe('John Doe');
        expect(result.data.totalCount).toBe(totalCount);
      }

      expect(mockUserRepository.findByCriteria).toHaveBeenCalledWith({
        searchQuery,
        minLevel: undefined,
        isActive: undefined,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(mockUserRepository.count).toHaveBeenCalledWith(searchQuery);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const page = 2;
      const limit = 2;
      const totalCount = 10;
      const pageUsers = testUsers.slice(0, 2);

      mockUserRepository.findByCriteria.mockResolvedValue(pageUsers);
      mockUserRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await getUsersUseCase.execute({ page, limit });

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.currentPage).toBe(2);
        expect(result.data.totalPages).toBe(5); // Math.ceil(10/2) = 5
        expect(result.data.hasNextPage).toBe(true);
        expect(result.data.hasPreviousPage).toBe(true);
      }

      expect(mockUserRepository.findByCriteria).toHaveBeenCalledWith({
        searchQuery: undefined,
        minLevel: undefined,
        isActive: undefined,
        page: 2,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should return failure for invalid page number', async () => {
      // Act
      const result = await getUsersUseCase.execute({ page: 0 });

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ページ番号は1以上である必要があります');
        expect(result.error.code).toBe('INVALID_PAGE');
      }

      expect(mockUserRepository.findByCriteria).not.toHaveBeenCalled();
      expect(mockUserRepository.count).not.toHaveBeenCalled();
    });

    it('should return failure for invalid limit', async () => {
      // Act - limit が101の場合
      const result1 = await getUsersUseCase.execute({ limit: 101 });

      // Assert
      expect(isFailure(result1)).toBe(true);
      if (isFailure(result1)) {
        expect(result1.error.message).toBe('取得件数は1から100の間で指定してください');
        expect(result1.error.code).toBe('INVALID_LIMIT');
      }

      // Act - limit が0の場合
      const result2 = await getUsersUseCase.execute({ limit: 0 });

      // Assert
      expect(isFailure(result2)).toBe(true);
      if (isFailure(result2)) {
        expect(result2.error.message).toBe('取得件数は1から100の間で指定してください');
        expect(result2.error.code).toBe('INVALID_LIMIT');
      }
    });

    it('should return failure when repository findByCriteria fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByCriteria.mockRejectedValue(repositoryError);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Database connection failed');
        expect(result.error.code).toBe('USERS_FETCH_FAILED');
      }

      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー一覧取得失敗', {
        request: {},
        error: 'Database connection failed',
        stack: expect.any(String),
      });
    });

    it('should return failure when repository count fails', async () => {
      // Arrange
      const countError = new Error('Count query failed');
      mockUserRepository.findByCriteria.mockResolvedValue(testUsers);
      mockUserRepository.count.mockRejectedValue(countError);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Count query failed');
        expect(result.error.code).toBe('USERS_FETCH_FAILED');
      }
    });

    it('should handle domain error correctly', async () => {
      // Arrange
      const domainError = new DomainError(
        '権限がありません',
        'ACCESS_DENIED'
      );
      mockUserRepository.findByCriteria.mockRejectedValue(domainError);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('権限がありません');
        expect(result.error.code).toBe('ACCESS_DENIED');
      }

      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー一覧取得失敗', {
        request: {},
        error: '権限がありません',
        stack: expect.any(String),
      });
    });

    it('should handle empty user list correctly', async () => {
      // Arrange
      mockUserRepository.findByCriteria.mockResolvedValue([]);
      mockUserRepository.count.mockResolvedValue(0);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.users).toHaveLength(0);
        expect(result.data.totalCount).toBe(0);
        expect(result.data.totalPages).toBe(0);
        expect(result.data.hasNextPage).toBe(false);
        expect(result.data.hasPreviousPage).toBe(false);
      }
    });

    it('should use correct sort parameters', async () => {
      // Arrange
      mockUserRepository.findByCriteria.mockResolvedValue(testUsers);
      mockUserRepository.count.mockResolvedValue(testUsers.length);

      // Act
      const result = await getUsersUseCase.execute({
        sortBy: 'name',
        sortOrder: 'asc',
      });

      // Assert
      expect(isSuccess(result)).toBe(true);
      expect(mockUserRepository.findByCriteria).toHaveBeenCalledWith({
        searchQuery: undefined,
        minLevel: undefined,
        isActive: undefined,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });
  });
});