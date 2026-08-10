---
name: env-management
description: |
  環境変数の型安全な管理パターンを提供するスキル。
  @t3-oss/env-nextjsのcreateEnvによるserver/client分離、
  process.env直接アクセス禁止ルールを含む。

  トリガー例:
  - env, process.env, t3-env, createEnv, 環境変数
  - .env ファイル編集時
  - src/lib/env.ts 編集時
globs:
  - ".env*"
  - "src/lib/env.ts"
---

# env-management スキル

## 概要

環境変数は `src/lib/env.ts` で `@t3-oss/env-nextjs` の `createEnv` を使って一元管理する。
ビルド時・起動時に自動バリデーションが走り、不正な設定を早期検出できる。

---

## ルール

### @t3-oss/env-nextjs で管理

全環境変数は `src/lib/env.ts` の `createEnv` で定義・バリデーションする。

**推奨パターン:**

```typescript
import { env } from '@/lib/env';

// アクセスは env オブジェクト経由（型安全・自動補完あり）
const dbUrl = env.DATABASE_URL;
const baseUrl = env.NEXT_PUBLIC_BASE_URL;
```

**禁止:**

- `process.env.XXX` の直接アクセス（`src/lib/env.ts` の `runtimeEnv` 内を除く）
- 使用側でのデフォルト値設定（`createEnv` のスキーマで `default()` を定義する）
- `Env` クラス（旧実装: `@/app/server-actions/env/Env`）の参照

---

## env.ts の構造

```typescript
// src/lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // サーバーサイドのみアクセス可能な変数
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    TOKEN_SECRET: z.string().min(1),
    // boolean: z.coerce.boolean().default(true)
    // number:  z.coerce.number().min(1).max(100).default(5)
  },
  client: {
    // NEXT_PUBLIC_ プレフィックス必須
    NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
    NEXT_PUBLIC_APP_NAME: z.string().default('D-Next Resources'),
  },
  runtimeEnv: {
    // server: process.env マッピング（ここだけ process.env アクセス可）
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    TOKEN_SECRET: process.env.TOKEN_SECRET,
    // client
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
```

---

## 型変換パターン

| 型 | Zodスキーマ | 備考 |
|----|-------------|------|
| string | `z.string().min(1)` | 必須文字列 |
| string (optional) | `z.url().optional()` | 任意URL |
| number | `z.coerce.number()` | 文字列から変換 |
| boolean | `z.coerce.boolean().default(true)` | 文字列から変換 |
| enum | `z.enum(['debug', 'info', 'warn', 'error'])` | 列挙型 |
| URL | `z.url()` | URL検証 |

### boolean の注意点

`z.coerce.boolean()` は文字列 `"false"` を `true` に変換する（`Boolean("false") === true`）。
`"false"` を `false` として扱いたい場合は旧 `Env.ts` 実装のような変換が必要だが、
本プロジェクトでは環境変数に `"false"` を設定すると無効化できる設計になっている。

---

## 新しい環境変数の追加手順

1. `src/lib/env.ts` の `server` or `client` スキーマに追加（`NEXT_PUBLIC_` のみ `client`）
2. `runtimeEnv` に `process.env.VARIABLE_NAME` のマッピングを追加
3. `.env.example.dev` に変数名とデフォルト値のコメントを追加
4. 必要に応じて `.env` にも設定

```typescript
// 追加例（server）
server: {
  NEW_API_KEY: z.string().min(1),
  NEW_TIMEOUT_MS: z.coerce.number().min(100).default(5000),
},

// 追加例（client）
client: {
  NEXT_PUBLIC_NEW_FEATURE_FLAG: z.coerce.boolean().default(false),
},

// runtimeEnv
runtimeEnv: {
  NEW_API_KEY: process.env.NEW_API_KEY,
  NEW_TIMEOUT_MS: process.env.NEW_TIMEOUT_MS,
  NEXT_PUBLIC_NEW_FEATURE_FLAG: process.env.NEXT_PUBLIC_NEW_FEATURE_FLAG,
},
```

---

## セキュリティ設定変数の範囲バリデーション

セキュリティ関連変数（Rate Limit, Lockout, Session）は不正値防止のため範囲制限を設定する。

```typescript
// SECURITY_DEFAULTS から適切なデフォルト値を参照
import { SECURITY_DEFAULTS } from '@/layers/infrastructure/constants/security';

AUTH_RATE_LIMIT_MAX: z.coerce
  .number()
  .min(1)      // 最小1回
  .max(1000)   // 最大1000回
  .default(SECURITY_DEFAULTS.AUTH_RATE_LIMIT_MAX),
```

---

## ビルド時バリデーション

`next.config.ts` の先頭で `import './src/lib/env'` を実行することで、
ビルド時・起動時に必須変数の存在チェックが自動的に行われる。

```typescript
// next.config.ts
import './src/lib/env'; // ビルド時バリデーション
import type { NextConfig } from 'next';
// ...
```

---

---

## process.env直接アクセスの例外

以下のケースではprocess.env直接参照が必要:

- **Prisma初期化** (`src/layers/infrastructure/persistence/prisma.ts`): PrismaClientはアプリ起動時にenv.tsより前に初期化されるため
- **proxy.ts (Edge Runtime)**: Edge RuntimeではNode.js APIが制限されるため
- **Logger初期化**: ロガーはDIコンテナ初期化時に生成されるため

---

## Zod v4 環境変数バリデーションパターン

### z.number().positive() / .nonnegative() の活用

`.refine()` で書いていた数値チェックを組み込みメソッドに置き換える:

```typescript
// ❌ .refine() で手書き
TOKEN_MAX_AGE_MINUTES: z.pipe(
  z.coerce.number(),
  z.number().refine((v) => 0 < v),
),

// ✅ 組み込みメソッド
TOKEN_MAX_AGE_MINUTES: z.pipe(
  z.coerce.number(),
  z.number().positive(),
),
```

### z.int() の環境変数での使用

環境変数は文字列として来るため、`z.pipe()` で coercion を分離する:

```typescript
// ✅ 整数環境変数
MAX_RETRY_COUNT: z.pipe(
  z.coerce.number(),
  z.int().min(1).max(10),
),
```

**関連スキル**: `zod-v4-modern-api` — Zod v4 の全般的なモダン API パターン

---

## 関連ファイル

- **env定義**: `src/lib/env.ts`
- **セキュリティ定数**: `src/layers/infrastructure/constants/security.ts`
- **環境変数テンプレート**: `.env.example.dev`
- **ビルド設定**: `next.config.ts`
