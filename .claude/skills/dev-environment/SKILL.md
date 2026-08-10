---
name: dev-environment
description: |
  開発環境の起動・リセット・トラブルシューティングを専門とするスキル。
  make up, make clean, make dev などのMakeコマンドの適切な使い分けをガイド。

  トリガー例:
  - 「開発環境を立ち上げたい」「環境を起動」「make up」
  - 「異常が発生した」「DBエラー」「コンテナが動かない」
  - 「作り直したい」「リセットしたい」「クリーンアップ」
  - 「make clean」「環境を初期化」
  - 「healthcheck」「ヘルスチェック」「BuildKit」「docker compose」
---

# Dev Environment Management Skill

## 概要

このスキルは、開発環境の起動・停止・リセット・トラブルシューティングを支援します。
Docker コンテナベースの開発環境において、適切な Make コマンドを選択し、問題を迅速に解決するためのガイドを提供します。
PostgreSQLはTraefik TCP routing経由で接続し、worktreeごとにCOMPOSE_PROJECT_NAMEで分離されます。

---

## コマンドリファレンス

| コマンド | 用途 | データへの影響 | 所要時間目安 |
|---------|------|--------------|------------|
| `make up` | DB起動 + マイグレーション + シード | なし（既存データ保持） | ~30秒 |
| `make dev` | up + 開発サーバー起動（portless経由） | なし | ~30秒 |
| `make down` | コンテナ停止 | なし（ボリューム保持） | ~5秒 |
| `make clean` | 完全クリーンアップ | ⚠️ **全データ削除** | ~10秒 |
| `make seed` | マイグレーション + シード再投入 | シードで上書き | ~10秒 |
| `make setup` | 初回セットアップ（依存関係インストール + 環境構築） | なし | ~3分 |

### 各コマンドの詳細

#### `make up`
- PostgreSQL コンテナを起動（Traefik TCP ルーティング経由）
- ブランチ名からworktreeIDを算出し、DBポートを動的に割り当て
- Prisma マイグレーション実行
- 初期シードデータ投入
- 既存データは保持される
- Traefik TCP経由でDBに接続（compose.yamlにports:なし、Traefikラベルで管理）

#### `make dev`
- `make up` を実行後、`pnpm dev` で開発サーバーを起動
- `pnpm dev` は以下の3プロセスを並列起動（`run-p` で管理）:
  - `next:dev`: `portless run next dev --turbopack`（Next.js開発サーバー、portless経由）
  - `db:generate:watch`: `prisma generate --sql --watch`（スキーマ変更を自動検知してClientを再生成）
  - `db:studio`: `prisma studio --browser none --port 0`（Prisma Studio、OS空きポートを自動割当）
- 開発サーバーは portless プロキシ経由でアクセス
- アクセスURLは `portless list` で確認
- 最も頻繁に使用するコマンド

#### `make down`
- すべてのコンテナを停止
- ボリュームは保持されるため、次回 `make up` でデータ復元可能

#### `make clean` ⚠️
- すべてのコンテナ、ボリューム、ネットワークを削除
- **すべてのローカルDBデータが失われる**
- 環境を完全にリセットしたい場合のみ使用

#### `make seed`
- Prisma マイグレーションを実行
- シードスクリプトを実行してデータ再投入
- DB構造は保持されるが、シードデータは最新の定義で上書き

#### `make setup`
- 初回クローン時のみ使用
- `pnpm install` でパッケージインストール
- `.env` の自動生成（`AUTH_SECRET` 等をランダム生成）
- Git hooks の設定（pre-commit, pre-push）
- **前提条件**: `fd`（`fd-find`）コマンドが必要。未インストール時は `sudo pacman -S fd`（Arch Linux）等でインストール
- 完了後の案内:
  1. `portless proxy start` でプロキシ起動（初回のみ）
  2. `make dev` で開発環境起動
  3. `portless list` でアクセスURL確認

---

## シナリオ別ガイド

### シナリオ1: 開発環境を立ち上げたい

#### 初回クローン時

```bash
# portlessプロキシを起動（初回のみ・グローバル設定）
portless proxy start

# セットアップ実行
make setup

# 開発サーバー起動
make dev

# アクセスURLを確認
portless list
```

