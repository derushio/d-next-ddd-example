'use server';

import { getUserById } from '@/app/server-actions/user/getUserById';
import { DeleteUserButton } from '@/components/features/user/DeleteUserButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';

import { clsx } from 'clsx';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface UserDetailPageProps {
  params: { id: string };
}

/**
 * ユーザー詳細ページ
 * Server Component（メイン）構成
 *
 * DDD/Clean Architecture パターン:
 * - Server ComponentでSSRによる初期データ取得
 * - 詳細情報の表示と各種アクションへのナビゲーション
 */
export default async function UserDetailPage({ params }: UserDetailPageProps) {
  // ユーザーデータ取得
  const result = await getUserById({ userId: params.id });

  // エラーハンドリング
  if ('error' in result) {
    if (result.code === 'USER_NOT_FOUND') {
      notFound();
    }

    return (
      <div className='min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 relative overflow-hidden'>
        <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
          <div className='max-w-4xl mx-auto text-center'>
            <h1 className='text-4xl font-bold text-red-600 mb-4'>
              エラーが発生しました
            </h1>
            <p className='text-xl text-gray-600'>{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const user = result.user;

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl'></div>
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full blur-3xl'></div>
      </div>

      {/* メインコンテンツ */}
      <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* ページヘッダー */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl sm:text-6xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-purple-600 via-pink-600 to-violet-600 bg-clip-text text-transparent'>
                User Detail
              </span>
            </h1>
            <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
              ユーザー詳細情報とアクション管理
            </p>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* メイン詳細情報 */}
            <div className='lg:col-span-2'>
              <Card variant='elevated' padding='lg' className='mb-6'>
                <Card.Header>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-2xl font-bold text-[var(--text-primary)]'>
                      基本情報
                    </h2>
                    <Badge variant='secondary'>
                      ID: {user.id.slice(0, 8)}...
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className='space-y-6'>
                    <div>
                      <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-2'>
                        👤 ユーザー名
                      </h3>
                      <p className='text-xl text-gray-700 bg-gray-50 p-3 rounded-lg'>
                        {user.name}
                      </p>
                    </div>

                    <div>
                      <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-2'>
                        📧 メールアドレス
                      </h3>
                      <p className='text-xl text-gray-700 bg-gray-50 p-3 rounded-lg'>
                        {user.email}
                      </p>
                    </div>

                    <Separator />

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div>
                        <h3 className='text-sm font-semibold text-gray-600 mb-1'>
                          作成日時
                        </h3>
                        <p className='text-gray-700'>
                          {new Date(user.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-gray-600 mb-1'>
                          最終更新日時
                        </h3>
                        <p className='text-gray-700'>
                          {new Date(user.updatedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>

            {/* アクションパネル */}
            <div className='lg:col-span-1'>
              <Card variant='bordered' padding='lg' className='sticky top-8'>
                <Card.Header>
                  <h2 className='text-xl font-bold text-[var(--text-primary)]'>
                    アクション
                  </h2>
                </Card.Header>
                <Card.Content>
                  <div className='space-y-3'>
                    <Link href={`/users/${user.id}/edit`} className='block'>
                      <Button
                        variant='primary'
                        size='lg'
                        className={clsx('w-full cursor-pointer')}
                      >
                        ✏️ ユーザーを編集
                      </Button>
                    </Link>

                    <DeleteUserButton
                      userId={user.id}
                      userName={user.name}
                      className='w-full'
                    />

                    <Separator />

                    <Link href='/users' className='block'>
                      <Button
                        variant='outline'
                        size='lg'
                        className={clsx('w-full cursor-pointer')}
                      >
                        ← 一覧に戻る
                      </Button>
                    </Link>

                    <Link href='/users/new' className='block'>
                      <Button
                        variant='secondary'
                        size='lg'
                        className={clsx('w-full cursor-pointer')}
                      >
                        ＋ 新規作成
                      </Button>
                    </Link>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
