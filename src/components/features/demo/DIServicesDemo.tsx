'use server';

import { resolve } from '@/layers/infrastructure/di/resolver';
import { Email } from '@/layers/domain/value-objects/Email';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

/**
 * DI機能デモンストレーション - Server Component
 *
 * Clean Architecture + DDD アーキテクチャの実演:
 * - Server ComponentでDIサービス直接実行
 * - 各層のサービス連携実演
 * - リアルタイム実行結果表示
 */
export async function DIServicesDemo() {
  const startTime = Date.now();

  try {
    // 🏗️ DIコンテナからサービス解決
    const configService = resolve('ConfigService');
    const logger = resolve('Logger');
    const userDomainService = resolve('UserDomainService');
    const userRepository = resolve('UserRepository');

    logger.info('DIサービスデモ実行開始', {
      timestamp: new Date().toISOString(),
      component: 'DIServicesDemo',
    });

    // 📋 1. Infrastructure層: ConfigService実行
    const config = configService.getConfig();

    // 👑 2. Domain層: UserDomainService実行
    const domainResult = await userDomainService.isEmailDuplicate(
      new Email('demo@example.com'),
    );

    // 🗄️ 3. Infrastructure層: UserRepository実行
    const users = await userRepository.findByCriteria({});

    const executionTime = Date.now() - startTime;

    logger.info('DIサービスデモ実行完了', {
      executionTime,
      servicesExecuted: 4,
      userCount: users.length,
    });

    return (
      <div className='space-y-6'>
        {/* ヘッダー */}
        <div className='flex items-center gap-3 pb-4 border-b border-violet-300'>
          <h2 className='text-2xl font-bold bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent flex-1'>
            🏗️ DI Architecture Live Demo
          </h2>
          <Badge variant='success' size='sm'>
            Server Component
          </Badge>
          <Badge variant='blue' size='sm'>
            {executionTime}ms
          </Badge>
        </div>

        {/* メイン結果表示 */}
        <div className='grid gap-6 md:grid-cols-2'>
          {/* Infrastructure層: ConfigService */}
          <Card
            variant='ocean'
            className='border-2 border-teal-200 hover:border-teal-300 transition-colors'
          >
            <Card.Header>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  🔧 ConfigService
                </h3>
                <Badge variant='blue' size='sm'>
                  Infrastructure
                </Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <div className='space-y-3'>
                <div className='bg-white/60 rounded-lg p-3 border border-teal-200/50'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      Base URL:
                    </span>
                    <Badge
                      variant='blue'
                      size='sm'
                      className='font-mono text-xs'
                    >
                      {config.app.baseUrl}
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      Environment:
                    </span>
                    <Badge
                      variant={config.app.isDevelopment ? 'warning' : 'success'}
                      size='sm'
                    >
                      {config.app.nodeEnv}
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-700'>
                      Development:
                    </span>
                    <Badge
                      variant={config.app.isDevelopment ? 'warning' : 'blue'}
                      size='sm'
                    >
                      {config.app.isDevelopment ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Domain層: UserDomainService */}
          <Card
            variant='sunset'
            className='border-2 border-orange-200 hover:border-orange-300 transition-colors'
          >
            <Card.Header>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  👑 UserDomainService
                </h3>
                <Badge variant='warning' size='sm'>
                  Domain
                </Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <div className='space-y-3'>
                <div className='bg-white/60 rounded-lg p-3 border border-orange-200/50'>
                  <div className='mb-3'>
                    <span className='text-sm font-medium text-gray-700'>
                      ビジネスロジック実行:
                    </span>
                  </div>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-sm text-gray-600'>Email:</span>
                    <code className='text-xs bg-gray-100 px-2 py-1 rounded'>
                      demo@example.com
                    </code>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-600'>
                      Duplicate Check:
                    </span>
                    <Badge
                      variant={domainResult ? 'warning' : 'success'}
                      size='sm'
                    >
                      {domainResult ? '既存あり' : '利用可能'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Infrastructure層: UserRepository */}
          <Card
            variant='elevated'
            className='border-2 border-green-200 hover:border-green-300 transition-colors'
          >
            <Card.Header>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  🗄️ UserRepository
                </h3>
                <Badge variant='success' size='sm'>
                  Infrastructure
                </Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <div className='space-y-3'>
                <div className='bg-white/60 rounded-lg p-3 border border-green-200/50'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      Operation:
                    </span>
                    <Badge
                      variant='blue'
                      size='sm'
                      className='font-mono text-xs'
                    >
                      findAll()
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      User Count:
                    </span>
                    <Badge variant='success' size='sm'>
                      {users.length} users
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-700'>
                      Status:
                    </span>
                    <Badge variant='success' size='sm'>
                      Data Access Success
                    </Badge>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* System Info */}
          <Card
            variant='glass'
            className='border-2 border-purple-200 hover:border-purple-300 transition-colors'
          >
            <Card.Header>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  ⚡ Performance Metrics
                </h3>
                <Badge variant='secondary' size='sm'>
                  System
                </Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <div className='space-y-3'>
                <div className='bg-white/60 rounded-lg p-3 border border-purple-200/50'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      Execution Time:
                    </span>
                    <Badge variant='blue' size='sm'>
                      {executionTime}ms
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700'>
                      Services Resolved:
                    </span>
                    <Badge variant='success' size='sm'>
                      4 services
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium text-gray-700'>
                      Timestamp:
                    </span>
                    <Badge
                      variant='secondary'
                      size='sm'
                      className='font-mono text-xs'
                    >
                      {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Architecture Info */}
        <div className='pt-6 border-t border-violet-300'>
          <div className='bg-gradient-to-br from-violet-50 to-cyan-50 border border-violet-200 rounded-xl p-5 relative overflow-hidden'>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400'></div>

            <div className='flex items-start gap-4 mt-1'>
              <div className='w-10 h-10 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform flex-shrink-0'>
                <span className='text-white text-lg'>🏗️</span>
              </div>
              <div>
                <h4 className='font-semibold text-gray-900 mb-2'>
                  Clean Architecture + DDD + TSyringe DI
                </h4>
                <p className='text-sm text-gray-600 leading-relaxed mb-3'>
                  このデモは Server Component
                  で各層のサービスを実際にDI実行し、リアルタイムの結果を表示しています。
                </p>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='blue' size='sm'>
                    Infrastructure Layer
                  </Badge>
                  <Badge variant='warning' size='sm'>
                    Domain Layer
                  </Badge>
                  <Badge variant='success' size='sm'>
                    TSyringe DI
                  </Badge>
                  <Badge variant='secondary' size='sm'>
                    Server Component
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('DIサービスデモ実行エラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    });

    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-3 pb-4 border-b border-red-300'>
          <h2 className='text-2xl font-bold text-red-600 flex-1'>
            🚨 DI Demo Error
          </h2>
          <Badge variant='destructive' size='sm'>
            Error
          </Badge>
        </div>

        <Card variant='sunset' className='border-2 border-red-200'>
          <Card.Header>
            <h3 className='text-lg font-semibold text-red-800'>
              実行エラーが発生しました
            </h3>
          </Card.Header>
          <Card.Content>
            <p className='text-sm text-red-700'>
              DIサービスの実行中にエラーが発生しました。ログを確認してください。
            </p>
            <div className='mt-3 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <code className='text-xs text-red-800'>
                {error instanceof Error ? error.message : 'Unknown error'}
              </code>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }
}
