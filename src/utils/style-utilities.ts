/**
 * 🎨 統一スタイルユーティリティシステム v2.0
 *
 * プロジェクト全体でのスタイル統一とメンテナンス性向上を実現
 * - グラデーション定義の統一化
 * - 共通トランジション・アニメーションの統一
 * - サイズ・スペーシング体系の統一
 * - シャドウ体系の統一
 * - CSS変数との完全統合
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind Merge統合のCN関数（既存のutils.tsと統合）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =================================
// 🌈 統一グラデーションシステム
// globals.cssのAurora Gradient Systemと完全統合
// =================================

export const gradientClasses = {
  // 🌟 2024年トレンド：Aurora Gradient System
  aurora: 'gradient-aurora',
  sunset: 'gradient-sunset',
  ocean: 'gradient-ocean',
  cosmic: 'gradient-cosmic',
  solar: 'gradient-solar',

  // 🎨 インタラクティブ・特殊効果
  animated: 'gradient-animated',
  glass: 'gradient-glass',

  // 🌈 Legacy互換性（bridge）
  brand: 'gradient-brand', // aurora のalias
  primary: 'gradient-aurora',
  secondary: 'gradient-sunset',
  success: 'gradient-ocean',
  danger: 'gradient-cosmic',
  warning: 'gradient-solar',
  error: 'gradient-cosmic',
  info: 'gradient-ocean',
} as const;

export const gradientHoverClasses = {
  aurora: 'gradient-aurora-hover',
  sunset: 'gradient-sunset-hover',
  ocean: 'gradient-ocean-hover',
  cosmic: 'gradient-cosmic-hover',
  solar: 'gradient-solar-hover',

  // 🎨 インタラクティブ・特殊効果
  animated: 'gradient-animated-hover',
  glass: 'gradient-glass-hover',

  // 🌈 Legacy互換性（bridge）
  brand: 'gradient-brand-hover',
  primary: 'gradient-aurora-hover',
  secondary: 'gradient-sunset-hover',
  success: 'gradient-ocean-hover',
  danger: 'gradient-cosmic-hover',
  warning: 'gradient-solar-hover',
  error: 'gradient-cosmic-hover',
  info: 'gradient-ocean-hover',
} as const;

// =================================
// 🎯 統一トランジション・アニメーションシステム
// =================================

export const transitionClasses = {
  // 基本トランジション（最頻出パターン）
  default: 'transition-all duration-300 ease-in-out',
  fast: 'transition-all duration-200 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',

  // 特定プロパティトランジション
  colors: 'transition-colors duration-200 ease-in-out',
  opacity: 'transition-opacity duration-200 ease-in-out',
  transform: 'transition-transform duration-200 ease-in-out',
  shadow: 'transition-shadow duration-300 ease-in-out',

  // インタラクション効果
  hover: 'transform hover:scale-[1.02] active:scale-[0.98]',
  hoverButton: 'transform hover:scale-[1.05] active:scale-[0.95]',
  hoverCard: 'transform hover:scale-[1.01] active:scale-[0.99]',

  // 統合：基本 + インタラクション
  interactive:
    'transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]',
  interactiveButton:
    'transition-all duration-300 ease-in-out transform hover:scale-[1.05] active:scale-[0.95]',
  interactiveCard:
    'transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99]',
} as const;

// =================================
// 📏 統一サイズ・スペーシングシステム
// =================================

export const sizeClasses = {
  button: {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm', // デフォルト
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  },

  card: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6', // デフォルト
    lg: 'p-8',
    xl: 'p-10',
  },

  input: {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2.5 text-sm', // デフォルト
    lg: 'px-4 py-3 text-base',
  },

  badge: {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm', // デフォルト
    lg: 'px-3 py-1.5 text-base',
  },
} as const;

// =================================
// 🌟 統一シャドウシステム
// =================================

export const shadowClasses = {
  // 基本シャドウ
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',

  // インタラクティブシャドウ（hover効果込み）
  interactive: {
    sm: 'shadow-sm hover:shadow-md',
    md: 'shadow-md hover:shadow-lg',
    lg: 'shadow-lg hover:shadow-xl', // 最頻出パターン
    xl: 'shadow-xl hover:shadow-2xl',
  },

  // カラーシャドウ（グラデーション用）
  colored: {
    aurora:
      'shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40',
    sunset:
      'shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40',
    ocean:
      'shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/40',
    cosmic:
      'shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40',
    solar:
      'shadow-lg shadow-yellow-500/25 hover:shadow-xl hover:shadow-yellow-500/40',
  },
} as const;

// =================================
// 🎨 統一角丸システム
// =================================

export const radiusClasses = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl', // 最頻出（デフォルト推奨）
  xl: 'rounded-2xl',
  full: 'rounded-full',
} as const;

// =================================
// 🌈 統一カラーシステム（CSS変数ベース）
// =================================

export const colorClasses = {
  // テキストカラー（CSS変数統一）
  text: {
    primary: 'text-[var(--text-primary)]',
    secondary: 'text-[var(--text-secondary)]',
    muted: 'text-[var(--text-muted)]',
    disabled: 'text-[var(--text-disabled)]',
    inverse: 'text-[var(--text-inverse)]',
  },

  // 背景カラー（CSS変数統一）
  bg: {
    primary: 'bg-[var(--primary)]',
    secondary: 'bg-[var(--secondary)]',
    success: 'bg-[var(--success)]',
    error: 'bg-[var(--error)]',
    warning: 'bg-[var(--warning)]',
    info: 'bg-[var(--info)]',
    surface: 'bg-[var(--surface)]',
    background: 'bg-[var(--background)]',
  },

  // ボーダーカラー（CSS変数統一）
  border: {
    default: 'border-[var(--border)]',
    light: 'border-[var(--border-light)]',
  },

  // ホバー状態（CSS変数統一）
  hover: {
    primary: 'hover:bg-[var(--primary-hover)]',
    secondary: 'hover:bg-[var(--secondary-hover)]',
    success: 'hover:bg-[var(--success-hover)]',
    error: 'hover:bg-[var(--error-hover)]',
    warning: 'hover:bg-[var(--warning-hover)]',
    info: 'hover:bg-[var(--info-hover)]',
  },
} as const;

// =================================
// 🔧 統合ユーティリティ関数
// =================================

/**
 * グラデーションクラスを取得（hover効果込み）
 */
