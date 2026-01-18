import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  /**
   * 画像最適化設定
   *
   * NOTE: セキュリティ考慮事項
   * - 開発環境では hostname: '*' で全ホストを許可（利便性優先）
   * - 本番環境では特定のホストに制限することを推奨
   *
   * 本番環境での推奨設定例:
   * ```
   * remotePatterns: [
   *   { hostname: 'your-cdn.example.com' },
   *   { hostname: 'images.example.com' },
   * ],
   * ```
   */
  images: {
    remotePatterns: [
      {
        hostname: '*',
      },
    ],
  },
  // 開発環境でのキャッシュ無効化設定
  ...(process.env.NODE_ENV === 'development' && {
    headers: async () => [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ],
  }),
  // Turbopack設定（Next.js 15対応）
  turbopack: {
    // エイリアス設定（tsconfig.jsonと統一）
    resolveAlias: {
      '@/*': './src/*',
      '@prisma/generated/*': './src/layers/infrastructure/persistence/prisma/generated/*',
      '@tests/*': './tests/*',
    },
  },
  // 外部パッケージ最適化
  serverExternalPackages: ['reflect-metadata', 'tsyringe'],
  /**
   * TSyringe DI Container対応のWebpack設定（Webpack使用時のフォールバック）
   * Turbopackで処理できない場合のWebpack設定
   */
  webpack: (config, { isServer, dev }) => {
    // Turbopackが有効な場合はスキップ
    if (dev && process.env.TURBOPACK) {
      return config;
    }

    if (isServer) {
      // Server側で別のentrypoint追加してreflect-metadataを先に読み込み
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();

        // Object.entries で安全に処理
        if (typeof entries === 'object' && entries !== null) {
          for (const [key, value] of Object.entries(entries)) {
            if (Array.isArray(value)) {
              // 既にreflect-metadataが含まれている場合はスキップ
              if (!value.includes('reflect-metadata')) {
                entries[key] = ['reflect-metadata', ...value];
              }
            }
          }
        }

        return entries;
      };
    }

    return config;
  },
};

export default nextConfig;
