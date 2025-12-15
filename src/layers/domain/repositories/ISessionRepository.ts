import type { User } from '@/layers/domain/entities/User';
import type { UserSession } from '@/layers/domain/entities/UserSession';
import type { SessionId } from '@/layers/domain/value-objects/SessionId';
import type { UserId } from '@/layers/domain/value-objects/UserId';

/**
 * セッションとユーザー情報を含む複合型
 * Repository から返される際に使用
 */
export interface UserSessionWithUser {
  session: UserSession;
  user: User;
}

/**
 * セッション検索条件の型定義
 */
export interface SessionFindCondition {
  userId: UserId;
  id: SessionId;
}

/**
 * SessionRepositoryのインターフェース
 * userSession テーブルへの操作を抽象化
 */
export interface ISessionRepository {
  /**
   * 新しいセッションを作成する
   * @param session 作成するセッションEntity
   * @returns 作成されたセッション（関連Userを含む）
   */
  create(session: UserSession): Promise<UserSessionWithUser>;

  /**
   * 指定条件でセッションを検索する
   * @param condition 検索条件
   * @returns 見つかったセッション（関連Userを含む）、またはnull
   */
  findFirst(
    condition: SessionFindCondition,
  ): Promise<UserSessionWithUser | null>;
}
