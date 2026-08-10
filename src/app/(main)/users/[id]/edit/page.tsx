import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackgroundDecoration } from '@/components/common/BackgroundDecoration';
import { EditUserFormClient } from '@/components/features/user/EditUserFormClient';
import { getCachedUserByIdAction } from '@/lib/cachedQueries';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCachedUserByIdAction(id);
  return {
    title: result.success ? `${result.data.name} — 編集` : 'ユーザー編集',
  };
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
  const { id } = await params;
  // ユーザーデータ取得
  const result = await getCachedUserByIdAction(id);

  // エラーハンドリング
  if (!result.success) {
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
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto mb-8'>
              {result.error}
            </p>
            <div className='bg-background/55 rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-8'>
              <p className='text-foreground'>
                エラーコード:{' '}
                <code className='bg-destructive/10 px-2 py-1 rounded'>
                  {result.code}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = result.data;

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <BackgroundDecoration blob1='blue-indigo' blob2='purple-pink' />

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
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              ユーザー情報を編集します。
            </p>
          </div>

          {/* フォームエリア */}
          <div className='relative'>
            <div className='bg-background/55 rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
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
