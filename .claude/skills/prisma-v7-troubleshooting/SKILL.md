---
name: prisma-v7-troubleshooting
description: |
  Prisma v7固有のエラー・移行・互換性問題を解決するスキル。
  「Prismaでエラーが出た」「v6からv7に移行したい」「Turbopackで動かない」
  「P2002やP2025のエラー」といった問題発生時の診断・解決ガイドを提供。
  一般的なPrisma利用（Repository実装）ではなく、Prisma v7特有の問題に特化。

  トリガー例:
  - 「Prismaエラー」「P2002」「P2025」「P2003」「PrismaClientKnownRequestError」
  - 「Prisma v7移行」「v6からv7」「Prismaアップグレード」
  - 「Turbopackで動かない」「Cannot find module .prisma」「prisma generateが失敗」
  - 「adapter-pgのエラー」「Edge runtime」「エッジランタイム」
  - 「TypedSQLが動かない」「型が生成されない」「$queryRawTyped型エラー」
  - 「prisma-db-comments-generator エラー」「comments-latest.json」
---

# Prisma v7 Troubleshooting Skill

Prisma v7固有のエラー・移行・互換性問題の診断・解決ガイド。

---

## 1. v6 → v7 移行チェックリスト

### 主要な破壊的変更

| 変更 | 対応 |
|---|---|
| ESM専用モジュール化 | `package.json` に `"type": "module"` |
| Driver Adapters必須 | `@prisma/adapter-pg` 導入 |
| `prisma.config.ts` 導入 | datasource urlをスキーマ外に移動 |
| Client Middleware API削除 | Client Extensionsに移行 |
| 自動シーディング廃止 | `prisma db seed` を明示実行 |
| `--skip-generate` 削除 | `prisma generate` を明示実行 |
| 環境変数の自動読み込み廃止 | `dotenv/config` を明示インポート |
| MongoDB非対応（暫定） | v6を継続使用 |
| Node.js 20.19.0+ 必須 | ランタイムバージョン確認 |
| TypeScript 5.4.0+ 必須 | tsconfig確認 |

### prisma.config.ts への移行

```typescript
// prisma.config.ts
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

> **Next.js + Turbopack環境の注意:** `package.json` に `"type": "module"` の追加は不要。
> Next.js 16はTurbopackでESMを処理するため、プロジェクトルートへの `"type": "module"` 追加は
> かえってビルドエラーを引き起こすことがある。

### 自動シーディング廃止対応

```bash
# v6: prisma migrate dev が自動でseedを実行していた
# v7: 明示的にseedを実行する必要がある
pnpm prisma migrate dev
pnpm db:seed  # 別途実行
```

PJの `Makefile` では `make up` で両方を実行する構成。

**詳細**: `references/v6-to-v7-migration.md` を参照

---

## 2. よくあるエラーと解決策

### Driver Adapter関連

| エラー | 原因 | 解決策 |
|---|---|---|
| `PrismaClientConstructorValidationError: Using engine type 'client' requires either 'adapter' or 'accelerateUrl'` | v7でアダプター必須化 | `@prisma/adapter-pg` を導入し `PrismaClient({ adapter })` を渡す |
| `Edge runtime does not support Node.js built-in modules` | Edge RuntimeでPrisma使用 | Node.jsランタイムのみで使用。proxy.tsからはDB直接アクセスしない |
| `PrismaPg requires a connectionString` | connectionString未設定 | `new PrismaPg({ connectionString: process.env.DATABASE_URL })` |

### Turbopack関連

| エラー | 原因 | 解決策 |
|---|---|---|
| `Cannot find module '.prisma/client/default'` | `prisma-client` generatorとTurbopackの非互換 | `prisma-client-js` に戻す |
| `Module not found: Can't resolve 'fs'` | adapter-pg + Turbopack | `next.config.ts` でfsフォールバック設定 |

### 型生成関連

| エラー | 原因 | 解決策 |
|---|---|---|
| TypedSQLの型が古い・存在しない | `generate --sql` 未実行 | `pnpm prisma generate --sql` |
| `.sql` ファイルが認識されない | `prisma/sql/` 以外に配置 | `prisma/sql/` ディレクトリに移動 |
| `previewFeatures` エラー | `typedSql` が未設定 | `schema.prisma` の generator に追加 |

### Prismaエラーコード

| コード | 名称 | よくある原因 | 対処法 |
|---|---|---|---|
| P2002 | Unique constraint failed | 重複データのINSERT | `upsert` を使うかエラーハンドリング |
| P2025 | Record not found | 存在しないレコードのupdate/delete | 事前存在チェックまたはtry-catch |
| P2003 | Foreign key constraint failed | 参照先レコードが存在しない | 外部キー整合性を確認 |
| P2021 | Table not found | マイグレーション未適用 | `pnpm db:migrate:dev` |
| P2024 | Timed out | 接続プール枯渇 | Pool設定の `max` を調整 |

**詳細**: `references/error-codes.md` を参照

### prisma-db-comments-generator関連

| エラー | 原因 | 解決策 |
|---|---|---|
| `migrate:dev` が失敗する | 対象テーブル未生成なのにコメントマイグレーションが生成された | `comments-latest.json` と該当マイグレーションディレクトリを削除して再実行 |

```bash
# 対処手順
rm -f prisma/comments-latest.json
rm -rf prisma/migrations/<問題のマイグレーション>/
pnpm db:migrate:dev
```

### PrismaClient多重インスタンス

| エラー | 原因 | 解決策 |
|---|---|---|
| `Too many connections` / `FATAL: too many connections` | HMR時に新しいPrismaClientが毎回作成される | `globalThis` シングルトンパターンを適用 |

```typescript
// ✅ 正しいパターン（PJ実装済み）
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## 3. 診断コマンド集

```bash
# バージョン確認
pnpm prisma --version

# クライアント再生成（TypedSQL含む）
pnpm prisma generate --sql

# マイグレーション状態確認
pnpm prisma migrate status

# スキーマ検証
pnpm prisma validate

# DB接続テスト（スキーマをDB側からpull）
pnpm prisma db pull --print

# DBの内容を確認（Prisma Studio）
pnpm db:studio

# マイグレーションリセット（開発環境のみ！本番絶対禁止）
pnpm prisma migrate reset
```

---

## 4. パフォーマンス問題の診断

### クエリログの有効化

```typescript
// 一時的にクエリログを有効化して問題を特定
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});
```

### N+1検出

クエリログで同じテーブルへのSELECTが連続している場合はN+1の可能性:
→ `include` または `relationLoadStrategy: 'join'` で解決

### Too many connections の対処

```typescript
// Pool利用時は max を調整
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // デフォルト: CPU数*2+1。サーバーレスは max: 1 から
});
```

---

## 実装チェックリスト（トラブル防止）

- [ ] Node.js 20.19.0以上を使用している
- [ ] TypeScript 5.4.0以上を使用している（TypeScript 6.0でも互換性に問題なし。`experimentalDecorators`/`emitDecoratorMetadata` は TS6 でも引き続きサポートされる）
- [ ] `prisma-client-js` をgeneratorに使用している（Turbopack互換）
- [ ] `@prisma/adapter-pg` がインストールされている
- [ ] `globalThis` シングルトンパターンを適用している
- [ ] `output` パスが正しく設定されている
- [ ] `previewFeatures` に必要な機能が設定されている
- [ ] 本番デプロイ前に `prisma migrate deploy` を実行している
