import { Loader2 } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave';
  color?: 'primary' | 'muted' | 'foreground' | 'white';
  text?: string;
  overlay?: boolean;
}

/**
 * カスタムLoadingコンポーネント
 *
 * 複数のアニメーションパターンに対応したローディング表示
 * - スピナー、ドット、パルス、ウェーブアニメーション
 * - オーバーレイ表示対応
 * - アクセシビリティ対応
 */
export function Loading({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  overlay = false,
  className,
  ...props
}: LoadingProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-12',
  };

  const colorClasses = {
    primary: 'text-primary',
    muted: 'text-muted-foreground',
    foreground: 'text-foreground',
    white: 'text-white',
  };

  const gradientColorClasses = {
    primary: 'from-primary to-primary/60',
    muted: 'from-muted-foreground to-muted-foreground/60',
    foreground: 'from-foreground to-foreground/60',
    white: 'from-white to-white/60',
  };

  const containerClasses = overlay
    ? 'fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center';

  const renderSpinner = () => (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], colorClasses[color])}
      aria-hidden='true'
    />
  );

  const dotsDelayClasses = [
    '[animation-delay:0s]',
    '[animation-delay:0.2s]',
    '[animation-delay:0.4s]',
  ] as const;

  const renderDots = () => (
    <div className='flex space-x-1'>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse bg-gradient-to-r [animation-duration:1.4s]',
            size === 'sm'
              ? 'size-2'
              : size === 'md'
                ? 'size-3'
                : size === 'lg'
                  ? 'size-4'
                  : 'size-5',
            gradientColorClasses[color],
            dotsDelayClasses[i],
          )}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        'rounded-full animate-pulse bg-gradient-to-r shadow-lg',
        sizeClasses[size],
        gradientColorClasses[color],
      )}
    />
  );

  const waveDelayClasses = [
    '[animation-delay:0s]',
    '[animation-delay:0.1s]',
    '[animation-delay:0.2s]',
    '[animation-delay:0.3s]',
    '[animation-delay:0.4s]',
  ] as const;

  const renderWave = () => (
    <div className='flex items-end space-x-1'>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-bounce bg-gradient-to-t rounded-sm [animation-duration:1s]',
            size === 'sm'
              ? 'w-1 h-4'
              : size === 'md'
                ? 'w-1.5 h-6'
                : size === 'lg'
                  ? 'w-2 h-8'
                  : 'w-3 h-12',
            gradientColorClasses[color],
            waveDelayClasses[i],
          )}
        />
      ))}
    </div>
  );

  const renderAnimation = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      default:
        return renderSpinner();
    }
  };

  return (
    <div
      data-slot='loading'
      className={cn(containerClasses, className)}
      role='status'
      aria-label={text || 'Loading...'}
      {...props}
    >
      <div className='flex flex-col items-center space-y-3'>
        {renderAnimation()}
        {text && (
          <p className={cn('text-sm font-medium', colorClasses[color])}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
