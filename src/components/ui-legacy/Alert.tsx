import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
  onDismiss?: () => void;
}

/**
 * カスタムAlertコンポーネント
 *
 * TailwindCSS v4対応のアラートコンポーネント
 * - 複数のバリアント対応
 * - 閉じるボタン付き
 * - アクセシビリティ対応
 */
export function Alert({
  children,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className,
  ...props
}: AlertProps) {
  const baseClasses = `
    p-4 rounded-xl border backdrop-blur-sm shadow-lg hover:shadow-xl
    transition-all duration-300 ease-in-out relative overflow-hidden
  `;

  const variantClasses = {
    info: 'bg-gradient-to-br from-blue-50/90 to-cyan-50/90 border-blue-200/50 text-blue-800 hover:shadow-blue-500/10',
    success:
      'bg-gradient-to-br from-green-50/90 to-emerald-50/90 border-green-200/50 text-green-800 hover:shadow-green-500/10',
    warning:
      'bg-gradient-to-br from-orange-50/90 to-yellow-50/90 border-orange-200/50 text-orange-800 hover:shadow-orange-500/10',
    error:
      'bg-gradient-to-br from-red-50/90 to-pink-50/90 border-red-200/50 text-red-800 hover:shadow-red-500/10',
  };

  const iconClasses = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
  };

  const accentClasses = {
    info: 'bg-gradient-to-r from-blue-400/40 to-cyan-400/40',
    success: 'bg-gradient-to-r from-green-400/40 to-emerald-400/40',
    warning: 'bg-gradient-to-r from-orange-400/40 to-yellow-400/40',
    error: 'bg-gradient-to-r from-red-400/40 to-pink-400/40',
  };

  const icons = {
    info: (
      <svg className={clsx('w-4 h-4')} fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
          clipRule='evenodd'
        />
      </svg>
    ),
    success: (
      <svg className={clsx('w-4 h-4')} fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
          clipRule='evenodd'
        />
      </svg>
    ),
    warning: (
      <svg className={clsx('w-4 h-4')} fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
          clipRule='evenodd'
        />
      </svg>
    ),
    error: (
      <svg className={clsx('w-4 h-4')} fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
          clipRule='evenodd'
        />
      </svg>
    ),
  };

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      role='alert'
      {...props}
    >
      {/* 🌟 Aurora アクセントライン */}
      <div
        className={clsx(
          'absolute top-0 left-0 w-full h-1',
          accentClasses[variant],
        )}
      />

      <div className={clsx('flex items-start relative')}>
        <div className={clsx('flex-shrink-0 mr-3', iconClasses[variant])}>
          {icons[variant]}
        </div>
        <div className={clsx('flex-1')}>{children}</div>
        {dismissible && onDismiss && (
          <button
            type='button'
            className={clsx(
              'flex-shrink-0 ml-3 p-1 rounded-lg hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current/50 transition-all duration-200 transform hover:scale-110',
              iconClasses[variant],
            )}
            onClick={onDismiss}
            aria-label='閉じる'
          >
            <svg
              className={clsx('w-4 h-4')}
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
