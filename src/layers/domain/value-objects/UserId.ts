import {
  EntityId,
  generateCuid2,
} from '@/layers/domain/value-objects/EntityId';

/**
 * ユーザーID Value Object
 *
 * ユーザーを一意に識別するためのID。
 * CUID2形式（小文字英数字、7-32文字）を使用。
 */
export class UserId extends EntityId {
  protected getEmptyErrorCode(): string {
    return 'USER_ID_REQUIRED';
  }

  protected getInvalidFormatErrorCode(): string {
    return 'INVALID_USER_ID_FORMAT';
  }

  protected getEmptyMessage(): string {
    return 'User IDは必須です';
  }

  protected getInvalidFormatMessage(): string {
    return 'User IDの形式が正しくありません';
  }

  /**
   * 型安全なequals（UserIdとSessionIdの混同を防止）
   */
  equals(other: UserId): boolean {
    return super.equals(other);
  }
}

export const generateUserId = (): UserId => {
  return new UserId(generateCuid2());
};
