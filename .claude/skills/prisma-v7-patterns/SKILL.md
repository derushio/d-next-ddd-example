---
name: prisma-v7-patterns
description: |
  Prisma 7.x固有の機能・設定パターンを提供するスキル。
  Driver Adapters（@prisma/adapter-pg）、TypedSQL（$queryRawTyped）、
  prisma.config.ts、globalThisシングルトン、クエリ最適化、previewFeaturesの設定を扱う。
  「Prismaの一般的な使い方」ではなく「Prisma v7の機能をどう使うか」という文脈で適用される。

  トリガー例:
  - 「Driver Adapter」「PrismaPg」「adapter-pg」「connectionString」
  - 「TypedSQL」「typedSql」「$queryRawTyped」「.sql ファイル」
  - 「prisma.config.ts」「defineConfig」「previewFeatures」
  - 「Prismaクライアント初期化」「シングルトン」「globalThis prisma」
  - 「N+1」「クエリ最適化」「relationLoadStrategy」「select vs include」
  - 「接続プール」「Pool設定」「connectionTimeoutMillis」
  - prisma/schema.prisma の generator/datasource 編集時
  - src/layers/infrastructure/persistence/prisma.ts 編集時
globs:
  - "prisma/schema.prisma"
  - "src/layers/infrastructure/persistence/prisma.ts"
---

# Prisma v7 Patterns Skill

Prisma 7.x固有の設定・機能・最適化パターンを提供する。

## infrastructure-impl との棲み分け

| スキル | 役割 |
|---|---|
| `infrastructure-impl` | Repositoryの設計・DIPの遵守・DRY原則 |
| このスキル | Prisma v7固有の設定・API・機能（Driver Adapters, TypedSQL等） |

---

## 1. PJ固有のPrisma v7構成

### schema.prisma の設定

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"   // Turbopack互換のため（prisma-clientは非互換）
  previewFeatures = ["typedSql"]         // TypedSQL有効化
  output          = "../src/layers/infrastructure/persistence/prisma/generated"
}

generator comments {
  // prisma-db-comments-generator: DBコメント自動生成
  // 注意: 対象テーブル未生成時にmigrate:devが失敗する場合あり
  // → comments-latest.jsonを削除して再実行
  provider = "prisma-db-comments-generator"
}

datasource db {
  provider = "postgresql"
  // v7ではurlをprisma.config.tsに移動推奨（schema内のurlはdeprecated）
}
```

**重要ポイント:**
- `prisma-client-js` を使用すること（`prisma-client` はTurbopack非互換）
- `output` は必須（v7からnode_modules外への出力が標準）
- importパスは `@/layers/infrastructure/persistence/prisma/generated`

### PrismaClient初期化パターン

```typescript
// src/layers/infrastructure/persistence/prisma.ts
import { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']   // 開発: クエリログ有効
        : ['warn', 'error'],            // 本番: クエリログ無効
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;  // HMR時の多重インスタンス防止
}
```

### Driver Adapters: @prisma/adapter-pg

v7からDriver Adaptersが**必須**。Rustエンジンが廃止されTypeScriptに移行。

```typescript
// ✅ PJの方式: connectionString直接渡し（シンプル）
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

