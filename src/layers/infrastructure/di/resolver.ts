// 分離されたDIコンテナアーキテクチャから最上位コンテナを直接インポート
import { applicationContainer } from '@/layers/infrastructure/di/containers/application.container';
import { INJECTION_TOKENS, ServiceType, ServiceTypeMap } from '@/layers/infrastructure/di/tokens';

/**
 * 型推論機能付きDIサービス取得関数
 *
 * 使用例:
 * ```ts
 * // 従来のダサい書き方 😞
 * const userService = container.resolve<UserService>(INJECTION_TOKENS.UserService);
 *
 * // resolve()で型付取得 ✨
 * const userService = resolve('UserService');  // 型が自動推論される！
 * const logger = resolve('Logger');            // ILogger型で推論
 * const config = resolve('ConfigService');     // IConfigService型で推論
 * ```
 *
 * @param serviceName - サービス名（型安全）
 * @returns 指定されたサービスのインスタンス（型推論付き）
 */
export function resolve<K extends keyof ServiceTypeMap>(
  serviceName: K,
): ServiceType<K> {
  return applicationContainer.resolve<ServiceType<K>>(
    INJECTION_TOKENS[serviceName] as any,
  );
}
