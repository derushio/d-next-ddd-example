---
to: tests/unit/repositories/<%= h.toPascalCase(name) %>Repository.test.ts
---
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { <%= h.toPascalCase(name) %> } from '@/layers/domain/entities/<%= h.toPascalCase(name) %>';
import { generate<%= h.toPascalCase(name) %>Id } from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { Prisma<%= h.toPascalCase(name) %>Repository } from '@/layers/infrastructure/repositories/implementations/Prisma<%= h.toPascalCase(name) %>Repository';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

describe('Prisma<%= h.toPascalCase(name) %>Repository', () => {
  let repository: Prisma<%= h.toPascalCase(name) %>Repository;
  let mockPrisma: MockProxy<PrismaClient>;
  let mockLogger: MockProxy<ILogger>;

  setupTestEnvironment();

  beforeEach(() => {
    mockPrisma = mock<PrismaClient>();
    mockPrisma.<%= h.toCamelCase(name) %> = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as typeof mockPrisma.<%= h.toCamelCase(name) %>;

    mockLogger = createAutoMockLogger();

    container.registerInstance(INJECTION_TOKENS.PrismaClient, mockPrisma);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    repository = container.resolve(Prisma<%= h.toPascalCase(name) %>Repository);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      // Arrange
      const id = generate<%= h.toPascalCase(name) %>Id();
      const now = new Date();
      const mockData = {
        id: id.value,
        // TODO: 必要なフィールドを追加
        createdAt: now,
        updatedAt: now,
      };

      vi.mocked(mockPrisma.<%= h.toCamelCase(name) %>.findUnique).mockResolvedValue(
        mockData as never,
      );

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toBeInstanceOf(<%= h.toPascalCase(name) %>);
      expect(result?.id.value).toBe(id.value);
    });

    it('should return null when not found', async () => {
      // Arrange
      const id = generate<%= h.toPascalCase(name) %>Id();
      vi.mocked(mockPrisma.<%= h.toCamelCase(name) %>.findUnique).mockResolvedValue(null);

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save entity successfully', async () => {
      // Arrange
      const entity = <%= h.toPascalCase(name) %>.create(
        // TODO: 引数を設定
      );
      vi.mocked(mockPrisma.<%= h.toCamelCase(name) %>.create).mockResolvedValue({} as never);

      // Act & Assert
      await expect(repository.save(entity)).resolves.not.toThrow();
      expect(mockPrisma.<%= h.toCamelCase(name) %>.create).toHaveBeenCalled();
    });
  });
});
