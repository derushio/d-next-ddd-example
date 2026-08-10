/**
 * ログ出力サービスのインターフェース
 * Application層で定義し、Infrastructure層で実装する
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  /**
   * バインディングを付与した子ロガーを生成
   * リクエストスコープのログにrequestId等を付与するために使用
   */
  createChild(bindings: Record<string, unknown>): ILogger;
}
