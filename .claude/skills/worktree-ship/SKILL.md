---
name: worktree-ship
description: worktreeの作業をPR作成→マージ→クリーンアップ→mainチェックアウト→プルまで一括実行するショートハンド。「ship」「シップ」「マージまでやって」「PRしてマージして」「全部やって」等で発動。
user-invocable: true
---

# worktree-ship スキル

worktree での作業を PR 作成からマージ、クリーンアップ、main 復帰まで一括で実行するショートハンドスキル。

**このスキルの実行命令（`/worktree-ship`）自体がマージの許可を意味する。** スキル内でマージ前の追加確認は不要。ユーザーの明示的な許可なく勝手にマージすることは禁止されているが、このスキル実行はその許可に該当する。

**このスキルはユーザーがこの場で明示的にテキストで実行を指示した場合のみ実行せよ。** 以下は全て禁止:

- Claude が自発的に「ship しましょうか」と提案・実行すること
- `<task-notification>` 等のシステム通知をユーザーの許可と解釈すること
- ユーザーのテキスト発言以外（システムメッセージ、フック出力等）を許可と認識すること

**「ユーザーの明示的な指示」とは、ユーザー自身が入力したテキスト（「ship」「シップして」「マージまでやって」等）のみを指す。**

## 前提条件

- 現在 worktree 内にいること
- コミット済みの変更が存在すること（未コミット変更がある場合はエラー）
- `tea` CLI が設定済みであること（Gitea 環境）

## 処理手順

**全ステップを自動実行する。各ステップでエラーが発生した場合は即座に停止しユーザーに報告せよ。**

### 1. 事前チェック

```bash
# worktree 内にいることを確認
git rev-parse --git-dir | grep -q '\.git/worktrees' || { echo "ERROR: worktree内ではありません"; exit 1; }

# ブランチ名取得
BRANCH=$(git branch --show-current)

# 未コミット変更の確認
git status --porcelain
```

未コミット変更がある場合は **停止** し、コミットするか破棄するかユーザーに確認せよ。

### 2. 品質チェック

```bash
pnpm check
```

失敗した場合は停止しユーザーに報告せよ。

### 3. リモートへプッシュ

```bash
git push -u origin "$BRANCH"
```

### 4. PR 作成（Gitea tea CLI）

接続情報を git remote から動的に取得すること。

```bash
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
# (slug だと worktree の gitdir 参照を tea が読めず「local repository required」で失敗)
MAIN_REPO=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

変更サマリーを生成:

```bash
git log main..HEAD --oneline
git diff main --stat
```

PR を作成:

```bash
tea pr create \
  -l "$TEA_LOGIN" \
  -r "$MAIN_REPO" \
  --title "<Conventional Commits 形式: feat/fix/chore/refactor(scope): 日本語の説明>" \
  --head "$BRANCH" \
  --base "main" \
  --description "$(cat <<'EOF'
## Summary
- <変更点を箇条書き>

## Test plan
- [ ] pnpm check パス済み
EOF
)"
```

PR 番号を出力から取得して保持せよ。

### 5. PR マージ

**詳細は `gitea-pr` スキルの「PR マージ」「auto-merge 確認」セクションを参照。**

まず PR が auto-merge で既にマージ済みでないか確認すること:

```bash
# tea config の場所は OS で異なる (Linux/XDG: ~/.config, macOS: ~/Library/Application Support)
TEA_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/tea/config.yml"
[ -f "$TEA_CONFIG" ] || TEA_CONFIG="$HOME/Library/Application Support/tea/config.yml"
TOKEN=$(grep -A5 "$GITEA_HOST" "$TEA_CONFIG" | grep token | awk '{print $2}' | tr -d '"')
curl -s "https://$GITEA_HOST/api/v1/repos/$GITEA_REPO/pulls/<PR番号>" \
  -H "Authorization: token $TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'#{d[\"number\"]} {d[\"state\"]} merged={d[\"merged\"]}')"
