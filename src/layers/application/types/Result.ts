/**
 * neverthrow ベースの Result 型
 *
 * neverthrow の Ok/Err を使用した型安全なエラーハンドリング。
 * ok()/err() パターンと map/andThen チェーンをサポート。
 */

export { err, ok, Result, ResultAsync } from 'neverthrow';

// ---------------------------------------------------------------------------
// AppError — 全 UseCase/Service 共通エラー型
// ---------------------------------------------------------------------------

export type AppError = {
  readonly message: string;
  readonly code: string;
  readonly details?: Record<string, unknown>;
};
