---
name: worktree-lifecycle
description: |
  このプロジェクト固有の worktree ライフサイクル手順。
  グローバルの worktree-setup/finish スキルと併せて自動発動する。
  worktree セットアップ、環境セットアップ、作業開始、依存インストール、
  作業完了、PR作成、クリーンアップ、worktree終了 のコンテキストで発動せよ。
---

# Worktree Lifecycle（プロジェクト固有）

このプロジェクトでは Prisma TypedSQL + Traefik TCP パターンを使用しているため、
グローバルの worktree-setup/finish に加えて以下の手順が必須。

## セットアップ時（worktree 入った直後）

グローバル worktree-setup スキルのステップ 3（依存インストール）の後、
以下を **必ず** 実行すること。

### 1. DB 起動 + TypedSQL 型生成

このプロジェクトは `prisma/sql/` ディレクトリを持つ TypedSQL 使用プロジェクトである。
TypedSQL の型生成には DB 接続が必須のため、**devサーバーが不要な作業であっても** DB を起動する。

```bash
# Traefik コンテナが起動していることを確認
docker start traefik

# DB 起動 + マイグレーション + Prisma generate --sql + シード
make up
```

**省略するとどうなるか**: pre-push hook の `pnpm check` → `tsc --noEmit` が TypedSQL 型定義の不在で失敗し、push できない。

**補足**: `package.json` の `postinstall` で通常の `prisma generate`（DB不要）は自動実行されるが、
TypedSQL (`--sql`) は DB 接続が必要なため `make up` 内の `pnpm db:generate` で別途実行される。

## クリーンアップ時（worktree 出る前）

PR マージ確認後、worktree 削除前に以下の順序で実行すること。

### CRITICAL: 順序厳守

`git worktree remove` の実行を hook (PreToolUse 等) や対話確認が走り出してから
ホスト側プロセスを止めようとしても、間に合わずに孤児プロセスが残り、
別 worktree 由来の next-server が CPU 200%+ を食い続ける事故が発生する。
**`make down` を一番最初に実行する**(プロセス停止 → DB 停止が一括で走る)。

### 1. dev 関連プロセス + DB コンテナ停止（必ず最初）

```bash
# worktree の作業ディレクトリ内で実行
make down
```

`make down` は内部で `stop-procs` を呼び、自 worktree CWD で動いている
dev 関連プロセス(next-server / next dev / portless / prisma generate --watch /
prisma studio)を `kill -TERM`(2 回) → `kill -KILL` で確実に停止してから
`docker compose down` する。自 cwd 一致でフィルタするため、他 worktree や
他プロジェクトの dev には影響しない。

`make up` で起動した DB コンテナは worktree 削除だけでは停止しない。
放置すると不要なコンテナが残り、Traefik TCP entrypoint を占有し続ける。

### 2. 完全なクリーンアップ順序

1. `make down` — dev 関連プロセス停止 + DB コンテナ停止(自動連鎖)
2. `git worktree remove <worktree-path>` — worktree 削除
3. `git branch -d <branch>` + `git push origin --delete <branch>` — ブランチ削除

DB データも消す場合は 1. を `make clean` に置き換え(`stop-procs` +
`docker compose down -v` + ボリューム削除)。

### プロセス停止のみ実行したい場合

DB は残したまま dev サーバーだけ止めたい場合は `make stop-procs` を使う。
Docker には触らない。
