import { userFactory } from '@tests/utils/factories';
import {
  createDefaultMocks,
  registerMockServices,
} from '@tests/utils/setup/diSetup';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { GetUsersUseCase } from '@/layers/application/usecases/user/GetUsersUseCase';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';

describe('GetUsersUseCase', () => {
  let getUsersUseCase: GetUsersUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    const mocks = createDefaultMocks({ userRepository: true, logger: true });
    mockUserRepository = mocks.mockUserRepository;
    mockLogger = mocks.mockLogger;

    registerMockServices({
      userRepository: mockUserRepository,
      logger: mockLogger,
    });

    // UseCaseインスタンスをDIコンテナから取得（型安全）
    getUsersUseCase = resolve('GetUsersUseCase');
  });

  describe('execute', () => {
    const testUsers = [
      userFactory.build({}, { transient: { emailValue: 'john@example.com' } }),
      userFactory.build({}, { transient: { emailValue: 'jane@example.com' } }),
      userFactory.build({}, { transient: { emailValue: 'bob@example.com' } }),
    ];

    it('should successfully get users with default parameters', async () => {
      // Arrange
      const totalCount = 3;
      mockUserRepository.findByCriteria.mockResolvedValue(testUsers);
      mockUserRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.users).toHaveLength(3);
        expect(result.value.totalCount).toBe(totalCount);
        expect(result.value.currentPage).toBe(1);
        expect(result.value.totalPages).toBe(1);
        expect(result.value.hasNextPage).toBe(false);
        expect(result.value.hasPreviousPage).toBe(false);

        // ユーザーデータの変換確認（nameはfakerで生成されるためanyStringで検証）
        expect(result.value.users[0]).toEqual({
          id: expect.any(String),
          name: expect.any(String),
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
      const filteredUsers = testUsers.slice(0, 1); // John Doe のみ
      const searchQuery = 'John';
      const totalCount = 1;

      mockUserRepository.findByCriteria.mockResolvedValue(filteredUsers);
      mockUserRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await getUsersUseCase.execute({ searchQuery });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.users).toHaveLength(1);
        expect(result.value.users[0]?.email).toBe('john@example.com');
        expect(result.value.totalCount).toBe(totalCount);
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
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.currentPage).toBe(2);
        expect(result.value.totalPages).toBe(5); // Math.ceil(10/2) = 5
        expect(result.value.hasNextPage).toBe(true);
        expect(result.value.hasPreviousPage).toBe(true);
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'ページ番号は1以上である必要があります',
        );
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }

      expect(mockUserRepository.findByCriteria).not.toHaveBeenCalled();
      expect(mockUserRepository.count).not.toHaveBeenCalled();
    });

    it('should return failure for invalid limit', async () => {
      // Act - limit が101の場合
      const result1 = await getUsersUseCase.execute({ limit: 101 });

      // Assert
      expect(result1.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.error.message).toBe('取得件数は100以下にしてください');
        expect(result1.error.code).toBe('VALIDATION_ERROR');
      }

      // Act - limit が0の場合
      const result2 = await getUsersUseCase.execute({ limit: 0 });

      // Assert
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.message).toBe(
          '取得件数は1以上である必要があります',
        );
        expect(result2.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return failure when repository findByCriteria fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByCriteria.mockRejectedValue(repositoryError);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database connection failed');
        expect(result.error.code).toBe('USERS_FETCH_FAILED');
      }

      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー一覧取得失敗', {
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Count query failed');
        expect(result.error.code).toBe('USERS_FETCH_FAILED');
      }
    });

    it('should handle domain error correctly', async () => {
      // Arrange
      const domainError = new DomainError('権限がありません', 'ACCESS_DENIED');
      mockUserRepository.findByCriteria.mockRejectedValue(domainError);

      // Act
      const result = await getUsersUseCase.execute();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('権限がありません');
        expect(result.error.code).toBe('ACCESS_DENIED');
      }

      expect(mockLogger.error).toHaveBeenCalledWith('ユーザー一覧取得失敗', {
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
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.users).toHaveLength(0);
        expect(result.value.totalCount).toBe(0);
        expect(result.value.totalPages).toBe(0);
        expect(result.value.hasNextPage).toBe(false);
        expect(result.value.hasPreviousPage).toBe(false);
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
      expect(result.isOk()).toBe(true);
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
