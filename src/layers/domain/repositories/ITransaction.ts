/**
 * トランザクションコンテキストを表す抽象インターフェース
 *
 * ドメイン層はインフラストラクチャの具体的な実装（Prisma等）に依存しないため、
 * トランザクションは抽象的な「コンテキスト」として扱います。
 *
 * 実際のトランザクション管理はインフラストラクチャ層で行われ、
 * このインターフェースはリポジトリメソッド間でトランザクションコンテキストを
 * 受け渡すための型安全なマーカーとして機能します。
 *
 * @example
 * // UseCase層でのトランザクション使用例（概念的）
 * const result = await transactionManager.executeInTransaction(async (tx) => {
 *   await userRepository.save(user, tx);
 *   await sessionRepository.create(session, tx);
 *   return success(response);
 * });
 *
 * @example
 * // Repository実装での使用例
 * async save(user: User, transaction?: ITransaction): Promise<void> {
 *   const client = this.getClient(transaction);
 *   await client.user.create({ data: ... });
 * }
 */
export interface ITransaction {
  /**
   * トランザクションを識別するためのブランド型
   * 実行時には存在しないが、コンパイル時の型チェックで
   * unknown や他の型との混同を防ぐ
   */
  readonly __brand: 'ITransaction';
}

/**
 * トランザクションコンテキストの型ガード
 * インフラ層で実際のトランザクションオブジェクトをITransactionとして扱う際に使用
 *
 * @param value - チェック対象の値
 * @returns ITransaction型として扱えるかどうか
 *
 * @example
 * // インフラ層でのキャスト
 * function asTransaction(prismaTransaction: PrismaClient): ITransaction {
 *   return prismaTransaction as unknown as ITransaction;
 * }
 */
export function isTransaction(value: unknown): value is ITransaction {
  // 実行時チェックは行わない（ブランド型のため）
  // インフラ層での明示的なキャストを前提とする
  return value != null && typeof value === 'object';
}