// ✅ Pool利用（高トラフィック環境向け）
import { Pool } from 'pg';
const pool = new Pool({
  // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
const adapter = new PrismaPg(pool);
```

**詳細**: `references/driver-adapters.md` を参照

---

## 2. TypedSQL パターン（$queryRawTyped）

### 概要

TypedSQLは `.sql` ファイルから型付き関数を生成する機能（プレビュー）。
`$queryRawTyped` で型安全にRaw SQLを実行できる。

### .sqlファイルの配置と@paramアノテーション

```sql
-- prisma/sql/queryFinishedMigrations.sql
SELECT "migration_name"
FROM "_prisma_migrations"
WHERE "finished_at" IS NOT NULL
ORDER BY "migration_name" ASC;
```

```sql
-- prisma/sql/insertFinishedMigration.sql
-- @param {String} $1:id uuidv4
-- @param {String} $2:checksum
-- @param {DateTime} $3:finished_at?
-- @param {String} $4:migration_name
-- @param {String} $5:logs?
-- @param {DateTime} $6:rolled_back_at?
-- @param {DateTime} $7:started_at
-- @param {Int} $8:applied_steps_count
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name",
  "logs", "rolled_back_at", "started_at", "applied_steps_count"
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
```

### 生成コマンド

```bash
pnpm prisma generate --sql   # DB接続が必要
pnpm prisma generate --sql --watch  # ウォッチモード
```

### PJの使用例（カスタムマイグレーションランナー）

```typescript
// src/layers/infrastructure/persistence/prisma/migrate.ts
import { createMigrationTable } from '@/.../generated/sql/createMigrationTable';
import { queryFinishedMigrations } from '@/.../generated/sql/queryFinishedMigrations';
import { insertFinishedMigration } from '@/.../generated/sql/insertFinishedMigration';

// 型安全なSQLクエリ実行
await prisma.$queryRawTyped(createMigrationTable());
const finished = await prisma.$queryRawTyped(queryFinishedMigrations());
await prisma.$queryRawTyped(insertFinishedMigration(uuid, checksum, ...));
```

### 使い分け

| メソッド | 用途 | 安全性 |
|---|---|---|
| `$queryRawTyped` | TypedSQL生成関数 | ✅ 型安全・パラメータ化 |
| `` $queryRaw`...` `` | タグ付きテンプレート | ✅ 自動パラメータ化 |
| `$queryRawUnsafe` | 動的SQL文字列 | ⚠️ SQLインジェクションリスク |
| `$executeRawUnsafe` | DDL等の実行 | ⚠️ ローカルファイル限定で使用 |

**詳細**: `references/typed-sql.md` を参照

---

## 3. クエリ最適化・パフォーマンス

### N+1問題対策

```typescript
// ❌ N+1が発生
const users = await prisma.user.findMany();
for (const user of users) {
  const sessions = await prisma.userSession.findMany({ where: { userId: user.id } });
}

// ✅ include で1クエリに統合
const users = await prisma.user.findMany({
  include: { UserSession: true },
});

// ✅ JOINを強制（Prisma v5.7+）
const users = await prisma.user.findMany({
  include: { UserSession: true },
  relationLoadStrategy: 'join',
});
```

### select vs include の使い分け

```typescript
// ✅ 必要なフィールドのみ取得（レスポンス軽量化）
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    // passwordHash は含めない
  },
});

// ✅ リレーション含む場合もselectで絞り込み
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    UserSession: {
      select: { id: true, accessTokenExpireAt: true },
    },
  },
});
```

### カーソルベースページネーション

```typescript
// ✅ 大規模データにはcursorベースを使用（offsetより高速）
const users = await prisma.user.findMany({
  take: 20,
  skip: 1,  // cursorの次から
  cursor: { id: lastUserId },
  orderBy: { createdAt: 'desc' },
});
```

### ログ設定

```typescript
// 開発環境: クエリログ有効（デバッグ用）
log: ['query', 'warn', 'error']

// 本番環境: クエリログ無効（パフォーマンス重視）
log: ['warn', 'error']
```

---

## 4. Raw SQL セキュリティ

### タグ付きテンプレートリテラル（安全）

```typescript
// ✅ 自動パラメータ化
const email = userInput;
const result = await prisma.$queryRaw`
  SELECT * FROM "User" WHERE email = ${email}
`;
```

### $executeRawUnsafe の許容ケース

```typescript
// ✅ ローカルSQLファイルの実行（ユーザー入力不介在）
// SECURITY: 信頼されたローカルマイグレーションSQLファイルの実行
const fileContent = await fs.promises.readFile(migrationPath, 'utf-8');
await prisma.$executeRawUnsafe(fileContent);

