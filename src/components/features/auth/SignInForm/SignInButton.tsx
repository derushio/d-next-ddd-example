'use client';

import { SubmitButton } from '@/components/common/SubmitButton';

interface SignInButtonProps {
  isPending?: boolean;
}

/**
 * サインインフォーム - サインインボタン
 *
 * React 19 パターン:
 * - useFormStatus() でフォームのpending状態を自動取得
 * - isPending prop で useTransition の状態も受け取れる
 * - グラデーション効果
 * - アニメーション効果
 */
export function SignInButton({ isPending }: SignInButtonProps) {
  return (
    <SubmitButton
      variant='aurora'
      size='lg'
      fullWidth
      isPending={isPending}
      pendingText='サインイン中...'
      data-testid='sign-in-button'
      className='cursor-pointer shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-300'
    >
      サインイン
    </SubmitButton>
  );
}
