import { SignInFormClient } from '@/components/features/auth/SignInFormClient';

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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-12 relative overflow-hidden'>
      {/* 🌟 Background decoration - 落ち着いたデザイン */}
      <div className='absolute inset-0 opacity-30'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-200 to-purple-200 rounded-full blur-3xl'></div>
      </div>

      <div className='max-w-md w-full space-y-8 relative z-10'>
        {/* 🎨 Clean Modern Card */}
        <div className='bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50'>
          {/* ヘッダー部分（Server Component - 静的コンテンツ） */}
          <div className='text-center'>
            <div className='mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg hover:scale-110 transition-transform duration-300'>
              <svg
                className='h-10 w-10 text-white drop-shadow-lg'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2.5}
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </div>

            <h2 className='text-4xl font-bold mb-2'>
              <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                ようこそ
              </span>
            </h2>

            <h3 className='text-xl font-semibold text-gray-900 mb-4'>
              アカウントにサインイン
            </h3>

            {/* 🌟 NextAuthエラー表示 - Clean Design */}
            {error && (
              <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl'>
                <div className='flex items-center space-x-3'>
                  <svg
                    className='h-5 w-5 text-red-600 flex-shrink-0'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                  <p className='text-sm text-red-800 font-medium'>
                    {error === 'CredentialsSignin'
                      ? 'メールアドレスまたはパスワードが正しくありません'
                      : '認証エラーが発生しました'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* サインインフォーム（Client Component - インタラクティブ部分） */}
          {/* DDD準拠: Client Component → NextAuth → CredentialsProvider → SignInUseCase */}
          <Suspense
            fallback={
              <div className='flex items-center justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]'></div>
              </div>
            }
          >
            <SignInFormClient callbackUrl={callbackUrl} />
          </Suspense>

          {/* 🌟 Clean Footer */}
          <div className='text-center space-y-4 mt-8'>
            <div className='flex justify-center space-x-6 text-sm text-gray-600'>
              <a
                href='/privacy'
                className='hover:text-blue-600 transition-colors duration-300 font-medium'
              >
                プライバシーポリシー
              </a>
              <span className='text-gray-400'>•</span>
              <a
                href='/terms'
                className='hover:text-blue-600 transition-colors duration-300 font-medium'
              >
                利用規約
              </a>
            </div>

            {/* ✨ Decorative gradient line */}
            <div className='w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto'></div>

            <p className='text-xs text-gray-500'>
              Powered by{' '}
              <span className='font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                Modern Design System
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
