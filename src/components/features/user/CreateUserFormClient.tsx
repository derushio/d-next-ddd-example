'use client';

import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';

import { createUser } from '@/app/server-actions/user/createUser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CreateUserFormProps {
  onSuccess?: () => void;
}

/**
 * ユーザー新規作成フォームコンポーネント
 * Client Component（最小範囲）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - バリデーション機能付き
 * - 作成成功時の自動遷移
 */
export function CreateUserFormClient({ onSuccess }: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // フォーム送信前のクライアントサイドバリデーション
  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // 名前の基本チェック
    if (!name || name.trim().length === 0) {
      newErrors.name = '名前を入力してください';
    } else if (name.length > 100) {
      newErrors.name = '名前は100文字以内で入力してください';
    }

    // メールアドレスの基本チェック
    if (!email || !email.includes('@')) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }

    // パスワードの基本チェック
    if (!password || password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    }

    // パスワード確認チェック
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    // クライアントサイドバリデーション
    if (!validateForm(formData)) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await createUser(formData);

      if ('success' in result && result.success) {
        setSuccess(true);
        setError(null);

        // 成功時の処理
        if (onSuccess) {
          onSuccess();
        } else {
          // デフォルトはユーザー一覧に遷移
          setTimeout(() => {
            router.push('/users');
            router.refresh();
          }, 1500);
        }
      } else if ('error' in result) {
        setError(result.error || null);

        // フィールド別エラーがある場合は設定
        if ('errors' in result && result.errors) {
          const formattedErrors: Record<string, string> = {};
          Object.entries(result.errors).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              formattedErrors[key] = value[0];
            }
          });
          setFieldErrors(formattedErrors);
        }
      }
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className={clsx('w-full max-w-md mx-auto')}>
        <Card variant='elevated' padding='lg'>
          <Card.Content>
            <div className={clsx('text-center py-8')}>
              <div className={clsx('text-6xl mb-4')}>🎉</div>
              <h2 className={clsx('text-2xl font-bold text-green-600 mb-2')}>
                ユーザー作成完了！
              </h2>
              <p className={clsx('text-gray-600 mb-4')}>
                新しいユーザーが正常に作成されました
              </p>
              <div className={clsx('animate-pulse text-sm text-gray-500')}>
                ユーザー一覧に移動しています...
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
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
              新規ユーザー作成
            </h1>
            <p className={clsx('text-sm text-[var(--text-muted)]')}>
              新しいユーザーアカウントを作成します
            </p>
          </div>
        </Card.Header>

        <Card.Content>
          {/* エラー表示 */}
          {error && (
            <div className={clsx('mb-6')}>
              <Alert variant='destructive' title='エラー'>
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className={clsx('space-y-6')}>
            {/* 名前入力 */}
            <div className={clsx('space-y-2')}>
              <Label htmlFor='name'>名前</Label>
              <Input
                id='name'
                name='name'
                type='text'
                placeholder='田中太郎'
                disabled={isLoading}
                className={clsx(
                  fieldErrors.name && 'border-red-300 focus:border-red-500',
                )}
              />
              {fieldErrors.name && (
                <p className={clsx('text-xs text-red-600')}>
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* メールアドレス入力 */}
            <div className={clsx('space-y-2')}>
              <Label htmlFor='email'>メールアドレス</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='example@example.com'
                disabled={isLoading}
                className={clsx(
                  fieldErrors.email && 'border-red-300 focus:border-red-500',
                )}
              />
              {fieldErrors.email && (
                <p className={clsx('text-xs text-red-600')}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* パスワード入力 */}
            <div className={clsx('space-y-2')}>
              <Label htmlFor='password'>パスワード</Label>
              <Input
                id='password'
                name='password'
                type='password'
                placeholder='8文字以上で入力してください'
                disabled={isLoading}
                className={clsx(
                  fieldErrors.password && 'border-red-300 focus:border-red-500',
                )}
              />
              {fieldErrors.password && (
                <p className={clsx('text-xs text-red-600')}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* パスワード確認入力 */}
            <div className={clsx('space-y-2')}>
              <Label htmlFor='confirmPassword'>パスワード（確認）</Label>
              <Input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                placeholder='同じパスワードを再入力してください'
                disabled={isLoading}
                className={clsx(
                  fieldErrors.confirmPassword &&
                    'border-red-300 focus:border-red-500',
                )}
              />
              {fieldErrors.confirmPassword && (
                <p className={clsx('text-xs text-red-600')}>
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* 作成ボタン */}
            <Button
              type='submit'
              variant='primary'
              size='lg'
              disabled={isLoading}
              className={clsx('w-full cursor-pointer')}
            >
              {isLoading ? 'ユーザー作成中...' : 'ユーザーを作成'}
            </Button>
          </form>
        </Card.Content>

        <Card.Footer>
          <div className={clsx('text-center')}>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => router.push('/users')}
              disabled={isLoading}
              className={clsx(
                'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              ← ユーザー一覧に戻る
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
