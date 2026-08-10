import type { Err } from 'neverthrow';
import { err } from 'neverthrow';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { AppError } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { toErrorMeta } from '@/utils/toErrorMeta';

/**
 * AppError プレーンオブジェクトかどうかを判定する型ガード
 *
 * `authResult.error` を直接 throw する際に mapToAppError でそのまま返せるようにする。
 */
function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'code' in value &&
    typeof (value as Record<string, unknown>).message === 'string' &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    !(value instanceof Error)
  );
}

/**
 * UseCase のビジネスロジックエラーを throw で表現するためのクラス
 *
 * ResultAsync.fromPromise パターンで `_execute` メソッドからエラーをスローする際に使用。
 * `mapToAppError` がこのエラーを検出して AppError に変換する。
 *
 * 使用例:
 * ```ts
 * private async _execute(...): Promise<...> {
 *   if (!valid) {
 *     throw new AppUseCaseError('バリデーションエラー', 'VALIDATION_ERROR');
 *   }
 *   return result;
 * }
 * ```
 */
export class AppUseCaseError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppUseCaseError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * UseCase の catch ブロックで共通的に使用するエラーハンドラー
 *
 * DRY原則:
 * - 全 UseCase の catch ブロックで同一のパターンを共有
 * - DomainError のコード保持、未知エラーのフォールバック処理を一元管理
 *
 * 使用例:
 * ```ts
 * } catch (error) {
 *   return handleUseCaseError(error, this.logger, 'ユーザー作成失敗', 'USER_CREATION_FAILED');
 * }
 * ```
 */
export function handleUseCaseError(
  error: unknown,
  logger: ILogger,
  context: string,
  fallbackCode: string,
): Err<never, AppError> {
  const meta = toErrorMeta(error);
  logger.error(context, meta);
  if (error instanceof DomainError) {
    return err({ message: error.message, code: error.code });
  }
  return err({ message: meta.error, code: fallbackCode });
}

/**
 * ResultAsync.fromPromise の第2引数で使用するエラーマッパー
 *
 * `handleUseCaseError` の AppError 版。
 * `ResultAsync.fromPromise(this._execute(...), mapToAppError(this.logger, '...', '...'))`
 * のように使用する。
 *
 * 使用例:
 * ```ts
 * execute(...): ResultAsync<..., AppError> {
 *   return ResultAsync.fromPromise(
 *     this._execute(...),
 *     mapToAppError(this.logger, 'コンテキスト', 'FALLBACK_CODE'),
 *   );
 * }
 * ```
 */
export function mapToAppError(
  logger: ILogger,
  context: string,
  fallbackCode: string,
): (error: unknown) => AppError {
  return (error: unknown): AppError => {
    // AppUseCaseError: ビジネスロジックエラー（予期済みのため error ログは出力しない）
    if (error instanceof AppUseCaseError) {
      return {
        message: error.message,
        code: error.code,
        ...(error.details !== undefined ? { details: error.details } : {}),
      };
    }
    // AppError プレーンオブジェクト: authResult.error 等を直接 throw した場合（予期済み）
    if (isAppError(error)) {
      return error;
    }
    const meta = toErrorMeta(error);
    logger.error(context, meta);
    if (error instanceof DomainError) {
      return { message: error.message, code: error.code };
    }
    return { message: meta.error, code: fallbackCode };
  };
}
