import { ReactNode, HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
  HiXMark,
} from 'react-icons/hi2';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * カスタムToastコンポーネント
 *
 * モダンなデザインとアニメーション効果:
 * - ガラスモーフィズム効果
 * - 複数のバリアント対応
 * - アイコン付きデザイン
 * - クローズボタン
 */
export function Toast({
  variant = 'info',
  children,
  onClose,
  showCloseButton = true,
  className,
  ...props
}: ToastProps) {
  const baseClasses = `
    relative flex items-center space-x-3 p-4 rounded-xl
    backdrop-blur-md shadow-lg border
    transform transition-all duration-300 ease-in-out
    min-w-[300px] max-w-[500px]
  `;

  const variantClasses = {
    success:
      'bg-gradient-to-r from-green-50/95 to-emerald-50/95 border-green-200/50 text-green-800 shadow-green-500/10',
    error:
      'bg-gradient-to-r from-red-50/95 to-pink-50/95 border-red-200/50 text-red-800 shadow-red-500/10',
    warning:
      'bg-gradient-to-r from-orange-50/95 to-yellow-50/95 border-orange-200/50 text-orange-800 shadow-orange-500/10',
    info: 'bg-gradient-to-r from-blue-50/95 to-cyan-50/95 border-blue-200/50 text-blue-800 shadow-blue-500/10',
  };

  const iconClasses = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-orange-600',
    info: 'text-blue-600',
  };

  const accentClasses = {
    success: 'from-green-400/40 to-emerald-400/40',
    error: 'from-red-400/40 to-pink-400/40',
    warning: 'from-orange-400/40 to-yellow-400/40',
    info: 'from-blue-400/40 to-cyan-400/40',
  };

  const icons = {
    success: HiCheckCircle,
    error: HiXCircle,
    warning: HiExclamationTriangle,
    info: HiInformationCircle,
  };

  const IconComponent = icons[variant];

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      role='alert'
      {...props}
    >
      {/* アイコン */}
      <div className={clsx('flex-shrink-0')}>
        <IconComponent className={clsx('w-5 h-5', iconClasses[variant])} />
      </div>

      {/* コンテンツ */}
      <div className={clsx('flex-1 min-w-0')}>{children}</div>

      {/* クローズボタン */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={clsx(
            'flex-shrink-0 p-1 rounded-lg hover:bg-white/30 transition-all duration-200 cursor-pointer group transform hover:scale-110',
          )}
          aria-label='閉じる'
        >
          <HiXMark
            className={clsx(
              'w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200',
            )}
          />
        </button>
      )}

      {/* 🌟 Aurora アクセントライン */}
      <div
        className={clsx(
          'absolute top-0 left-0 w-full h-1 bg-gradient-to-r rounded-t-xl',
          accentClasses[variant],
        )}
      />
    </div>
  );
}
