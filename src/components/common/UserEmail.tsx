'use server';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { clsx } from 'clsx';
import { HiUser } from 'react-icons/hi2';

/**
 * ユーザーメールアドレス表示コンポーネント
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseを使用してユーザー情報取得
 * - Infrastructure層の実装詳細を隠蔽
 * - モダンなデザインとアニメーション効果
 */
export async function UserEmail() {
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const result = await getCurrentUserUseCase.execute();

  if (!isSuccess(result)) {
    return (
      <div
        className={clsx(
          'flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-500/20 backdrop-blur-sm',
        )}
      >
        <HiUser className={clsx('h-4 w-4 text-gray-300')} />
        <span className={clsx('text-sm text-gray-300 font-medium')}>
          未サインイン
        </span>
      </div>
    );
  }

  // メールアドレスを短縮表示（ローカル部分のみ表示）
  const displayEmail =
    result.data.email.length > 20
      ? `${result.data.email.split('@')[0]}@...`
      : result.data.email;

  return (
    <div
      className={clsx(
        'flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 cursor-pointer group',
      )}
    >
      <div className={clsx('flex-shrink-0')}>
        <div
          className={clsx(
            'w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-200',
          )}
        >
          <HiUser className={clsx('h-3 w-3 text-white')} />
        </div>
      </div>
      <div className={clsx('flex-1 min-w-0')}>
        <span
          className={clsx('text-sm font-medium text-white truncate block')}
          title={result.data.email}
        >
          {displayEmail}
        </span>
      </div>
      {result.data.name && (
        <div
          className={clsx(
            'text-xs text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded-full',
          )}
        >
          {result.data.name.substring(0, 8)}
        </div>
      )}
    </div>
  );
}
