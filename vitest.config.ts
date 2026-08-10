import path from 'path';
import { defineConfig } from 'vitest/config';

const sharedAlias = {
  '@': path.resolve(__dirname, './src'),
  '@prisma/generated': path.resolve(
    __dirname,
    './src/layers/infrastructure/persistence/prisma/generated',
  ),
  '@tests': path.resolve(__dirname, './tests'),
  // shadcn/ui コンポーネントは src/components/ui に配置
  '@/components/ui': path.resolve(__dirname, './src/components/ui'),
  // next-auth v5 が `next/server` (拡張子なし) をimportするが、
  // Next.js 16 では `next/server.js` に変更されたため vitest で解決できない。
  // エイリアスで `next/server` → `next/server.js` にマッピングして解決する。
  'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
};

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    reporters: process.env['CI'] ? ['github-actions', 'verbose'] : ['verbose'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    // node環境とjsdom環境のプロジェクトを分離
    // components/hooks テストはjsdom、それ以外はnode
    projects: [
      {
        // Node.js環境: ユニットテスト（domain/application/infrastructure等）
        test: {
          name: 'unit-node',
          globals: true,
          clearMocks: true,
          restoreMocks: true,
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
          include: [
            'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
          ],
          exclude: [
            'node_modules',
            'dist',
            '.next',
            'tests/e2e/**/*',
            'tests/unit/components/**',
            'tests/unit/hooks/**',
          ],
          server: {
            deps: {
              // next-auth が `next/server`（拡張子なし）をimportするため、
              // vitestのトランスフォームパイプライン（resolve.alias適用）を通す
              inline: ['next-auth', '@auth/core'],
            },
          },
        },
        resolve: {
          alias: sharedAlias,
        },
      },
      {
        // jsdom環境: コンポーネント・フックテスト
        test: {
          name: 'unit-jsdom',
          globals: true,
          clearMocks: true,
          restoreMocks: true,
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          include: [
            'tests/unit/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'tests/unit/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
          ],
          server: {
            deps: {
              // next-auth が `next/server`（拡張子なし）をimportするため、
              // vitestのトランスフォームパイプライン（resolve.alias適用）を通す
              inline: ['next-auth', '@auth/core'],
            },
          },
        },
        resolve: {
          alias: sharedAlias,
        },
      },
    ],
  },
  resolve: {
    alias: sharedAlias,
  },
});
