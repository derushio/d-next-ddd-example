---
name: db-reset
description: |
  DB 初期化スキル。Docker ボリューム削除 → コンテナ再起動 → マイグレーション再適用 → シード投入 →
  キャッシュクリア → devサーバー再起動を一括実行する。

  トリガー例:
  - 「DB初期化」「データベースリセット」「全クリーン」
  - 「データを初期化して」「DBをやり直して」
  - 「db reset」「clean data」
---

# DB Reset Skill

## 概要

PostgreSQL コンテナ（Docker ボリューム）を完全にクリーンな状態に戻す手順。
中途半端な部分リセットは不整合の原因になるため、**全クリーン → 全再構築**が原則。

## 全初期化手順

```bash
# 1. devサーバー停止
pkill -f "next dev" 2>/dev/null; sleep 2

# 2. Docker ボリューム削除（PostgreSQL データ含む）
make clean

# 3. Next.js キャッシュ削除（古い DB 参照が残るため）
rm -rf .next

# 4. コンテナ起動 + マイグレーション再適用 + シード投入
make up

# 5. devサーバー再起動
make dev
```

## 簡易版

```bash
pkill -f "next dev" 2>/dev/null; sleep 2
make clean   # docker compose down -v（Docker ボリューム削除）
rm -rf .next
make dev     # コンテナ起動 + migrate + generate + seed + dev server
```

## 部分リセット（非推奨）

特定テーブルのみリセットする場合、FK 制約を考慮して子テーブルから順に削除する必要がある。
**中間テーブルの削除漏れでデータ不整合が発生しやすいため、全クリーンを強く推奨する。**

## 注意事項

- **devサーバーを必ず再起動すること** — Prisma Client が DB コネクションをキャッシュしているため、
  コンテナを差し替えても devサーバーが古いデータを返す
- `.next` ディレクトリも削除すること — Next.js の RSC キャッシュに古いデータが残る
- worktree ごとに個別の PostgreSQL コンテナが起動する（`COMPOSE_PROJECT_NAME` でプロジェクト分離）
- バックアップから復元したい場合は `make db-restore` を使用（本リセット手順ではなく）
