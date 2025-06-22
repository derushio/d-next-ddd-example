'use client';

import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { EmailField } from '@/components/features/auth/SignInForm/EmailField';
import { PasswordField } from '@/components/features/auth/SignInForm/PasswordField';
import { ErrorAlert } from '@/components/features/auth/SignInForm/ErrorAlert';
import { SignInButton } from '@/components/features/auth/SignInForm/SignInButton';
import { RegisterLink } from '@/components/features/auth/SignInForm/RegisterLink';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
 * - 分離されたコンポーネント使用でメンテナンス性向上
 */
export function SignInFormClient({ callbackUrl = '/' }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // フォーム送信前のクライアントサイドバリデーション
  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // メールアドレスの基本チェック
    if (!email || !email.includes('@')) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }

    // パスワードの基本チェック
    if (!password || password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    // クライアントサイドバリデーション
    if (!validateForm(formData)) {
      setIsLoading(false);
      return;
    }

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
    <div className={clsx('w-full max-w-md mx-auto')}>
      <Card
        variant='elevated'
        padding='lg'
        className={clsx('backdrop-blur-sm bg-[var(--surface)]/95')}
      >
        <Card.Header>
          <div className={clsx('text-center')}>
            <h1
              className={clsx(
                'text-2xl font-bold text-[var(--text-primary)] mb-2',
              )}
            >
              サインイン
            </h1>
            <p className={clsx('text-sm text-[var(--text-muted)]')}>
              アカウントにサインインしてご利用ください
            </p>
          </div>
        </Card.Header>

        <Card.Content>
          {/* エラー表示 */}
          {error && (
            <div className={clsx('mb-6')}>
              <ErrorAlert error={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className={clsx('space-y-6')}>
            {/* メールアドレス入力 */}
            <EmailField disabled={isLoading} error={fieldErrors.email} />

            {/* パスワード入力 */}
            <PasswordField disabled={isLoading} error={fieldErrors.password} />

            {/* サインインボタン */}
            <SignInButton isLoading={isLoading} />
          </form>
        </Card.Content>

        <Card.Footer>
          {/* 新規登録リンク */}
          <div className={clsx('w-full')}>
            <RegisterLink />
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
