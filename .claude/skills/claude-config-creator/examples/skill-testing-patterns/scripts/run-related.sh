#!/bin/bash
# 変更されたファイルに関連するテストのみ実行
# Usage: ./run-related.sh

# Gitで変更されたファイルを取得
CHANGED_FILES=$(git diff --name-only HEAD~1 | grep -E '\.(ts|tsx|js|jsx)$' | grep -v '\.test\.' | grep -v '\.spec\.')

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files found"
  exit 0
fi

echo "Running tests for changed files:"
echo "$CHANGED_FILES"

npm test -- --findRelatedTests $CHANGED_FILES
