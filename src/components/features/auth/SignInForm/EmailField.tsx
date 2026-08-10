import { Mail } from 'lucide-react';
import type { ControllerRenderProps } from 'react-hook-form';
import { Input } from '@/components/ui/input';

interface EmailFieldProps {
  disabled?: boolean | undefined;
  error?: string | undefined;
  field?:
    | ControllerRenderProps<{ email: string; password: string }, 'email'>
    | undefined;
}

/**
 * サインインフォーム - メールアドレス入力フィールド
 *
 * 分離されたフォームコンポーネント：
 * - 再利用可能な入力フィールド
 * - エラー状態の視覚的フィードバック
 * - アクセシビリティ対応
 */
export function EmailField({
  disabled = false,
  error,
  field,
}: EmailFieldProps) {
  return (
    <Input
      id='email'
      name='email'
      type='email'
      autoComplete='email'
      required
      placeholder='user@example.com'
      label='メールアドレス'
      leftIcon={<Mail className='size-5 text-[var(--text-disabled)]' />}
      disabled={disabled}
      error={error}
      helperText='ご登録いただいたメールアドレスを入力してください'
      {...field}
    />
  );
}
