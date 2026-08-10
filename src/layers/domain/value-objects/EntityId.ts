import { DomainError } from '@/layers/domain/errors/DomainError';
import { genCuid2 } from '@/utils/cuid2';

/**
 * エンティティID基底クラス
 *
 * 全てのエンティティIDはCUID2形式（小文字英数字、7-32文字）を使用。
 * 継承クラスはエラーコードをオーバーライドしてドメイン固有のメッセージを提供。
 *
 * @example
 * ```typescript
 * export class UserId extends EntityId {
 *   protected getEmptyErrorCode(): string { return 'USER_ID_REQUIRED'; }
 *   protected getInvalidFormatErrorCode(): string { return 'INVALID_USER_ID_FORMAT'; }
 * }
 * ```
 */
export abstract class EntityId {
  public readonly value: string;

  constructor(value: string) {
    this.validateCuid2(value);
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: EntityId): boolean {
    // 同じクラスのインスタンスかつ同じ値の場合のみtrue
    return this.constructor === other.constructor && this.value === other.value;
  }

  /**
   * CUID2形式のバリデーション
   * - 必須チェック
   * - 小文字英数字のみ
   * - 7-32文字
   */
  protected validateCuid2(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError(this.getEmptyMessage(), this.getEmptyErrorCode());
    }

    const cuid2Pattern = /^[a-z0-9]{7,32}$/;
    if (!cuid2Pattern.test(value)) {
      throw new DomainError(
        this.getInvalidFormatMessage(),
        this.getInvalidFormatErrorCode(),
      );
    }
  }

  /** 空の場合のエラーコード（継承クラスでオーバーライド） */
  protected abstract getEmptyErrorCode(): string;

  /** 形式不正の場合のエラーコード（継承クラスでオーバーライド） */
  protected abstract getInvalidFormatErrorCode(): string;

  /** 空の場合のエラーメッセージ（オーバーライド可能） */
  protected getEmptyMessage(): string {
    return 'IDは必須です';
  }

  /** 形式不正の場合のエラーメッセージ（オーバーライド可能） */
  protected getInvalidFormatMessage(): string {
    return 'IDの形式が正しくありません';
  }
}

/**
 * 新しいCUID2を生成
 */
export const generateCuid2 = (): string => genCuid2();

/**
 * EntityId サブクラスをファクトリ関数で生成する設定型
 */
export interface EntityIdConfig {
  emptyErrorCode: string;
  invalidFormatErrorCode: string;
  emptyMessage: string;
  invalidFormatMessage: string;
}

/**
 * EntityId サブクラスのファクトリ関数
 *
 * ボイラープレートを削減し、新しいIDタイプを簡潔に定義できます。
 * `instanceof` チェックは class extends パターンにより引き続き機能します。
 *
 * @example
 * ```typescript
 * export class UserId extends createEntityIdClass({
 *   emptyErrorCode: 'USER_ID_REQUIRED',
 *   invalidFormatErrorCode: 'INVALID_USER_ID_FORMAT',
 *   emptyMessage: 'User IDは必須です',
 *   invalidFormatMessage: 'User IDの形式が正しくありません',
 * }) {}
 * ```
 */
export function createEntityIdClass(config: EntityIdConfig) {
  class GeneratedEntityId extends EntityId {
    protected getEmptyErrorCode(): string {
      return config.emptyErrorCode;
    }

    protected getInvalidFormatErrorCode(): string {
      return config.invalidFormatErrorCode;
    }

    protected override getEmptyMessage(): string {
      return config.emptyMessage;
    }

    protected override getInvalidFormatMessage(): string {
      return config.invalidFormatMessage;
    }
  }

  return GeneratedEntityId;
}
