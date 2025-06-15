import { SignInFormClient } from '@/components/auth/SignInFormClient';

import { Card } from 'flowbite-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Sign In - Clean Architecture Sample',
  description: 'サインインページ - Clean Architecture サンプルアプリ',
};

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

/**
 * サインインページ
 * Server Component - DDD/Clean Architecture準拠
 *
 * DDD/Clean Architecture パターン:
 * - Client ComponentでNextAuthのsignIn関数使用
 * - NextAuth CredentialsProviderがSignInUseCaseを呼び出し
 * - ドーナツ構造：静的コンテンツはServer Component、インタラクティブ部分のみClient Component
 * - NextAuthのコールバック機能対応
 * - TailwindCSS v4記法使用
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        {/* ヘッダー部分（Server Component - 静的コンテンツ） */}
        <div className='text-center'>
          <div className='mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg'>
            <svg
              className='h-8 w-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              />
            </svg>
          </div>

          <h2 className='text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
            アカウントにサインイン
          </h2>

          <p className='mt-3 text-sm text-gray-600 font-medium'>
            Clean Architecture サンプルアプリ
          </p>

          {/* NextAuthエラー表示 */}
          {error && (
            <div className='mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-md'>
              <p className='text-sm text-red-700 font-medium'>
                {error === 'CredentialsSignin'
                  ? 'メールアドレスまたはパスワードが正しくありません'
                  : '認証エラーが発生しました'}
              </p>
            </div>
          )}
        </div>

        {/* カード部分 */}
        <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <div className='p-6'>
            {/* サインインフォーム（Client Component - インタラクティブ部分） */}
            {/* DDD準拠: Client Component → NextAuth → CredentialsProvider → SignInUseCase */}
            <Suspense
              fallback={
                <div className='flex items-center justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                </div>
              }
            >
              <SignInFormClient callbackUrl={callbackUrl} />
            </Suspense>
          </div>
        </Card>

        {/* フッター部分（Server Component - 静的コンテンツ） */}
        <div className='text-center space-y-2'>
          <p className='text-xs text-gray-500'>
            このサイトは Clean Architecture + DDD パターンで構築されています
          </p>
          <div className='flex justify-center space-x-4 text-xs text-gray-400'>
            <a
              href='/privacy'
              className='hover:text-gray-600 transition-colors'
            >
              プライバシーポリシー
            </a>
            <span>|</span>
            <a href='/terms' className='hover:text-gray-600 transition-colors'>
              利用規約
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
