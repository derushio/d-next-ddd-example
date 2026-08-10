/**
 * エラーオブジェクトをログメタデータに変換するユーティリティ
 *
 * DRY原則:
 * - `error instanceof Error ? error.message : 'Unknown error'` パターンを一元管理
 * - 全 Repository/Service/UseCase/ServerAction の catch ブロックで共用
 *
 * 使用例:
 * ```ts
 * } catch (error) {
 *   this.logger.error('処理に失敗', {
 *     ...toErrorMeta(error),
 *     userId: id.value,
 *   });
 * }
 * ```
 */
export function toErrorMeta(error: unknown): { error: string; stack?: string } {
  if (error instanceof Error) {
    return {
      error: error.message,
      ...(error.stack !== undefined && { stack: error.stack }),
    };
  }
  return { error: String(error) };
}
