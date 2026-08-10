/**
 * テスト用ファクトリー エントリーポイント
 *
 * fishery + @faker-js/faker を使用したテストデータ生成。
 *
 * 使用例:
 * ```ts
 * import { userFactory, userPrismaDataFactory } from '@tests/utils/factories';
 * import { userSessionFactory, userSessionPrismaDataFactory } from '@tests/utils/factories';
 * ```
 */
export { userFactory, userPrismaDataFactory } from './userFactory';
export {
  userSessionFactory,
  userSessionPrismaDataFactory,
} from './userSessionFactory';
