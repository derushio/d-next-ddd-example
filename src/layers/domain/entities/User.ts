import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';
import { generateUserId, UserId } from '@/layers/domain/value-objects/UserId';

export class User {
  private constructor(
    private readonly id: UserId,
    private email: Email,
    private name: string,
    private readonly passwordHash: string,
    private readonly createdAt: Date,
    private updatedAt: Date,
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

  // ビジネスロジック：ユーザー情報更新
  updateProfile(email: Email, name: string): void {
    this.email = email;
    this.name = name;
    this.updatedAt = new Date();
    this.validateInvariants();
  }

  // ゲッター（読み取り専用）
  getId(): UserId {
    return this.id;
  }
  getEmail(): Email {
    return this.email;
  }
  getName(): string {
    return this.name;
  }
  getPasswordHash(): string {
    return this.passwordHash;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
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
