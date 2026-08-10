// DIコンテナ設定をインポート

import { geistMonoFont, geistSansFont } from '@/app/fonts';

import '@/app/globals.css';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { Toaster } from '@/components/ui/sonner';

import '@/di/container';

import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

/**
 * テーマ初期化スクリプト（ライトテーマのみ）
 */
function ThemeModeScript() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: テーマ初期化スクリプトは静的で安全なコード
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            document.documentElement.classList.remove('dark');
          })()
        `,
      }}
    />
  );
}

/**
 * アプリのメタデータ
 */
export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

/**
 * 全てのページで読み込まれる最小 RootLayout
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - DIコンテナ初期化をアプリケーション起動時に実行
 * - NextAuthのSessionProviderでセッション管理統合
 * - サイドバー等のレイアウトは (main)/layout.tsx に委譲
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja' className='h-full' suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body
        className={`${geistSansFont.className} ${geistMonoFont.className} antialiased h-full`}
      >
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
