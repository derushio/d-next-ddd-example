import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// 無視するパターンの定義
const ignorePatterns = [
  // dependencies
  'node_modules/**',
  '.pnp',
  '.pnp.*',
  '.yarn/**',

  // testing
  'coverage/**',

  // next.js
  '.next/**',
  'out/**',

  // production
  'build/**',

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
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ignorePatterns,
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
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
      // Next.jsのServer Componentsでは Date.now() 等の使用は正当なため無効化
      'react-hooks/purity': 'off',
    },
  },
  // ============================================================
  // Clean Architecture レイヤー依存関係制約
  // src/layers/ 配下のみが対象
  // ============================================================
  // Domain層: 最も内側、他のレイヤーに依存禁止
  {
    files: ['src/layers/domain/**/*.ts', 'src/layers/domain/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', './*'],
              message:
                '相対参照は禁止です。@/* のalias参照を使用してください。',
            },
            {
              group: ['@/layers/application/*', '@/layers/application/**'],
              message:
                'Domain層からApplication層へのインポートは禁止です。Clean Architectureの依存関係に違反しています。',
            },
            {
              group: ['@/layers/infrastructure/*', '@/layers/infrastructure/**'],
              message:
                'Domain層からInfrastructure層へのインポートは禁止です。Clean Architectureの依存関係に違反しています。',
            },
          ],
        },
      ],
    },
  },
  // Application層: Domain層にのみ依存可能
  {
    files: ['src/layers/application/**/*.ts', 'src/layers/application/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', './*'],
              message:
                '相対参照は禁止です。@/* のalias参照を使用してください。',
            },
            {
              group: ['@/layers/infrastructure/*', '@/layers/infrastructure/**'],
              message:
                'Application層からInfrastructure層へのインポートは禁止です。Clean Architectureの依存関係に違反しています。',
            },
          ],
        },
      ],
    },
  },
  // Infrastructure層: Domain層、Application層に依存可能
  {
    files: [
      'src/layers/infrastructure/**/*.ts',
      'src/layers/infrastructure/**/*.tsx',
    ],
    rules: {
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
  },
];

export default eslintConfig;
