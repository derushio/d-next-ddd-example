import { clsx } from 'clsx';
import { HTMLAttributes } from 'react';

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave';
  color?: 'blue' | 'purple' | 'gray' | 'white';
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
  color = 'blue',
  text,
  overlay = false,
  className,
  ...props
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-violet-600',
    gray: 'text-gray-500',
    white: 'text-white',
  };

  const gradientColorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-violet-500 to-purple-500',
    gray: 'from-gray-400 to-gray-600',
    white: 'from-white to-gray-100',
  };

  const containerClasses = overlay
    ? 'fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center';

  const renderSpinner = () => (
    <svg
      className={clsx('animate-spin', sizeClasses[size], colorClasses[color])}
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
    >
      <circle
        className={clsx('opacity-25')}
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className={clsx('opacity-75')}
        fill='currentColor'
        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
      />
    </svg>
  );

  const renderDots = () => (
    <div className={clsx('flex space-x-1')}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={clsx(
            'rounded-full animate-pulse bg-gradient-to-r shadow-lg',
            size === 'sm'
              ? 'w-2 h-2'
              : size === 'md'
                ? 'w-3 h-3'
                : size === 'lg'
                  ? 'w-4 h-4'
                  : 'w-5 h-5',
            gradientColorClasses[color],
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={clsx(
        'rounded-full animate-pulse bg-gradient-to-r shadow-lg',
        sizeClasses[size],
        gradientColorClasses[color],
      )}
    />
  );

  const renderWave = () => (
    <div className={clsx('flex items-end space-x-1')}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={clsx(
            'animate-bounce bg-gradient-to-t shadow-lg rounded-sm',
            size === 'sm'
              ? 'w-1 h-4'
              : size === 'md'
                ? 'w-1.5 h-6'
                : size === 'lg'
                  ? 'w-2 h-8'
                  : 'w-3 h-12',
            gradientColorClasses[color],
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1s',
          }}
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
      className={clsx(containerClasses, className)}
      role='status'
      aria-label={text || 'Loading...'}
      {...props}
    >
      <div className={clsx('flex flex-col items-center space-y-3')}>
        {renderAnimation()}
        {text && (
          <p className={clsx('text-sm font-medium', colorClasses[color])}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
