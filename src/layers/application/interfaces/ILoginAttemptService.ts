/**
 * ログイン試行サービスインターフェース
 *
 * アカウントロックアウト機能を提供し、ブルートフォース攻撃を防止します。
 * 環境変数で閾値・ロック期間を調整可能です。
 *
 * 設定項目:
 * - AUTH_LOCKOUT_ENABLED: ロックアウト機能の有効/無効
 * - AUTH_LOCKOUT_THRESHOLD: ロックアウト閾値（デフォルト: 5回）
 * - AUTH_LOCKOUT_DURATION_MS: ロック期間（デフォルト: 15分）
 */

/**
 * ロックアウト状態チェック結果
 */
export interface LockoutCheckResult {
  /** アカウントがロックされているか */
  isLocked: boolean;
  /** 直近のウィンドウ内での失敗回数 */
  failedAttempts: number;
  /** ロック解除予定時刻（ロック中の場合） */
  lockoutUntil?: Date;
  /** ロック前の残り試行回数 */
  remainingAttempts: number;
}

/**
 * ログイン試行記録のパラメータ
 */
export interface RecordAttemptParams {
  /** 対象メールアドレス */
  email: string;
  /** 成功/失敗 */
  success: boolean;
  /** 試行元IPアドレス（オプション） */
  ipAddress?: string;
  /** 失敗理由コード（失敗時） */
  failureReason?: string;
}

/**
 * ログイン試行サービスインターフェース
 */
export interface ILoginAttemptService {
  /**
   * ログイン試行を記録
   *
   * 成功時: 該当メールアドレスの失敗カウントをリセット
   * 失敗時: 失敗カウントを増加
   */
  recordAttempt(params: RecordAttemptParams): Promise<void>;

  /**
   * アカウントのロックアウト状態を確認
   *
   * 指定されたメールアドレスが現在ロックされているか、
   * また残り試行回数を返します。
   */
  checkLockout(email: string): Promise<LockoutCheckResult>;

  /**
   * ログイン試行履歴をリセット（管理者用）
   *
   * 指定されたメールアドレスの失敗履歴をクリアし、
   * ロックアウト状態を解除します。
   */
  resetAttempts(email: string): Promise<void>;

  /**
   * 古いログイン試行履歴をクリーンアップ
   *
   * 一定期間経過した履歴を削除し、DBの肥大化を防止します。
   * 定期バッチ等で呼び出すことを想定。
   *
   * @param retentionDays 保持期間（日数）
   */
  cleanup(retentionDays: number): Promise<number>;
}
