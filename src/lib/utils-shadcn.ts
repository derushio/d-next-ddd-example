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
 * 既存HEX変数とshadcn/ui HSL変数の適切な対応付け
 */
export const themeMapping = {
  // 既存HEX → shadcn/ui HSL マッピング
  'var(--primary)': 'hsl(var(--shadcn-primary))',
  'var(--error)': 'hsl(var(--shadcn-destructive))',
  'var(--success)': 'hsl(var(--shadcn-success))',
  'var(--warning)': 'hsl(var(--shadcn-warning))',
  'var(--info)': 'hsl(var(--shadcn-info))',
  'var(--secondary)': 'hsl(var(--shadcn-secondary))',

  // shadcn/ui専用変数（HSL形式）
  'var(--background)': 'hsl(var(--shadcn-background))',
  'var(--foreground)': 'hsl(var(--shadcn-foreground))',
  'var(--border)': 'hsl(var(--shadcn-border))',
  'var(--input)': 'hsl(var(--shadcn-input))',
  'var(--card)': 'hsl(var(--shadcn-card))',
  'var(--muted)': 'hsl(var(--shadcn-muted))',
  'var(--accent)': 'hsl(var(--shadcn-accent))',
} as const;
