# Next.js Clean Architecture Template

**Clean Architecture + DDD + TypeScript** による実用的なNext.jsテンプレートプロジェクト

現代的なフロントエンド開発のベストプラクティスを集約し、スケーラブルで保守性の高いWebアプリケーション開発を実現します。

---

## ご自身の状況に合わせてお使いください

### これからモダンアーキテクチャに触れる方へ

**Clean ArchitectureやDDDにご興味をお持ちの方** へ、以下の順序でご案内しております：

1. **[従来のReactからモダンアーキテクチャへの入門](./_DOCS/guides/beginners/legacy-react-to-modern-architecture.md)** - 従来のReact vs モダンアーキテクチャの比較
2. **[アーキテクチャ図解：ビジュアルで理解](./_DOCS/guides/beginners/architecture-diagrams.md)** - 図解でアーキテクチャの全体像を把握
3. **[実践チュートリアル：商品一覧機能を作ってみよう](./_DOCS/guides/beginners/simple-tutorial.md)** - 手を動かしながら機能を実装
4. **[よくある質問とトラブルシューティング](./_DOCS/guides/beginners/legacy-react-faq.md)** - よくある疑問・つまづきポイントの解決

### モダンアーキテクチャの経験がある方

Clean ArchitectureやDDDの経験をお持ちの方：

- **[アーキテクチャ概要](./_DOCS/architecture/overview.md)** - このプロジェクトの設計思想
- **[開発ガイド](./_DOCS/guides/development/workflow.md)** - 実装フローとベストプラクティス
- **[テスト戦略](./_DOCS/testing/strategy.md)** - vitest-mock-extended活用法

### チーム導入やアーキテクチャ設計をお考えの方

- **[設計原則・判断基準](./_DOCS/architecture/principles.md)** - 技術選択の背景と理由
- **[プロジェクト設計判断](./_DOCS/guides/project-architecture-decisions.md)** - アーキテクチャの意思決定記録
- **[他アーキテクチャとの比較](./_DOCS/guides/ddd/concepts/architecture-comparison.md)** - 選択肢とトレードオフ

---

## 特徴

- **Clean Architecture + DDD** - スケーラブルで保守性の高い設計
- **Next.js 16 + TypeScript** - 最新技術によるモダン開発
- **充実したテスト環境** - Vitest + Playwright
- **開発体験重視** - Biome（Linter/Formatter） + pnpm

---

## クイックスタート

```bash
# 1. 初期セットアップ（.env生成、依存インストール、hooks設定）
make setup

# 2. Docker + DB起動（PostgreSQL + マイグレーション + シード）
make up

# 3. 開発サーバー起動
pnpm dev
```

または一括実行:

```bash
make setup && make dev
```

**<http://localhost:3000>** でアプリケーションが起動します。

---

## プロジェクト構造

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── api/                 # API Routes
│
├── layers/                   # Clean Architecture レイヤー
│   ├── application/         # Application Layer (UseCases, DTOs)
│   ├── domain/              # Domain Layer (Entities, Value Objects)
│   └── infrastructure/      # Infrastructure Layer (Repository実装)
│
├── components/              # Reactコンポーネント
│   ├── features/           # 機能別コンポーネント
│   ├── common/             # 共通コンポーネント
│   ├── layout/             # レイアウト
│   └── ui/                 # UIコンポーネント（shadcn/ui）
│
├── di/                      # DIコンテナ設定
│   ├── container.ts        # コンテナ設定
│   ├── tokens.ts           # Injection Tokens
│   └── resolver.ts         # resolve関数
│
└── utils/                   # ユーティリティ関数
```

---

## 主要コマンド

### 開発

```bash
pnpm dev          # 開発サーバー起動（ポート解放 → Turbopack + DB watch + Prisma Studio）
pnpm stop-dev     # ポート解放のみ（必要時のみ）
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
pnpm check        # 品質チェック（format → type-check → lint → test:unit）
pnpm lint         # Biome Lint実行
pnpm format       # Biome + markdownlint 実行
```

### Git Hooks

```bash
make setup-git-hooks  # 環境自動判定でGit hooks設定
```

**設定されるhooks:**

- **pre-commit**: 自動フォーマット実行 (`pnpm format`)
- **pre-push**: 品質チェック実行 (`pnpm check`)

### データベース

```bash
pnpm db:generate       # Prismaクライアント生成
pnpm db:studio         # Prisma Studio起動
pnpm db:migrate:dev    # 開発用マイグレーション
pnpm db:seed           # シードデータ投入
```

### Make Commands

```bash
make setup         # 初期セットアップ（.env生成、依存インストール、hooks設定）
make up            # PostgreSQL起動 + マイグレーション + シード
make dev           # make up + pnpm dev
make down          # Docker停止
make clean         # 完全クリーンアップ（Docker volumes含む）
make seed          # マイグレーション + シード再実行
```

### コード生成 (Hygen)

Clean Architecture + DDDパターンに準拠したボイラープレートコードを自動生成できます。

```bash
pnpm gen:usecase   # UseCase + テスト + DI登録
pnpm gen:entity    # Entity + EntityId + テスト
pnpm gen:repo      # Repository Interface + Prisma実装 + テスト + DI登録
pnpm gen:action    # Server Action + テスト
pnpm gen:vo        # Value Object + テスト
```

**使用例:**

```bash
# 新しいエンティティを作成
pnpm gen:entity --name Order

