import { clsx } from 'clsx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="status"はローディング状態を示すために意図的に使用
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-gray-200 border-t-violet-600 shadow-lg',
        'before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-violet-500 before:to-cyan-500 before:p-0.5 before:opacity-20',
        'relative',
        sizeClasses[size],
        className,
      )}
      role='status'
      aria-label='読み込み中'
    >
      <span className={clsx('sr-only')}>読み込み中...</span>
    </div>
  );
}
