# Prisma v6 → v7 移行ガイド

## 移行手順（ステップバイステップ）

### Step 1: パッケージアップデート

```bash
pnpm add prisma@^7 @prisma/client@^7 @prisma/adapter-pg@^7 @prisma/client-runtime-utils@^7
pnpm add pg  # pgドライバーも必要
```

### Step 2: package.json に ESM設定

```json
{
  "type": "module"
}
```

> **Next.js + Turbopackでは不要:** Next.js 16プロジェクトでは `"type": "module"` をルートの
> `package.json` に追加するとビルドエラーが発生することがある。Next.jsはTurbopackで
> ESMを内部処理するため、この設定は省略すること。

### Step 3: tsconfig.json の更新

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023"
  }
}
```

> **Next.js + Turbopackでは不要:** Next.js 16プロジェクトは独自のtsconfig設定を持つため、
> 上記のtsconfig変更は不要。`next.config.ts` の設定が優先される。

### Step 4: prisma.config.ts の作成

```typescript
import { config } from '@dotenvx/dotenvx';
import { defineConfig } from 'prisma/config';

config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'pnpm tsx ./src/layers/infrastructure/persistence/prisma/seeds/index.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

**PJ固有のポイント:**
- `@dotenvx/dotenvx` を使用（`dotenv/config` ではない）
- `config()` を先頭で呼び出すこと（環境変数を確実にロード）
- `env()` ヘルパーは使用せず `process.env.DATABASE_URL!` で参照
- `migrations.seed` フィールドでシードコマンドを登録（v7から `prisma migrate dev` 時に自動実行）

### Step 5: schema.prisma の更新

```prisma
generator client {
  provider        = "prisma-client-js"  // Turbopack互換のためこちらを使用
  output          = "../src/layers/infrastructure/persistence/prisma/generated"  // v7から必須
  previewFeatures = ["typedSql"]  // 必要に応じて
}

datasource db {
  provider = "postgresql"
  // url を削除（prisma.config.ts に移動）
}
```

### Step 6: PrismaClient初期化の更新

```typescript
// Before (v6)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// After (v7)
import { PrismaClient } from './generated/client';  // カスタムoutputパス
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

### Step 7: Client Middleware → Client Extensions

```typescript
// Before (v6): Client Middleware
prisma.$use(async (params, next) => {
  const result = await next(params);
  return result;
});

// After (v7): Client Extensions
const xprisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(args);
        return result;
      },
    },
  },
});
```

### Step 8: 生成と検証

```bash
pnpm prisma generate --sql
pnpm prisma validate
pnpm prisma migrate status
```

## 破壊的変更の完全リスト

### 必須対応

| 変更 | 影響 | 対応方法 |
|---|---|---|
| Driver Adapter必須 | PrismaClient初期化 | adapter-pg導入 |
| ESM専用 | import/export | package.json + tsconfig更新（Next.js+Turbopackでは不要） |
| output必須 | generate先 | schema.prismaにoutput追加 |
| prisma.config.ts | datasource設定 | 新ファイル作成 |
| 環境変数自動読込廃止 | DB接続 | dotenv/config明示インポート |

### 推奨対応

| 変更 | 影響 | 対応方法 |
|---|---|---|
| Client Middleware廃止 | 拡張機能 | Client Extensionsに移行 |
| 自動シーディング廃止 | 開発フロー | make/CI設定で明示実行 |
| URL パラメータでのプール設定廃止 | 接続設定 | Pool オブジェクトで設定 |

## Node.js / TypeScript バージョン要件

| 依存 | 最小バージョン |
|---|---|
| Node.js | 20.19.0 |
| TypeScript | 5.4.0 |
| npm | 10.x（推奨） |

## Turbopack互換性の注意

v7には2つのgenerator:
- `prisma-client-js`: Turbopack互換。PJで使用中
- `prisma-client`: Turbopack非互換（`Cannot find module '.prisma/client/default'`）

**結論**: Next.js + Turbopack環境では `prisma-client-js` を使用すること。
内部実装は同一で、v7の全機能が利用可能。

## テスト時の注意点

- `vitest-mock-extended` でのモックは引き続き動作
- TypedSQL関数のモックは `$queryRawTyped` をモックすることで対応
- Prisma v7のカスタムoutputパスからインポートすることを忘れずに

```typescript
// テストでのインポート例
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { mockDeep } from 'vitest-mock-extended';

const prismaMock = mockDeep<PrismaClient>();
```