**実行内容**:
1. portless プロキシ起動（ポート1355でローカルプロキシ）
2. 依存パッケージのインストール
3. 環境変数ファイルの自動生成（`.env`）
4. Git hooks 設定（pre-commit, pre-push）
5. Docker コンテナ起動（worktreeごとに独立したDBポート）
6. DB マイグレーション + シード投入
7. 開発サーバー起動（`http://d-next-ddd-example.localhost:1355`）

#### 2回目以降

```bash
make dev
```

**実行内容**:
1. Docker コンテナ起動（worktree名からDBポートを動的算出、既存データ保持）
2. DB マイグレーション（差分のみ）
3. シード投入（冪等性により安全）
4. 開発サーバー起動（portless経由）

#### アクセスURLの確認

```bash
portless list
# 例: http://d-next-ddd-example.localhost:1355
```

#### worktreeでの並列開発

worktreeごとにDBポートが自動的に異なる値に設定されるため、複数のworktreeを同時に起動しても衝突しません。

```bash
# worktree-fix-auth ブランチ → DBポート: 5466〜5484のいずれか（ブランチ名のハッシュで決定）
# main ブランチ             → DBポート: 5465（固定）
portless list  # 各worktreeのURLを確認
```

---

### シナリオ2: 異常が発生した

#### ステップ1: 現象の特定

以下の質問で原因を絞り込みます:

- [ ] Docker は起動していますか? → `docker ps` で確認
- [ ] portless プロキシは起動していますか? → `portless list` で確認
- [ ] `.env` ファイルは存在しますか? → `ls -la .env` で確認
- [ ] 依存パッケージはインストール済みですか? → `ls node_modules` で確認

#### ステップ2: 基本的なトラブルシューティング

**問題: コンテナが起動しない**

```bash
# コンテナを停止して再起動
make down
make up
```

**問題: マイグレーションエラー**

```bash
# マイグレーションの状態を確認
pnpm db:migrate:status

# 必要に応じてリセット
pnpm db:migrate:reset
```

**問題: ポート競合**

```bash
# portlessプロキシの状態確認
portless list

# portlessプロキシを再起動
portless proxy stop
portless proxy start

# PostgreSQLポート（動的割り当て）の確認
# mainブランチ: 5465、worktreeブランチ: 5466〜5484
docker ps  # 使用中のポートを確認
```

**問題: 依存パッケージのエラー**

```bash
# node_modules を削除して再インストール
rm -rf node_modules
pnpm install
```

#### ステップ3: 改善しない場合

環境を完全にリセットします（⚠️ データ削除注意）:

```bash
# 完全クリーンアップ
make clean

# 再セットアップ
pnpm install
make dev
```

---

### シナリオ3: 作り直したい

#### ケース1: シードデータだけ再投入したい

```bash
make seed
```

**影響**: DB構造はそのまま、シードデータのみ最新化

#### ケース2: DBを完全にリセットしたい

```bash
# マイグレーションをリセット
pnpm db:migrate:reset
```

**影響**: DB構造とデータを完全にリセット、マイグレーション + シードを再実行

#### ケース3: 環境を完全にクリーンアップしたい

⚠️ **警告: すべてのローカルDBデータが削除されます**

```bash
# ステップ1: クリーンアップ
make clean

# ステップ2: 再起動
make dev
```

**影響**: Docker ボリューム、コンテナ、ネットワークをすべて削除し、クリーンな状態から再構築

---

## トラブルシューティング チェックリスト

### 環境起動前のチェック

- [ ] Docker が起動している（`docker ps` で確認）
- [ ] portless プロキシが起動している（`portless list` で確認、なければ `portless proxy start`）
- [ ] `.env` ファイルが存在する（なければ `make setup`）
- [ ] `node_modules` が存在する（なければ `pnpm install`）
- [ ] DBポートが空いている（mainブランチ: 5465、worktreeブランチ: 動的割り当て）

### エラー発生時のチェック

- [ ] `docker ps` でコンテナの状態を確認
- [ ] `docker logs <container-id>` でコンテナのログを確認
- [ ] `pnpm db:migrate:status` でマイグレーション状態を確認
- [ ] `.env` の環境変数が正しく設定されている
- [ ] `pnpm check` で型エラーやビルドエラーがないか確認

