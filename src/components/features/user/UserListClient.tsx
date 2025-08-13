'use client';

import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';

import {
  getUsers,
  type GetUsersParams,
} from '@/app/server-actions/user/getUsers';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface UserListProps {
  initialParams?: Partial<GetUsersParams>;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UsersResponse {
  users: UserData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
export function UserListClient({ initialParams = {} }: UserListProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    initialParams.searchQuery || '',
  );
  const [currentPage, setCurrentPage] = useState(initialParams.page || 1);

  // ユーザー一覧を取得する関数
  const fetchUsers = async (params: Partial<GetUsersParams> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getUsers({
        ...initialParams,
        ...params,
        searchQuery: searchQuery || undefined,
        page: currentPage,
      });

      if ('success' in result && result.success) {
        setUsers(result.data);
      } else if ('error' in result) {
        setError(result.error || null);
      }
    } catch (error) {
      console.error('ユーザー一覧取得エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchUsers();
  }, []);

  // 検索実行
  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  // ページ変更
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers({ page });
  };

  // Enter キーで検索実行
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={clsx('w-full max-w-4xl mx-auto')}>
      {/* ヘッダー */}
      <Card variant='elevated' padding='lg' className={clsx('mb-6')}>
        <Card.Header>
          <div
            className={clsx(
              'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
            )}
          >
            <div>
              <h1
                className={clsx(
                  'text-2xl font-bold text-[var(--text-primary)]',
                )}
              >
                ユーザー一覧
              </h1>
              {users && (
                <p className={clsx('text-sm text-[var(--text-muted)] mt-1')}>
                  {users.totalCount}人のユーザーが登録されています
                </p>
              )}
            </div>

            {/* 検索欄 */}
            <div className={clsx('flex gap-2')}>
              <Input
                type='text'
                placeholder='ユーザー名で検索...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className={clsx('w-48')}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                variant='primary'
                size='sm'
              >
                検索
              </Button>
              <Button
                onClick={() => router.push('/users/new')}
                disabled={isLoading}
                variant='secondary'
                size='sm'
                className={clsx('cursor-pointer')}
              >
                ＋ 新規作成
              </Button>
            </div>
          </div>
        </Card.Header>
      </Card>

      {/* エラー表示 */}
      {error && (
        <div className={clsx('mb-6')}>
          <Alert variant='destructive' title='エラー'>
            {error}
          </Alert>
        </div>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <div className={clsx('mb-6')}>
          <Loading />
        </div>
      )}

      {/* ユーザー一覧 */}
      {users && (
        <div className={clsx('space-y-4')}>
          {users.users.length === 0 ? (
            <Card variant='bordered' padding='lg'>
              <div
                className={clsx('text-center text-[var(--text-muted)] py-8')}
              >
                ユーザーが見つかりませんでした
              </div>
            </Card>
          ) : (
            <>
              {users.users.map((user) => (
                <Card key={user.id} variant='bordered' padding='md' hover>
                  <Card.Content>
                    <div
                      className={clsx(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      )}
                    >
                      <div className={clsx('flex-1')}>
                        <div className={clsx('flex items-center gap-3 mb-2')}>
                          <h3
                            className={clsx(
                              'text-lg font-semibold text-[var(--text-primary)]',
                            )}
                          >
                            {user.name}
                          </h3>
                          <Badge variant='secondary'>
                            ID: {user.id.slice(0, 8)}...
                          </Badge>
                        </div>
                        <p
                          className={clsx(
                            'text-sm text-[var(--text-muted)] mb-1',
                          )}
                        >
                          📧 {user.email}
                        </p>
                        <div
                          className={clsx(
                            'flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-[var(--text-muted)]',
                          )}
                        >
                          <span>
                            作成:{' '}
                            {new Date(user.createdAt).toLocaleDateString(
                              'ja-JP',
                            )}
                          </span>
                          <Separator
                            orientation='vertical'
                            className={clsx('hidden sm:block h-3')}
                          />
                          <span>
                            更新:{' '}
                            {new Date(user.updatedAt).toLocaleDateString(
                              'ja-JP',
                            )}
                          </span>
                        </div>
                      </div>

                      {/* アクション */}
                      <div className={clsx('flex gap-2')}>
                        <Button
                          variant='secondary'
                          size='sm'
                          disabled={isLoading}
                          onClick={() => router.push(`/users/${user.id}`)}
                          className={clsx('cursor-pointer')}
                        >
                          詳細
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={isLoading}
                          onClick={() => router.push(`/users/${user.id}/edit`)}
                          className={clsx('cursor-pointer')}
                        >
                          編集
                        </Button>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {/* ページネーション */}
          {users.totalPages > 1 && (
            <Card variant='bordered' padding='md'>
              <div
                className={clsx(
                  'flex flex-col sm:flex-row items-center justify-between gap-4',
                )}
              >
                <div className={clsx('text-sm text-[var(--text-muted)]')}>
                  ページ {users.currentPage} / {users.totalPages}（
                  {users.totalCount}件中 {(users.currentPage - 1) * 10 + 1}-
                  {Math.min(users.currentPage * 10, users.totalCount)}件を表示）
                </div>

                <div className={clsx('flex gap-2')}>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!users.hasPreviousPage || isLoading}
                    onClick={() => handlePageChange(users.currentPage - 1)}
                  >
                    前のページ
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!users.hasNextPage || isLoading}
                    onClick={() => handlePageChange(users.currentPage + 1)}
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
