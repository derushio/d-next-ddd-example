'use client';

import { clsx } from 'clsx';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { useServices } from '@/hooks/useServices';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

import { Alert } from '@/components/ui-legacy/Alert';
import { Badge } from '@/components/ui-legacy/Badge';
import { Button } from '@/components/ui-legacy/Button';
import { Card } from '@/components/ui-legacy/Card';
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
    <div className={clsx('max-w-4xl mx-auto p-6')}>
      <Card
        variant='aurora'
        className={clsx('shadow-2xl border border-violet-200/50')}
      >
        <div className={clsx('flex items-center gap-3 mb-6')}>
          <h2
            className={clsx(
              'text-2xl font-bold bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent',
            )}
          >
            DI サービス統合デモ ✨
          </h2>
          <Badge variant='success' size='sm'>
            Client Component
          </Badge>
        </div>

        <div className={clsx('grid gap-6 md:grid-cols-2')}>
          {/* 🌟 設定値表示 */}
          <Card
            variant='ocean'
            className={clsx(
              'border-2 border-teal-200/50 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 shadow-lg',
            )}
          >
            <h3 className={clsx('text-lg font-semibold mb-3 text-gray-900')}>
              📋 設定値取得例
            </h3>
            <div
              className={clsx(
                'bg-white/60 rounded-lg p-4 border border-teal-200/30 shadow-inner relative overflow-hidden backdrop-blur-sm',
              )}
            >
              {/* 🌊 Ocean アクセントグラデーション */}
              <div
                className={clsx(
                  'absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400/40 via-green-400/40 to-blue-400/40',
                )}
              />
              {config ? (
                <div className={clsx('space-y-2')}>
                  <div className={clsx('flex justify-between items-center')}>
                    <span className={clsx('text-sm font-medium text-gray-700')}>
                      Base URL:
                    </span>
                    <Badge
                      variant='blue'
                      size='sm'
                      className={clsx('font-mono text-xs max-w-48 truncate')}
                    >
                      {config.app.baseUrl}
                    </Badge>
                  </div>
                  <div className={clsx('flex justify-between items-center')}>
                    <span className={clsx('text-sm font-medium text-gray-700')}>
                      環境:
                    </span>
                    <Badge
                      variant={config.app.isDevelopment ? 'warning' : 'success'}
                      size='sm'
                    >
                      {config.app.nodeEnv}
                    </Badge>
                  </div>
                  <div
                    className={clsx('mt-3 pt-3 border-t border-teal-200/50')}
                  >
                    <p className={clsx('text-xs text-gray-600')}>
                      {config.app.note}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={clsx('animate-pulse')}>
                  <div
                    className={clsx('h-4 bg-gray-300 rounded w-3/4 mb-2')}
                  ></div>
                  <div className={clsx('h-4 bg-gray-300 rounded w-1/2')}></div>
                </div>
              )}
            </div>
          </Card>

          {/* 🌟 サービステスト */}
          <Card
            variant='sunset'
            className={clsx(
              'border-2 border-orange-200/50 hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 shadow-lg',
            )}
          >
            <h3 className={clsx('text-lg font-semibold mb-3 text-gray-900')}>
              🔧 DIサービステスト
            </h3>
            <div className={clsx('space-y-4')}>
              <div className={clsx('flex items-center space-x-4')}>
                <Button
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  variant='primary'
                  size='sm'
                  gradient={true}
                  className={clsx(
                    'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl text-white transition-all duration-300 transform hover:scale-105',
                  )}
                >
                  {isLoading ? '⏳ Processing...' : '🚀 Test Service Execution'}
                </Button>
              </div>

              {message && (
                <Alert variant='success' className={clsx('text-sm')}>
                  <div className={clsx('font-medium')}>✅ テスト結果:</div>
                  <div className={clsx('text-xs mt-1 break-words')}>
                    {message}
                  </div>
                </Alert>
              )}
            </div>
          </Card>
        </div>

        {/* 🌟 ログ出力説明 */}
        <div
          className={clsx(
            'mt-6 pt-6 border-t border-gradient-to-r from-transparent via-violet-200/50 to-transparent',
          )}
        >
          <div
            className={clsx(
              'flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-50/80 to-cyan-50/80 border border-violet-200/30 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden backdrop-blur-sm',
            )}
          >
            {/* 🌟 Aurora アクセントグラデーション */}
            <div
              className={clsx(
                'absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400/40 via-pink-400/40 to-cyan-400/40',
              )}
            />
            <div
              className={clsx(
                'w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300',
              )}
            >
              <span className={clsx('text-white text-lg')}>📝</span>
            </div>
            <div>
              <h4 className={clsx('font-semibold text-gray-900 mb-1')}>
                ログ出力について
              </h4>
              <p className={clsx('text-sm text-gray-600 leading-relaxed')}>
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
