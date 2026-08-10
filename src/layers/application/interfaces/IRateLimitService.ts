/**
 * Rate Limitサービスインターフェース
 *
 * ブルートフォース攻撃やDoS攻撃を防止するため、
 * 認証エンドポイントへのリクエスト数を制限します。
 *
 * 実装パターン:
 * - テンプレート: インメモリSliding Window（サーバー再起動でリセット）
 * - 本番推奨: Redis等の外部ストアを使用した分散対応実装
 *
 * 設定項目:
 * - AUTH_RATE_LIMIT_ENABLED: Rate Limit機能の有効/無効
 * - AUTH_RATE_LIMIT_MAX: ウィンドウ内の最大リクエスト数（デフォルト: 5）
 * - AUTH_RATE_LIMIT_WINDOW_MS: ウィンドウ期間（デフォルト: 60秒）
 */

/**
 * Rate Limit状態チェック結果
 */
export interface RateLimitCheckResult {
  /** リクエストが許可されるか */
  allowed: boolean;
  /** 現在のウィンドウ内のリクエスト数 */
  current: number;
  /** 最大許可リクエスト数 */
  limit: number;
  /** 次のリクエストが許可されるまでの待機時間（ミリ秒） */
  retryAfterMs?: number;
  /** 残りリクエスト数 */
  remaining: number;
}

/**
 * Rate Limitサービスインターフェース
 */
export interface IRateLimitService {
  /**
   * Rate Limitをチェックし、リクエストを記録
   *
   * @param key 識別キー（IPアドレス、メールアドレス等）
   * @returns Rate Limit状態
   */
  checkLimit(key: string): Promise<RateLimitCheckResult>;

  /**
   * 指定キーのRate Limit記録をリセット
   *
   * 成功したログイン後やCAPTCHA検証後等に使用
   *
   * @param key 識別キー
   */
  resetLimit(key: string): Promise<void>;

  /**
   * 古いエントリをクリーンアップ
   *
   * メモリリーク防止のため、定期的に呼び出すことを推奨
   */
  cleanup(): Promise<void>;
}
