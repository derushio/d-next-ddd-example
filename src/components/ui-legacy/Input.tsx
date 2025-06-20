import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * カスタムInputコンポーネント
 *
 * TailwindCSS v4対応のモダンなフォーム入力デザイン
 * - アイコン付き入力フィールド
 * - エラー状態の視覚的フィードバック
 * - アクセシビリティ対応
 * - フォーカス時のアニメーション効果
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = `
      block w-full px-3 py-2.5
      text-gray-900 bg-white/80 backdrop-blur-sm
      border rounded-xl shadow-sm hover:shadow-md
      transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-4 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-gray-400
    `;

    const inputStateClasses = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 hover:border-red-400 bg-red-50/50'
      : 'border-violet-200 focus:border-violet-500 focus:ring-violet-200 hover:border-violet-300 focus:bg-gradient-to-r focus:from-violet-50/50 focus:to-purple-50/50';

    const iconPaddingClasses = {
      left: leftIcon ? 'pl-10' : '',
      right: rightIcon ? 'pr-10' : '',
    };

    return (
      <div className={clsx('space-y-1', fullWidth ? 'w-full' : 'w-auto')}>
        {/* ラベル */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx('block text-sm font-medium text-gray-700 mb-1')}
          >
            {label}
          </label>
        )}

        {/* 入力フィールドコンテナ */}
        <div className={clsx('relative')}>
          {/* 左アイコン */}
          {leftIcon && (
            <div
              className={clsx(
                'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10',
              )}
            >
              <div className={clsx('text-gray-800')}>{leftIcon}</div>
            </div>
          )}

          {/* 入力フィールド */}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              baseInputClasses,
              inputStateClasses,
              iconPaddingClasses.left,
              iconPaddingClasses.right,
              className,
            )}
            {...props}
          />

          {/* 右アイコン */}
          {rightIcon && (
            <div
              className={clsx(
                'absolute inset-y-0 right-0 pr-3 flex items-center z-10',
              )}
            >
              <div className={clsx('text-gray-800')}>{rightIcon}</div>
            </div>
          )}
        </div>

        {/* エラーメッセージ */}
        {error && (
          <p className={clsx('text-sm text-red-600 mt-1 animate-fade-in')}>
            {error}
          </p>
        )}

        {/* ヘルパーテキスト */}
        {helperText && !error && (
          <p className={clsx('text-sm text-gray-500 mt-1')}>{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
