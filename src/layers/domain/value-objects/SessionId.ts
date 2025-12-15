import { DomainError } from '@/layers/domain/errors/DomainError';
import { genCuid2 } from '@/utils/cuid2';

/**
 * セッションID Value Object
 * ユーザーセッションを一意に識別するためのID
 */
export class SessionId {
  public readonly value: string;

  constructor(value: string) {
    this.validateSessionId(value);
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }

  private validateSessionId(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('セッションIDは必須です', 'INVALID_SESSION_ID');
    }

    // CUID2形式のチェック（7-32文字）
    if (value.length < 7 || value.length > 32) {
      throw new DomainError(
        'セッションIDの形式が正しくありません',
        'INVALID_SESSION_ID_FORMAT',
      );
    }
  }
}

export const generateSessionId = (): SessionId => {
  return new SessionId(genCuid2());
};
