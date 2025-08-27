'use server';

import { UserListClient } from '@/components/features/user/UserListClient';

/**
 * ユーザー一覧ページ
 * Server Component（メイン）+ Client Component（インタラクション）構成
 *
 * DDD/Clean Architecture パターン:
 * - Server ComponentでSSRによる初期表示高速化
 * - Client Componentで動的なユーザー操作対応
 * - 検索・ページネーション・リアルタイム更新機能
 */
export default async function UsersPage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-3xl'></div>
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-violet-400 to-pink-400 rounded-full blur-3xl'></div>
      </div>

      {/* メインコンテンツ */}
      <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          {/* ページヘッダー */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl sm:text-6xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'>
                User Management
              </span>
            </h1>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              ユーザーの管理・検索・作成を行えます。
            </p>
          </div>

          {/* ユーザー一覧コンポーネント */}
          <div className='relative'>
            <div className='bg-white/25 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
              <div className='p-6 sm:p-8'>
                <UserListClient
                  initialParams={{
                    page: 1,
                    limit: 10,
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
