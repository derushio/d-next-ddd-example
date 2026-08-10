import { Home, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'お問い合わせ - Clean Architecture Sample',
  description: 'お問い合わせページ - Clean Architecture サンプルアプリ',
};

/**
 * お問い合わせページ（スタブ）
 * Server Component
 */
export default function ContactPage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden'>
      {/* Background decoration */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-1/4 left-1/4 size-80 bg-gradient-to-r from-cyan-300 to-blue-300 rounded-full blur-2xl will-change-transform' />
        <div className='absolute bottom-1/4 right-1/4 size-96 bg-gradient-to-r from-blue-200 to-violet-200 rounded-full blur-2xl will-change-transform' />
      </div>

      <div className='max-w-md w-full space-y-8 relative z-10'>
        {/* Header */}
        <div className='text-center'>
          <div className='mx-auto size-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg'>
            <Mail className='size-8 text-white' aria-hidden='true' />
          </div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent'>
            お問い合わせ
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Clean Architecture サンプルアプリ
          </p>
        </div>

        {/* Card */}
        <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <div className='p-6 space-y-6 text-center'>
            <div className='p-4 bg-muted rounded-2xl'>
              <p className='text-muted-foreground font-medium'>
                このページは現在準備中です
              </p>
              <p className='text-sm text-muted-foreground mt-1'>
                お問い合わせフォームは近日公開予定です
              </p>
            </div>

            <Button variant='outline' size='default' className='w-full' asChild>
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
