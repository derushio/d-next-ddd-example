'use server';

import { resolve } from '@/layers/infrastructure/di/resolver';

/**
 * ユーザーメールアドレス表示コンポーネント
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseを使用してユーザー情報取得
 * - Infrastructure層の実装詳細を隠蔽
 */
export async function UserEmail() {
  try {
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const user = await getCurrentUserUseCase.execute();

    if (!user?.email) {
      return <span className='text-gray-500 text-sm'>未サインイン</span>;
    }

    return <span className='text-sm font-medium text-white'>{user.email}</span>;
  } catch (error) {
    return <span className='text-gray-500 text-sm'>取得エラー</span>;
  }
}
