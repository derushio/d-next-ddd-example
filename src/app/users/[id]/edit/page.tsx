'use server';

import { EditUserFormClient } from '@/components/features/user/EditUserFormClient';
import { getUserById } from '@/app/server-actions/user/getUserById';
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
              Clean Architecture + DDDパターンで構築されたユーザー編集機能。
              型安全で堅牢なユーザー情報更新システムです。
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

          {/* 機能紹介セクション */}
          <div className='mt-12'>
            <div className='bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/30'>
              <h3 className='text-2xl font-bold mb-6'>
                <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                  編集機能・特徴
                </span>
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-700'>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-blue-700 mb-2'>
                    データ整合性チェック
                  </h4>
                  <p className='text-sm'>
                    メールアドレス重複確認と業務ルール検証を実行
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-indigo-700 mb-2'>
                    楽観的更新
                  </h4>
                  <p className='text-sm'>
                    既存データを保持しつつ差分のみ更新する効率的な処理
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-purple-700 mb-2'>
                    ドメインロジック統合
                  </h4>
                  <p className='text-sm'>
                    エンティティの不変条件を保持した安全な更新処理
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-blue-700 mb-2'>
                    リアルタイムエラー表示
                  </h4>
                  <p className='text-sm'>
                    ユーザビリティを重視した即座のフィードバック
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-indigo-700 mb-2'>
                    キャッシュ自動更新
                  </h4>
                  <p className='text-sm'>
                    更新後の関連ページキャッシュを自動再検証
                  </p>
                </div>
                <div className='bg-white/30 backdrop-blur-lg rounded-xl p-4 border border-white/20'>
                  <h4 className='font-semibold text-purple-700 mb-2'>
                    トランザクション保証
                  </h4>
                  <p className='text-sm'>
                    データベース更新の原子性を保証する堅牢な設計
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
