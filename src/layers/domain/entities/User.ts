import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';
import { generateUserId, UserId } from '@/layers/domain/value-objects/UserId';

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly name: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  // ファクトリーメソッド：新規ユーザー作成
  static create(email: Email, name: string, passwordHash: string): User {
    const now = new Date();
    return new User(generateUserId(), email, name, passwordHash, now, now);
  }

  // ファクトリーメソッド：既存ユーザー再構築（永続化から復元）
  static reconstruct(
    id: UserId,
    email: Email,
    name: string,
    passwordHash: string,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, email, name, passwordHash, createdAt, updatedAt);
  }

  // ビジネスロジック：ユーザー情報更新（新しいインスタンスを返すimmutableパターン）
  updateProfile(email: Email, name: string): User {
    return new User(
      this.id,
      email,
      name,
      this.passwordHash,
      this.createdAt,
      new Date(),
    );
  }

  // プライベートメソッド：不変条件検証
  private validateInvariants(): void {
    if (this.name.trim().length === 0) {
      throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
    }

    if (this.name.length > 100) {
      throw new DomainError(
        '名前は100文字以内である必要があります',
        'NAME_TOO_LONG',
      );
    }
  }
}
