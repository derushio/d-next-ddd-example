import type { Metadata } from 'next';
import { getUsers } from '@/app/server-actions/user/getUsers';
import { BackgroundDecoration } from '@/components/common/BackgroundDecoration';
import { UserListClient } from '@/components/features/user/UserListClient';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/layers/application/constants/pagination';

export const metadata: Metadata = {
  title: 'ユーザー管理',
};

const INITIAL_PARAMS = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
} as const;

/**
 * ユーザー一覧ページ
 * Server Component（外側） + Client Component（内側）のドーナツ構造
 *
 * DDD/Clean Architecture パターン:
 * - Server ComponentでSSRによる初期データ取得（初回表示の高速化）
 * - Client Componentはpropsとして受け取った初期データを表示し
 *   検索・ページネーション操作時のみ再フェッチ
 */
export default async function UsersPage() {
  // Server Componentで初期データを取得してClient Componentに渡す（ドーナツ構造）
  const initialResult = await getUsers(INITIAL_PARAMS);
  const initialData = initialResult.success ? initialResult.data : undefined;

  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <BackgroundDecoration blob1='blue-cyan' blob2='violet-pink' />

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
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              ユーザーの管理・検索・作成を行えます。
            </p>
          </div>

          {/* ユーザー一覧コンポーネント */}
          <div className='relative perf-content-auto'>
            <div className='bg-background/55 rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
              <div className='p-6 sm:p-8'>
                <UserListClient
                  initialParams={INITIAL_PARAMS}
                  initialData={initialData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
