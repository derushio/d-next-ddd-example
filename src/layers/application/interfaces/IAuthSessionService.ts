/**
 * 認証セッションサービスのインターフェース
 * Application層で定義し、Infrastructure層で実装する
 */

/**
 * 認証済みユーザー情報
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * 認証セッション情報
 */
export interface AuthSession {
  user: AuthenticatedUser;
}

/**
 * 認証セッション取得サービスのインターフェース
 */
export interface IAuthSessionService {
  /**
   * 現在の認証セッションを取得
   * @returns セッション情報またはnull
   */
  getSession(): Promise<AuthSession | null>;
}
