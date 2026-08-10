import { headers } from 'next/headers';
import type { ZodSchema } from 'zod';
import { resolve } from '@/di/resolver';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';
import { HEADER_REQUEST_ID } from '@/proxy';
import { toErrorMeta } from '@/utils/toErrorMeta';

/**
 * Server Action 用の認証・バリデーション HOF（Higher-Order Function）
 *
 * 全 Server Action に共通する以下の処理を一元化します:
 * - Logger の取得
 * - 認証チェック（GetCurrentUserUseCase.requireAuthentication()）
 * - Zod バリデーション（schema が null の場合はスキップ）
 * - 予期しない例外の catch と統一エラーレスポンス
 *
 * @example
 * export const createUser = withAuth('createUser', createUserSchema, async (input, userId) => {
 *   const useCase = resolve('CreateUserUseCase');
 *   const result = await useCase.execute(input);
 *   if (result.isOk()) return { success: true, data: result.value };
 *   return { success: false, error: result.error.message, code: result.error.code };
 * });
 *
 * @param actionName - ログ出力に使用するアクション名
 * @param schema - バリデーションスキーマ（null の場合はバリデーションをスキップし、input をそのまま渡す）
 * @param fn - 実際のアクション処理（validatedInput と認証済みユーザーID を受け取る）
 */
export function withAuth<TInput, TOutput>(
  actionName: string,
  schema: ZodSchema<TInput> | null,
  fn: (
    validatedInput: TInput,
    userId: string,
  ) => Promise<ActionResult<TOutput>>,
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    // requestId の取得（テスト環境やリクエストスコープ外では headers() が失敗するためスキップ）
    let requestId: string | null = null;
    try {
      const headersList = await headers();
      requestId = headersList.get(HEADER_REQUEST_ID);
    } catch {
      // テスト環境やリクエストスコープ外では無視
    }
    const baseLogger = resolve('Logger');
    const logger = requestId
      ? baseLogger.createChild({ requestId })
      : baseLogger;
    try {
      logger.info(`${actionName} started`);

      // 認証チェック
      const authUseCase = resolve('GetCurrentUserUseCase');
      const authResult = await authUseCase.requireAuthentication();
      if (authResult.isErr()) {
        logger.warn(`${actionName}: 認証失敗`, {
          error: authResult.error.message,
          code: authResult.error.code,
        });
        return {
          success: false,
          error: authResult.error.message,
          code: authResult.error.code,
        };
      }

      // バリデーション
      if (schema) {
        const validated = schema.safeParse(input);
        if (!validated.success) {
          const rawFieldErrors = validated.error.flatten().fieldErrors;
          const fieldErrors: Record<string, string[]> = {};
          for (const [key, value] of Object.entries(rawFieldErrors)) {
            if (Array.isArray(value)) {
              fieldErrors[key] = value;
            }
          }
          logger.warn(`${actionName}: バリデーションエラー`, { fieldErrors });
          return {
            success: false,
            error: 'バリデーションエラー',
            code: 'VALIDATION_ERROR',
            fieldErrors,
          };
        }
        return await fn(validated.data, authResult.value.id);
      }

      return await fn(input, authResult.value.id);
    } catch (error) {
      const meta = toErrorMeta(error);
      logger.error(`${actionName} failed`, meta);
      return { success: false, error: meta.error, code: 'SYSTEM_ERROR' };
    }
  };
}
