'use server';

import { getUserById } from '@/app/server-actions/user/getUserById';
import { EditUserFormClient } from '@/components/features/user/EditUserFormClient';

import { notFound } from 'next/navigation';

interface EditUserPageProps {
  params: { id: string };
}

/**
 * ユーザー編集ページ
 * Server Component（メイン）+ Client Component（インタラクション）構成
 *
 * DDD/Clean Architecture パターン:
 * - Server ComponentでSSRによる初期データ取得
 * - Client Componentでフォーム操作・バリデーション対応
 * - 更新成功時の自動遷移機能
 */
export default async function EditUserPage({ params }: EditUserPageProps) {
  // ユーザーデータ取得
  const result = await getUserById({ userId: params.id });

  // エラーハンドリング
  if ('error' in result) {
    if (result.code === 'USER_NOT_FOUND') {
      notFound(); // Next.js の 404 ページを表示
    }

    // その他のエラーの場合はエラー表示
    return (
      <div className='min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 relative overflow-hidden'>
        <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
          <div className='max-w-4xl mx-auto text-center'>
            <h1 className='text-4xl sm:text-6xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-red-600 via-pink-600 to-red-600 bg-clip-text text-transparent'>
                エラーが発生しました
              </span>
            </h1>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto mb-8'>
              {result.error}
            </p>
            <div className='bg-white/25 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-8'>
              <p className='text-gray-700'>
                エラーコード:{' '}
                <code className='bg-red-100 px-2 py-1 rounded'>
                  {result.code}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = result.user;

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-3xl'></div>
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl'></div>
      </div>

      {/* メインコンテンツ */}
      <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* ページヘッダー */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl sm:text-6xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent'>
                Edit User
              </span>
            </h1>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              ユーザー情報を編集します。
            </p>
          </div>

          {/* フォームエリア */}
          <div className='relative'>
            <div className='bg-white/25 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
              <div className='p-6 sm:p-8'>
                <EditUserFormClient user={user} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
