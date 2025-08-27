'use server';

import { CreateUserFormClient } from '@/components/features/user/CreateUserFormClient';

/**
 * ユーザー新規作成ページ
 * Server Component（メイン）+ Client Component（インタラクション）構成
 *
 * DDD/Clean Architecture パターン:
 * - Server ComponentでSSRによる初期表示高速化
 * - Client Componentでフォーム操作・バリデーション対応
 * - 作成成功時の自動遷移機能
 */
export default async function CreateUserPage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-3xl'></div>
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-3xl'></div>
      </div>

      {/* メインコンテンツ */}
      <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* ページヘッダー */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl sm:text-6xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent'>
                Create New User
              </span>
            </h1>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              新しいユーザーを作成します。
            </p>
          </div>

          {/* フォームエリア */}
          <div className='relative'>
            <div className='bg-white/25 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
              <div className='p-6 sm:p-8'>
                <CreateUserFormClient />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
