# コマンドリファレンス 📋

プロジェクトで使用する全コマンドの包括的リファレンス

---

## 📖 このドキュメントについて

### 🎯 目的

- **コマンド統一**: プロジェクト全体で使用するコマンドの標準化
- **効率化支援**: 頻繁に使用するコマンドの迅速な参照
- **新メンバー支援**: コマンドの理解とプロジェクト参加促進

### 🔗 関連ドキュメント

- **[開発フロー](../guides/development/workflow.md)** - 開発手順
- **[テスト戦略](../testing/strategy.md)** - テスト実行方法

---

## 🚀 開発コマンド

### 基本開発

```bash
# 開発サーバー起動（Turbopack）
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# Lint チェック
pnpm lint

# コードフォーマット
pnpm format

# 全品質チェック（format + type-check + lint + test:unit）
pnpm check
```

### プロジェクト管理

```bash
# プロジェクトクリーン
pnpm clean

# 依存関係更新
pnpm update

# パッケージ追加
pnpm add <package-name>
pnpm add -D <package-name>  # 開発依存
```

---

## 🧪 テストコマンド

### ユニット・統合テスト

```bash
# 全テスト実行
pnpm test

# ユニットテストのみ
pnpm test:unit

# ウォッチモード
pnpm test:watch

# カバレッジ付きテスト
pnpm test:coverage

# テストUI起動
pnpm test:ui
```

### E2Eテスト

```bash
# E2Eテスト実行
pnpm test:e2e

# E2EテストUI（推奨）
pnpm test:e2e:ui

# E2Eテストデバッグ
pnpm test:e2e:debug

# E2Eテストheaded（ブラウザ表示）
pnpm test:e2e:headed

# E2Eテストレポート表示
pnpm test:e2e:report

# E2Eテストトレース表示
pnpm test:e2e:trace
```

---

## 🗄️ データベースコマンド

### Prisma操作

```bash
# Prismaクライアント生成
pnpm db:generate

# スキーマプッシュ
pnpm db:push

# マイグレーション（開発）
pnpm db:migrate:dev

# Prisma Studio起動
pnpm db:studio

# シードデータ投入
pnpm db:seed
```

---

## 🎨 UI・shadcn/ui コマンド

### shadcn/ui管理

```bash
# コンポーネント追加
pnpm ui:add

# 利用可能コンポーネント一覧
pnpm ui:list

# 特定コンポーネント追加例
pnpx shadcn@latest add button
pnpx shadcn@latest add card
pnpx shadcn@latest add form
```

---

## 🏗️ コード生成コマンド (Hygen)

Clean Architectureパターンに沿ったコード自動生成

```bash
# UseCase + テスト + DI登録
pnpm gen:usecase

# Entity + EntityId + テスト
pnpm gen:entity

# Repository Interface + Prisma実装 + テスト + DI登録
pnpm gen:repo

# Server Action + テスト
pnpm gen:action

# Value Object + テスト
pnpm gen:vo
```

**詳細**: [コード生成ガイド](../guides/code-generator.md)

---

## 🐳 Make コマンド (Docker + DB)

Docker環境とデータベースのセットアップ

```bash
# 初期セットアップ（.env生成、依存インストール、hooks設定）
make setup

# PostgreSQL起動 + マイグレーション + シード
make up

# make up + pnpm dev（一括起動）
make dev

# Docker停止
make down

# 完全クリーンアップ（Docker volumes含む）
make clean

# マイグレーション + シード再実行
make seed

# Git hooks 設定（環境自動判定）
make setup-git-hooks
```

---

## 🔧 メンテナンス・ツール

### ユーティリティ

```bash
# ハッシュ生成ツール
pnpm hash:generate
```

---

## 🚨 トラブルシューティング

### よく使用するデバッグコマンド

```bash
# ポート確認・プロセス停止
lsof -ti:3000 | xargs kill -9

# キャッシュクリア
pnpm store prune
rm -rf node_modules
pnpm install

# 型エラー詳細確認
pnpm type-check --verbose

# テスト詳細実行
pnpm test:unit --reporter=verbose
```

---

## 📊 使用頻度別コマンド

### 🔥 毎日使用

- `pnpm dev` - 開発サーバー起動（ポート解放含む）
- `pnpm test:unit` - ユニットテスト実行
- `pnpm lint` - コード品質チェック
- `pnpm type-check` - 型チェック

### 📅 週次使用

- `pnpm test:e2e` - E2Eテスト実行
- `pnpm build` - 本番ビルド確認
- `pnpm test:coverage` - カバレッジ確認
- `pnpm db:migrate:dev` - DB更新

### 🗓️ 月次・必要時

- `pnpm clean` - プロジェクトクリーン
- `pnpm update` - 依存関係更新
- `pnpm ui:add` - 新UIコンポーネント追加

---

**📋 効率的なコマンド活用で、スムーズな開発体験を実現しましょう！**
