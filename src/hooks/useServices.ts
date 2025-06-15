import { resolve } from '@/layers/infrastructure/di/resolver';
import { ServiceType, ServiceTypeMap } from '@/layers/infrastructure/di/tokens';
import type { IConfigService } from '@/layers/infrastructure/services/ConfigService';
import type { IErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';
import type { ILogger } from '@/layers/infrastructure/services/Logger';
import { useMemo } from 'react';

/**
 * Client Component用DIサービス取得Hook
 *
 * DIサービス統合対応:
 * - Client ComponentからDIコンテナへの型安全なアクセス
 * - resolve()関数による型推論付きサービス取得
 * - useMemo最適化による不要な再作成防止
 * - 一貫性のあるAPIで簡潔な記述が可能！
 *
 * 使用例:
 * ```tsx
 * const { logger, config, resolve } = useServices();
 *
 * // 基本サービス使用
 * logger.info('Client側処理開始', { componentName: 'MyComponent' });
 *
 * // resolve()で型付取得により任意のサービス取得 ✨
 * const userService = resolve('UserService');  // 型が自動推論される！
 * const authService = resolve('AuthService');  // AuthService型で推論
 * ```
 */
export function useServices() {
  /**
   * 基本的なサービスをuseMemoでキャッシュ
   * resolve()で型付取得により簡潔に
   */
  const basicServices = useMemo(() => {
    return {
      logger: resolve('Logger'),
      config: resolve('ConfigService'),
      errorHandler: resolve('ErrorHandler'),
    };
  }, []);

  /**
   * ユーティリティ関数もuseMemoでキャッシュして無限ループを防ぐ
   */
  const utils = useMemo(
    () => ({
      /**
       * コンポーネントマウント時のログ出力
       * @param componentName - コンポーネント名
       * @param props - コンポーネントのprops（機密情報は除外すること）
       */
      logComponentMount: (
        componentName: string,
        props: Record<string, unknown> = {},
      ) => {
        basicServices.logger.info(`Component mounted: ${componentName}`, {
          componentName,
          props: Object.keys(props), // 値ではなくキーのみログ出力（プライバシー配慮）
        });
      },

      /**
       * コンポーネントアンマウント時のログ出力
       * @param componentName - コンポーネント名
       */
      logComponentUnmount: (componentName: string) => {
        basicServices.logger.info(`Component unmounted: ${componentName}`, {
          componentName,
        });
      },

      /**
       * ユーザーアクション時のログ出力
       * @param action - アクション名
       * @param details - アクション詳細
       */
      logUserAction: (
        action: string,
        details: Record<string, unknown> = {},
      ) => {
        basicServices.logger.info(`User action: ${action}`, {
          action,
          ...details,
          timestamp: new Date().toISOString(),
        });
      },
    }),
    [basicServices],
  );

  /**
   * 型推論機能付きサービス取得関数
   * useMemoでキャッシュして参照安定性を保つ
   */
  const resolveWithMemo = useMemo(() => {
    return function <K extends keyof ServiceTypeMap>(
      serviceName: K,
    ): ServiceType<K> {
      return resolve(serviceName);
    };
  }, []);

  /**
   * エラーハンドリング付きのサービス実行ヘルパー
   * useMemoでキャッシュして参照安定性を保つ
   */
  const executeService = useMemo(() => {
    return async function <T>(
      serviceCall: () => Promise<T>,
      context: Record<string, unknown> = {},
    ): Promise<T | undefined> {
      try {
        return await serviceCall();
      } catch (error) {
        const errorResult = basicServices.errorHandler.handleError(
          error instanceof Error ? error : new Error('Unknown error'),
          { ...context, location: 'Client Component' },
        );

        basicServices.logger.error(
          'Client Component service execution failed',
          {
            errorType: errorResult.type,
            errorMessage: errorResult.message,
            ...context,
          },
        );

        return undefined;
      }
    };
  }, [basicServices]);

  return {
    // 基本サービス（頻繁に使用）
    ...basicServices,

    // resolve()関数による型推論付きサービス取得
    resolve: resolveWithMemo,

    // ユーティリティ関数（useMemoでキャッシュ済み）
    executeService,
    utils,
  };
}
