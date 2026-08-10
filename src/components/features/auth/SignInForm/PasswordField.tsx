'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  disabled?: boolean | undefined;
  error?: string | undefined;
  field?:
    | ControllerRenderProps<{ email: string; password: string }, 'password'>
    | undefined;
}

interface PasswordToggleIconProps {
  onClick: () => void;
  showPassword: boolean;
  disabled?: boolean;
}

function PasswordToggleIcon({
  onClick,
  showPassword,
  disabled,
}: PasswordToggleIconProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1 rounded-md hover:bg-[var(--surface-100)] transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed',
      )}
      aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
    >
      {showPassword ? (
        <EyeOff
          className={cn(
            'size-5 text-[var(--text-disabled)] hover:text-[var(--text-muted)]',
          )}
        />
      ) : (
        <Eye
          className={cn(
            'size-5 text-[var(--text-disabled)] hover:text-[var(--text-muted)]',
          )}
        />
      )}
    </button>
  );
}

/**
 * サインインフォーム - パスワード入力フィールド
 *
 * 分離されたフォームコンポーネント：
 * - パスワード表示/非表示切り替え
 * - エラー状態の視覚的フィードバック
 * - アクセシビリティ対応
 */
export function PasswordField({
  disabled = false,
  error,
  field,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Input
      id='password'
      name='password'
      type={showPassword ? 'text' : 'password'}
      autoComplete='current-password'
      required
      placeholder='8文字以上のパスワード'
      label='パスワード'
      rightIcon={
        <PasswordToggleIcon
          onClick={togglePasswordVisibility}
          showPassword={showPassword}
          disabled={disabled}
        />
      }
      disabled={disabled}
      error={error}
      helperText='8文字以上で英数字を組み合わせてください'
      {...field}
    />
  );
}