export function getGradientClass(
  variant: keyof typeof gradientClasses,
  withHover: boolean = true,
): string {
  const base = gradientClasses[variant];
  const hover = withHover ? gradientHoverClasses[variant] : '';
  return cn(base, hover);
}

/**
 * インタラクティブシャドウクラスを取得
 */
export function getShadowClass(
  size: keyof typeof shadowClasses.interactive = 'lg',
): string {
  return shadowClasses.interactive[size];
}

/**
 * サイズに応じたクラスを取得
 */
export function getSizeClass(
  component: keyof typeof sizeClasses,
  size: string = 'md',
): string {
  return (
    sizeClasses[component][
      size as keyof (typeof sizeClasses)[typeof component]
    ] || sizeClasses[component].md
  );
}

/**
 * 完全統合：共通基底クラスを生成
 */
export function getBaseComponentClass(
  component: 'button' | 'card' | 'input' | 'badge' = 'button',
  size: string = 'md',
  variant: keyof typeof gradientClasses | 'none' = 'none',
  interactive: boolean = true,
): string {
  const baseClasses = [
    // 基本構造
    'inline-flex items-center justify-center',
    'font-medium',

    // サイズ・角丸・シャドウ
    getSizeClass(component, size),
    radiusClasses.lg,
    getShadowClass('lg'),

    // トランジション（interactive）
    interactive
      ? transitionClasses.interactiveButton
      : transitionClasses.default,

    // 無効状態
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  ];

  // グラデーション（variant指定時）
  if (variant !== 'none') {
    baseClasses.push(getGradientClass(variant, true));
    baseClasses.push(
      shadowClasses.colored[variant as keyof typeof shadowClasses.colored] ||
        '',
    );
  }

  return cn(...baseClasses);
}

