'use client';

import { Input } from '@/components/ui/Input';

import { clsx } from 'clsx';
import { HiMail } from 'react-icons/hi';

interface EmailFieldProps {
  disabled?: boolean;
  error?: string;
}

/**
 * サインインフォーム - メールアドレス入力フィールド
 *
 * 分離されたフォームコンポーネント：
 * - 再利用可能な入力フィールド
 * - エラー状態の視覚的フィードバック
 * - アクセシビリティ対応
 */
export function EmailField({ disabled = false, error }: EmailFieldProps) {
  return (
    <Input
      id='email'
      name='email'
      type='email'
      autoComplete='email'
      required
      placeholder='user@example.com'
      label='メールアドレス'
      leftIcon={
        <HiMail className={clsx('h-5 w-5 text-[var(--text-disabled)]')} />
      }
      disabled={disabled}
      error={error}
      helperText='ご登録いただいたメールアドレスを入力してください'
    />
  );
}
