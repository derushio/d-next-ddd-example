'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SubmitButtonProps
  extends Omit<ButtonProps, 'type' | 'disabled' | 'loading'> {
  pendingText?: string;
  isPending?: boolean | undefined;
  children: React.ReactNode;
}

/**
 * useFormStatus を使用したSubmitボタンコンポーネント
 *
 * React 19 パターン:
 * - useFormStatus() でフォームのpending状態を自動取得
 * - isPending prop で react-hook-form の useTransition 状態も受け取れる
 * - フォームコンポーネントの子として配置することで動作する
 */
export function SubmitButton({
  pendingText,
  isPending,
  children,
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = isPending || pending;

  return (
    <Button
      type='submit'
      loading={isLoading}
      disabled={isLoading}
      className={className}
      {...props}
    >
      {isLoading && pendingText ? pendingText : children}
    </Button>
  );
}
