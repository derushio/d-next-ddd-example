import { Card } from '@/components/ui/card';

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication Error - Clean Architecture Sample',
  description: '認証エラーページ - Clean Architecture サンプルアプリ',
};

interface ErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

/**
 * 認証エラーページ
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - 静的コンテンツのためServer Componentで実装
 * - TailwindCSS v4記法使用
 * - 美しいエラーハンドリングUI
 */
export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { error } = await searchParams;

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case 'CredentialsSignin':
        return {
          title: '認証情報エラー',
          message: 'メールアドレスまたはパスワードが正しくありません',
          suggestion: 'メールアドレスとパスワードを確認してください',
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth認証エラー',
          message: 'OAuth認証でエラーが発生しました',
          suggestion: 'しばらく時間をおいてから再度お試しください',
        };
      case 'OAuthCallback':
        return {
          title: '認証コールバックエラー',
          message: 'OAuth認証のコールバック処理でエラーが発生しました',
          suggestion: '認証プロバイダーとの連携に問題がある可能性があります',
        };
      case 'OAuthCreateAccount':
        return {
          title: 'アカウント作成エラー',
          message: 'OAuthアカウントの作成に失敗しました',
          suggestion: 'アカウントが既に存在する可能性があります',
        };
      case 'EmailCreateAccount':
        return {
          title: 'メールアカウント作成エラー',
          message: 'メールアカウントの作成に失敗しました',
          suggestion: 'メールアドレスが既に使用されている可能性があります',
        };
      case 'Callback':
        return {
          title: 'コールバック処理エラー',
          message: 'コールバック処理でエラーが発生しました',
          suggestion: 'ネットワーク接続を確認してください',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'アカウント連携エラー',
          message: 'このメールアドレスは別のアカウントで既に使用されています',
          suggestion: '別の認証方法でサインインしてください',
        };
      case 'EmailSignin':
        return {
          title: 'メール認証エラー',
          message: 'メール認証でエラーが発生しました',
          suggestion: 'メールアドレスを確認してください',
        };
      case 'CredentialsSignup':
        return {
          title: 'アカウント作成エラー',
          message: 'アカウント作成でエラーが発生しました',
          suggestion: '入力内容を確認してください',
        };
      case 'SessionRequired':
        return {
          title: 'サインインが必要です',
          message: 'このページにアクセスするにはサインインが必要です',
          suggestion: 'サインインしてからアクセスしてください',
        };
      default:
        return {
          title: '認証エラー',
          message: '認証処理でエラーが発生しました',
          suggestion: 'しばらく時間をおいてから再度お試しください',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className='min-h-screen bg-gradient-to-br from-[var(--error-light)] via-[var(--surface)] to-[var(--warning-light)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        {/* ヘッダー部分 */}
        <div className='text-center'>
          <div className='mx-auto h-16 w-16 bg-gradient-to-r from-[var(--error)] to-[var(--warning)] rounded-full flex items-center justify-center mb-6 shadow-lg'>
            <svg
              className='h-8 w-8 text-[var(--text-inverse)]'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 19.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>

          <h2 className='text-3xl font-bold bg-gradient-to-r from-[var(--error)] to-[var(--warning)] bg-clip-text text-transparent'>
            {errorInfo.title}
          </h2>

          <p className='mt-3 text-sm text-[var(--text-muted)] font-medium'>
            Clean Architecture サンプルアプリ
          </p>
        </div>

        {/* エラーカード */}
        <Card
          variant='glass'
          className='shadow-xl border-0 bg-[var(--surface)]/80 backdrop-blur-sm'
        >
          <div className='p-6 space-y-6 text-center'>
            {/* エラーメッセージ */}
            <div className='p-4 bg-[var(--error-light)] border-l-4 border-[var(--error)] rounded-r-lg'>
              <div className='flex flex-col space-y-2'>
                <p className='text-[var(--error)] font-semibold text-sm'>
                  {errorInfo.message}
                </p>
                <p className='text-[var(--error)] text-xs'>
                  {errorInfo.suggestion}
                </p>
              </div>
            </div>

            {/* アクションボタン */}
            <div className='space-y-3'>
              <Link
                href='/auth/sign-in'
                className='w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-[var(--text-inverse)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-hover)] hover:to-[var(--secondary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary-muted)] transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
              >
                <svg
                  className='h-4 w-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                  />
                </svg>
                サインインページに戻る
              </Link>

              <Link
                href='/'
                className='w-full inline-flex justify-center items-center px-4 py-3 border border-[var(--border)] text-sm font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-[var(--surface-50)] focus:outline-none focus:ring-4 focus:ring-[var(--border-light)] transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
              >
                <svg
                  className='h-4 w-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                  />
                </svg>
                ホームに戻る
              </Link>
            </div>
          </div>
        </Card>

        {/* フッター部分 */}
        <div className='text-center space-y-2'>
          <p className='text-xs text-[var(--text-muted)]'>
            問題が解決しない場合は、お問い合わせください
          </p>
          <div className='flex justify-center space-x-4 text-xs text-[var(--text-disabled)]'>
            <a
              href='/contact'
              className='hover:text-[var(--text-muted)] transition-colors'
            >
              お問い合わせ
            </a>
            <span>|</span>
            <a
              href='/help'
              className='hover:text-[var(--text-muted)] transition-colors'
            >
              ヘルプ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
