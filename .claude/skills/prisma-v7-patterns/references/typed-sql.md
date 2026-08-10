# TypedSQL 詳細ガイド

TypedSQLはPrismaのプレビュー機能で、`.sql`ファイルから型付き関数を自動生成する。

## 前提条件

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["typedSql"]
  output          = "../src/layers/infrastructure/persistence/prisma/generated"
}
```

## .sqlファイルの配置

`prisma/sql/` ディレクトリに配置。ファイル名が関数名になる。

```
prisma/
  sql/
    createMigrationTable.sql      → createMigrationTable()
    insertFinishedMigration.sql   → insertFinishedMigration()
    queryFinishedMigrations.sql   → queryFinishedMigrations()
```

## @param アノテーション

### 構文

```sql
-- @param {Type} $N:name description?
```

### 対応する型

| アノテーション型 | PostgreSQL型 | TypeScript型 |
|---|---|---|
| `{String}` | TEXT, VARCHAR | `string` |
| `{Int}` | INTEGER | `number` |
| `{BigInt}` | BIGINT | `bigint` |
| `{Float}` | REAL, DOUBLE | `number` |
| `{Boolean}` | BOOLEAN | `boolean` |
| `{DateTime}` | TIMESTAMP, TIMESTAMPTZ | `Date` |
| `{Bytes}` | BYTEA | `Buffer` |
| `{Decimal}` | DECIMAL, NUMERIC | `Decimal` |

### オプショナルパラメータ

型名の後に `?` をつけるとオプショナル:

```sql
-- @param {DateTime} $3:finished_at?
-- @param {String} $5:logs?
```

### PJの実例

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

## 生成コマンド

```bash
# TypedSQL含めて生成（DB接続が必要）
pnpm prisma generate --sql

# ウォッチモード（開発時に便利）
pnpm prisma generate --sql --watch
```

**重要**: `--sql` フラグを忘れるとTypedSQLの型が生成されない。
PJでは `package.json` に以下を定義済み:

```json
"db:generate": "pnpm prisma generate --sql",
"db:generate:watch": "pnpm prisma generate --sql --watch"
```

## 使用パターン

### SELECT クエリ

```typescript
import { queryFinishedMigrations } from '@/.../generated/sql/queryFinishedMigrations';

// 戻り値の型が自動推論される
const results = await prisma.$queryRawTyped(queryFinishedMigrations());
// results: { migration_name: string }[]
```

### INSERT クエリ

```typescript
import { insertFinishedMigration } from '@/.../generated/sql/insertFinishedMigration';

await prisma.$queryRawTyped(
  insertFinishedMigration(
    uuidv4(),       // $1:id - String
    checksum,       // $2:checksum - String
    new Date(),     // $3:finished_at - DateTime?
    migration,      // $4:migration_name - String
    null,           // $5:logs - String?
    null,           // $6:rolled_back_at - DateTime?
    new Date(),     // $7:started_at - DateTime
    1,              // $8:applied_steps_count - Int
  ),
);
```

### DDL クエリ

```typescript
import { createMigrationTable } from '@/.../generated/sql/createMigrationTable';

// CREATE TABLE IF NOT EXISTS なのでべき等
await prisma.$queryRawTyped(createMigrationTable());
```

## 制限事項

1. **DB接続が `generate` 時に必要**: `prisma generate --sql` はDBに接続してカラム型を推論する
2. **動的カラムは非対応**: SELECT句のカラムは固定である必要がある
3. **プレビュー機能**: 破壊的変更の可能性あり。本番導入は慎重に
4. **prisma/sql/ に限定**: 別ディレクトリに置いても認識されない
5. **PostgreSQL固有構文**: DBプロバイダーによって書き方が異なる

## $queryRawTyped vs 他のRaw SQLメソッド

| メソッド | 型安全 | SQLインジェクション | 用途 |
|---|---|---|---|
| `$queryRawTyped` | ✅ 完全型安全 | ✅ パラメータ化 | 定義済みSQLクエリ |
| `` $queryRaw`...` `` | ⚠️ 部分的 | ✅ 自動パラメータ化 | 動的だがシンプルなクエリ |
| `$queryRawUnsafe` | ❌ | ⚠️ 手動パラメータ化必須 | 動的で複雑なクエリ |
| `$executeRawUnsafe` | ❌ | ❌ | DDL、信頼されたSQL限定 |
