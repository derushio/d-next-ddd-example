'use client';

import { Input } from '@/components/ui/Input';

import { clsx } from 'clsx';
import { useState } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';

interface PasswordFieldProps {
  disabled?: boolean;
  error?: string;
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
      className={clsx(
        'p-1 rounded-md hover:bg-[var(--surface-100)] transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed',
      )}
      aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
    >
      {showPassword ? (
        <HiEyeOff
          className={clsx(
            'h-5 w-5 text-[var(--text-disabled)] hover:text-[var(--text-muted)]',
          )}
        />
      ) : (
        <HiEye
          className={clsx(
            'h-5 w-5 text-[var(--text-disabled)] hover:text-[var(--text-muted)]',
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
export function PasswordField({ disabled = false, error }: PasswordFieldProps) {
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
    />
  );
}
