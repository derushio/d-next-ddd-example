import { Home, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'アカウント登録 - Clean Architecture Sample',
  description: 'アカウント登録ページ - Clean Architecture サンプルアプリ',
};

/**
 * アカウント登録ページ（スタブ）
 * Server Component
 */
export default function RegisterPage() {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <div className='mx-auto size-16 gradient-aurora rounded-full flex items-center justify-center mb-6 shadow-lg'>
            <UserPlus className='size-8 text-white' aria-hidden='true' />
          </div>
          <h1 className='text-3xl font-bold text-foreground'>アカウント登録</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Clean Architecture サンプルアプリ
          </p>
        </div>

        <Card className='shadow-xl'>
          <div className='p-6 space-y-6 text-center'>
            <div className='p-4 bg-muted rounded-2xl'>
              <p className='text-muted-foreground font-medium'>
                このページは現在準備中です
              </p>
              <p className='text-sm text-muted-foreground mt-1'>
                アカウント登録機能は近日公開予定です
              </p>
            </div>

            <Button
              variant='ghost'
              size='default'
              className='w-full cursor-pointer'
              asChild
            >
              <Link href={routes.home}>
                <Home aria-hidden='true' />
                ホームに戻る
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
