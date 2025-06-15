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
      throw new Error('メールアドレスは必須です');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
    if (!emailRegex.test(value) || value.includes('..')) {
      throw new Error('メールアドレスの形式が正しくありません');
    }

    if (value.length > 254) {
      throw new Error('メールアドレスが長すぎます');
    }

    // 禁止文字チェック
    const forbiddenChars = /[<>\"'&]/;
    if (forbiddenChars.test(value)) {
      throw new Error('メールアドレスに使用できない文字が含まれています');
    }
  }
}
