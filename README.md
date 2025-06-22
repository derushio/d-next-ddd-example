# Next.js Clean Architecture テンプレート

Next.js 15、TypeScript、Clean Architecture、ドメイン駆動設計パターンを使用したモダンなWebアプリケーションテンプレートです。

## 特徴

- **Clean Architecture + DDD** - 明確な責務分離による構造化されたレイヤー設計
- **Next.js 15** - App RouterやServer Actionsなどの最新機能を活用
- **TypeScript** - アプリケーション全体での完全な型安全性
- **Prisma** - SQLiteを使用した型安全なデータベースアクセス
- **shadcn/ui** - 美しくアクセシブルなUIコンポーネント
- **Tailwind CSS** - ユーティリティファーストなCSSフレームワーク
- **依存性注入** - TSyringeによるテスタブルで保守性の高いコード
- **Result パターン** - 例外を使わない型安全なエラーハンドリング
- **包括的なテスト** - VitestによるユニットテストとPlaywrightによるE2Eテスト

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **データベース**: Prisma with SQLite
- **テスト**: Vitest, Playwright, Testing Library
- **開発ツール**: ESLint, Prettier, Husky

## はじめ方

### 前提条件

- Node.js 20以上
- pnpm（推奨）または npm

### インストール

1. リポジトリをクローンする
2. 依存関係をインストールする：

```bash
pnpm install
```

3. 環境変数を設定する：

```bash
cp .env.example .env.local
```

`.env.local`ファイルを編集して設定を行ってください。

4. データベースを初期化する：

```bash
pnpm db:generate
pnpm db:push
```

5. 開発サーバーを起動する：

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## 利用可能なスクリプト

```bash
pnpm dev          # 開発サーバーを起動
pnpm build        # 本番用ビルド
pnpm start        # 本番サーバーを起動
pnpm test         # 全テストを実行
pnpm test:unit    # ユニットテストを実行
pnpm test:e2e     # E2Eテストを実行
pnpm lint         # ESLintを実行
pnpm type-check   # TypeScript型チェックを実行
pnpm ui:add       # shadcn/uiコンポーネントを追加
```

## プロジェクト構造

```text
src/
├── app/                    # Next.js App Router
├── components/             # Reactコンポーネント
│   ├── features/          # 機能固有のコンポーネント
│   ├── common/            # 共通コンポーネント
│   ├── layout/            # レイアウトコンポーネント
│   └── ui/                # UIコンポーネント
└── layers/
    ├── presentation/      # Server Actions
    ├── application/       # ユースケースとDTO
    ├── domain/           # エンティティとバリューオブジェクト
    └── infrastructure/   # リポジトリ実装
```

## ドキュメント

- [アーキテクチャ概要](_DOCS/architecture/overview.md)
- [セットアップガイド](_DOCS/guides/setup.md)
- [開発ワークフロー](_DOCS/guides/development/workflow.md)
- [テスト戦略](_DOCS/testing/strategy.md)
- [トラブルシューティング](_DOCS/troubleshooting/common-issues.md)

## コントリビューション

プルリクエストを歓迎します。お気軽にご提案ください。

## ライセンス

このプロジェクトはMITライセンスのもとで公開されています。