### クリーンアップ前のチェック

- [ ] ⚠️ ローカルDBデータを失っても問題ないか確認
- [ ] ⚠️ コミットされていない変更がないか確認（`git status`）
- [ ] ⚠️ `.env` のバックアップがあるか確認

---

## 注意事項

### ⚠️ `make clean` の破壊的性質

`make clean` は以下をすべて削除します:

- Docker コンテナ
- Docker ボリューム（**DB データがすべて失われる**）
- Docker ネットワーク

**実行前に必ず確認してください**:
- ローカルDBデータを失っても問題ないか
- 重要なテストデータがないか
- `.env` のバックアップがあるか

### ⚠️ データの永続性について

| コマンド | データ永続性 |
|---------|-----------|
| `make down` | ✅ データ保持（ボリューム残る） |
| `make clean` | ❌ データ削除（ボリューム削除） |
| `pnpm db:migrate:reset` | ❌ DB内容削除（コンテナは残る） |

### ⚠️ シード投入のタイミング

シードは冪等性が保証されているため、何度実行しても安全です:

- `make up` - 初回起動時に自動実行
- `make dev` - 初回起動時に自動実行
- `make seed` - 手動でシード再投入

**詳細は `db-seed-idempotency` スキルを参照してください。**

---

## 関連コマンド

### DB操作

```bash
# Prisma Studio（DB GUI）を起動
pnpm db:studio

# マイグレーションファイルを作成
pnpm db:migrate:dev

# マイグレーション状態を確認
pnpm db:migrate:status

# DBをリセット（マイグレーション + シード再実行）
pnpm db:migrate:reset
```

### 開発サーバー操作

```bash
# 開発サーバーのみ起動（DBは別途起動済み前提）
pnpm dev

# 本番ビルド
pnpm build

# 本番ビルドの起動
pnpm start

# 品質チェック（型検査 + lint + test）
pnpm check
```

### Docker直接操作

```bash
# コンテナ一覧
docker ps

# コンテナのログ
docker logs <container-id>

# コンテナに入る
docker exec -it <container-id> bash

# ボリューム一覧
docker volume ls

# ネットワーク一覧
docker network ls
```

---

## 推奨ワークフロー

### 日常の開発フロー

```bash
# 朝: 環境起動
make dev

# 開発作業...

# 夜: 環境停止（データは保持）
make down
```

### 機能開発フロー

```bash
# 1. worktreeで新しい作業セッションを開始（直接ブランチを切るのは禁止）
# オプションA: claude CLIからworktreeを作成
claude --worktree feature-new-feature

# オプションB: git worktreeで直接作成
git worktree add ../.claude/worktrees/feature-new-feature -b worktree-feature-new-feature

# 2. worktree内で環境起動
make dev

# 3. 開発・テスト
# (編集...)
pnpm test
pnpm check

# 4. コミット
git add .
git commit -m "feat: implement new feature"

# 5. 環境停止
make down

# 6. PR作成後にworktreeをクリーンアップ
# git worktree remove ../.claude/worktrees/feature-new-feature
```

> **IMPORTANT**: `git checkout -b` で直接ブランチを切って main 等の保護ブランチ上で開発することは禁止。
> 必ず worktree 内で作業すること（並列開発の保護・revertの容易さのため）。

### トラブル対応フロー

```bash
# 1. 軽度の問題: 再起動
make down
make up

# 2. 中度の問題: DBリセット
pnpm db:migrate:reset

# 3. 重度の問題: 完全クリーンアップ
make clean
make dev
```

---

## よくある質問

### Q: `make dev` と `pnpm dev` の違いは?

**A**:
- `make dev`: DB起動 + マイグレーション + シード + 開発サーバー起動
- `pnpm dev`: 開発サーバーのみ起動（DBは起動済み前提）

通常は `make dev` を使用してください。

> **NOTE**: `pnpm dev` はDBを起動しないため、事前に `make up` でTraefik TCP経由のDBコンテナが起動している必要があります。

### Q: `make down` と `make clean` の違いは?

**A**:
- `make down`: コンテナ停止のみ（データ保持）
- `make clean`: コンテナ + ボリューム + ネットワークを完全削除（データ削除）

