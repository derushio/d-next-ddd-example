'use client';

import { Alert, Button, Label, TextInput } from 'flowbite-react';
import { getSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiEye, HiEyeOff, HiMail } from 'react-icons/hi';

interface SignInFormProps {
  callbackUrl?: string;
}

/**
 * サインインフォームのクライアント側処理
 * Client Component（最小範囲）
 *
 * DDD/Clean Architecture パターン:
 * - NextAuth signIn関数でセッション管理
 * - ドーナツ構造の原則に従い最小範囲でClient Component化
 * - TailwindCSS v4記法使用
 */
export function SignInFormClient({ callbackUrl = '/' }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // NextAuth signIn関数でセッション管理統合
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // 手動でリダイレクト制御
      });

      if (result?.error) {
        // NextAuthエラーハンドリング
        switch (result.error) {
          case 'CredentialsSignin':
            setError('メールアドレスまたはパスワードが正しくありません');
            break;
          default:
            setError('サインインに失敗しました。もう一度お試しください。');
        }
        return;
      }

      if (result?.ok) {
        // サインイン成功時は即座にリダイレクト
        // E2E環境でgetSession()が正しく動作しない場合があるため、
        // NextAuthのsignIn結果のokフラグを信頼してリダイレクト
        router.push(callbackUrl);
        router.refresh(); // セッション状態を反映
      }
    } catch (error) {
      console.error('サインインエラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      {/* エラー表示 */}
      {error && (
        <Alert color='failure' className='mb-6'>
          <span className='font-medium'>エラー!</span> {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* メールアドレス入力 */}
        <div className='space-y-2'>
          <Label
            htmlFor='email'
            className='block text-sm font-medium text-gray-900'
          >
            メールアドレス
          </Label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <HiMail className='h-5 w-5 text-gray-400' />
            </div>
            <TextInput
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
              placeholder='user@example.com'
              className='pl-10'
              disabled={isLoading}
            />
          </div>
        </div>

        {/* パスワード入力 */}
        <div className='space-y-2'>
          <Label
            htmlFor='password'
            className='block text-sm font-medium text-gray-900'
          >
            パスワード
          </Label>
          <div className='relative'>
            <TextInput
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              required
              placeholder='8文字以上のパスワード'
              className='pr-10'
              disabled={isLoading}
            />
            <button
              type='button'
              className='absolute inset-y-0 right-0 pr-3 flex items-center'
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <HiEyeOff className='h-5 w-5 text-gray-400 hover:text-gray-600' />
              ) : (
                <HiEye className='h-5 w-5 text-gray-400 hover:text-gray-600' />
              )}
            </button>
          </div>
        </div>

        {/* サインインボタン */}
        <Button
          type='submit'
          className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
          disabled={isLoading}
        >
          {isLoading ? (
            <div className='flex items-center justify-center'>
              <svg
                className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                />
              </svg>
              サインイン中...
            </div>
          ) : (
            <span className='font-semibold'>サインイン</span>
          )}
        </Button>

        {/* 新規登録リンク */}
        <div className='text-center'>
          <p className='text-sm text-gray-600'>
            アカウントをお持ちでない場合は
          </p>
          <a
            href='/auth/register'
            className='mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200'
          >
            新規登録はこちら
          </a>
        </div>
      </form>
    </div>
  );
}
