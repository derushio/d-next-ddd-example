import { env } from '@/lib/env';

/**
 * サイト全体の共通設定
 *
 * - アプリ名は NEXT_PUBLIC_APP_NAME 環境変数から取得（デフォルト: 'D-Next Resources'）
 * - ベースURLは NEXT_PUBLIC_BASE_URL 環境変数から取得
 * - メタデータのデフォルト値として使用する
 */
export const siteConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  description: 'D-Next Resources アプリケーション',
  url: env.NEXT_PUBLIC_BASE_URL,
} as const;

export type SiteConfig = typeof siteConfig;
