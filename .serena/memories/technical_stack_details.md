# 技術スタック詳細

## フロントエンド

- **Next.js 15**: React フレームワーク（App Router、Turbopack対応）
- **React 19**: UI ライブラリ
- **TypeScript 5**: 静的型付けシステム
- **TailwindCSS v4**: CSSフレームワーク
- **shadcn/ui**: UIコンポーネントライブラリ
- **next-themes**: ダークモード対応

## バックエンド・データベース

- **Prisma 6.9.0**: ORM（PostgreSQL、SQLite対応）
- **NextAuth.js**: 認証システム
- **bcryptjs**: パスワードハッシュ化
- **jose**: JWT処理

## アーキテクチャ・DI

- **TSyringe**: 依存性注入コンテナ
- **reflect-metadata**: デコレーターサポート
- **Clean Architecture**: 4層アーキテクチャ実装
- **DDD**: ドメイン駆動設計パターン

## 開発ツール

- **pnpm**: パッケージマネージャ
- **ESLint 9**: 静的解析ツール
- **Prettier**: コードフォーマッタ
- **npm-run-all**: 並列・直列タスク実行

## テスト

- **Vitest**: ユニットテストフレームワーク
- **vitest-mock-extended**: 自動モック生成
- **@testing-library/react**: React テスティングライブラリ
- **Playwright**: E2Eテストフレームワーク
- **jsdom**: DOM環境シミュレーション

## バリデーション・ユーティリティ

- **Zod**: スキーマバリデーション
- **lodash**: ユーティリティライブラリ
- **date-fns**: 日付操作ライブラリ
- **uuid**: UUID生成
- **p-queue**: 非同期キュー管理

## 設定・環境

- **@dotenvx/dotenvx**: 環境変数管理
- **cross-env**: 環境変数設定（クロスプラットフォーム）
- **markdownlint**: Markdownリント
- **tsx**: TypeScript実行環境
