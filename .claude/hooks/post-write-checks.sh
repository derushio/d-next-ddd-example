#!/bin/bash
# Write/Edit 直後の自動整形とアーキテクチャ違反の警告。
# 編集対象パスは PostToolUse の stdin JSON（.tool_input.file_path）から取る。

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
[ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ] || exit 0

case "$FILE_PATH" in
  *.ts | *.tsx | *.js | *.jsx)
    pnpm biome format --write "$FILE_PATH" >/dev/null 2>&1 || true
    ;;
esac

case "$FILE_PATH" in
  *src/layers/domain/*)
    if grep -qE 'from.*layers/(application|infrastructure|presentation)' "$FILE_PATH" 2>/dev/null; then
      echo "WARNING: Domain層が上位層に依存しています！ $FILE_PATH"
    fi
    ;;
esac

case "$FILE_PATH" in
  *UseCase.ts)
    if ! grep -q 'Promise<Result<' "$FILE_PATH" 2>/dev/null; then
      echo "REMINDER: UseCaseはResult型を返却してください: $FILE_PATH"
    fi
    ;;
esac

exit 0