/**
 * 統一カードクラスを生成
 */
export function getCardClass(
  size: string = 'md',
  variant: keyof typeof gradientClasses | 'surface' = 'surface',
  interactive: boolean = true,
): string {
  const baseClasses = [
    // サイズ・角丸・シャドウ
    getSizeClass('card', size),
    radiusClasses.lg,
    getShadowClass('md'),

    // トランジション
    interactive ? transitionClasses.interactiveCard : transitionClasses.default,
  ];

  // 背景色・グラデーション
  if (variant === 'surface') {
    baseClasses.push(
      colorClasses.bg.surface,
      colorClasses.border.default,
      'border',
    );
  } else {
    baseClasses.push(getGradientClass(variant, interactive));
    baseClasses.push(
      shadowClasses.colored[variant as keyof typeof shadowClasses.colored] ||
        '',
    );
  }

  return cn(...baseClasses);
}

/**
 * Focus Ring統一クラス
 */
export const focusRingClass =
  'focus:outline-none focus:ring-4 focus:ring-offset-1 focus:ring-[var(--primary)]/30';

/**
 * 統一フォームコントロールクラス
 */
export function getFormControlClass(
  size: string = 'md',
  state: 'default' | 'error' | 'success' = 'default',
): string {
  const baseClasses = [
    'block w-full',
    getSizeClass('input', size),
    radiusClasses.lg,
    'border shadow-sm hover:shadow-md',
    transitionClasses.default,
    focusRingClass,
  ];

  // 状態別スタイル
  switch (state) {
    case 'error':
      baseClasses.push('border-[var(--error)]', 'focus:ring-[var(--error)]/30');
      break;
    case 'success':
      baseClasses.push(
        'border-[var(--success)]',
        'focus:ring-[var(--success)]/30',
      );
      break;
    default:
      baseClasses.push(colorClasses.border.default);
  }

  return cn(...baseClasses);
}

// =================================
// 📊 プリセット統合パターン（よく使う組み合わせ）
// =================================

export const presetClasses = {
  // 最頻出ボタンパターン
  primaryButton: cn(
    getBaseComponentClass('button', 'md', 'aurora', true),
    'text-white',
  ),
  secondaryButton: cn(
    getBaseComponentClass('button', 'md', 'sunset', true),
    'text-white',
  ),
  successButton: cn(
    getBaseComponentClass('button', 'md', 'ocean', true),
    'text-white',
  ),
  dangerButton: cn(
    getBaseComponentClass('button', 'md', 'cosmic', true),
    'text-white',
  ),

  // 汎用ボタン（グラデーションなし）
  defaultButton: cn(
    getBaseComponentClass('button', 'md', 'none', true),
    colorClasses.bg.surface,
    colorClasses.text.primary,
    colorClasses.border.default,
    'border',
  ),

  // カードパターン
  defaultCard: getCardClass('md', 'surface', true),
  featuredCard: getCardClass('lg', 'aurora', true),
  compactCard: getCardClass('sm', 'surface', false),

  // フォームパターン
  textInput: getFormControlClass('md', 'default'),
  textInputError: getFormControlClass('md', 'error'),
  textInputSuccess: getFormControlClass('md', 'success'),
} as const;

// Type exports for better TypeScript support
export type GradientVariant = keyof typeof gradientClasses;
export type TransitionVariant = keyof typeof transitionClasses;
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ShadowVariant = keyof typeof shadowClasses.interactive;
export type ComponentType = 'button' | 'card' | 'input' | 'badge';
