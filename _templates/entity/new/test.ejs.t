---
to: tests/unit/domain/entities/<%= h.toPascalCase(name) %>.test.ts
---
import { <%= h.toPascalCase(name) %> } from '@/layers/domain/entities/<%= h.toPascalCase(name) %>';
import {
  generate<%= h.toPascalCase(name) %>Id,
  <%= h.toPascalCase(name) %>Id,
} from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id';
import { describe, expect, it } from 'vitest';

describe('<%= h.toPascalCase(name) %>', () => {
  describe('create', () => {
    it('should create a new <%= h.toPascalCase(name) %> with generated ID', () => {
      // Arrange & Act
      const entity = <%= h.toPascalCase(name) %>.create(
        // TODO: 引数を設定
      );

      // Assert
      expect(entity.id).toBeInstanceOf(<%= h.toPascalCase(name) %>Id);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      // TODO: 追加のアサーション
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct <%= h.toPascalCase(name) %> from existing data', () => {
      // Arrange
      const id = generate<%= h.toPascalCase(name) %>Id();
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      // Act
      const entity = <%= h.toPascalCase(name) %>.reconstruct(
        id,
        // TODO: 引数を設定
        createdAt,
        updatedAt,
      );

      // Assert
      expect(entity.id).toBe(id);
      expect(entity.createdAt).toBe(createdAt);
      expect(entity.updatedAt).toBe(updatedAt);
      // TODO: 追加のアサーション
    });
  });
});
