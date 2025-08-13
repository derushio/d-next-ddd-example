# CLAUDE.md

## 📋 CLAUDE.mdの存在意義

このファイルは **Claude Code (claude.ai/code) が効率的にプロジェクトで作業できるよう**、以下の情報を提供します：

1. **プロジェクト概要** - アーキテクチャと技術選択の要点
2. **開発コマンド** - よく使用するコマンドの一覧
3. **タスクマップ** - やりたいことに対する適切なドキュメント参照先
4. **重要ルール** - 守るべき実装原則の要点

詳細な実装方法、コード例、ベストプラクティスは専用ドキュメント（`_DOCS/`）に記載されています。

---

## 🚀 プロジェクト概要

**Next.js 15 + TypeScript + Clean Architecture + DDD** ベースのWebアプリケーションテンプレート

### 重要な技術選択

- **Result型パターン** - 例外処理の代わりに型安全なエラーハンドリング
- **shadcn/ui統合** - Enhanced Components + Bridge System による統一UI
- **Server Actions優先** - Client Componentsは最小限に抑制
- **依存性注入** - TSyringeによるテスタブルな設計

### アーキテクチャ構成

```
src/
├── app/                     # Next.js App Router
├── components/              # UI Components
│   ├── features/           # 機能別コンポーネント
│   ├── common/             # 共通コンポーネント
│   ├── layout/             # レイアウト
│   └── ui/                 # 基本UIコンポーネント
└── layers/
    ├── presentation/       # Server Actions
    ├── application/        # UseCases, DTOs
    ├── domain/            # Entities, Value Objects
    └── infrastructure/    # Repository実装, 外部サービス
```

---

## 📝 開発コマンド

### 基本開発

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm start        # 本番サーバー
pnpm lint         # Lint
pnpm type-check   # 型チェック
```

### テスト

```bash
pnpm test              # 🎯 全テスト実行（推奨）
pnpm test:unit         # ユニットテストのみ
pnpm test:coverage     # カバレッジ付きテスト
pnpm test:e2e          # E2Eテスト
```

### shadcn/ui

```bash
pnpm ui:add           # コンポーネント追加
pnpm ui:list          # 利用可能コンポーネント一覧
```

### データベース

```bash
pnpm db:generate      # Prismaクライアント生成
pnpm db:studio        # Prisma Studio起動
pnpm db:migrate:dev   # マイグレーション実行
```

---

## 🎯 タスク別ドキュメント参照マップ

### 🏗️ アーキテクチャ理解

| タスク | 必読ドキュメント |
|--------|------------------|
| プロジェクト全体理解 | `_DOCS/architecture/overview.md` |
| DDD・Clean Architecture理解 | `_DOCS/guides/ddd/concepts/` |
| 依存性注入理解 | `_DOCS/architecture/patterns/dependency-injection.md` |

### 🎨 UI・フロントエンド開発

| タスク | 必読ドキュメント |
|--------|------------------|
| コンポーネント作成 | `_DOCS/guides/ddd/layers/presentation-layer.md` |
| shadcn/ui統合 | `_DOCS/guides/theme-system.md` |
| Server Actions実装 | `_DOCS/guides/ddd/layers/components/server-actions.md` |
| フロントエンドベストプラクティス | `_DOCS/guides/frontend-best-practices.md` |

### 📋 ビジネスロジック開発

| タスク | 必読ドキュメント |
|--------|------------------|
| UseCase作成 | `_DOCS/guides/ddd/layers/application-layer.md` |
| UseCase詳細実装 | `_DOCS/guides/ddd/layers/components/use-cases.md` |
| エラーハンドリング | `_DOCS/guides/ddd/cross-cutting/error-handling.md` |

### 👑 ドメインモデル開発

| タスク | 必読ドキュメント |
|--------|------------------|
| Entity作成 | `_DOCS/guides/ddd/layers/components/entities.md` |
| Value Object作成 | `_DOCS/guides/ddd/layers/components/value-objects.md` |
| ドメイン層全体 | `_DOCS/guides/ddd/layers/domain-layer.md` |

### 🔧 インフラ開発

| タスク | 必読ドキュメント |
|--------|------------------|
| Repository実装 | `_DOCS/guides/ddd/layers/components/repository-implementations.md` |
| 外部サービス連携 | `_DOCS/guides/ddd/layers/components/external-services.md` |
| インフラ層全体 | `_DOCS/guides/ddd/layers/infrastructure-layer.md` |

### 🧪 テスト開発

| タスク | 必読ドキュメント |
|--------|------------------|
| テスト戦略理解 | `_DOCS/testing/strategy.md` |
| ユニットテスト | `_DOCS/testing/unit/overview.md` |
| E2Eテスト | `_DOCS/testing/e2e/overview.md` |
| モック活用 | `_DOCS/testing/unit/mocking.md` |

### 🚨 問題解決

| 問題カテゴリ | 参照先 |
|-------------|-------|
| 一般的な問題 | `_DOCS/troubleshooting/common-issues.md` |
| Email関連 | `_DOCS/troubleshooting/development/email-validation-issues.md` |
| Prisma関連 | `_DOCS/troubleshooting/development/prisma-mock-setup.md` |
| テスト関連 | `_DOCS/troubleshooting/testing/` |

---

## ⚡ 重要な実装ルール

### 🔄 Result型パターン（必須）

```typescript
// 全UseCaseはResult型を返却
import { Result, success, failure } from '@/layers/application/types/Result';

