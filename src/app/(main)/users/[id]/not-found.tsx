import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { routes } from '@/lib/routes';

/**
 * ユーザー詳細・編集ページの404ページ
 *
 * Next.js App Router パターン:
 * - notFound() 呼び出し時に表示されるカスタム404 UI
 * - ユーザー一覧へのナビゲーションを提供
 */
export default function UserNotFound() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full'>
        <Card variant='elevated' padding='lg' className='text-center'>
          <Card.Header>
            <div className='space-y-4'>
              <div className='text-6xl font-bold text-[var(--text-disabled)]'>
                404
              </div>
              <h1 className='text-2xl font-bold text-[var(--text-primary)] text-balance'>
                ユーザーが見つかりません
              </h1>
              <p className='text-sm text-[var(--text-muted)]'>
                指定されたユーザーは存在しないか、既に削除されています。
              </p>
            </div>
          </Card.Header>

          <Card.Content>
            <div className='flex flex-col gap-3 mt-4'>
              <Button
                variant='aurora'
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
