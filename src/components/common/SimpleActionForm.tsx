'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

type Props<T> = {
  action: (
    prevState: ActionResult<T> | null,
    formData: FormData,
  ) => Promise<ActionResult<T>>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
};

/**
 * useActionState を使ったシンプルなフォームのテンプレート。
 * react-hook-form が不要なシンプルなServer Action呼び出しに使用する。
 * 複雑なバリデーションやフィールドエラー表示が必要な場合は
 * react-hook-form + useServerAction パターンを使用すること。
 */
export function SimpleActionForm<T>({
  action,
  children,
  submitLabel = '実行',
  pendingLabel = '処理中...',
}: Props<T>) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction}>
      {children}
      {state?.success === false && (
        <p className='text-sm text-destructive'>{state.error}</p>
      )}
      <Button type='submit' disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
