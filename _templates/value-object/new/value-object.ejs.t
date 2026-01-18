---
to: src/layers/domain/value-objects/<%= h.toPascalCase(name) %>.ts
---
import { DomainError } from '@/layers/domain/errors/DomainError';

export class <%= h.toPascalCase(name) %> {
  public readonly value: <%= type %>;

  constructor(value: <%= type %>) {
    this.validate(value);
    this.value = value;
  }

  toString(): string {
    return String(this.value);
  }

  equals(other: <%= h.toPascalCase(name) %>): boolean {
<% if (type === 'Date') { -%>
    return this.value.getTime() === other.value.getTime();
<% } else { -%>
    return this.value === other.value;
<% } -%>
  }

  private validate(value: <%= type %>): void {
<% if (type === 'string') { -%>
    if (!value || value.trim().length === 0) {
      throw new DomainError(
        '<%= h.toPascalCase(name) %>は必須です',
        '<%= h.toUpperSnake(name) %>_REQUIRED',
      );
    }
    // TODO: 追加のバリデーションロジックを実装
    // if (condition) {
    //   throw new DomainError('エラーメッセージ', '<%= h.toUpperSnake(name) %>_INVALID');
    // }
<% } else if (type === 'number') { -%>
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new DomainError(
        '<%= h.toPascalCase(name) %>は有効な数値である必要があります',
        '<%= h.toUpperSnake(name) %>_INVALID',
      );
    }
    // TODO: 追加のバリデーションロジックを実装
    // if (value < 0) {
    //   throw new DomainError('値は0以上である必要があります', '<%= h.toUpperSnake(name) %>_NEGATIVE');
    // }
<% } else if (type === 'boolean') { -%>
    if (typeof value !== 'boolean') {
      throw new DomainError(
        '<%= h.toPascalCase(name) %>は真偽値である必要があります',
        '<%= h.toUpperSnake(name) %>_INVALID',
      );
    }
<% } else if (type === 'Date') { -%>
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new DomainError(
        '<%= h.toPascalCase(name) %>は有効な日付である必要があります',
        '<%= h.toUpperSnake(name) %>_INVALID',
      );
    }
    // TODO: 追加のバリデーションロジックを実装
    // if (value < new Date()) {
    //   throw new DomainError('過去の日付は指定できません', '<%= h.toUpperSnake(name) %>_PAST');
    // }
<% } -%>
  }
}