# UseCaseを作成（Repository注入付き）
pnpm gen:usecase --name CreateOrder --domain order --withRepository true --repository Order
```

詳細は [コード生成ガイド](./_DOCS/guides/code-generator.md) を参照してください。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5, React 19 |
| **Architecture** | Clean Architecture + DDD |
| **Database** | PostgreSQL + Prisma 7 |
| **Styling** | TailwindCSS v4 + shadcn/ui |
| **DI** | TSyringe |
| **Testing** | Vitest + vitest-mock-extended + Playwright |
| **Linting** | Biome |
| **Code Generation** | Hygen |
| **Auth** | NextAuth.js |

### Next.js 16 重要変更

Next.js 16 では `middleware.ts` が `proxy.ts` にリネームされました。
本プロジェクトでは `src/proxy.ts` を使用しています。

詳細は [CLAUDE.md](./CLAUDE.md) または
[Next.js公式ドキュメント](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) を参照

---

## 環境設定

`make setup` で自動生成される `.env` ファイルを必要に応じて編集してください。

主要な環境変数:

- `DATABASE_URL` - PostgreSQL接続URL
- `NEXTAUTH_SECRET` - NextAuth.js シークレット
- `TOKEN_SECRET` - JWTトークンシークレット

---

## ドキュメント

詳細なドキュメントは `_DOCS/` フォルダに格納されています：

### 基本ドキュメント

- [アーキテクチャ概要](./_DOCS/architecture/overview.md) - システム設計と技術選択
- [設計原則](./_DOCS/architecture/principles.md) - 設計思想と判断基準
- [開発フロー](./_DOCS/guides/development/workflow.md) - 実装手順とベストプラクティス

### 実装ガイド

- [コード生成ツール](./_DOCS/guides/code-generator.md) - Hygenによるボイラープレート自動生成
- [UseCase実装](./_DOCS/guides/ddd/layers/components/use-cases.md) - Result型パターン
- [依存性注入](./_DOCS/architecture/patterns/dependency-injection.md) - TSyringe活用
- [フロントエンドベストプラクティス](./_DOCS/guides/frontend-best-practices.md)

### テスト

- [テスト戦略](./_DOCS/testing/strategy.md) - テスト方針
- [ユニットテスト](./_DOCS/testing/unit/overview.md) - vitest-mock-extended活用
- [モック戦略](./_DOCS/testing/unit/mocking.md)

### トラブルシューティング

- [よくある問題](./_DOCS/troubleshooting/common-issues.md)
- [Prismaモック設定](./_DOCS/troubleshooting/development/prisma-mock-setup.md)
- [vitest-mock-extended設定](./_DOCS/troubleshooting/development/vitest-mock-extended-setup.md)

---

## Claude Code での開発

このプロジェクトは Claude Code (claude.ai/code) での開発に最適化されています。
詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

---

## ライセンス

MIT License
