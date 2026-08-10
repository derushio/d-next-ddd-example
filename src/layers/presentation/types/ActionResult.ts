/**
 * Server Action の統一レスポンス型
 *
 * 全 Server Action はこの discriminated union 型を返すこと。
 * SAごとに異なるレスポンス構造を定義することは禁止。
 *
 * @example
 * // 成功時
 * return { success: true, data: user };
 *
 * // 失敗時
 * return { success: false, error: 'メッセージ', code: 'ERROR_CODE' };
 *
 * // バリデーションエラー時
 * return { success: false, error: 'バリデーションエラー', code: 'VALIDATION_ERROR', fieldErrors: { email: ['無効なメールアドレスです'] } };
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
      details?: Record<string, unknown>;
    };
