import { Mail, Pencil, User } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackgroundDecoration } from '@/components/common/BackgroundDecoration';
import { DeleteUserButton } from '@/components/features/user/DeleteUserButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getCachedUserByIdAction } from '@/lib/cachedQueries';
import { routes } from '@/lib/routes';
import { formatJaDateTime } from '@/utils/dfUtils';

interface UserDetailPageProps {
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
    title: result.success
      ? `${result.data.name} — ユーザー詳細`
      : 'ユーザー詳細',
  };
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
  const { id } = await params;
  // ユーザーデータ取得
  const result = await getCachedUserByIdAction(id);

  // エラーハンドリング
  if (!result.success) {
    if (result.code === 'USER_NOT_FOUND') {
      notFound();
    }

    return (
      <div className='min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 relative overflow-hidden'>
        <div className='relative z-10 min-h-full py-8 px-4 sm:py-12 sm:px-6 lg:px-8'>
          <div className='max-w-4xl mx-auto text-center'>
            <h1 className='text-4xl font-bold text-destructive mb-4'>
              エラーが発生しました
            </h1>
            <p className='text-xl text-muted-foreground'>{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const user = result.data;

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden'>
      {/* 背景装飾エフェクト */}
      <BackgroundDecoration blob1='purple-pink' blob2='violet-purple' />

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
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
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
                      <h3 className='text-lg font-semibold text-balance text-[var(--text-primary)] mb-2'>
                        <User className='inline-block size-4 mr-1' /> ユーザー名
                      </h3>
                      <p className='text-xl text-foreground bg-muted p-3 rounded-lg'>
                        {user.name}
                      </p>
                    </div>

                    <div>
                      <h3 className='text-lg font-semibold text-balance text-[var(--text-primary)] mb-2'>
                        <Mail className='inline-block size-4 mr-1' />{' '}
                        メールアドレス
                      </h3>
                      <p className='text-xl text-foreground bg-muted p-3 rounded-lg'>
                        {user.email}
                      </p>
                    </div>

                    <Separator />

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div>
                        <h3 className='text-sm font-semibold text-muted-foreground mb-1'>
                          作成日時
                        </h3>
                        <p className='text-foreground'>
                          {formatJaDateTime(user.createdAt)}
                        </p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-muted-foreground mb-1'>
                          最終更新日時
                        </h3>
                        <p className='text-foreground'>
                          {formatJaDateTime(user.updatedAt)}
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
                    <Button
                      asChild
                      variant='aurora'
                      size='lg'
                      className='w-full cursor-pointer'
                    >
                      <Link href={routes.users.edit(user.id)}>
                        <Pencil className='inline-block size-4 mr-1' />{' '}
                        ユーザーを編集
                      </Link>
                    </Button>

                    <DeleteUserButton
                      userId={user.id}
                      userName={user.name}
                      className='w-full'
                    />

                    <Separator />

                    <Button
                      asChild
                      variant='outline'
                      size='lg'
                      className='w-full cursor-pointer'
                    >
                      <Link href={routes.users.list()}>← 一覧に戻る</Link>
                    </Button>

                    <Button
                      asChild
                      variant='secondary'
                      size='lg'
                      className='w-full cursor-pointer'
                    >
                      <Link href={routes.users.new}>＋ 新規作成</Link>
                    </Button>
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
