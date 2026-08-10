import type { Metadata } from 'next';
import { BackgroundDecoration } from '@/components/common/BackgroundDecoration';
import { CreateUserFormClient } from '@/components/features/user/CreateUserFormClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '新規ユーザー作成',
};

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
      <BackgroundDecoration blob1='green-emerald' blob2='teal-cyan' />

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
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              新しいユーザーを作成します。
            </p>
          </div>

          {/* フォームエリア */}
          <div className='relative'>
            <div className='bg-background/55 rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
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
