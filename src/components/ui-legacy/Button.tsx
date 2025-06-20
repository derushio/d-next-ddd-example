import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  gradient?: boolean;
}

/**
 * カスタムButtonコンポーネント
 *
 * TailwindCSS v4対応のモダンなボタンデザイン
 * - グラデーション、アニメーション効果
 * - アクセシビリティ対応
 * - 複数のバリアント対応
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      gradient = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center
      font-medium rounded-xl shadow-lg hover:shadow-xl
      cursor-pointer
      transition-all duration-300 ease-in-out
      transform hover:scale-[1.05] active:scale-[0.95]
      focus:outline-none focus:ring-4 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
      select-none backdrop-blur-sm relative overflow-hidden
    `;

    const variantClasses = {
      primary: gradient
        ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 text-white focus:ring-violet-300 shadow-violet-500/25 hover:shadow-violet-500/40'
        : 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-300 shadow-violet-500/25',
      secondary:
        'bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white focus:ring-slate-300 shadow-slate-500/25',
      outline:
        'border-2 border-violet-500 text-violet-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 focus:ring-violet-300 bg-white/80 backdrop-blur-sm',
      ghost:
        'text-violet-600 hover:bg-gradient-to-r hover:from-violet-100/80 hover:to-purple-100/80 focus:ring-violet-300 backdrop-blur-sm',
      danger: gradient
        ? 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white focus:ring-red-300 shadow-red-500/25 hover:shadow-red-500/40'
        : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300 shadow-red-500/25',
      blue: gradient
        ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600 text-white focus:ring-blue-300 shadow-blue-500/25 hover:shadow-blue-500/40'
        : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300 shadow-blue-500/25',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className='animate-spin -ml-1 mr-2 h-4 w-4'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
