'use client';

import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { useServices } from '@/hooks/useServices';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    <div className='space-y-6'>
      {/* ヘッダー */}
      <div className='flex items-center gap-3 pb-4 border-b border-violet-300'>
        <h2 className='text-2xl font-bold bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent flex-1'>
          DI サービス統合デモ ✨
        </h2>
        <Badge variant='success' size='sm'>
          Client Component
        </Badge>
      </div>

      {/* メインコンテンツ */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* 設定値表示 */}
        <Card
          variant='ocean'
          className='border-2 border-teal-200 hover:border-teal-300 transition-colors'
        >
          <Card.Header>
            <h3 className='text-lg font-semibold text-gray-900'>
              📋 設定値取得例
            </h3>
          </Card.Header>
          <Card.Content>
            <div className='bg-white/60 rounded-lg p-4 border border-teal-200/50 relative overflow-hidden'>
              {/* アクセントライン */}
              <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-green-400 to-blue-400'></div>

              {config ? (
                <div className='space-y-3 mt-2'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-700'>
                      Base URL:
                    </span>
                    <Badge
                      variant='blue'
                      size='sm'
                      className='font-mono text-xs max-w-48 truncate'
                    >
                      {config.app.baseUrl}
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-700'>
                      環境:
                    </span>
                    <Badge
                      variant={config.app.isDevelopment ? 'warning' : 'success'}
                      size='sm'
                    >
                      {config.app.nodeEnv}
                    </Badge>
                  </div>
                  <div className='pt-3 mt-3 border-t border-teal-200'>
                    <p className='text-xs text-gray-600'>{config.app.note}</p>
                  </div>
                </div>
              ) : (
                <div className='animate-pulse space-y-2 mt-2'>
                  <div className='h-4 bg-gray-300 rounded w-3/4'></div>
                  <div className='h-4 bg-gray-300 rounded w-1/2'></div>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* サービステスト */}
        <Card
          variant='sunset'
          className='border-2 border-orange-200 hover:border-orange-300 transition-colors'
        >
          <Card.Header>
            <h3 className='text-lg font-semibold text-gray-900'>
              🔧 DIサービステスト
            </h3>
          </Card.Header>
          <Card.Content>
            <div className='space-y-4'>
              <Button
                onClick={handleButtonClick}
                disabled={isLoading}
                variant='primary'
                gradient={true}
                className='w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white'
              >
                {isLoading ? '⏳ Processing...' : '🚀 Test Service Execution'}
              </Button>

              {message && (
                <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
                  <div className='text-sm font-medium text-green-800 mb-2'>
                    ✅ テスト結果:
                  </div>
                  <div className='text-sm text-green-700'>{message}</div>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* ログ出力説明 */}
      <div className='pt-6 border-t border-violet-300'>
        <div className='bg-gradient-to-br from-violet-50 to-cyan-50 border border-violet-200 rounded-xl p-5 relative overflow-hidden'>
          {/* アクセントライン */}
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400'></div>

          <div className='flex items-start gap-4 mt-1'>
            <div className='w-10 h-10 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform flex-shrink-0'>
              <span className='text-white text-lg'>📝</span>
            </div>
            <div>
              <h4 className='font-semibold text-gray-900 mb-1'>
                ログ出力について
              </h4>
              <p className='text-sm text-gray-600 leading-relaxed'>
                このコンポーネントの操作は構造化ログとして記録されます。
                ブラウザのコンソールまたはサーバーログで詳細を確認できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
