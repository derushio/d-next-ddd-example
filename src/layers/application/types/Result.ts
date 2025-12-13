/**
 * 統一的なResult型パターン
 *
 * すべてのUseCaseで一貫したエラーハンドリングを実現するための型定義
 * 例外を投げる代わりに、成功・失敗の結果を型安全に表現
 */

/**
 * 成功時の結果
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * 失敗時の結果
 */
export interface Failure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: string;
    readonly details?: Record<string, unknown>;
  };
}

/**
 * Result型の汎用定義
 * 成功時はSuccess<T>、失敗時はFailureを返す
 */
export type Result<T> = Success<T> | Failure;

/**
 * 成功結果を作成するヘルパー関数
 */
export function success<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 失敗結果を作成するヘルパー関数
 */
export function failure(
  message: string,
  code: string,
  details?: Record<string, unknown>,
): Failure {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}

/**
 * Result型のタイプガード
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.success === true;
}

export function isFailure<T>(result: Result<T>): result is Failure {
  return result.success === false;
}

/**
 * 複数のResult型を組み合わせるユーティリティ
 * 全て成功の場合のみ成功、一つでも失敗があれば最初の失敗を返す
 */
export function combineResults<T extends readonly Result<unknown>[]>(
  results: T,
): Result<{ [K in keyof T]: T[K] extends Result<infer U> ? U : never }> {
  const failures = results.filter(isFailure);
  if (failures.length > 0) {
    return failures[0];
  }

  const data = results.map((result) =>
    isSuccess(result) ? result.data : null,
  ) as { [K in keyof T]: T[K] extends Result<infer U> ? U : never };

  return success(data);
}
