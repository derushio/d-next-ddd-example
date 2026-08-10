import type { Result } from 'neverthrow';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { AppError } from '@/layers/application/types/Result';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

/**
 * UseCase エラーコードを ActionResult の標準コードにマッピング
 */
function mapActionErrorCode(useCaseCode: string): string {
  // Rate limiting
  if (useCaseCode === 'RATE_LIMIT_EXCEEDED') return 'RATE_LIMITED';
  // Conflicts
  if (
    ['EMAIL_DUPLICATE', 'EMAIL_ALREADY_EXISTS', 'DUPLICATE_ENTRY'].includes(
      useCaseCode,
    )
  )
    return 'CONFLICT';
  // Not found
  if (['USER_NOT_FOUND', 'RECORD_NOT_FOUND'].includes(useCaseCode))
    return 'NOT_FOUND';
  // Authentication
  if (['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(useCaseCode))
    return 'UNAUTHORIZED';
  // Authorization
  if (['FORBIDDEN', 'ACCOUNT_LOCKED'].includes(useCaseCode)) return 'FORBIDDEN';
  // Validation (keep granular codes for field-level handling)
  if (
    useCaseCode === 'VALIDATION_ERROR' ||
    useCaseCode.startsWith('EMPTY_') ||
    useCaseCode.startsWith('INVALID_')
  )
    return 'VALIDATION_ERROR';
  // Default: pass through as-is
  return useCaseCode;
}

/**
 * neverthrow Result → ActionResult 変換ユーティリティ
 *
 * Server Action 内で Result を ActionResult に変換する際の定型処理を一元化します。
 * - 成功時: logger.info + ActionResult<TData> を返却
 * - 失敗時: logger.warn + ActionResult（success: false）を返却
 *
 * @param result - UseCase から返された neverthrow Result
 * @param logger - ロガー
 * @param actionName - ログに出力するアクション名
 * @param options.mapData - result.value から ActionResult.data に変換する関数（省略時は result.value をそのまま使用）
 * @param options.successMeta - 成功ログに追加する meta（省略可）
 * @param options.failureMeta - 失敗ログに追加する meta（省略可）
 */
// mapData あり: TValue → TData の変換が保証される（型安全）
export function resultToActionResult<TValue, TData>(
  result: Result<TValue, AppError>,
  logger: ILogger,
  actionName: string,
  options: {
    mapData: (value: TValue) => TData;
    successMeta?: (value: TValue) => Record<string, unknown>;
    failureMeta?: Record<string, unknown>;
  },
): ActionResult<TData>;
// mapData 省略時: TValue がそのまま TData として使用される（型安全）
export function resultToActionResult<TValue>(
  result: Result<TValue, AppError>,
  logger: ILogger,
  actionName: string,
  options?: {
    mapData?: never;
    successMeta?: (value: TValue) => Record<string, unknown>;
    failureMeta?: Record<string, unknown>;
  },
): ActionResult<TValue>;
// 実装シグネチャ（オーバーロードを網羅するため unknown 型で統合。呼び出し元はオーバーロードで型推論）
export function resultToActionResult<TValue, TData = TValue>(
  result: Result<TValue, AppError>,
  logger: ILogger,
  actionName: string,
  options?: {
    mapData?: (value: TValue) => TData;
    successMeta?: (value: TValue) => Record<string, unknown>;
    failureMeta?: Record<string, unknown>;
  },
): ActionResult<unknown> {
  if (result.isOk()) {
    const data: unknown = options?.mapData
      ? options.mapData(result.value)
      : result.value;

    const meta = options?.successMeta ? options.successMeta(result.value) : {};
    logger.info(`${actionName} 成功`, meta);

    return {
      success: true,
      data,
    };
  }

  logger.warn(`${actionName} 失敗`, {
    error: result.error.message,
    code: result.error.code,
    ...options?.failureMeta,
  });

  return {
    success: false,
    error: result.error.message,
    code: mapActionErrorCode(result.error.code),
    ...(result.error.details !== undefined
      ? { details: result.error.details }
      : {}),
  };
}
