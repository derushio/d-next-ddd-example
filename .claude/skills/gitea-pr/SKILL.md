---
name: gitea-pr
description: Gitea リポジトリへの PR 作成・管理。`gh pr create` や GitHub MCP が使えない Gitea 環境で自動発動。「PR作成」「プルリクエスト」「マージリクエスト」「tea pr」等のコンテキストで発動せよ。
---

# Gitea PR 管理スキル

このプロジェクトは **Gitea** でホストされており、GitHub CLI (`gh`) や GitHub MCP は使用できない。
PR 操作にはすべて **`tea` CLI** を使用すること。

## 接続情報の取得

接続情報はハードコードせず、git remote から動的に取得すること。

```bash
# remote URL からホスト名とリポジトリパスを抽出
# 3形式対応: https:// / git@host: / ssh://git@host:port/
REMOTE_URL=$(git remote get-url origin)
GITEA_HOST=$(echo "$REMOTE_URL" | sed -E \
  -e 's|^https?://([^/]+)/.*|\1|' \
  -e 's|^ssh://[^@]+@([^:]+):.*|\1|' \
  -e 's|^[^@]+@([^:]+):.*|\1|')
GITEA_REPO=$(echo "$REMOTE_URL" | sed -E \
  -e 's|^https?://[^/]+/||' \
  -e 's|^ssh://[^@]+@[^:]+:[0-9]+/||' \
  -e 's|^[^:]+:||' \
  -e 's|\.git$||')
TEA_LOGIN="$GITEA_HOST"

# tea の -r にはメインリポジトリのローカルパスを渡す
# (slug を渡すと worktree から「local repository required」で失敗する)
MAIN_REPO=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

| 変数 | 説明 | 取得元 |
|------|------|--------|
| `GITEA_HOST` | Gitea インスタンスのホスト名 | `git remote get-url origin` |
| `GITEA_REPO` | `owner/repo` 形式のリポジトリパス | `git remote get-url origin` |
| `TEA_LOGIN` | tea login 名（= ホスト名） | 同上 |
| `MAIN_REPO` | メインリポジトリのローカルパス（`tea -r` 用） | `git rev-parse --git-common-dir` の親ディレクトリ |

## PR 作成

```bash
tea pr create \
  -l "$TEA_LOGIN" \
  -r "$MAIN_REPO" \
  --title "<Conventional Commits 形式のタイトル>" \
  --head "<ブランチ名>" \
  --base "main" \
  --description "$(cat <<'EOF'
## Summary
- <変更点を箇条書き>

## Test plan
- [ ] <テスト項目>
EOF
)"
```

### 必須フラグ

- `-l "$TEA_LOGIN"`: 省略すると `no gitea login detected` 警告が出る。動作はするが明示推奨
- `-r "$MAIN_REPO"`: worktree 内では tea がリポジトリを自動検出できず、slug (`owner/repo`) を渡しても「local repository required」で失敗する。メインリポジトリのローカルパスを渡すこと

### PR タイトル規約

Conventional Commits 形式: `feat/fix/chore/refactor(scope): 日本語の簡潔な説明`

### PR body 構造

```markdown
## Summary
- 変更点1
- 変更点2

## Background（任意）
変更の背景・動機

## Test plan
- [ ] テスト項目1
- [ ] テスト項目2
```

## その他の操作

### PR 一覧

```bash
tea pr list -l "$TEA_LOGIN" -r "$MAIN_REPO"
```

### PR クローズ

```bash
tea pr close <PR番号> -l "$TEA_LOGIN" -r "$MAIN_REPO"
```

### PR マージ

```bash
tea pr merge <PR番号> -l "$TEA_LOGIN" -r "$MAIN_REPO"
```

**注意**: スクアッシュマージは禁止（グローバル CLAUDE.md のルール）。通常の merge commit を使うこと。

## 既知のハマりポイント

### SSH URL パース

git remote が `ssh://user@host:port/path` 形式の場合、単純な sed パターンではホスト名とリポジトリパスを正しく分離できない。上記の「接続情報の取得」セクションの正規表現は以下の3形式すべてに対応している:

| 形式 | 例 |
|------|-----|
| HTTPS | `https://gitea.example.com/owner/repo.git` |
| SSH (SCP) | `git@gitea.example.com:owner/repo.git` |
| SSH (URL) | `ssh://git@gitea.example.com:2222/owner/repo.git` |

パースに失敗する場合は `git remote get-url origin` の出力形式を確認し、上記の正規表現に対応していない形式がないか検証すること。

### `tea` CLI の long flag 問題

`tea` の一部サブコマンド（特に `tea pr merge`）で `--login` / `--repo` の long flag が正しく解釈されないケースが確認されている。short flag（`-l`, `-r`）を使用すること。PR 作成（`tea pr create`）では long flag でも動作するが、一貫性のため short flag を推奨する。

### worktree 内からのリポジトリ自動検出

worktree 内では `tea` がリポジトリを自動検出できない。さらに worktree の `.git` は
`gitdir:` 参照ファイル（ディレクトリではない）のため、`-r` に slug (`owner/repo`) を
渡しても tea 0.14.1 は「local repository required」で失敗する。`-r` には
**メインリポジトリのローカルパス**を渡すこと:

```bash
MAIN_REPO=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
tea pr create -l "$TEA_LOGIN" -r "$MAIN_REPO" --head ... --base main ...
```

`git-common-dir` は worktree でも共有 `.git`（`…/<repo>/.git`）を返すため、その親が
メインリポジトリ root になる。`GITEA_REPO` (slug) は PR URL の構築・記録用に保持する。

## 禁止事項

- `gh pr create` の使用（GitHub CLI は Gitea 非対応）
- `mcp__github__create_pull_request` の使用（GitHub MCP は Gitea 非対応）
- Gitea API の直接呼び出し（`tea` CLI で十分）
