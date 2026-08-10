---
to: src/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id.ts
---
import {
  EntityId,
  generateCuid2,
} from '@/layers/domain/value-objects/EntityId';

/**
 * <%= h.toPascalCase(name) %>ID Value Object
 *
 * <%= h.toPascalCase(name) %>を一意に識別するためのID。
 * CUID2形式（小文字英数字、7-32文字）を使用。
 */
export class <%= h.toPascalCase(name) %>Id extends EntityId {
  protected getEmptyErrorCode(): string {
    return '<%= h.toUpperSnake(name) %>_ID_REQUIRED';
  }

  protected getInvalidFormatErrorCode(): string {
    return 'INVALID_<%= h.toUpperSnake(name) %>_ID_FORMAT';
  }

  protected getEmptyMessage(): string {
    return '<%= h.toPascalCase(name) %> IDは必須です';
  }

  protected getInvalidFormatMessage(): string {
    return '<%= h.toPascalCase(name) %> IDの形式が正しくありません';
  }

  /**
   * 型安全なequals
   */
  equals(other: <%= h.toPascalCase(name) %>Id): boolean {
    return super.equals(other);
  }
}

export const generate<%= h.toPascalCase(name) %>Id = (): <%= h.toPascalCase(name) %>Id => {
  return new <%= h.toPascalCase(name) %>Id(generateCuid2());
};
