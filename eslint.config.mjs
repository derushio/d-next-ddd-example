import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat の初期化
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// 無視するパターンの定義
const ignorePatterns = [
  // dependencies
  '/node_modules/**',
  '/.pnp',
  '.pnp.*',
  '.yarn/**',

  // testing
  '/coverage/**',

  // next.js
  '/.next/**',
  '/out/**',

  // production
  '/build/**',

  // misc
  '.DS_Store',
  '*.pem',

  // debug
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',

  // env files (can opt-in for committing if needed)
  '.env',

  // vercel
  '.vercel',

  // typescript
  '*.tsbuildinfo',
  'next-env.d.ts',

  // generated
  'src/layers/infrastructure/persistence/prisma/generated/**',
];

// ESLint 設定
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript').map((c) => ({
    ...c,
    ignores: ignorePatterns, // 無視パターンを適用
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // ルールのカスタマイズ
      // 相対参照を禁止し、alias参照を強制
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', './*'],
              message:
                '相対参照は禁止です。@/* のalias参照を使用してください。',
            },
          ],
        },
      ],
    },
  })),
];

export default eslintConfig;
