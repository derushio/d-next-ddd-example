# 🌟 Next.js Clean Architecture Template

**Clean Architecture + DDD + TypeScript** による実用的なNext.jsテンプレートプロジェクト

現代的なフロントエンド開発のベストプラクティスを集約し、スケーラブルで保守性の高いWebアプリケーション開発を実現します。

---

## 🎯 ご自身の状況に合わせてお使いください

### 🔰 これからモダンアーキテクチャに触れる方へ

**Clean ArchitectureやDDDにご興味をお持ちの方** へ、以下の順序でご案内しております：

```mermaid
graph LR
    A[📚 基本概念理解] --> B[🎨 図解で理解]
    B --> C[🚀 実践チュートリアル]
    C --> D[🤔 FAQ・トラブル解決]

    style A fill:#ffcdd2
    style B fill:#c8e6c9
    style C fill:#bbdefb
    style D fill:#d1c4e9
```

**📖 おすすめの順序（目安：1-2週間程度）：**

1. **[📚 従来のReactからモダンアーキテクチャへの入門](./_DOCS/guides/beginners/legacy-react-to-modern-architecture.md)**

   - 従来のReact vs モダンアーキテクチャの比較
   - よくある疑問や不安の解消

2. **[🎨 アーキテクチャ図解：ビジュアルで理解](./_DOCS/guides/beginners/architecture-diagrams.md)**

   - 図解でアーキテクチャの全体像を把握
   - データフローとレイヤー構造を視覚的に確認

3. **[🚀 実践チュートリアル：商品一覧機能を作ってみよう](./_DOCS/guides/beginners/simple-tutorial.md)**

   - 実際に手を動かしながら機能を実装
   - Clean Architecture の各層を段階的に体験

4. **[🤔 よくある質問とトラブルシューティング](./_DOCS/guides/beginners/legacy-react-faq.md)**
   - よくある疑問・つまづきポイントの解決
   - 困ったときのチートシート

### 💪 モダンアーキテクチャの経験がある方

Clean ArchitectureやDDDの経験をお持ちの方：

- **[🏗️ アーキテクチャ概要](./_DOCS/architecture/overview.md)** - このプロジェクトの設計思想
- **[📋 開発ガイド](./_DOCS/guides/development/workflow.md)** - 実装フローとベストプラクティス
- **[🧪 テスト戦略](./_DOCS/testing/strategy.md)** - vitest-mock-extended活用法

### 🚀 チーム導入やアーキテクチャ設計をお考えの方

チーム導入やカスタマイズをご検討の方：

- **[🏛️ 設計原則・判断基準](./_DOCS/architecture/principles.md)** - 技術選択の背景と理由
- **[🔧 プロジェクト設計判断](./_DOCS/guides/project-architecture-decisions.md)** - アーキテクチャの意思決定記録
- **[📊 他アーキテクチャとの比較](./_DOCS/guides/ddd/concepts/architecture-comparison.md)** - 選択肢とトレードオフ

---

## ✨ 特徴

- **Clean Architecture + DDD** - スケーラブルで保守性の高い設計
- **Next.js 15 + TypeScript** - 最新技術によるモダン開発
- **充実したテスト環境** - Vitest + Playwright
- **開発体験重視** - ESLint/Prettier + pnpm

---

## 🚀 クイックスタート

```bash
# 1. 依存関係インストール
pnpm install

# 2. 環境設定
cp .env.example .env
# .env.local を編集して必要な環境変数を設定

# 3. データベースセットアップ
make dev
pnpm db:migrate:dev
pnpm db:seed

# 4. 開発サーバー起動
pnpm dev
```

**<http://localhost:3000>** でアプリケーションが起動します 🎉

---

