---
name: prisma-tls-workaround
description: |
  Prisma 7 + PostgreSQL ローカル開発環境で発生する TLS 接続エラー（P1011）の診断と解決。
  Traefik TCP routing 経由の PostgreSQL は TLS 無効のため、DATABASE_URL に sslmode パラメータが必要。

  トリガー例:
  - 「P1011」「TLS connection」「unexpected EOF」「SSL」
  - prisma migrate dev / prisma generate --sql でエラーが出たとき
  - worktree 作成後の make up で失敗したとき
globs:
  - ".env"
  - ".env.example"
  - "prisma/schema.prisma"
  - "prisma.config.ts"
---

# Prisma TLS Workaround — P1011 解決ガイド

## 症状

`make up` または `pnpm db:migrate:dev` 実行時に以下のエラーが発生する:

```
Error: P1011: Error opening a TLS connection: unexpected EOF
```

または:

```
Error: P1011: Error opening a TLS connection: error:0A000126:SSL routines:SSL_read:unexpected eof while reading
```

## 原因

このプロジェクトは PostgreSQL を **Traefik TCP routing 経由**（TLS 無効、plain TCP）で公開している。

Prisma 7 は `@prisma/adapter-pg`（Driver Adapter）を使用しており、内部で `pg` ライブラリが接続を確立する。`pg` ライブラリはデフォルトで SSL 接続を試みるため、TLS 無効のサーバーに対して `unexpected EOF` エラーが発生する。

### 構成の概要

```
Prisma CLI / PrismaClient
  └─ @prisma/adapter-pg (PrismaPg)
       └─ pg.Pool({ connectionString: DATABASE_URL })
            └─ Traefik TCP entrypoint → PostgreSQL コンテナ（TLS なし）
```

`prisma.config.ts` の `datasource.url` と `prisma.ts` の `PrismaPg({ connectionString })` の両方が `DATABASE_URL` を参照するため、**URL 自体に `sslmode=disable` を付与するのが最もシンプルな解決策**。

## 解決方法

### 手順 1: `.env` の `DATABASE_URL` に `sslmode=disable` を追加

```diff
- DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
+ DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=disable"
```

### 手順 2: `.env.example.dev` も同様に更新（テンプレートの維持）

```diff
- DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
+ DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=disable"
```

### 手順 3: 動作確認

```bash
make up
# 期待: migrate dev → generate → seed まで全て成功
```

## なぜ `sslmode=disable` が効くのか

`pg` ライブラリは PostgreSQL の接続文字列に含まれる `sslmode` パラメータを解釈する。`sslmode=disable` を指定すると SSL ネゴシエーション自体をスキップし、plain TCP 接続のみを行う。

| sslmode 値 | 動作 |
|-----------|------|
| `disable` | SSL 接続を試みない（plain TCP のみ） |
| `prefer`（デフォルト） | SSL を優先し、失敗時に plain TCP にフォールバック |
| `require` | SSL 必須（失敗時エラー） |

ローカル開発環境（Traefik TCP routing）では `disable` が正しい選択。

## 代替解決策（非推奨）

`prisma.ts` の `PrismaPg` 初期化で `ssl: false` を直接渡す方法もあるが、`prisma.config.ts` 側の migrate 実行には効果がないため不完全:

```typescript
// ❌ 不完全な解決策（migrate dev は DATABASE_URL を直接使うため無効）
const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ssl: false, // PrismaPg の pg.Pool オプション — migrate には適用されない
});
```

**URL パラメータで指定する方法が CLI/ランタイム両方に効く唯一の方法**。

## worktree-setup スキルとの連携

`worktree-setup` スキルは `make setup` と `.env.example.dev` からの `.env` コピーを行う。`.env.example.dev` に `sslmode=disable` が含まれていれば、新規 worktree 作成時に自動的に正しい設定が反映される。

**重要**: `.env.example.dev` テンプレートに `sslmode=disable` が含まれていることを必ず確認すること。含まれていない場合は上記の手順 2 を先に実施すること。

## 本番環境への影響

`sslmode=disable` はローカル開発専用。本番環境（Vercel、Railway 等）の `DATABASE_URL` は `sslmode=require` または `sslmode=verify-full` を使用すること。本番の接続文字列は環境変数管理システム（Vercel Environment Variables 等）で別途管理し、`.env.example.dev` の値が本番に使われないようにすること。