async function createUser(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
  try {
    return success(response);
  } catch (error) {
    return failure('エラーメッセージ', 'ERROR_CODE');
  }
}
```

### 🔧 依存性注入ルール

- **サービス層**: `@injectable()` + コンストラクター注入
- **Server Action**: `resolve()` 関数使用
- **Client Component**: シンプルなUI + イベントハンドリングに限定（DI使用不要）
- **新規トークン**: `tokens.ts` に型定義追加必須

### 📁 インポートルール

```typescript
// ✅ 推奨：個別インポート + alias使用
import { Button } from '@/components/ui/Button';
import { SignInForm } from '@/components/features/auth/SignInForm';

// ❌ 禁止：相対パス・index.ts経由
import { Button } from '../../ui/Button';
import { Button } from '@/components/ui';
```

### 🧪 テストルール

- **新規テスト**: vitest-mock-extended の自動モック使用
- **カバレッジ目標**: Application 94%以上、Domain 90%以上、Infrastructure 85%以上
- **テスト実行**: `pnpm test` で包括的品質保証

### 🎨 スタイルルール

- **統一システム**: `@/utils/style-utilities` のユーティリティ関数使用
- **shadcn/ui**: Bridge System (`@/components/ui-bridge`) 経由で使用
- **テーマ変数**: `bg-[var(--primary)]` 形式でCSS変数使用

---

## 🚨 実装前チェックリスト

### 任意の実装開始前に必ず実行

1. **📖 適切なドキュメント読み込み** - 上記タスクマップから該当ドキュメント確認
2. **🏗️ アーキテクチャ準拠性確認** - レイヤー責務と依存関係の方向性確認
3. **🔧 実装ルール確認** - Result型、DI、インポート、テストルール遵守
4. **✅ 完了時品質確認** - `pnpm test && pnpm lint && pnpm type-check && pnpm build`

---

## 📚 完全ドキュメント一覧

詳細な実装ガイド、ベストプラクティス、トラブルシューティングは以下にまとまっています：

### 📖 基盤ドキュメント

- `_DOCS/README.md` - ドキュメンテーション全体ガイド
- `_DOCS/architecture/` - アーキテクチャ詳細
- `_DOCS/guides/ddd/` - DDD・Clean Architecture実装ガイド
- `_DOCS/testing/` - テスト戦略・実装方法
- `_DOCS/troubleshooting/` - 問題解決・FAQ

### 🎯 重要ドキュメント（優先確認推奨）

- `_DOCS/guides/development/workflow.md` - 新機能開発手順
- `_DOCS/guides/frontend-best-practices.md` - フロントエンド開発
- `_DOCS/guides/standards/coding.md` - コーディング規約
- `_DOCS/guides/ddd/cross-cutting/error-handling.md` - エラーハンドリング

**詳細な実装パターン、コード例、包括的なガイドは `_DOCS/` ディレクトリを参照してください。**

---

**🎯 このCLAUDE.mdで要点を把握してから、必要に応じて詳細ドキュメントで深掘りする効率的な開発を実現します！**