## 📁 プロジェクト構造

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── api/                 # API Routes
│
├── layers/                   # Clean Architecture レイヤー
│   ├── application/         # Application Layer (Use Cases)
│   ├── domain/              # Domain Layer (Business Logic)
│   └── infrastructure/      # Infrastructure Layer (Data Access)
│
├── components/              # Reactコンポーネント
│   ├── atom/               # 基本コンポーネント
│   ├── navigation/         # ナビゲーション
│   └── ui/                 # UIコンポーネント
│
├── data-accesses/          # データアクセス層
│   ├── queries/            # データ取得
│   ├── mutations/          # データ変更
│   └── infra/              # インフラストラクチャ
│
└── types/                  # 型定義
    ├── api/               # API型定義
    ├── domain/            # ドメイン型定義
    └── infrastructure/    # インフラ型定義
```

---

## 🛠️ 主要コマンド

### 開発

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
pnpm type-check   # TypeScript型チェック
```

### テスト

```bash
pnpm test         # 全テスト実行
pnpm test:unit    # ユニットテストのみ
pnpm test:e2e     # E2Eテストのみ
pnpm test:watch   # ウォッチモード
pnpm test:coverage # カバレッジ付きテスト
```

### コード品質

```bash
pnpm lint         # ESLint実行
pnpm format       # Prettier実行
pnpm audit        # セキュリティ監査
```

### Git Hooks

```bash
make setup-git-hooks  # 🚀 環境自動判定でGit hooks設定
```

**個別コマンド（必要に応じて）:**

```bash
make setup-hooks     # ../.gitにhooks追加（テンプレート利用時）
make init-hooks      # .gitにhusky初期化（独立プロジェクト時）
```

**設定されるhooks:**

- **pre-commit**: 自動フォーマット実行 (`pnpm format`)
- **pre-push**: ユニットテスト実行 (`pnpm test:unit`)

> `setup-git-hooks`は環境を自動判定し、適切な方法でGit hooksを設定します

### データベース

```bash
pnpm prisma studio           # Prisma Studio起動
pnpm prisma migrate dev      # 開発用マイグレーション
pnpm prisma migrate deploy   # 本番マイグレーション
pnpm prisma db seed          # シードデータ投入
```

---

## 📋 技術スタック

**Next.js 15** + **TypeScript** + **Clean Architecture** + **DDD**

主要技術: React 19, TailwindCSS v4, Prisma, NextAuth.js, TSyringe, Vitest, Playwright

---

## 🌍 環境設定

詳細なアーキテクチャ説明、実装パターン、セットアップ方法は [📚 ドキュメント](#-ドキュメント) を参照してください。

---

## 📚 ドキュメント

詳細なドキュメントは`_DOCS/`フォルダに格納されています：

### 📋 基本ドキュメント

- [プロジェクト構造](./_DOCS/project-structure.md) - ディレクトリ構成とファイル配置
- [開発ガイド](./_DOCS/development-guide.md) - セットアップと開発フロー
- [アーキテクチャ概要](./_DOCS/architecture-overview.md) - システム設計と技術選択

### 🔧 技術ドキュメント

- [依存性注入](./_DOCS/dependency-injection.md) - DIコンテナの設計・実装
- [テスト戦略](./_DOCS/testing-strategy.md) - テスト方針と実装パターン
- [デプロイガイド](./_DOCS/deployment-guide.md) - 本番環境への展開手順

### 📖 実装ガイド

- [フロントエンドベストプラクティス](./_DOCS/guides/frontend-best-practices.md)
- [コーディング規約](./_DOCS/guides/coding-standards.md)
- [Next.js統合パターン](./_DOCS/guides/nextjs-integration-patterns.md)

### 🔍 トラブルシューティング

- [テストモック設定](./_DOCS/troubleshootings/vitest-mock-extended-setup.md)
- [Prismaモック](./_DOCS/troubleshootings/prisma-mock-setup.md)
- [バリデーションエラー](./_DOCS/troubleshootings/email-validation-issues.md)

---

## 📄 ライセンス

MIT License

---

💡 **詳しい使い方やカスタマイズ方法は [📚 ドキュメント](#-ドキュメント) をチェックしてね〜📋✨**
