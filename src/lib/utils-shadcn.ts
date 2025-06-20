import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui 専用のclassName結合ユーティリティ
 * 既存の utils.ts と分離して管理
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 既存テーマからshadcn/uiテーマへの変数マッピング
 */
export const themeMapping = {
  // 既存 → shadcn/ui マッピング
  'var(--primary)': 'hsl(var(--shadcn-primary))',
  'var(--error)': 'hsl(var(--shadcn-destructive))',
  'var(--success)': 'hsl(var(--shadcn-success))',
  'var(--warning)': 'hsl(var(--shadcn-warning))',
  'var(--info)': 'hsl(var(--shadcn-info))',
  'var(--secondary)': 'hsl(var(--shadcn-secondary))',
} as const;
