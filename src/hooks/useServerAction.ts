'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';
import { applyFieldErrors } from '@/utils/formUtils';

interface UseServerActionOptions<TForm extends FieldValues> {
  /** react-hook-form instance (optional - DeleteUserButton has no form) */
  form?: UseFormReturn<TForm> | undefined;
  /** Success message for toast */
  successMessage?: string | undefined;
  /** Default error message for catch block */
  defaultErrorMessage?: string | undefined;
  /** Route to navigate to on success */
  redirectTo?: Route | undefined;
  /** Callback on success (takes priority over redirectTo) */
  onSuccess?: (() => void) | undefined;
}

interface UseServerActionReturn {
  /** Wraps the action in startTransition + try/catch + error handling */
  execute: (action: () => Promise<void>) => void;
  /** Process ActionResult: returns true if success */
  handleActionResult: (result: ActionResult<unknown>) => boolean;
  /** React useTransition isPending state */
  isPending: boolean;
}

/**
 * Server Action 実行をラップするカスタムフック
 *
 * DDD/Clean Architecture パターン:
 * - useTransition による isPending 管理を一元化
 * - try/catch + toast.error によるエラーハンドリングを共通化
 * - ActionResult の成功/失敗処理を共通化
 * - NOTE: Client ComponentではサーバーサイドDI(ILogger/pino)が使用不可のため、console.errorが正当
 */
export function useServerAction<TForm extends FieldValues>(
  options: UseServerActionOptions<TForm> = {},
): UseServerActionReturn {
  const { form, successMessage, defaultErrorMessage, redirectTo, onSuccess } =
    options;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const execute = (action: () => Promise<void>): void => {
    form?.clearErrors('root');

    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        // NOTE: Server Actionは withAuth HOF で例外をキャッチし ActionResult を返すが、
        // ネットワーク断等のクライアント側例外はここでキャッチされる
        // Client ComponentではサーバーサイドDI(ILogger/pino)が使用不可のため、console.errorが正当
        console.error(
          defaultErrorMessage ?? '予期しないエラーが発生しました',
          error,
        );
        const message = defaultErrorMessage ?? '予期しないエラーが発生しました';
        form?.setError('root', { type: 'server', message });
        toast.error(message);
      }
    });
  };

  const handleActionResult = (result: ActionResult<unknown>): boolean => {
    if (result.success) {
      if (successMessage) toast.success(successMessage);
      if (onSuccess) {
        onSuccess();
      } else if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
      return true;
    }

    const errorMessage =
      result.error || defaultErrorMessage || '予期しないエラーが発生しました';
    form?.setError('root', { type: 'server', message: errorMessage });
    toast.error(errorMessage);
    if (form) applyFieldErrors(form, result.fieldErrors);
    return false;
  };

  return { execute, handleActionResult, isPending };
}