// ❌ ユーザー入力を含むSQL（絶対禁止）
await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE email = '${userInput}'`);
```

---

## 5. マイグレーション管理

### prisma.config.ts の設定

```typescript
// prisma.config.ts（プロジェクトルート）
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
    // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
    url: process.env.DATABASE_URL!,
  },
});
```

**ポイント:**
- `@dotenvx/dotenvx` を使用（`dotenv/config` ではない）
- `config()` を必ず呼び出すこと
- `process.env.DATABASE_URL!` で参照（`env()` ヘルパーは不使用）
- `migrations.seed` に `pnpm tsx` 経由でシードスクリプトを指定

### 環境別コマンド

| 環境 | コマンド | 備考 |
|---|---|---|
| 開発 | `pnpm db:migrate:dev` | インタラクティブ |
| 本番 | `prisma migrate deploy` | CI/CDで使用、非インタラクティブ |
| リセット | `prisma migrate reset` | **本番絶対禁止** |

### PJのカスタムマイグレーションランナー

`src/layers/infrastructure/persistence/prisma/migrate.ts` でTypedSQLを使った独自マイグレーション管理を実装:
1. `_prisma_migrations` テーブル作成（べき等）
2. 未実行マイグレーション一覧取得
3. SQLファイル順次実行 + checksum記録

### CI/CD推奨構成

```bash
pnpm prisma generate --sql   # 1. クライアント + TypedSQL生成
pnpm prisma migrate deploy   # 2. マイグレーション適用
pnpm db:seed                 # 3. シード投入（v7では自動実行されない）
```

---

## 6. Turbopack互換性

### prisma-client-js vs prisma-client

| Generator | Turbopack | 備考 |
|---|---|---|
| `prisma-client-js` | ✅ 互換 | PJで使用中。v7の全機能利用可 |
| `prisma-client` | ❌ 非互換 | `Cannot find module '.prisma/client/default'` エラー |

### Next.js 16 + Turbopackでの注意点

- `prisma-client-js` を使用すること
- `adapter-pg` + `pg` のNode.jsモジュールはEdge Runtimeでは動作しない
- Server Component / Route Handler（Node.jsランタイム）でのみ使用可

---

## 7. Entity ID 生成ルール（CUID2統一）

### ❌ 禁止: Prisma スキーマの `@default(cuid())`

```prisma
// ❌ 非推奨: Prisma組み込みのCUID v1（古いアルゴリズム）
model User {
  id String @id @default(cuid())
}
```

### ✅ 推奨: Application層で `genCuid2()` を使用

```typescript
// Application層（UseCase）でIDを生成してからPrismaに渡す
import { genCuid2 } from '@paralleldrive/cuid2';

// ✅ Entity ID はApplication層で生成
const newUserId = genCuid2();
await prisma.user.create({
  data: {
    id: newUserId,  // 明示的にIDを渡す
    email: userData.email,
    // ...
  },
});
```

**理由**:
- `@default(cuid())` はPrisma組み込みのCUID v1（非推奨アルゴリズム）
- `@paralleldrive/cuid2` はCUID v2（衝突耐性・予測困難性が向上）
- Application層でID生成することで、テスト時にIDを制御しやすくなる
- Prismaスキーマから `@default(cuid())` を削除し、`id String @id` のみに変更すること

---

## 実装チェックリスト

- [ ] `@prisma/adapter-pg` を使用している（v7必須）
- [ ] `globalThis` シングルトンパターンを適用している
- [ ] generator に `prisma-client-js` を指定している（Turbopack互換）
- [ ] `output` パスが正しく設定されている
- [ ] `previewFeatures` に `"typedSql"` を設定している（TypedSQL使用時）
- [ ] 本番環境ではクエリログを無効化している
- [ ] `$queryRawUnsafe` にユーザー入力を直接渡していない
- [ ] N+1問題を `include` / `select` で回避している
- [ ] Entity ID を `genCuid2()` でApplication層で生成している（`@default(cuid())` 禁止）
