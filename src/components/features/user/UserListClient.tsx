'use client';

import Link from 'next/link';
import { useCallback, useOptimistic } from 'react';
import {
  type GetUsersParams,
  getUsers,
} from '@/app/server-actions/user/getUsers';
import { DeleteUserButton } from '@/components/features/user/DeleteUserButton';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Separator } from '@/components/ui/separator';
import { useUrlSearchPagination } from '@/hooks/useUrlSearchPagination';
import { routes } from '@/lib/routes';
import { formatJaDate } from '@/utils/dfUtils';

/** ユーザー一覧のページサイズ */
const PAGE_SIZE = 10;

export interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsersResponse {
  users: UserData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UserListProps {
  initialParams?: Partial<GetUsersParams> | undefined;
  /** SSRで取得した初期データ。指定時は初回クライアントフェッチをスキップ */
  initialData?: UsersResponse | undefined;
}

/**
 * ユーザー一覧表示コンポーネント
 * Client Component（最小範囲）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - ページネーション機能付き
 * - 検索機能付き
 * - レスポンシブ対応
 */
export function UserListClient({
  initialParams = {},
  initialData,
}: UserListProps) {
  const {
    data: users,
    error,
    isPending,
    searchInputValue,
    setSearchInputValue,
    handlePageChange,
    handleSearch,
    handleKeyDown,
    fetchData,
    currentPage,
  } = useUrlSearchPagination<UsersResponse, GetUsersParams['sortBy']>({
    initialData,
    initialParams: {
      ...(initialParams.page !== undefined ? { page: initialParams.page } : {}),
      ...(initialParams.searchQuery !== undefined
        ? { searchQuery: initialParams.searchQuery }
        : {}),
      ...(initialParams.sortBy !== undefined
        ? { sortBy: initialParams.sortBy }
        : {}),
      ...(initialParams.sortOrder !== undefined
        ? { sortOrder: initialParams.sortOrder }
        : {}),
    },
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    pageSize: PAGE_SIZE,
    buildRoute: (params) =>
      routes.users.list({
        page: params.page,
        ...(params.search ? { search: params.search } : {}),
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
    fetchFn: async (params) =>
      getUsers({
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        page: params.page,
        searchQuery: params.search,
      }),
  });

  // useOptimistic: 削除時にサーバー応答を待たずに即座にリストから除外
  const [optimisticUsers, removeOptimisticUser] = useOptimistic(
    users,
    (currentUsers: UsersResponse | null, deletedUserId: string) => {
      if (!currentUsers) return currentUsers;
      return {
        ...currentUsers,
        users: currentUsers.users.filter((u) => u.id !== deletedUserId),
        totalCount: Math.max(0, currentUsers.totalCount - 1),
      };
    },
  );

  // 削除成功後のリフレッシュ（現在のURLページで再取得）
  // React Compiler: removable when adopted
  const handleDeleteSuccess = useCallback(() => {
    const searchArg = searchInputValue || undefined;
    fetchData({
      page: currentPage,
      ...(searchArg !== undefined ? { search: searchArg } : {}),
    });
  }, [fetchData, currentPage, searchInputValue]);

  return (
    <div className='w-full max-w-4xl mx-auto'>
      {/* ヘッダー */}
      <Card variant='elevated' padding='lg' className='mb-6'>
        <Card.Header>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-bold text-[var(--text-primary)] text-balance'>
                ユーザー一覧
              </h1>
              {optimisticUsers && (
                <p className='text-sm text-[var(--text-muted)] mt-1'>
                  {optimisticUsers.totalCount}人のユーザーが登録されています
                </p>
              )}
            </div>

            {/* 検索欄 */}
            <div className='flex gap-2'>
              <Input
                type='text'
                placeholder='ユーザー名で検索...'
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                className='w-48'
              />
              <Button
                onClick={handleSearch}
                disabled={isPending}
                variant='aurora'
                size='sm'
              >
                検索
              </Button>
              <Button asChild variant='secondary' size='sm'>
                <Link href={routes.users.new}>＋ 新規作成</Link>
              </Button>
            </div>
          </div>
        </Card.Header>
      </Card>

      {/* エラー表示 */}
      {error && (
        <div className='mb-6'>
          <Alert variant='destructive'>
            <AlertTitle>エラー</AlertTitle>
            {error}
          </Alert>
        </div>
      )}

      {/* ローディング表示 */}
      {isPending && (
        <div className='mb-6'>
          <Loading />
        </div>
      )}

      {/* ユーザー一覧 */}
      {optimisticUsers && (
        <div className='space-y-4'>
          {optimisticUsers.users.length === 0 ? (
            <Card variant='bordered' padding='lg'>
              <div className='text-center text-[var(--text-muted)] py-8'>
                ユーザーが見つかりませんでした
              </div>
            </Card>
          ) : (
            optimisticUsers.users.map((user) => (
              <Card key={user.id} variant='bordered' padding='md' hover>
                <Card.Content>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-lg font-semibold text-balance text-[var(--text-primary)]'>
                          {user.name}
                        </h3>
                        <Badge variant='secondary'>
                          ID: {user.id.slice(0, 8)}...
                        </Badge>
                      </div>
                      <p className='text-sm text-[var(--text-muted)] mb-1'>
                        📧 {user.email}
                      </p>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-[var(--text-muted)]'>
                        <span>作成: {formatJaDate(user.createdAt)}</span>
                        <Separator
                          orientation='vertical'
                          className='hidden sm:block h-3'
                        />
                        <span>更新: {formatJaDate(user.updatedAt)}</span>
                      </div>
                    </div>

                    {/* アクション */}
                    <div className='flex gap-2'>
                      <Button asChild variant='secondary' size='sm'>
                        <Link href={routes.users.detail(user.id)}>詳細</Link>
                      </Button>
                      <Button asChild variant='outline' size='sm'>
                        <Link href={routes.users.edit(user.id)}>編集</Link>
                      </Button>
                      <DeleteUserButton
                        userId={user.id}
                        userName={user.name}
                        variant='destructive'
                        size='sm'
                        onOptimisticDelete={() => {
                          // 削除前にuseOptimisticで即座にリストから除外
                          removeOptimisticUser(user.id);
                        }}
                        onSuccess={handleDeleteSuccess}
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card>
            ))
          )}

          {/* ページネーション */}
          {optimisticUsers.totalPages > 1 && (
            <Card variant='bordered' padding='md'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div className='text-sm text-[var(--text-muted)]'>
                  ページ {optimisticUsers.currentPage} /{' '}
                  {optimisticUsers.totalPages}（{optimisticUsers.totalCount}件中{' '}
                  {(optimisticUsers.currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(
                    optimisticUsers.currentPage * PAGE_SIZE,
                    optimisticUsers.totalCount,
                  )}
                  件を表示）
                </div>

                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!optimisticUsers.hasPreviousPage || isPending}
                    onClick={() =>
                      handlePageChange(optimisticUsers.currentPage - 1)
                    }
                  >
                    前のページ
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!optimisticUsers.hasNextPage || isPending}
                    onClick={() =>
                      handlePageChange(optimisticUsers.currentPage + 1)
                    }
                  >
                    次のページ
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
