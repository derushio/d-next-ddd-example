'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { routes } from '@/lib/routes';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ユーザー管理セクションのエラーバウンダリ
 *
 * Next.js App Router パターン:
 * - ユーザー管理操作中の予期しないエラー発生時に表示
 * - reset() によるリトライ、一覧への復帰、ホームへのナビゲーションを提供
 */
export default function UsersError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full'>
        <Card variant='elevated' padding='lg' className='text-center'>
          <Card.Header>
            <div className='space-y-4'>
              <div className='flex justify-center'>
                <AlertTriangle
                  className='size-12 text-violet-500'
                  aria-hidden='true'
                />
              </div>
              <h1 className='text-2xl font-bold text-[var(--text-primary)] text-balance'>
                ユーザー管理でエラーが発生しました
              </h1>
              <p className='text-sm text-[var(--text-muted)]'>
                予期しないエラーが発生しました。もう一度お試しください。
              </p>
              {error.digest && (
                <p className='text-xs text-[var(--text-muted)] bg-muted rounded-lg p-2 font-mono'>
                  エラーID: {error.digest}
                </p>
              )}
            </div>
          </Card.Header>

          <Card.Content>
            <div className='flex flex-col gap-3 mt-4'>
              <Button
                variant='aurora'
                size='lg'
                onClick={reset}
                className='w-full cursor-pointer'
              >
                もう一度試す
              </Button>
              <Button
                variant='outline'
                size='lg'
                asChild
                className='w-full cursor-pointer'
              >
                <Link href={routes.users.list()}>ユーザー一覧に戻る</Link>
              </Button>
              <Button
                variant='outline'
                size='lg'
                asChild
                className='w-full cursor-pointer'
              >
                <Link href={routes.home}>ホームに戻る</Link>
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
