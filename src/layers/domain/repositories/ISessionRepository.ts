import type { UserSessionWithUser } from '@/layers/domain/types/Session';

/**
 * セッション作成用のDTO
 * NextAuth.jsのユーザセッション管理に使用
 */
export interface CreateSessionDTO {
  userId: string;
  accessTokenHash: string;
  accessTokenExpireAt: Date;
  resetTokenHash: string;
  resetTokenExpireAt: Date;
}

/**
 * セッション検索条件の型定義
 */
export interface SessionFindCondition {
  userId: string;
  id: string;
}

// Re-export for convenience
export type { UserSessionWithUser } from '@/layers/domain/types/Session';

/**
 * SessionRepositoryのインターフェース
 * userSession テーブルへの操作を抽象化
 */
export interface ISessionRepository {
  /**
   * 新しいセッションを作成する
   * @param data セッション作成データ
   * @returns 作成されたセッション（Userを含む）
   */
  create(data: CreateSessionDTO): Promise<UserSessionWithUser>;

  /**
   * 指定条件でセッションを検索する
   * @param condition 検索条件
   * @returns 見つかったセッション、またはnull
   */
  findFirst(
    condition: SessionFindCondition,
  ): Promise<UserSessionWithUser | null>;
}
