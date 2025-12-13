import { cn } from '@/lib/utils-shadcn';

import { clsx } from 'clsx';
import * as React from 'react';

export interface InputProps extends React.ComponentProps<'input'> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

/**
 * 高機能Inputコンポーネント
 *
 * 統合機能:
 * - shadcn/ui基本スタイル
 * - ラベル、アイコン、エラー表示
 * - アクセシビリティ対応
 */
function Input({
  className,
  type,
  label,
  leftIcon,
  rightIcon,
  error,
  helperText,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className='w-full'>
      {/* ラベル */}
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block text-sm font-medium mb-2',
            error ? 'text-destructive' : 'text-foreground',
          )}
        >
          {label}
        </label>
      )}

      {/* 入力フィールドコンテナ */}
      <div className='relative'>
        {/* 左アイコン */}
        {leftIcon && (
          <div className='absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'>
            {leftIcon}
          </div>
        )}

        {/* 入力フィールド */}
        <input
          type={type}
          id={inputId}
          data-slot='input'
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            error
              ? 'border-destructive aria-invalid:ring-destructive/20 aria-invalid:border-destructive'
              : 'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className,
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />

        {/* 右アイコン */}
        {rightIcon && (
          <div className='absolute right-3 top-1/2 -translate-y-1/2'>
            {rightIcon}
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <p id={`${inputId}-error`} className='mt-2 text-sm text-destructive'>
          {error}
        </p>
      )}

      {/* ヘルパーテキスト */}
      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className='mt-2 text-sm text-muted-foreground'
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

export { Input };
