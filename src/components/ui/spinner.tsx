import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
  };

  return (
    <div
      data-slot='spinner'
      className={cn(
        'animate-spin rounded-full border-2 border-muted border-t-primary',
        'relative',
        sizeClasses[size],
        className,
      )}
      role='status'
      aria-label='読み込み中'
    >
      <span className='sr-only'>読み込み中...</span>
    </div>
  );
}
