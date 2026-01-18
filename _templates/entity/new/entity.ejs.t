---
to: src/layers/domain/entities/<%= h.toPascalCase(name) %>.ts
---
import { DomainError } from '@/layers/domain/errors/DomainError';
import {
  generate<%= h.toPascalCase(name) %>Id,
  type <%= h.toPascalCase(name) %>Id,
} from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id';

export class <%= h.toPascalCase(name) %> {
  private constructor(
    public readonly id: <%= h.toPascalCase(name) %>Id,
    // TODO: プロパティを追加
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  /** ファクトリーメソッド：新規作成 */
  static create(
    // TODO: 引数を定義
  ): <%= h.toPascalCase(name) %> {
    const now = new Date();
    return new <%= h.toPascalCase(name) %>(
      generate<%= h.toPascalCase(name) %>Id(),
      // TODO: プロパティを設定
      now,
      now,
    );
  }

  /** ファクトリーメソッド：再構築（永続化から復元） */
  static reconstruct(
    id: <%= h.toPascalCase(name) %>Id,
    // TODO: 引数を定義
    createdAt: Date,
    updatedAt: Date,
  ): <%= h.toPascalCase(name) %> {
    return new <%= h.toPascalCase(name) %>(
      id,
      // TODO: プロパティを設定
      createdAt,
      updatedAt,
    );
  }

  /** ビジネスロジック（immutableパターン） */
  // update(newValue: Type): <%= h.toPascalCase(name) %> {
  //   return new <%= h.toPascalCase(name) %>(
  //     this.id,
  //     newValue,
  //     this.createdAt,
  //     new Date(),
  //   );
  // }

  private validateInvariants(): void {
    // TODO: 不変条件を検証
    // if (condition) {
    //   throw new DomainError('エラーメッセージ', 'ERROR_CODE');
    // }
  }
}