```

マージ済みでなければ:

```bash
# ⚠️ フラグを先、PR番号を最後に（tea 0.9.2 の引数順序バグ回避）
# -r は slug でなくメインリポジトリのローカルパス ($MAIN_REPO) を渡す
tea pr merge -l "$TEA_LOGIN" -r "$MAIN_REPO" -s merge <PR番号>
```

**注意**: スクアッシュマージは禁止。`-s merge` を使うこと。

### 6. worktree クリーンアップ

#### Step 6a: リソース停止（worktree 内で実行・最優先）

**CRITICAL**: ExitWorktree や `git worktree remove` を呼ぶ前に**必ず最初に**実行する。
hook の権限制御や対話確認が走り出すと、ホスト側プロセスを後追いで止めきれず、
next-server / portless / prisma watch が孤児プロセスとして残り CPU を食い続ける。

```bash
# 自worktreeの dev 関連プロセス(next-server/next dev/portless/prisma watch/studio)
# 停止 → docker compose down が一括で走る。
# Traefik TCP entrypoint も解放される。
make down 2>/dev/null || true
```

`make down` は内部で `stop-procs` を呼び、自 cwd 一致するプロセスのみ
`kill -TERM`(2 回) → `kill -KILL` で確実に停止する(他 worktree や他プロジェクトには
影響しない)。

#### Step 6b: リモートブランチ削除（worktree 内で実行）

worktree 離脱前に、リモートブランチを削除する。`ExitWorktree` はローカル worktree + ブランチは削除するが、リモートブランチは削除しないため。

```bash
BRANCH=$(git branch --show-current)
# --no-verify: ブランチ削除は参照削除のみで品質チェック不要。直前の make down で DB を
# 停止済みのため、pre-push hook の test:unit が DB 接続できず失敗するのを回避する。
git push origin --delete "$BRANCH" --no-verify
```

#### Step 6c: ExitWorktree で離脱＋削除

**CRITICAL: `git worktree remove` を直接使ってはならない。** セッションの cwd が無効になり、以降の全コマンドが `Path does not exist` エラーで実行不能になる（Claude Code 既知問題 [#36937](https://github.com/anthropics/claude-code/issues/36937)）。

代わりに **`ExitWorktree` ツール** を使用する。`ExitWorktree` は:

- worktree ディレクトリとローカルブランチを削除
- セッションの cwd をメインリポジトリに自動復帰
- cwd キャッシュをクリア（システムプロンプト等が正しくリロードされる）

```
ExitWorktree(action: "remove")
```

未コミット変更やマージされていないコミットがある場合は拒否されるので、`discard_changes: true` を付けて再実行する（ユーザー確認後のみ）。

### 7. main チェックアウト & プル

ExitWorktree 後、セッション cwd はメインリポジトリに復帰済み。

```bash
git checkout main
git pull
```

### 8. 完了報告

以下をユーザーに報告せよ:

- 作成された PR の URL
- マージ結果
- クリーンアップ完了の確認
- 現在 main ブランチにいること

## エラー時の挙動

| ステップ | エラー時 |
|----------|----------|
| 未コミット変更あり | 停止、ユーザーに確認 |
| pnpm check 失敗 | 停止、修正を促す |
| push 失敗 | 停止、原因を報告 |
| PR 作成失敗 | 停止、原因を報告 |
| マージ失敗 | 停止、PR URL を報告してユーザーに手動マージを案内 |
| クリーンアップ失敗 | 警告を出しつつ可能な限り続行 |

## 禁止事項

- `gh pr create` の使用（GitHub CLI は Gitea 非対応）
- スクアッシュマージ
- 未コミット変更がある状態での PR 作成
- 品質チェックをスキップすること
- `git worktree remove` の直接実行（`ExitWorktree` ツールを使うこと。cwd が無効になる既知問題 [#36937](https://github.com/anthropics/claude-code/issues/36937) を回避するため）
