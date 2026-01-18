---
to: tests/unit/domain/value-objects/<%= h.toPascalCase(name) %>.test.ts
---
import { DomainError } from '@/layers/domain/errors/DomainError';
import { <%= h.toPascalCase(name) %> } from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>';
import { describe, expect, it } from 'vitest';

describe('<%= h.toPascalCase(name) %>', () => {
  describe('constructor', () => {
    it('should create a valid <%= h.toPascalCase(name) %>', () => {
      // Arrange
<% if (type === 'string') { -%>
      const value = 'valid-value';
<% } else if (type === 'number') { -%>
      const value = 100;
<% } else if (type === 'boolean') { -%>
      const value = true;
<% } else if (type === 'Date') { -%>
      const value = new Date();
<% } -%>

      // Act
      const vo = new <%= h.toPascalCase(name) %>(value);

      // Assert
      expect(vo.value).toBe(value);
    });

<% if (type === 'string') { -%>
    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => new <%= h.toPascalCase(name) %>('')).toThrow(DomainError);
    });

    it('should throw error for whitespace only', () => {
      // Arrange & Act & Assert
      expect(() => new <%= h.toPascalCase(name) %>('   ')).toThrow(DomainError);
    });
<% } else if (type === 'number') { -%>
    it('should throw error for NaN', () => {
      // Arrange & Act & Assert
      expect(() => new <%= h.toPascalCase(name) %>(Number.NaN)).toThrow(DomainError);
    });
<% } else if (type === 'Date') { -%>
    it('should throw error for invalid date', () => {
      // Arrange & Act & Assert
      expect(() => new <%= h.toPascalCase(name) %>(new Date('invalid'))).toThrow(DomainError);
    });
<% } -%>
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      // Arrange
<% if (type === 'string') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>('test');
      const vo2 = new <%= h.toPascalCase(name) %>('test');
<% } else if (type === 'number') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>(100);
      const vo2 = new <%= h.toPascalCase(name) %>(100);
<% } else if (type === 'boolean') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>(true);
      const vo2 = new <%= h.toPascalCase(name) %>(true);
<% } else if (type === 'Date') { -%>
      const date = new Date('2024-01-01');
      const vo1 = new <%= h.toPascalCase(name) %>(date);
      const vo2 = new <%= h.toPascalCase(name) %>(new Date('2024-01-01'));
<% } -%>

      // Act & Assert
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different values', () => {
      // Arrange
<% if (type === 'string') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>('test1');
      const vo2 = new <%= h.toPascalCase(name) %>('test2');
<% } else if (type === 'number') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>(100);
      const vo2 = new <%= h.toPascalCase(name) %>(200);
<% } else if (type === 'boolean') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>(true);
      const vo2 = new <%= h.toPascalCase(name) %>(false);
<% } else if (type === 'Date') { -%>
      const vo1 = new <%= h.toPascalCase(name) %>(new Date('2024-01-01'));
      const vo2 = new <%= h.toPascalCase(name) %>(new Date('2024-01-02'));
<% } -%>

      // Act & Assert
      expect(vo1.equals(vo2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
<% if (type === 'string') { -%>
      const vo = new <%= h.toPascalCase(name) %>('test');
<% } else if (type === 'number') { -%>
      const vo = new <%= h.toPascalCase(name) %>(100);
<% } else if (type === 'boolean') { -%>
      const vo = new <%= h.toPascalCase(name) %>(true);
<% } else if (type === 'Date') { -%>
      const vo = new <%= h.toPascalCase(name) %>(new Date('2024-01-01'));
<% } -%>

      // Act & Assert
      expect(typeof vo.toString()).toBe('string');
    });
  });
});
