import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { toErrorMeta } from '@/utils/toErrorMeta';

interface OperationContext {
  operation: string;
  entity: string;
  params?: Record<string, unknown>;
}

/**
 * Repository メソッドの try-catch + ログ + DomainError 変換を共通化する HOF
 *
 * DRY原則:
 * - 各 Repository メソッドの catch ブロックの重複を一元管理
 * - エラーログ出力 + DomainError スローのボイラープレートを削除
 *
 * 使用例:
 * ```ts
 * return repositoryOperation(
 *   async () => {
 *     const result = await this.prisma.user.findUnique({ where: { id: id.value } });
 *     this.logger.info('ユーザー検索成功', { userId: id.value });
 *     return result;
 *   },
 *   this.logger,
 *   { operation: '検索', entity: 'ユーザー', params: { userId: id.value } },
 *   'ユーザーの検索に失敗しました',
 *   'USER_FIND_FAILED',
 * );
 * ```
 *
 * 注意: mapPrismaError を使うメソッド（P2002/P2025等の個別エラー変換が必要なもの）は
 * このHOFを使わず、従来の try-catch パターンを維持すること。
 */
export async function repositoryOperation<T>(
  operation: () => Promise<T>,
  logger: ILogger,
  context: OperationContext,
  errorMessage: string,
  errorCode: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`${context.entity}の${context.operation}に失敗`, {
      ...context.params,
      ...toErrorMeta(error),
    });
    throw new DomainError(errorMessage, errorCode);
  }
}
