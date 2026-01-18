# Smart Commit Command

> **重要**: `pnpm check`、`pnpm type-check`、`pnpm lint`等の品質チェックコマンドは**絶対に手動実行しないでください**。これらはpre-commit/pre-pushフックで自動実行されます。

以下の手順でgit commitを実行してください。

## 1. 変更内容の取得

```bash
git diff --staged
git diff
git status
```

## 2. コードレビュー

**`commit-review` スキルが自動適用されます。**

以下の観点で変更をレビューしてください:
- コード品質（命名、SRP、DRY、不要コード）
- セキュリティ（機密情報、脆弱性、バリデーション）
- パフォーマンス（不要ループ、メモリリーク）
- 保守性（型定義、エラーハンドリング、テスト）

問題があれば修正を提案し、ユーザー承認後に修正してください。

## 3. コミット実行

1. 変更を適切な単位でステージング
2. 論理的に分離可能な変更は**複数のコミットに分割**
3. **Conventional Commits形式**でコミット

```
<type>(<scope>): <subject>
```

Type: feat, fix, docs, style, refactor, perf, test, chore, ci

## 4. 最終確認

```bash
git status
git diff
```

フォーマッターによる追加変更がある場合:
```bash
git add -A
git commit --amend --no-edit
```

`git log --oneline -3` で確認して完了報告。
