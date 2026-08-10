'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { updateUser } from '@/app/server-actions/user/updateUser';
import { SubmitButton } from '@/components/common/SubmitButton';
import { TextFormField } from '@/components/common/TextFormField';
import type { UserData } from '@/components/features/user/UserListClient';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useServerAction } from '@/hooks/useServerAction';
import { nameSchema } from '@/layers/application/schemas/commonFieldSchemas';
import { routes } from '@/lib/routes';
import { formatJaDate } from '@/utils/dfUtils';

// フォーム用バリデーションスキーマ
const editUserFormSchema = z.object({
  name: nameSchema,
  email: z.email('有効なメールアドレスを入力してください'),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

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
 * - react-hook-form + zodResolver によるバリデーション
 * - 更新成功時の自動遷移
 */
export function EditUserFormClient({ user, onSuccess }: EditUserFormProps) {
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  const { execute, handleActionResult, isPending } = useServerAction({
    form,
    successMessage: 'ユーザーを更新しました',
    defaultErrorMessage: '予期しないエラーが発生しました',
    redirectTo: routes.users.list(),
    onSuccess,
  });

  const onSubmit = (values: EditUserFormValues) => {
    execute(async () => {
      const result = await updateUser({
        userId: user.id,
        name: values.name,
        email: values.email,
      });
      handleActionResult(result);
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
              ユーザー編集
            </h1>
            <p className='text-sm text-[var(--text-muted)]'>
              ユーザー情報を編集します
            </p>
            <div className='mt-2 text-xs text-[var(--text-muted)] bg-muted rounded-lg p-2'>
              <strong>ID:</strong> {user.id.slice(0, 8)}...
              <br />
              <strong>作成日:</strong> {formatJaDate(user.createdAt)}
              <br />
              <strong>最終更新:</strong> {formatJaDate(user.updatedAt)}
            </div>
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

              {/* 更新ボタン */}
              <div className='flex gap-3'>
                <SubmitButton
                  variant='aurora'
                  size='lg'
                  isPending={isPending}
                  pendingText='ユーザー更新中...'
                  className='flex-1 cursor-pointer'
                >
                  ユーザーを更新
                </SubmitButton>

                <Button
                  type='button'
                  variant='secondary'
                  size='lg'
                  asChild
                  disabled={isPending}
                  className='cursor-pointer'
                >
                  <Link href={routes.users.list()}>キャンセル</Link>
                </Button>
              </div>
            </form>
          </Form>
        </Card.Content>

        <Card.Footer>
          <div className='flex justify-between items-center w-full text-xs text-[var(--text-muted)]'>
            <Button
              variant='ghost'
              size='sm'
              asChild
              disabled={isPending}
              className='text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            >
              <Link href={routes.users.list()}>← ユーザー一覧に戻る</Link>
            </Button>

            <Button
              variant='ghost'
              size='sm'
              asChild
              disabled={isPending}
              className='text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            >
              <Link href={routes.users.detail(user.id)}>詳細表示 →</Link>
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
