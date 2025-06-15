import { genCuid2 } from '@/utils/cuid2';

export class UserId {
  private readonly value: string;

  constructor(value: string) {
    this.validateUserId(value);
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  private validateUserId(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('User IDは必須です');
    }

    // CUID2形式のチェック
    if (value.length < 7 || value.length > 32) {
      throw new Error('User IDの形式が正しくありません');
    }
  }
}

export const generateUserId = (): UserId => {
  return new UserId(genCuid2());
};