日常的な停止には `make down` を使用してください。

### Q: シードデータを変更したらどうする?

**A**:

```bash
make seed
```

シードスクリプトは冪等性が保証されているため、何度実行しても安全です。

### Q: DBスキーマを変更したらどうする?

**A**:

```bash
# マイグレーションファイル作成
pnpm db:migrate:dev

# 自動的にマイグレーション実行 + Prisma Client再生成
```

### Q: Dockerを使わずに開発できる?

**A**:

可能ですが、以下の準備が必要です:

1. PostgreSQL をローカルにインストール
2. `.env` の `DATABASE_URL` をローカルDBに変更
3. `pnpm db:migrate:dev` でマイグレーション実行
4. `pnpm db:seed` でシード投入
5. `pnpm dev` で開発サーバー起動

**推奨**: Docker環境を使用することで環境差異を防げます。

---

## Docker ヘルスチェック（必須）

PostgreSQL コンテナには必ず healthcheck を設定すること。

```yaml
services:
  pg:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

### 理由
- `make up` が DB 起動完了を待たずにマイグレーション実行するのを防止
- CI/CD でのコンテナ起動順序制御
- worktree 並列起動時の安定性向上

## Dockerfile BuildKit キャッシュ

Dockerfile では BuildKit のマウントキャッシュを活用すること。

```dockerfile
# syntax=docker/dockerfile:1

# pnpm ストアキャッシュ
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

### 理由
- 依存関係の再ダウンロードを回避
- ビルド時間の短縮（特にCI環境）

---

## Dockerfile ベストプラクティス

本プロジェクトの `docker/dockerfile.yaml` は以下の方針で管理する。

### マルチステージビルドと最終イメージの軽量化

- `base` ステージにはソースコードをコピーしない
- `build` ステージでのみ `COPY . /app` を行い、ビルド成果物を生成する
- 最終ステージ（`next`）には実行に必要なファイルのみコピーする:
  - `node_modules`（prod-deps ステージから）
  - `.next/`（ビルド成果物）
  - `public/`（静的ファイル）
  - `package.json`（pnpm start 実行のため）
  - Prisma generated client（必要な場合）
- ソースコード（`src/`）は最終イメージに含めない

```dockerfile
FROM base AS next
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/.next /app/.next
COPY --from=build /app/public /app/public
COPY --from=build /app/package.json /app/package.json
```

### BuildKit cache mount の有効化

`pnpm install` には BuildKit の cache mount を使用してビルド時間を短縮する。

```dockerfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
```

- `id=pnpm` でキャッシュを識別（プロジェクト固有IDを付与）
- `target=/pnpm/store` は pnpm のコンテンツアドレスストア
- BuildKit 有効化: `DOCKER_BUILDKIT=1 docker build ...` または `docker buildx build`

### Node.js LTS バージョン追従ルール

- ベースイメージは **Node.js LTS（偶数バージョン）の `-slim` バリアント** を使用する
- Node.js LTS スケジュール: https://nodejs.org/en/about/previous-releases
- 現在: `node:22-slim`（Node.js 22 LTS、2027年4月までサポート）
- バージョンアップ時は全ステージ（`base` を継承しているため `FROM base` を変更するだけでよい）を更新する
- セキュリティパッチが出た場合は速やかにバージョン更新すること

```dockerfile
# 良い例: LTS slim バリアント
FROM node:22-slim AS base

# 悪い例: alpine（@node-rs/argon2 等のネイティブモジュールが動作しない場合がある）
FROM node:22-alpine AS base
```

---

## まとめ

### 基本の3コマンド

1. **`make dev`** - 日常的な開発開始時
2. **`make down`** - 作業終了時（データ保持）
3. **`make clean`** - 環境をリセットしたい時（⚠️ データ削除）

### トラブル時の対応順序

1. `make down` → `make up` で再起動
2. `pnpm db:migrate:reset` でDB再構築
3. `make clean` → `make dev` で完全リセット

### 安全な運用のために

- 日常的な停止には `make down` を使用
- `make clean` 実行前にデータバックアップを確認
- シード変更は `make seed` で反映
- スキーマ変更は `pnpm db:migrate:dev` で反映

この原則に従えば、安全で効率的な開発環境管理が可能です。
