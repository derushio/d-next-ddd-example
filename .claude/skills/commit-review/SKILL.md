---
name: commit-review
description: |
  コミット前のコードレビュー観点とConventional Commits形式を自動適用するスキル。
  コード品質、セキュリティ、パフォーマンス、保守性のチェックリストを提供。

  トリガー例:
  - 「コミット」「commit」「変更をレビュー」
  - 「コード品質をチェック」「セキュリティ確認」
  - git diff/git statusの結果を見るとき
allowed-tools:
  - Read
  - Bash
  - Grep
---

# Commit Review Skill

> **重要**: `pnpm check`、`pnpm type-check`、`pnpm lint`等の品質チェックコマンドは**絶対に手動実行しないでください**。これらはpre-commitフックで自動実行されます。

このスキルは、コミット前のコードレビュー観点とConventional Commits形式のコミットメッセージ作成をサポートします。

## 1. 変更内容の分析

まず、現在の変更内容を確認してください：

```bash
git diff --staged
git diff
git status
```

## 2. ベストプラクティス観点でのレビュー

分析した変更に対して、以下のエンジニアリングベストプラクティスの観点でレビューしてください：

### コード品質

- [ ] 命名規則は適切か（変数名、関数名、クラス名）
- [ ] 単一責任の原則は守られているか
- [ ] 重複コードはないか（DRY原則）
- [ ] 不要なコメント、デバッグコード、console.logは残っていないか

### アーキテクチャ（Clean Architecture + DDD）

#### レイヤー依存関係チェック

変更されたファイルが以下の依存関係ルールに違反していないか確認してください：

- [ ] **Domain層** (`layers/domain/`): Application/Infrastructure/Presentation への import が**ない**こと
  - 違反パターン: `from '@/layers/(application|infrastructure|presentation)'`
- [ ] **Application層** (`layers/application/`): Infrastructure/Presentation への import が**ない**こと
  - 違反パターン: `from '@/layers/(infrastructure|presentation)'`
- [ ] **Infrastructure層** (`layers/infrastructure/`): Presentation への import が**ない**こと
  - 違反パターン: `from '@/layers/presentation'`

#### Result型パターンチェック（UseCaseのみ）

UseCase ファイル（`layers/application/usecases/` 配下）の変更がある場合：

- [ ] 戻り値の型が `Promise<Result<...>>` になっているか
- [ ] `success()` / `failure()` 関数が適切に使用されているか
- [ ] `throw new Error()` などの例外スローが**ない**こと（Result型で統一）
- [ ] `import { Result, success, failure } from '@/layers/application/types/Result'` が含まれているか

### セキュリティ

- [ ] 機密情報（APIキー、パスワード等）がハードコードされていないか
- [ ] SQLインジェクション、XSS等の脆弱性がないか
- [ ] 入力値のバリデーションは適切か

### パフォーマンス

- [ ] 不要なループや再レンダリングはないか
- [ ] メモリリークの可能性はないか

### 保守性

- [ ] 型定義は適切か（TypeScript）
- [ ] エラーハンドリングは適切か
- [ ] テストの追加・更新は必要か

## 3. 問題点の報告と対応

上記レビューで問題が見つかった場合：

1. **問題点を具体的に報告**してください
2. ユーザーに**修正を提案**してください
3. ユーザーの承認を得てから修正を行ってください

## 4. Conventional Commits形式ガイド

問題がない場合、または修正完了後、以下のConventional Commits形式でコミットメッセージを作成してください：

### フォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type一覧

- `feat`: 新機能追加
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正でも機能追加でもないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更
- `ci`: CI設定の変更

### 良いコミットメッセージの例

```
feat(auth): ログイン機能にOAuth2.0認証を追加

- Google OAuth2.0プロバイダーを実装
- セッション管理にJWTを採用
- リフレッシュトークンのローテーション機能を追加

Closes #123
```

### コミット分割の原則

1. 必要に応じて変更を適切な単位でステージング
2. 論理的に分離可能な変更は**複数のコミットに分割**
3. 各コミットは**単一の目的**を持つようにする

## 5. Git Hooksによる自動品質チェック

このプロジェクトでは以下のGit Hooksが設定されています：

- **pre-commit**: `pnpm format` で自動フォーマット
- **pre-push**: `pnpm check` で品質チェック（format, type-check, lint, test:unit）

そのため、コミット時に手動で品質チェックコマンドを実行する必要はありません。

## 6. フォーマット後の差分処理

pre-commitフックでフォーマッターが実行された結果、追加の変更が発生することがあります。

この場合、ユーザーは以下の対応を行う必要があります：

```bash
# 差分確認
git status
git diff

# フォーマット差分のみの場合は --amend で追加
git add -A
git commit --amend --no-edit
```

フォーマット以外の変更が含まれている場合は、別コミットとして処理することを推奨してください。
