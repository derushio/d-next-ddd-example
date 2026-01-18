import {
  EntityId,
  generateCuid2,
} from '@/layers/domain/value-objects/EntityId';

/**
 * セッションID Value Object
 *
 * ユーザーセッションを一意に識別するためのID。
 * CUID2形式（小文字英数字、7-32文字）を使用。
 */
export class SessionId extends EntityId {
  protected getEmptyErrorCode(): string {
    return 'SESSION_ID_REQUIRED';
  }

  protected getInvalidFormatErrorCode(): string {
    return 'INVALID_SESSION_ID_FORMAT';
  }

  protected getEmptyMessage(): string {
    return 'セッションIDは必須です';
  }

  protected getInvalidFormatMessage(): string {
    return 'セッションIDの形式が正しくありません';
  }

  /**
   * 型安全なequals（UserIdとSessionIdの混同を防止）
   */
  equals(other: SessionId): boolean {
    return super.equals(other);
  }
}

export const generateSessionId = (): SessionId => {
  return new SessionId(generateCuid2());
};
