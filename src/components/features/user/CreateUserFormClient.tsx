'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createUser } from '@/app/server-actions/user/createUser';
import { SubmitButton } from '@/components/common/SubmitButton';
import { TextFormField } from '@/components/common/TextFormField';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useServerAction } from '@/hooks/useServerAction';
import { createUserInputSchema } from '@/layers/application/usecases/user/CreateUserUseCase.schema';
import { routes } from '@/lib/routes';

// フォーム用バリデーションスキーマ（confirmPasswordを含む）
// DRY原則: createUserInputSchemaをUseCaseから共有し、バリデーションルールを一元管理
const createUserFormSchema = createUserInputSchema
  .extend({
    confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

interface CreateUserFormProps {
  onSuccess?: () => void;
}

/**
 * ユーザー新規作成フォームコンポーネント
 * Client Component（最小範囲）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - react-hook-form + zodResolver によるバリデーション
 * - 作成成功時の自動遷移
 */
export function CreateUserFormClient({ onSuccess }: CreateUserFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { execute, handleActionResult, isPending } = useServerAction({
    form,
    successMessage: 'ユーザーを作成しました',
    defaultErrorMessage: '予期しないエラーが発生しました',
    redirectTo: routes.users.list(),
    onSuccess,
  });

  const onSubmit = (values: CreateUserFormValues) => {
    execute(async () => {
      const result = await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (handleActionResult(result)) {
        form.reset();
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
              新規ユーザー作成
            </h1>
            <p className='text-sm text-[var(--text-muted)]'>
              新しいユーザーアカウントを作成します
            </p>
          </div>
        </Card.Header>

        <Card.Content>
          {/* サーバーエラー表示 */}
          {form.formState.errors.root?.message && (
            <div className='mb-6'>
              <Alert variant='destructive'>
                <AlertTitle>エラー</AlertTitle>
                {form.formState.errors.root.message}
              </Alert>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* 名前入力 */}
              <TextFormField
                form={form}
                name='name'
                label='名前'
                placeholder='田中太郎'
                disabled={isPending}
              />

              {/* メールアドレス入力 */}
              <TextFormField
                form={form}
                name='email'
                label='メールアドレス'
                placeholder='example@example.com'
                type='email'
                disabled={isPending}
              />

              {/* パスワード入力 */}
              <TextFormField
                form={form}
                name='password'
                label='パスワード'
                placeholder='8文字以上で入力してください'
                type='password'
                disabled={isPending}
              />

              {/* パスワード確認入力 */}
              <TextFormField
                form={form}
                name='confirmPassword'
                label='パスワード（確認）'
                placeholder='同じパスワードを再入力してください'
                type='password'
                disabled={isPending}
              />

              {/* 作成ボタン */}
              <SubmitButton
                variant='aurora'
                size='lg'
                isPending={isPending}
                pendingText='ユーザー作成中...'
                className='w-full cursor-pointer'
              >
                ユーザーを作成
              </SubmitButton>
            </form>
          </Form>
        </Card.Content>

        <Card.Footer>
          <div className='text-center'>
            <Button
              variant='ghost'
              size='sm'
              asChild
              disabled={isPending}
              className='text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            >
              <Link href={routes.users.list()}>← ユーザー一覧に戻る</Link>
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
