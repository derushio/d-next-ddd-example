import { CircleAlert, Home, LogIn } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { routes } from '@/lib/routes';

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
          <div className='mx-auto size-16 bg-gradient-to-r from-[var(--error)] to-[var(--warning)] rounded-full flex items-center justify-center mb-6 shadow-lg'>
            <CircleAlert
              className='size-8 text-[var(--text-inverse)]'
              aria-hidden='true'
            />
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
              <Button variant='aurora' size='default' fullWidth asChild>
                <Link href={routes.auth.signIn}>
                  <LogIn aria-hidden='true' />
                  サインインページに戻る
                </Link>
              </Button>

              <Button variant='outline' size='default' fullWidth asChild>
                <Link href={routes.home}>
                  <Home aria-hidden='true' />
                  ホームに戻る
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* フッター部分 */}
        <div className='text-center space-y-2'>
          <p className='text-xs text-[var(--text-muted)]'>
            問題が解決しない場合は、お問い合わせください
          </p>
          <div className='flex justify-center space-x-4 text-xs text-[var(--text-disabled)]'>
            <Link
              href={routes.support.contact}
              className='hover:text-[var(--text-muted)] transition-colors'
            >
              お問い合わせ
            </Link>
            <span>|</span>
            <Link
              href={routes.support.help}
              className='hover:text-[var(--text-muted)] transition-colors'
            >
              ヘルプ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
