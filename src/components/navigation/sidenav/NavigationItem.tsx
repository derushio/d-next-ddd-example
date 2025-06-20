'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface NavigationItemProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  isActive?: boolean;
  variant?: 'default' | 'auth' | 'danger';
  onClick?: () => void;
}

/**
 * ナビゲーションアイテムコンポーネント
 *
 * モダンなデザインと豊富なアニメーション効果:
 * - ホバーアニメーション
 * - アクティブ状態の表示
 * - 複数のバリアント対応
 */
export function NavigationItem({
  href,
  icon,
  children,
  isActive = false,
  variant = 'default',
  onClick,
}: NavigationItemProps) {
  const baseClasses = `
    group flex items-center space-x-3 px-4 py-3 rounded-xl
    transition-all duration-200 ease-in-out
    cursor-pointer select-none
    transform hover:scale-[1.02] active:scale-[0.98]
    relative overflow-hidden
  `;

  const variantClasses = {
    default: isActive
      ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-600 shadow-lg backdrop-blur-sm border border-violet-200/50'
      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900',
    auth: 'text-green-600 hover:bg-green-50 hover:text-green-700',
    danger: 'text-red-600 hover:bg-red-50 hover:text-red-700',
  };

  const iconClasses = `
    flex-shrink-0 w-5 h-5 transition-all duration-200
    ${isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-current'}
    ${variant === 'auth' ? 'group-hover:text-green-600' : ''}
    ${variant === 'danger' ? 'group-hover:text-red-600' : ''}
    group-hover:scale-110
  `;

  const content = (
    <>
      {/* 🌟 ホバー時の背景効果 */}
      {!isActive && (
        <div
          className={clsx(
            'absolute inset-0 bg-gradient-to-r from-violet-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl',
          )}
        />
      )}

      {/* ✨ アクティブ時の左側ボーダー */}
      {isActive && (
        <div
          className={clsx(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-r-full',
          )}
        />
      )}

      <div className={clsx('relative flex items-center space-x-3 w-full')}>
        {icon && <div className={iconClasses}>{icon}</div>}
        <span
          className={clsx(
            'flex-1 font-medium text-sm group-hover:translate-x-1 transition-transform duration-200',
          )}
        >
          {children}
        </span>

        {/* 💫 アクティブ時のインジケーター */}
        {isActive && (
          <div
            className={clsx(
              'w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-pulse',
            )}
          />
        )}
      </div>
    </>
  );

  return (
    <Link
      href={href}
      className={clsx(baseClasses, variantClasses[variant])}
      onClick={onClick}
    >
      {content}
    </Link>
  );
}
