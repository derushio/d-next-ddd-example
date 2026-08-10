import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInFormClient } from '@/components/features/auth/SignInFormClient';
import { routes } from '@/lib/routes';

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
        <div className='absolute top-1/4 left-1/4 size-96 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full blur-2xl will-change-transform'></div>
        <div className='absolute bottom-1/4 right-1/4 size-80 bg-gradient-to-r from-violet-200 to-purple-200 rounded-full blur-2xl will-change-transform'></div>
      </div>

      <div className='max-w-md w-full space-y-8 relative z-10'>
        {/* 🎨 Clean Modern Card */}
        <div className='bg-white rounded-3xl p-8 shadow-xl border border-white/50'>
          {/* ヘッダー部分（Server Component - 静的コンテンツ） */}
          <div className='text-center'>
            <div className='mx-auto size-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg hover:scale-110 transition-transform duration-300'>
              <ShieldCheck
                className='size-10 text-white drop-shadow-lg'
                aria-hidden='true'
              />
            </div>

            <h2 className='text-4xl font-bold mb-2 text-balance'>
              <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                ようこそ
              </span>
            </h2>

            <h3 className='text-xl font-semibold text-foreground mb-4'>
              アカウントにサインイン
            </h3>

            {/* 🌟 NextAuthエラー表示 - Clean Design */}
            {error && (
              <div className='mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl'>
                <div className='flex items-center space-x-3'>
                  <AlertTriangle
                    className='size-5 text-destructive flex-shrink-0'
                    aria-hidden='true'
                  />
                  <p className='text-sm text-destructive font-medium'>
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
          <SignInFormClient callbackUrl={callbackUrl} />

          {/* 🌟 Clean Footer */}
          <div className='text-center space-y-4 mt-8'>
            <div className='flex justify-center space-x-6 text-sm text-muted-foreground'>
              <Link
                href={routes.legal.privacy}
                className='hover:text-primary transition-colors duration-300 font-medium'
              >
                プライバシーポリシー
              </Link>
              <span className='text-muted-foreground'>•</span>
              <Link
                href={routes.legal.terms}
                className='hover:text-primary transition-colors duration-300 font-medium'
              >
                利用規約
              </Link>
            </div>

            {/* ✨ Decorative gradient line */}
            <div className='w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto'></div>

            <p className='text-xs text-muted-foreground'>
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
