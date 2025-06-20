import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'blue'
    | 'green'
    | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
}

/**
 * カスタムBadgeコンポーネント
 *
 * TailwindCSS v4対応のバッジコンポーネント
 * - 複数のバリアント対応
 * - サイズ選択
 * - ピル型対応
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  className,
  ...props
}: BadgeProps) {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium select-none shadow-sm hover:shadow-md
    transition-all duration-300 ease-in-out
    transform hover:scale-105 backdrop-blur-sm
  `;

  const variantClasses = {
    default:
      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-200/50 hover:from-gray-200 hover:to-gray-300',
    primary:
      'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200/50 hover:from-violet-200 hover:to-purple-200',
    secondary:
      'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 border border-slate-200/50 hover:from-slate-200 hover:to-gray-200',
    success:
      'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200/50 hover:from-green-200 hover:to-emerald-200',
    warning:
      'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border border-orange-200/50 hover:from-orange-200 hover:to-yellow-200',
    error:
      'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-200/50 hover:from-red-200 hover:to-pink-200',
    blue: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200/50 hover:from-blue-200 hover:to-cyan-200',
    green:
      'bg-gradient-to-r from-green-100 to-teal-100 text-green-700 border border-green-200/50 hover:from-green-200 hover:to-teal-200',
    yellow:
      'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border border-yellow-200/50 hover:from-yellow-200 hover:to-orange-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const roundedClasses = pill ? 'rounded-full' : 'rounded-md';

  return (
    <span
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        roundedClasses,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
