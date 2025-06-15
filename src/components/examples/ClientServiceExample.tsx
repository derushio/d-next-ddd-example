'use client';

import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { useServices } from '@/hooks/useServices';
import { Alert, Badge, Button, Card } from 'flowbite-react';
import { useEffect, useState } from 'react';

/**
 * 設定情報の型定義
 */
type ConfigInfo = {
  baseUrl: string;
  isDevelopment: boolean;
  nodeEnv: string;
  note: string;
  availableData: string;
};

/**
 * Client Component用DIサービス活用例
 *
 * UseCase + DI統合デモ:
 * - useServices Hook活用のベストプラクティス例示
 * - Client ComponentからのDIサービス使用パターン
 * - UseCase パターンとDomain Service の活用例
 * - 構造化ログとエラーハンドリングの実装例
 *
 * このコンポーネントは実際のプロダクトでは削除可能。
 * UseCase + DIパターンの参考実装として提供。
 */
export function ClientServiceExample() {
  const [message, setMessage] = useState<string>('');
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // DIサービス取得（型推論付き）
  const {
    config: configService,
    logger,
    utils,
    executeService,
    resolve,
  } = useServices();

  // マウント状態チェック
  const isMounted = useIsMountedCheck();

  // Component mount時の処理
  useEffect(() => {
    if (!isMounted) return;

    utils.logComponentMount('ClientServiceExample', {
      timestamp: new Date().toISOString(),
    });

    // 設定値の取得例
    try {
      const appConfig = configService.getConfig();
      setConfig(appConfig);
      logger.info('Client側設定値取得成功', {
        hasConfig: true,
        configKeys: Object.keys(appConfig),
      });
    } catch (error) {
      logger.error('Client側設定値取得エラー', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return () => {
      utils.logComponentUnmount('ClientServiceExample');
    };
  }, [isMounted, configService, logger, utils]);

  /**
   * ユーザーアクション例：ボタンクリック処理
   */
  const handleButtonClick = async () => {
    if (!isMounted) return;

    setIsLoading(true);
    utils.logUserAction('button_click', {
      component: 'ClientServiceExample',
      action: 'test_service_execution',
    });

    // エラーハンドリング付きサービス実行の例
    const result = await executeService(
      async () => {
        // 何らかの非同期処理をシミュレート
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // resolve()で型推論付きサービス取得の例
        const errorHandler = resolve('ErrorHandler');

        return {
          success: true,
          message: 'サービス実行が完了しました！',
          timestamp: new Date().toISOString(),
          errorHandlerType: typeof errorHandler.handleError,
        };
      },
      {
        operation: 'test_service_execution',
        component: 'ClientServiceExample',
      },
    );

    if (result) {
      setMessage(result.message);
      logger.info('サービス実行が成功しました', result);
    } else {
      setMessage('サービス実行に失敗しました');
    }

    setIsLoading(false);
  };

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <Card className='shadow-lg'>
        <div className='flex items-center gap-3 mb-6'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            DI サービス統合デモ ✨
          </h2>
          <Badge color='success' size='sm'>
            Client Component
          </Badge>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {/* 設定値表示 */}
          <Card className='border border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-white'>
              📋 設定値取得例
            </h3>
            <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border'>
              {config ? (
                <div className='space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
                      Base URL:
                    </span>
                    <Badge
                      color='blue'
                      size='sm'
                      className='font-mono text-xs max-w-48 truncate'
                    >
                      {config.app.baseUrl}
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
                      環境:
                    </span>
                    <Badge
                      color={config.app.isDevelopment ? 'yellow' : 'green'}
                      size='sm'
                    >
                      {config.app.nodeEnv}
                    </Badge>
                  </div>
                  <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-600'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {config.app.note}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='animate-pulse'>
                  <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2'></div>
                  <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2'></div>
                </div>
              )}
            </div>
          </Card>

          {/* サービステスト */}
          <Card className='border border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-white'>
              🔧 DIサービステスト
            </h3>
            <div className='space-y-4'>
              <div className='flex items-center space-x-4'>
                <Button
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  color='blue'
                  size='sm'
                >
                  {isLoading ? 'Processing...' : 'Test Service Execution'}
                </Button>
              </div>

              {message && (
                <Alert color='info' className='text-sm'>
                  <div className='font-medium'>テスト結果:</div>
                  <div className='text-xs mt-1 break-words'>{message}</div>
                </Alert>
              )}
            </div>
          </Card>
        </div>

        {/* ログ出力説明 */}
        <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex items-start gap-3'>
            <div className='text-blue-500 dark:text-blue-400 text-xl'>📝</div>
            <div>
              <h4 className='font-semibold text-gray-900 dark:text-white mb-1'>
                ログ出力について
              </h4>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                このコンポーネントの操作は構造化ログとして記録されます。
                ブラウザのコンソールまたはサーバーログで詳細を確認できます。
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
