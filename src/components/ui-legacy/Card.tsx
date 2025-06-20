import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?:
    | 'default'
    | 'bordered'
    | 'elevated'
    | 'glass'
    | 'aurora'
    | 'sunset'
    | 'ocean'
    | 'cosmic';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * カスタムCardコンポーネント
 *
 * Compound Patternを使用したモダンなカードデザイン
 * - 複数のバリアント対応
 * - ホバーアニメーション
 * - ガラスモーフィズム効果
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  ...props
}: CardProps) {
  const baseClasses = `
    rounded-xl transition-all duration-300 ease-in-out
    shadow-sm hover:shadow-lg
  `;

  const variantClasses = {
    default: 'bg-white border border-gray-200',
    bordered: 'bg-white border-2 border-gray-300',
    elevated: 'bg-white shadow-lg hover:shadow-xl border border-gray-100',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg',
    // 🌟 Aurora Gradient Variants
    aurora:
      'bg-gradient-to-br from-violet-50 to-cyan-50 border-violet-200/50 shadow-xl hover:shadow-2xl backdrop-blur-sm',
    sunset:
      'bg-gradient-to-br from-orange-50 to-pink-50 border-orange-200/50 shadow-xl hover:shadow-2xl backdrop-blur-sm',
    ocean:
      'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200/50 shadow-xl hover:shadow-2xl backdrop-blur-sm',
    cosmic:
      'bg-gradient-to-br from-red-50 to-purple-50 border-red-200/50 shadow-xl hover:shadow-2xl backdrop-blur-sm',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClasses = hover
    ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer'
    : '';

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        hoverClasses,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={clsx('mb-4 pb-4 border-b border-gray-200', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: CardContentProps) {
  return (
    <div className={clsx('text-gray-600', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={clsx(
        'mt-4 pt-4 border-t border-gray-200 flex justify-end gap-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Compound Patternの設定
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
