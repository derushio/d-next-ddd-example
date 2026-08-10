'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { EmailField } from '@/components/features/auth/SignInForm/EmailField';
import { ErrorAlert } from '@/components/features/auth/SignInForm/ErrorAlert';
import { PasswordField } from '@/components/features/auth/SignInForm/PasswordField';
import { RegisterLink } from '@/components/features/auth/SignInForm/RegisterLink';
import { SignInButton } from '@/components/features/auth/SignInForm/SignInButton';
import { Card } from '@/components/ui/card';
import { Form, FormField } from '@/components/ui/form';
import { useServerAction } from '@/hooks/useServerAction';
import { signInSchema } from '@/layers/infrastructure/types/zod/authSchema';

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  callbackUrl?: string | undefined;
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
 * - react-hook-form + zodResolver によるバリデーション
 */
export function SignInFormClient({ callbackUrl = '/' }: SignInFormProps) {
  const router = useRouter();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { execute, isPending } = useServerAction({
    form,
    defaultErrorMessage: '予期しないエラーが発生しました',
  });

  const onSubmit = (values: SignInFormValues) => {
    execute(async () => {
      // NextAuth signIn関数でセッション管理統合
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false, // 手動でリダイレクト制御
      });

      if (result?.error) {
        // NextAuthエラーハンドリング
        let errorMessage: string;
        switch (result.error) {
          case 'CredentialsSignin':
            errorMessage = 'メールアドレスまたはパスワードが正しくありません';
            break;
          default:
            errorMessage = 'サインインに失敗しました。もう一度お試しください。';
        }
        form.setError('root', { type: 'server', message: errorMessage });
        toast.error(errorMessage);
        return;
      }

      if (result?.ok) {
        // サインイン成功時は即座にリダイレクト
        // E2E環境でgetSession()が正しく動作しない場合があるため、
        // NextAuthのsignIn結果のokフラグを信頼してリダイレクト
        router.push(callbackUrl as Route);
        router.refresh(); // セッション状態を反映
      }
    });
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card
        variant='elevated'
        padding='lg'
        className='backdrop-blur-sm bg-[var(--surface)]/95'
      >
        <Card.Header>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-[var(--text-primary)] mb-2 text-balance'>
              サインイン
            </h1>
            <p className='text-sm text-[var(--text-muted)]'>
              アカウントにサインインしてご利用ください
            </p>
          </div>
        </Card.Header>

        <Card.Content>
          {/* エラー表示 */}
          {form.formState.errors.root?.message && (
            <div className='mb-6'>
              <ErrorAlert error={form.formState.errors.root.message} />
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* メールアドレス入力 */}
              <FormField
                control={form.control}
                name='email'
                render={({ field, fieldState }) => (
                  <EmailField error={fieldState.error?.message} field={field} />
                )}
              />

              {/* パスワード入力 */}
              <FormField
                control={form.control}
                name='password'
                render={({ field, fieldState }) => (
                  <PasswordField
                    error={fieldState.error?.message}
                    field={field}
                  />
                )}
              />

              {/* サインインボタン */}
              <SignInButton isPending={isPending} />
            </form>
          </Form>
        </Card.Content>

        <Card.Footer>
          {/* 新規登録リンク */}
          <div className='w-full'>
            <RegisterLink />
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
