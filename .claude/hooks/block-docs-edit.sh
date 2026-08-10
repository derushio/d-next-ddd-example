#!/bin/bash
# _DOCS/ はテンプレート配布物であり、適用先プロジェクトでは不可侵（読み取り専用）。
# 編集はテンプレ配布リポジトリ（ルートディレクトリ名 d-next-template-debug）でのみ許可する。
# 適用先でのローカル編集は次回の sup-next（rsync -a）で無告知に上書き消失するため、書き込みを未然に止める。
#
# Write/Edit 系の遮断が本丸。Bash 経路はコマンド文字列のパターン照合なので best-effort
# （間接実行やスクリプト経由の書き込みまでは追えない）。

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# 対象パスが属するリポジトリのメイン worktree を返す（linked worktree からでも本体を指す）。
# 未作成パス（Write）を渡されるため、実在する最近の祖先ディレクトリまで遡ってから git に問う。
main_worktree_of() {
  local dir="$1"
  [ -n "$dir" ] || return 1
  case "$dir" in /*) ;; *) dir="$PWD/$dir" ;; esac
  while [ -n "$dir" ] && [ "$dir" != "/" ] && [ ! -d "$dir" ]; do dir=$(dirname "$dir"); done
  [ -d "$dir" ] || return 1
  git -C "$dir" worktree list --porcelain 2>/dev/null | sed -n '1s/^worktree //p'
}

# テンプレ配布リポジトリ内なら編集を許可する。
# sup-next はテンプレ本体ディレクトリの外にあり rsync 対象外＝適用先には絶対に存在しないマーカー。
# .d-next-template-version.json は適用先にのみ生成されるマーカー。
is_template_repo() {
  local root
  root=$(main_worktree_of "$1") || return 1
  [ -n "$root" ] || return 1
  [ -e "$root/.d-next-template-version.json" ] && return 1
  [ "$(basename "$root")" = "d-next-template-debug" ] && return 0
  [ -f "$root/sup-next" ] && return 0
  return 1
}

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

REASON="\`_DOCS/\` はテンプレート配布物のため、このプロジェクトでは不可侵（読み取り専用）です。

理由:
- \`_DOCS/\` の正本はテンプレリポジトリ d-next-template-debug 側にあります
- このプロジェクトで編集しても、次回 \`sup-next\` 実行時の rsync で無告知に上書き消失します

ドキュメントを直したい場合:
- テンプレリポジトリ側の \`_DOCS/\` を修正 → 各プロジェクトで \`sup-next\` を再実行
- このプロジェクト固有の記述は \`_DOCS/\` の外（README.md や docs/ 等）に書いてください"

case "$TOOL_NAME" in
  Write | Edit | MultiEdit | NotebookEdit)
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
    [[ "$FILE_PATH" =~ (^|/)_DOCS/ ]] || exit 0
    is_template_repo "$FILE_PATH" && exit 0
    deny "$REASON"
    ;;
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
    echo "$COMMAND" | grep -q '_DOCS' || exit 0
    is_template_repo "$PWD" && exit 0

    # _DOCS を書き換え・削除・移動・生成する系のみ止める（閲覧・grep・lint は通す）。
    # 末尾スラッシュ無しの `rm -rf _DOCS` も対象にするため _DOCS の直後は / 空白 行末のいずれも許す。
    D='_DOCS(/|[[:space:]]|$)'
    for pattern in \
      "(^|[;&|]\\s*)(rm|mv|mkdir|touch|truncate)\\s+[^;&|]*$D" \
      "(sed|perl|ruby)\\s+-[a-zA-Z]*i[a-zA-Z]*\\s+[^;&|]*$D" \
      "(>>?|tee\\s+(-a\\s+)?)[^;&|]*$D" \
      "(^|[;&|]\\s*)(cp|rsync)\\s+[^;&|]+\\s+[^;&|]*$D" \
      "(^|[[:space:]])(-o|--out|--output|--out-file|--output-file)[= ]\"?[^\"[:space:];&|]*$D" \
      "git\\s+(checkout|restore|apply|rm)\\s+[^;&|]*$D" \
      "(^|[;&|]\\s*)(patch|find)\\s+[^;&|]*$D"; do
      if echo "$COMMAND" | grep -qE "$pattern"; then
        deny "$REASON"
      fi
    done
    ;;
esac

exit 0
