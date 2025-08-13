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
              Clean Architecture + DDDパターンで構築されたユーザー管理システム。
              検索・ページネーション・リアルタイム更新をサポートします。
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

          {/* 技術情報セクション */}
          <div className='mt-12'>
            <div className='bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/30'>
              <h3 className='text-2xl font-bold mb-6'>
                <span className='bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent'>
                  技術スタック
                </span>
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-700'>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-violet-700 mb-2'>
                    Application Layer
                  </h4>
                  <p className='text-sm'>
                    GetUsersUseCase でビジネスロジック実装
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-blue-700 mb-2'>
                    Presentation Layer
                  </h4>
                  <p className='text-sm'>
                    Server Actions で型安全なAPI呼び出し
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-cyan-700 mb-2'>
                    Infrastructure Layer
                  </h4>
                  <p className='text-sm'>
                    Prisma Repository でデータベース操作
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
