import { INPUT_VALIDATION_RULES } from '@/layers/domain/constants/inputValidationRules';
import { DomainError } from '@/layers/domain/errors/DomainError';

/**
 * メールアドレスバリデーションルール定数
 *
 * authSchema.ts (Infrastructure層) からこれらの定数を参照することで、
 * Email VO が Single Source of Truth となる。
 * Infrastructure → Domain の依存方向は Clean Architecture 上許可されている。
 */
export const EMAIL_VALIDATION_RULES = {
  /** RFC 5321 に基づくメールアドレス最大長 */
  MAX_LENGTH: 254,
  /** メールアドレス形式チェック用正規表現 */
  FORMAT_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@.]+$/,
  /** メールアドレスに使用できない禁止文字（INPUT_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX と共通） */
  FORBIDDEN_CHARS_REGEX: INPUT_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX,
} as const;

export class Email {
  public readonly value: string;

  constructor(value: string) {
    this.validateEmail(value);
    this.value = value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }

  getLocalPart(): string {
    return this.value.split('@')[0] ?? '';
  }

  isFromDomain(domain: string): boolean {
    return (this.value.split('@')[1] ?? '') === domain.toLowerCase();
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  private validateEmail(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    if (
      !EMAIL_VALIDATION_RULES.FORMAT_REGEX.test(value) ||
      value.includes('..')
    ) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    if (value.length > EMAIL_VALIDATION_RULES.MAX_LENGTH) {
      throw new DomainError(
        `メールアドレスが長すぎます（${EMAIL_VALIDATION_RULES.MAX_LENGTH}文字以内である必要があります）`,
        'EMAIL_TOO_LONG',
      );
    }

    // 禁止文字チェック
    if (EMAIL_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX.test(value)) {
      throw new DomainError(
        'メールアドレスに使用できない文字が含まれています',
        'EMAIL_INVALID_CHARACTERS',
      );
    }
  }
}
