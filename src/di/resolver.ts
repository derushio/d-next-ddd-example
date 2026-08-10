// 分離されたDIコンテナアーキテクチャから最上位コンテナを直接インポート
import { applicationContainer } from '@/di/containers/application.container';
import {
  INJECTION_TOKENS,
  type ServiceType,
  type ServiceTypeMap,
} from '@/di/tokens';

/**
 * 型推論機能付きDIサービス取得関数
 *
 * 使用例:
 * ```ts
 * // 従来のダサい書き方 😞
 * const signInUseCase = container.resolve<SignInUseCase>(INJECTION_TOKENS.SignInUseCase);
 *
 * // resolve()で型付取得 ✨
 * const signInUseCase = resolve('SignInUseCase');  // 型が自動推論される！
 * const logger = resolve('Logger');                // ILogger型で推論
 * const config = resolve('ConfigService');         // IConfigService型で推論
 * ```
 *
 * @param serviceName - サービス名（型安全）
 * @returns 指定されたサービスのインスタンス（型推論付き）
 */
export function resolve<K extends keyof ServiceTypeMap>(
  serviceName: K,
): ServiceType<K> {
  return applicationContainer.resolve<ServiceType<K>>(
    // biome-ignore lint/suspicious/noExplicitAny: TSyringeの型システム制約によりSymbol型をanyでキャスト必要
    INJECTION_TOKENS[serviceName] as any,
  );
}
