/**
 * Domain層のセッション関連型定義
 * Prisma型への依存を避けるために独自定義
 */

/**
 * ユーザーセッションのDomain型
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザーセッションのDomain型
 */
export interface UserSession {
  id: string;
  userId: string;
  accessTokenHash: string;
  accessTokenExpireAt: Date;
  resetTokenHash: string;
  resetTokenExpireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザー情報を含むセッション型
 */
export interface UserSessionWithUser extends UserSession {
  User: SessionUser;
}
