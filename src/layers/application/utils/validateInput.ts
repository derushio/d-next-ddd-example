import type { ZodError, ZodType } from 'zod';
import { AppUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

/**
 * UseCase 入力バリデーションヘルパー
 *
 * Zod スキーマで入力を検証し、成功時はパース済みデータを返す。
 * 失敗時は最初の issue メッセージで AppUseCaseError をスローする。
 *
 * @param schema - Zod スキーマ
 * @param data - 検証対象データ
 * @param codeOrMapper - エラーコード文字列、または ZodError からコードを導出する関数
 * @returns パース済みデータ
 * @throws AppUseCaseError バリデーション失敗時
 *
 * @example
 * ```ts
 * // デフォルトコード（'VALIDATION_ERROR'）
 * const validated = validateInput(schema, request);
 *
 * // カスタム静的コード
 * validateInput(schema, request, 'INVALID_USER_ID');
 *
 * // フィールドごとのカスタムコード
 * validateInput(schema, request, (error) => {
 *   const field = error.issues[0]?.path[0];
 *   return field === 'password' ? 'EMPTY_PASSWORD' : 'EMPTY_EMAIL';
 * });
 * ```
 */
export function validateInput<T>(
  schema: ZodType<T>,
  data: unknown,
  codeOrMapper: string | ((error: ZodError) => string) = 'VALIDATION_ERROR',
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const code =
      typeof codeOrMapper === 'function'
        ? codeOrMapper(result.error)
        : codeOrMapper;
    throw new AppUseCaseError(firstIssue?.message ?? '入力が無効です', code);
  }
  return result.data;
}

/**
 * フィールド名ごとにエラーコードをマッピングするヘルパー
 *
 * validateInput の第3引数に渡すマッパー関数を生成します。
 * ZodError の最初の issue のフィールド名でコードを決定します。
 *
 * @param mapping - フィールド名 → エラーコードのマッピング
 * @param fallback - フィールド名がマッピングに存在しない場合のデフォルトコード（省略時: 'VALIDATION_ERROR'）
 * @returns ZodError からエラーコードを返す関数
 *
 * @example
 * ```ts
 * validateInput(
 *   schema,
 *   { email, password },
 *   fieldErrorCodeMap({ password: 'EMPTY_PASSWORD', email: 'EMPTY_EMAIL' }),
 * );
 * ```
 */
export function fieldErrorCodeMap(
  mapping: Record<string, string>,
  fallback = 'VALIDATION_ERROR',
): (error: ZodError) => string {
  return (error: ZodError) => {
    const field = String(error.issues[0]?.path[0] ?? '');
    return mapping[field] ?? fallback;
  };
}
