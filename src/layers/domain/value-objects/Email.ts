import { DomainError } from '@/layers/domain/errors/DomainError';

export class Email {
  private readonly value: string;

  constructor(value: string) {
    this.validateEmail(value);
    this.value = value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  isFromDomain(domain: string): boolean {
    return this.getDomain() === domain.toLowerCase();
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  isCompanyEmail(): boolean {
    const companyDomains = ['company.com', 'corp.com', 'enterprise.com'];
    return companyDomains.includes(this.getDomain());
  }

  private validateEmail(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
    if (!emailRegex.test(value) || value.includes('..')) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    if (value.length > 254) {
      throw new DomainError(
        'メールアドレスが長すぎます（254文字以内である必要があります）',
        'EMAIL_TOO_LONG',
      );
    }

    // 禁止文字チェック
    const forbiddenChars = /[<>\"'&]/;
    if (forbiddenChars.test(value)) {
      throw new DomainError(
        'メールアドレスに使用できない文字が含まれています',
        'EMAIL_INVALID_CHARACTERS',
      );
    }
  }
}
