import { DomainError } from '@/layers/domain/errors/DomainError';
import {
  generateSessionId,
  type SessionId,
} from '@/layers/domain/value-objects/SessionId';
import type { UserId } from '@/layers/domain/value-objects/UserId';

/**
 * ユーザーセッション Entity
 * 認証セッションを表現するドメインエンティティ
 */
export class UserSession {
  private constructor(
    public readonly id: SessionId,
    public readonly userId: UserId,
    public readonly accessTokenHash: string,
    public readonly accessTokenExpireAt: Date,
    public readonly resetTokenHash: string,
    public readonly resetTokenExpireAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  /**
   * 新規セッション作成
   */
  static create(
    userId: UserId,
    accessTokenHash: string,
    accessTokenExpireAt: Date,
    resetTokenHash: string,
    resetTokenExpireAt: Date,
  ): UserSession {
    const now = new Date();
    return new UserSession(
      generateSessionId(),
      userId,
      accessTokenHash,
      accessTokenExpireAt,
      resetTokenHash,
      resetTokenExpireAt,
      now,
      now,
    );
  }

  /**
   * 既存セッション再構築（永続化から復元）
   */
  static reconstruct(
    id: SessionId,
    userId: UserId,
    accessTokenHash: string,
    accessTokenExpireAt: Date,
    resetTokenHash: string,
    resetTokenExpireAt: Date,
    createdAt: Date,
    updatedAt: Date,
  ): UserSession {
    return new UserSession(
      id,
      userId,
      accessTokenHash,
      accessTokenExpireAt,
      resetTokenHash,
      resetTokenExpireAt,
      createdAt,
      updatedAt,
    );
  }

  /**
   * アクセストークンが有効期限内かチェック
   */
  isAccessTokenValid(): boolean {
    return this.accessTokenExpireAt > new Date();
  }

  /**
   * リセットトークンが有効期限内かチェック
   */
  isResetTokenValid(): boolean {
    return this.resetTokenExpireAt > new Date();
  }

  private validateInvariants(): void {
    if (!this.accessTokenHash || this.accessTokenHash.trim().length === 0) {
      throw new DomainError(
        'アクセストークンハッシュは必須です',
        'INVALID_ACCESS_TOKEN_HASH',
      );
    }

    if (!this.resetTokenHash || this.resetTokenHash.trim().length === 0) {
      throw new DomainError(
        'リセットトークンハッシュは必須です',
        'INVALID_RESET_TOKEN_HASH',
      );
    }
  }
}
