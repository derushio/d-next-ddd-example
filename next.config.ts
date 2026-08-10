import type { NextConfig } from 'next';
import { resolveProjectBase } from './scripts/resolveProjectBase.mjs';

// PROJECT_BASE は Makefile と同一の算出ロジック（scripts/resolveProjectBase.mjs）を共有
const projectBase = resolveProjectBase();

const nextConfig: NextConfig = {
  /* config options here */
  // 型安全なルーティング（typedRoutes）
  // next dev / next build 実行時に .next/types/ に Route型定義が自動生成される
  typedRoutes: true,
  /**
   * TypeScript 7 の native (Go) compiler を CLI 経由で使う。
   *
   * TS 7 は package layout を刷新して `typescript/lib/typescript.js` を削除し、
   * Next.js の従来の JS API 経由の tsc 呼び出しが `require.resolve` 段階で
   * 失敗する（The "id" argument must be of type string. Received undefined）。
   * Next.js 16.3 preview はこの状況を検知し、`experimental.useTypeScriptCli`
   * が true のときは tsc を CLI として spawn するフォールバック経路を通す。
   *
   * 参照: vercel/next.js#95685, #95801, PR #95639
   */
  experimental: {
    useTypeScriptCli: true,
  },
  // portless/worktree経由のdevアクセスでHMR WebSocketのCSRFチェックを許可
  // Next.js 15.2.3+ のCSRF origin チェックにより、portless proxy経由のWebSocket HMR接続が
  // クロスオリジンとしてブロックされるため、明示的に許可が必要
  allowedDevOrigins: [
    `*.${projectBase}.localhost`,
    `${projectBase}.localhost`,
  ],
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
    remotePatterns:
      process.env.NODE_ENV === 'development'
        ? [{ hostname: '*' }]
        : [
            // 本番環境では必要なホストを明示的に指定
            // { hostname: 'your-cdn.example.com' },
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
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ],
  }),
  // Turbopack設定（Next.js 16対応）
  turbopack: {
    // エイリアス設定（tsconfig.jsonと統一）
    resolveAlias: {
      '@/*': './src/*',
      '@prisma/generated/*': './src/layers/infrastructure/persistence/prisma/generated/*',
      '@tests/*': './tests/*',
    },
  },
  // 外部パッケージ最適化
  //
  // @node-rs/argon2: HashService が使う native binding (`.node`)。
  // Turbopack / webpack でバンドルすると Vercel Fluid Compute 等の
  // サーバーレス環境で "Failed to load native binding" が起きて 500 に落ちる。
  // external にしつつ、下段 `outputFileTracingIncludes` で platform 別 `.node`
  // を明示同梱する (external 指定だけでは @vercel/nft が optionalDependencies
  // 経由の native binary を trace しないため、Function bundle から `.node`
  // が抜けて runtime に落ちる)。
  //
  // 詳細: .claude/skills/password-hashing-import-strategy/SKILL.md
  serverExternalPackages: ['reflect-metadata', 'tsyringe', '@node-rs/argon2'],
  /**
   * サーバーレス Function bundle に native binding / 非 JS asset を強制同梱する。
   *
   * `serverExternalPackages` で external 扱いにすると node_modules の JS 自体は
   * Function trace に含まれるが、`.node` / `.json` 等の非 JS asset や
   * `optionalDependencies` 経由の platform-specific package は trace から漏れて
   * runtime `require` 時に "Failed to load native binding" が発生する。
   * `outputFileTracingIncludes` で対象 glob を明示同梱して回避する。
   *
   * NOTE: glob は `.node` suffix に限定し pnpm symlink (`.pnpm/node_modules/...`)
   * は含めない。recursive glob で symlink を include するとサーバーレスデプロイの
   * "Download deployment files" 段階で symlink 重複展開により EEXIST が発生し
   * deploy 失敗する。version wildcard `@*` で lockfile bump に追随する。
   *
   * @node-rs/argon2 の platform 別 native binding (`.node`):
   *   `@node-rs/argon2` は napi-rs 系で `optionalDependencies` として
   *   `@node-rs/argon2-<platform>` package を持ち、その中に `.node` が入る。
   *   pnpm isolated mode では top-level `node_modules/@node-rs/argon2-<platform>/`
   *   symlink は作られないため、実体パス `.pnpm/@node-rs+argon2-<platform>@<ver>/...`
   *   を明示する必要がある。
   *
   *   linux-x64-gnu / linux-x64-musl / linux-arm64-gnu を同梱:
   *     Vercel Fluid Compute (Node.js LTS Linux x86_64 glibc) は linux-x64-gnu が本命。
   *     musl / arm64-gnu は将来の runtime 変更 (Musl 移行, Graviton, ARM Lambda) 保険。
   */
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/.pnpm/@node-rs+argon2-linux-x64-gnu@*/node_modules/@node-rs/argon2-linux-x64-gnu/*.node',
      './node_modules/.pnpm/@node-rs+argon2-linux-x64-musl@*/node_modules/@node-rs/argon2-linux-x64-musl/*.node',
      './node_modules/.pnpm/@node-rs+argon2-linux-arm64-gnu@*/node_modules/@node-rs/argon2-linux-arm64-gnu/*.node',
    ],
  },
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
