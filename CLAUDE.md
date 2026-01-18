# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Critical Rules

**変更前に必ずチェック:**

- 既存コードを読んで理解してから実装
- Clean Architecture の依存方向を遵守（Presentation → Application → Domain ← Infrastructure）
- 全 UseCase で Result 型を使用（例外スロー禁止）
- インポートは `@/` alias 必須（相対パス禁止）
- 実装前に適切な Skill を参照（下記 Skills Navigator 参照）

---

## Project Overview

### Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5
- **Architecture**: Clean Architecture + DDD
- **Database**: PostgreSQL + Prisma 7
- **Styling**: TailwindCSS v4 + shadcn/ui
- **DI**: TSyringe
- **Testing**: Vitest + vitest-mock-extended + Playwright
- **Linting**: Biome

**Note**: Next.js 16 では `middleware.ts` が `proxy.ts` にリネーム（`src/proxy.ts`）

### Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # UI Components (features/common/layout/ui)
├── layers/
│   ├── presentation/       # Server Actions
│   ├── application/        # UseCases, DTOs, Services
│   ├── domain/             # Entities, Value Objects, Repository Interfaces
│   └── infrastructure/     # Repository実装, 外部サービス
├── di/                     # DIコンテナ, tokens, resolver
└── hooks/                  # Custom Hooks
```

---

## Quick Start

### New Clone Setup

```bash
make setup && make dev     # 初期セットアップ → DB起動 → 開発サーバー
```

### Daily Development

```bash
pnpm dev                   # 開発サーバー
pnpm check                 # 品質チェック（commit前推奨）
```

---

## Commands Reference

| Category | Command | Description |
|----------|---------|-------------|
| **Dev** | `pnpm dev` | 開発サーバー起動 |
| | `pnpm build` | 本番ビルド |
| | `pnpm check` | 品質チェック |
| **Test** | `pnpm test` | 全テスト実行 |
| | `pnpm test:unit` | ユニットテスト |
| | `pnpm test:e2e` | E2Eテスト |
| **DB** | `pnpm db:migrate:dev` | マイグレーション |
| | `pnpm db:studio` | Prisma Studio |
| | `pnpm db:seed` | シード投入 |
| **Gen** | `pnpm gen:usecase` | UseCase生成 |
| | `pnpm gen:entity` | Entity生成 |
| | `pnpm gen:repo` | Repository生成 |
| | `pnpm gen:action` | Server Action生成 |
| **UI** | `pnpm ui:add <name>` | shadcn/ui追加 |
| **Make** | `make dev` | DB起動 + 開発サーバー |
| | `make down` | Docker停止 |

**Code Generation詳細**: `code-generation` スキルまたは `_DOCS/guides/code-generator.md`

**カスタマイズ済みUI**: `button`, `card`, `input`, `alert`, `badge`, `dialog`,
`form`, `label`, `separator`, `sonner`, `toast`, `loading`, `spinner`

---

## Skills Navigator

**実装前に適切なスキルを参照してください。** 各スキルが詳細なパターンとベストプラクティスを提供します。

### Task-based Navigation

| タスク | Skill |
|--------|-------|
| **何から始めればいいか分からない** | `skill-navigator` |
| **UseCase/Entity/Repository 実装** | `best-practices` |
| **テスト作成** | `test-patterns` |
| **UI/フロントエンド実装** | `frontend-patterns` |
| **コーディング規約確認** | `coding-standards` |
| **コード生成ツール使用** | `code-generation` |
| **コミット前レビュー** | `commit-review` |

### Layer-based Navigation

| レイヤー | Skill |
|----------|-------|
| **Domain Layer** | `best-practices` + `_DOCS/guides/ddd/layers/components/entities.md` |
| **Application Layer** | `best-practices` + `_DOCS/guides/ddd/layers/components/use-cases.md` |
| **Infrastructure Layer** | `infrastructure-impl` |
| **Presentation Layer** | `presentation-impl` + `frontend-patterns` |

---

## Development Workflow

1. **Plan**: `skill-navigator` でタスク分類
2. **Design**: `best-practices` でアーキテクチャ確認
3. **Implement**: Domain → Infrastructure → Application → Presentation
4. **Test**: `test-patterns` でテスト作成
5. **Review**: `commit-review` で品質チェック
6. **Commit**: `pnpm check` → Git commit

**Pre-commit**: [ ] `pnpm check` パス [ ] テスト追加 [ ] Result型使用 [ ] `@/` alias使用

**Git Hooks**: pre-commit (`pnpm format`), pre-push (`pnpm check`)

---

## Documentation Quick Links

**詳細は `_DOCS/` 参照。** よく使うドキュメント:

- **全体理解**: `_DOCS/architecture/overview.md`
- **設計原則**: `_DOCS/architecture/principles.md`
- **開発フロー**: `_DOCS/guides/development/workflow.md`
- **DDD概念**: `_DOCS/guides/ddd/concepts/`
- **環境変数**: `_DOCS/reference/environment-variables.md`
- **トラブルシューティング**: `_DOCS/troubleshooting/common-issues.md`

---

## Essential Patterns

### Result Type

全 UseCase は Result 型を返却。例外スロー禁止。

```typescript
import { success } from '@/layers/application/types/Result';
async execute(req: Request): Promise<Result<Response>> {
  return success(response); // 詳細は best-practices スキル
}
```

### Dependency Injection

Service: `@injectable()` + コンストラクター注入 | Server Action: `resolve()` 関数
**詳細**: `best-practices` スキル

### Layer Dependencies (Biome強制)

Domain → なし | Application → Domain | Infrastructure → Domain + Application | Presentation → すべて

**詳細**: `coding-standards` スキルまたは `_DOCS/architecture/principles.md`
