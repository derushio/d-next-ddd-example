import { cn } from '@/lib/utils-shadcn';

import { clsx } from 'clsx';
import * as React from 'react';
import { HiXMark } from 'react-icons/hi2';
// Sonner integration (for modern toast usage)
import { Toaster as Sonner, toast } from 'sonner';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * カスタムToastコンポーネント
 *
 * AppToast.tsx用の機能:
 * - variant サポート
 * - onClose ハンドラー
 * - showCloseButton フラグ
 * - アニメーション対応
 */
function Toast({
  variant = 'info',
  onClose,
  showCloseButton = false,
  className,
  children,
  ...props
}: ToastProps) {
  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
        'backdrop-blur-sm relative',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {/* クローズボタン */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={clsx(
            'absolute top-2 right-2 p-1 rounded-full',
            'hover:bg-black/10 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current',
          )}
          aria-label='閉じる'
        >
          <HiXMark className='w-4 h-4' />
        </button>
      )}

      {/* コンテンツ */}
      <div className={clsx(showCloseButton && 'pr-8')}>{children}</div>
    </div>
  );
}

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme='light'
      className='toaster group'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // 既存システムのステート色統合
          success:
            'group-[.toast]:bg-success group-[.toast]:text-success-foreground group-[.toast]:border-success/20',
          error:
            'group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground group-[.toast]:border-destructive/20',
          warning:
            'group-[.toast]:bg-warning group-[.toast]:text-warning-foreground group-[.toast]:border-warning/20',
          info: 'group-[.toast]:bg-info group-[.toast]:text-info-foreground group-[.toast]:border-info/20',
        },
      }}
      {...props}
    />
  );
};

// 既存のAppToastとの統合ヘルパー
export const showToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),
  info: (message: string, description?: string) =>
    toast.info(message, { description }),
  default: (message: string, description?: string) =>
    toast(message, { description }),
};

export { Toast, Toaster, toast };
