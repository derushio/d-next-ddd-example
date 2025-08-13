'use client';

import { updateUser } from '@/app/server-actions/user/updateUser';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EditUserFormProps {
  user: UserData;
  onSuccess?: () => void;
}

/**
 * ユーザー編集フォームコンポーネント
 * Client Component（最小範囲）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - バリデーション機能付き
 * - 更新成功時の自動遷移
 */
export function EditUserFormClient({ user, onSuccess }: EditUserFormProps) {
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
      const result = await updateUser({
        userId: user.id,
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      });

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
      console.error('ユーザー更新エラー:', error);
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
              <div className={clsx('text-6xl mb-4')}>✨</div>
              <h2 className={clsx('text-2xl font-bold text-blue-600 mb-2')}>
                ユーザー更新完了！
              </h2>
              <p className={clsx('text-gray-600 mb-4')}>
                ユーザー情報が正常に更新されました
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
              ユーザー編集
            </h1>
            <p className={clsx('text-sm text-[var(--text-muted)]')}>
              ユーザー情報を編集します
            </p>
            <div
              className={clsx(
                'mt-2 text-xs text-[var(--text-muted)] bg-gray-50 rounded-lg p-2',
              )}
            >
              <strong>ID:</strong> {user.id.slice(0, 8)}...
              <br />
              <strong>作成日:</strong>{' '}
              {new Date(user.createdAt).toLocaleDateString('ja-JP')}
              <br />
              <strong>最終更新:</strong>{' '}
              {new Date(user.updatedAt).toLocaleDateString('ja-JP')}
            </div>
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
                defaultValue={user.name}
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
                defaultValue={user.email}
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

            {/* 更新ボタン */}
            <div className={clsx('flex gap-3')}>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                disabled={isLoading}
                className={clsx('flex-1 cursor-pointer')}
              >
                {isLoading ? 'ユーザー更新中...' : 'ユーザーを更新'}
              </Button>

              <Button
                type='button'
                variant='secondary'
                size='lg'
                onClick={() => router.push('/users')}
                disabled={isLoading}
                className={clsx('cursor-pointer')}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Card.Content>

        <Card.Footer>
          <div
            className={clsx(
              'flex justify-between items-center w-full text-xs text-[var(--text-muted)]',
            )}
          >
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

            <Button
              variant='ghost'
              size='sm'
              onClick={() => router.push(`/users/${user.id}`)}
              disabled={isLoading}
              className={clsx(
                'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              詳細表示 →
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
