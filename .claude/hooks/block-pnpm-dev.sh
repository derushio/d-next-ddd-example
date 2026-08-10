#!/bin/bash
# pnpm dev の直接実行を禁止し、make dev の使用を強制する。
# DB起動・portless URL自動設定が make dev 経由でのみ行われるため。

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# pnpm dev にマッチ（pnpm dev, pnpm dev --turbopack 等）
# make dev, pnpm build, pnpm test 等は通す
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)pnpm\s+dev(\s|$|;|&|\|)'; then
  # make dev 経由の場合は許可（make dev は内部で pnpm dev を呼ぶ）
  if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)make\s+dev'; then
    exit 0
  fi

  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "`pnpm dev` の直接実行は禁止されています。代わりに `make dev` を使用してください。\n\n理由:\n- `make dev` はDB起動（Traefik TCP）+ .env URL自動設定 + devサーバー起動を一括で行います\n- `pnpm dev` 単体ではDBが起動せず、NEXT_PUBLIC_BASE_URL/AUTH_URLも設定されません"
    }
  }'
  exit 0
fi

exit 0
