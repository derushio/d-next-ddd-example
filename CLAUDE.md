# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Critical Rules

**変更前に必ずチェック:**

- 既存コードを読んで理解してから実装
- Clean Architecture の依存方向を遵守（Presentation → Application → Domain ← Infrastructure）
- 全 UseCase で Result 型を使用（例外スロー禁止）
- インポートは `@/` alias 必須（相対パス禁止）
- 実装前に適切な Skill を参照（下記 Skills Navigator 参照）
- **`_DOCS/` は不可侵（読み取り専用）。参照のみ、編集・追加・削除は一切禁止**（下記 Documentation Quick Links 参照）

---

## Project Overview

### Tech Stack

- **Framework**: Next.js 16.3 preview (App Router, Turbopack) + React 19.2 + TypeScript 7
  - `experimental.useTypeScriptCli` を有効化 (TS 7 の Go-native compiler を CLI 経由で呼ぶ)
- **Architecture**: Clean Architecture + DDD
- **Database**: PostgreSQL + Prisma 7.9
- **Styling**: TailwindCSS v4.3+ + shadcn/ui (OKLCH色空間, radix-ui統一パッケージ)
- **DI**: TSyringe
- **Testing**: Vitest + vitest-mock-extended + Playwright
- **Linting**: Biome
- **Result型**: neverthrow（型安全なエラーハンドリング）
- **ロギング**: pino + pino-pretty
- **パスワードハッシュ**: @node-rs/argon2 (Argon2id)
- **環境変数**: @t3-oss/env-nextjs
- **ユーティリティ**: es-toolkit（配列・オブジェクト操作、debounce/throttle等。lodash代替）

**Note**: Next.js 16 では `middleware.ts` が `proxy.ts` にリネーム（`src/proxy.ts`）

### Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # UI Components (features/common/layout/providers/ui)
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
portless proxy start       # portlessプロキシ起動（初回のみ）
make setup && make dev     # 初期セットアップ → DB起動 → 開発サーバー
```

### Daily Development

```bash
make dev                   # DB起動(Traefik TCP) + portless + 開発サーバー
pnpm check                 # 品質チェック（commit前推奨）
```

### Debug Credentials

| Item | Value |
|------|-------|
| **Email** | `test@example.com` |
| **Password** | `Test@1234!` |

---

## Commands Reference

| Category | Command | Description |
|----------|---------|-------------|
| **Env** | `portless proxy start` | portlessプロキシ起動（初回のみ） |
| | `portless list` | アクティブルート確認 |
| | `portless get <name>` | サービスURL取得 |
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
| | `pnpm gen:vo` | Value Object生成 |
| | `pnpm gen:repo` | Repository生成 |
| | `pnpm gen:action` | Server Action生成 |
| **UI** | `pnpm ui:add <name>` | shadcn/ui追加 |
| **Make** | `make dev` | DB起動 + 開発サーバー |
| | `make up` | DB起動 + マイグレーション + シード（worktree 新規時は親 main バックアップから自動復元） |
| | `make up-fresh` | `make up` と同じだが親バックアップ自動復元を skip（空 DB で起動） |
| | `make down` | dev関連プロセス停止(自worktree内 next-server/portless/prisma watch/studio) + Docker停止 |
| | `make clean` | dev関連プロセス停止 + 完全クリーンアップ（⚠️データ削除） |
| | `make stop-procs` | 自worktreeのdev関連プロセスのみ停止(Docker は触らない) |
| | `make db-backup` | auto スナップショット作成（`BACKUP_KEEP=20` 超過分は FIFO 削除） |
| | `make db-backup-named NAME=<slug>` | ネームドスナップショット作成（永続・ローテーション対象外） |
| | `make db-backup-list` | バックアップ一覧表示（auto + named） |
| | `make db-restore` | バックアップから復元（対話式・auto + named から選択） |
| | `make db-restore BACKUP=<path>` | 指定ファイルから復元 |
| | `make db-backup-clean` | 古い auto バックアップを削除（named は削除されない） |

**Code Generation詳細**: `code-generation` スキルまたは `_DOCS/guides/code-generator.md`

**カスタマイズ済みUI**: `button`, `card`, `input`, `alert`, `alert-dialog`, `badge`, `dialog`,
`form`, `label`, `separator`, `sonner`, `loading`, `spinner`

---

## Skills Navigator

**実装前に適切なスキルを参照してください。** 各スキルが詳細なパターンとベストプラクティスを提供します。

### Task-based Navigation

| タスク | Skill |
|--------|-------|
| **何から始めればいいか分からない** | `skill-navigator` |
| **UseCase/Entity/Repository 実装** | `best-practices` |
| **テスト作成** | `test-patterns` |
| **E2Eテスト設計・原則** | `e2e-principles` |
| **UI/フロントエンド実装** | `frontend-patterns` |
| **コーディング規約確認** | `coding-standards` |
| **コード生成ツール使用** | `code-generation` |
| **DBシード作成** | `db-seed-idempotency` |
| **コミット前レビュー** | `commit-review` |
| **開発環境の起動・トラブル** | `dev-environment` |
| **ロギング実装** | `pino-logging` |
| **パスワードハッシュ** | `password-hashing` |
| **パスワードハッシュ import 戦略・argon2 native binding** | `password-hashing-import-strategy` |
| **環境変数管理** | `env-management` |
| **Result型・エラーハンドリング** | `neverthrow-patterns` |
| **テストデータ作成** | `test-factory-patterns` |
| **日付フォーマット** | `date-formatting` |
| **ルーティング・ページ遷移** | `typesafe-routing` |
| **バックグラウンドジョブ** | `background-jobs` |
| **認可・権限管理** | `authorization` |
| **Auth.js v5 認証パターン** | `nextauth-v5-patterns` |
| **Auth.js v5 初期セットアップ** | `nextauth-v5-setup` |
| **Prisma 7 DB操作パターン** | `prisma-v7-patterns` |
| **Prisma 7 エラー対応** | `prisma-v7-troubleshooting` |
| **Prisma TLS接続エラー（P1011）** | `prisma-tls-workaround` |
| **Biome importエラー・レイヤー依存** | `biome-layer-enforcement` |
| **Promise並列処理パターン** | `promise-concurrency-patterns` |
| **セキュリティレビュー** | `security-review` |
| **Server Action実装** | `presentation-impl` |
| **Server Action Result変換** | `server-action-result-mapping` |
| **.claude設定・自動化** | `claude-config-creator` |
| **配列・オブジェクト操作** | `es-toolkit-collection` |
| **debounce/throttle/タイミング** | `es-toolkit-function` |
| **UseCase入力検証・バリデーション順序・Zod一貫性** | `usecase-validation-patterns` |
| **テストDIセットアップ** | `test-di-setup` |
| **アイコン使用** | `icon-consistency` |
| **フォームフィールド実装** | `form-field-consistency` |
| **Prismaクエリ設計** | `prisma-query-semantics` |
| **@injectable クラス実装** | `constructor-readonly` |
| **ファイル配置ルール** | `file-placement-rules` |
| **deprecated import 整理** | `deprecated-import-cleanup` |
| **Hook 命名規則** | `hook-naming-convention` |
| **Vitest設定・projects構成** | `vitest-configuration` |
| **マジックナンバー定数化** | `magic-number-constants` |
| **Zodエラーハンドリング（Server Action）** | `zod-error-handling` |
| **Zodスキーマ再利用（認証共有スキーマ）** | `zod-schema-reuse` |
| **TailwindCSSショートハンド・テキスト折り返し** | `tailwind-v4-utilities` |
| **TypeScriptパターン（satisfies等）** | `typescript-patterns` |
| **非同期UseCase（ResultAsync）** | `resultasync-patterns` |
| **Prismaエラー処理** | `prisma-error-handling` |
| **React 19フォームパターン** | `react19-form-patterns` |
| **React 19モダンAPI** | `react19-modern-patterns` |
| **DI衛生管理** | `di-hygiene` |
| **デッドコード検出** | `dead-code-detection` |
| **Web Crypto API** | `web-crypto-patterns` |
| **テスト設定最適化** | `test-config-optimization` |
| **es-toolkit基礎** | `es-toolkit-basics` |
| **トークン生成** | `token-generation` |
| **portless HMR修正** | `portless-hmr-fix` |
| **Server Action フォームHook** | `server-action-form-hook` |
| **動的インポート・コード分割** | `next-dynamic-import` |
| **検索・ページネーション一覧画面** | `url-search-pagination` |
| **Next.js Error Boundary** | `nextjs-error-boundary` |
| **Zod 4 ネイティブAPI** | `zod-v4-modern-api` |
| **React.cache() デデュプリケーション** | `react-cache-dedup` |
| **Next.js 16 after() レスポンス後処理** | `next16-after-api` |
| **React 19 use() Hook** | `react19-use-hook` |
| **Zodスキーマ所有権** | `zod-schema-ownership` |
| **ActionResultエラーコード** | `action-error-granularity` |
| **レートリミットUX** | `rate-limit-ux` |
| **UseCase一括登録** | `usecase-batch-registration` |
| **UseCaseログレベル** | `usecase-logging-levels` |
| **リクエスト相関ID** | `correlation-id` |
| **ダークモードOKLCH** | `dark-mode-oklch` |
| **並列データ取得** | `parallel-data-fetching` |
| **Server Componentデータ設計** | `server-component-data-patterns` |
| **楽観的UI更新（useOptimistic）** | `optimistic-ui-patterns` |
| **Prismaトランザクション** | `prisma-transactions` |
| **shadcn/uiカスタマイズ** | `shadcn-component-customization` |
| **Suspense/Streamingパターン** | `streaming-ssr-patterns` |
| **proxy.ts (middleware) 設計** | `middleware-proxy-patterns` |
| **Next.js Image最適化** | `image-optimization` |
| **ページ作成時の loading.tsx 強制** | `loading-boundary-completeness` |
| **Next.js キャッシュ戦略** | `nextjs-cache-strategy` |
| **ページネーション定数管理** | `pagination-constants` |
| **React Compiler 準備・メモ化判断** | `react19-compiler-readiness` |
| **共通フィールドZodスキーマ** | `shared-validation-schemas` |
| **リテラルカラー禁止・意味論的クラス** | `semantic-color-classes` |
| **クリック要素のcursor-pointer必須** | `cursor-pointer-enforcement` |
| **React import パターン統一** | `react-import-hygiene` |
| **型アサーション安全化** | `type-assertion-safety` |
| **PR作成（Gitea）** | `gitea-pr` |
| **worktree ship（PR→マージ→クリーンアップ）** | `worktree-ship` |
| **DB初期化（全クリーン）** | `db-reset` |
| **UIパフォーマンス最適化** | `ui-performance-patterns` |

### Layer-based Navigation

| レイヤー | Skill |
|----------|-------|
| **Domain Layer** | `best-practices` + `domain-impl` + `_DOCS/guides/ddd/layers/components/entities.md` |
| **Application Layer** | `best-practices` + `application-impl` + `resultasync-patterns` + `usecase-validation-patterns` + `zod-schema-reuse` + `zod-v4-modern-api` |
| **Infrastructure Layer** | `infrastructure-impl` + `prisma-error-handling` + `db-seed-idempotency` (シード作成時) |
| **Presentation Layer** | `presentation-impl` + `frontend-patterns` + `zod-error-handling` + `zod-schema-reuse` |
| **Cross-cutting** | `coding-standards` + `typescript-patterns` + `neverthrow-patterns` + `tailwind-v4-utilities` + `zod-v4-modern-api` + `semantic-color-classes` + `react-import-hygiene` + `type-assertion-safety` + `biome-layer-enforcement` + `promise-concurrency-patterns` |

---

## Security Quick Reference

- **IPA対応ガイド**: `_DOCS/guides/ddd/cross-cutting/security/` にIPA 11脆弱性対策
- **チェックリスト**: 開発時・レビュー時・デプロイ前の3段階チェック
- **スキル**: `security-review`(詳細レビュー)、`commit-review`(コミット前確認)

### 必須セキュリティルール

- 全Server Actionsで `requireAuthentication()` による認証チェック（Auth.js v5）
- Prismaパラメータ化クエリのみ使用($queryRaw禁止、複雑なクエリは `$queryRawTyped` (TypedSQL) を推奨)
- `dangerouslySetInnerHTML` 使用時は DOMPurify 必須
- 機密情報は環境変数経由(ハードコード禁止)

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

### CRITICAL: `_DOCS/` は不可侵領域

**`_DOCS/` はテンプレート配布物であり、このプロジェクトでは読み取り専用。編集・追加・削除は一切禁止。**

- ローカルで編集しても、次回 `sup-next` 実行時の rsync で無告知に上書き消失する
- ドキュメントを直す場合はテンプレ配布リポジトリ（ルートディレクトリ名 `d-next-template-debug`）側の `_DOCS/` を修正 →
  各プロジェクトで `sup-next` を再実行して配布する
- このプロジェクト固有のドキュメントは `_DOCS/` の外（`README.md` やプロジェクト独自ディレクトリ）に書く
- `.claude/hooks/block-docs-edit.sh` が `_DOCS/` への書き込み（Write/Edit/破壊的 Bash）を PreToolUse で拒否する
- 唯一の例外は `make setup` のプロジェクト名一括置換（テンプレ名を実プロジェクト名に書き換える機械処理）

**詳細は `_DOCS/` 参照。** よく使うドキュメント:

- **全体理解**: `_DOCS/architecture/overview.md`
- **設計原則**: `_DOCS/architecture/principles.md`
- **開発フロー**: `_DOCS/guides/development/workflow.md`
- **DDD概念**: `_DOCS/guides/ddd/concepts/`
- **環境変数**: `_DOCS/reference/environment-variables.md`
- **トラブルシューティング**: `_DOCS/troubleshooting/common-issues.md`

---

## portless/worktree開発

### devサーバー起動方式

- **Next.js**: `portless run next dev --turbopack` でホスト実行（ポート自動管理）
- **PostgreSQL**: Traefik TCP routing 経由でコンテナ実行（`ports:` なし）
- **Prisma Studio**: `--port 0` でOS空きポート自動割当

### worktree分離

#### 設計原則

PostgreSQL等のTCPサービスはHTTPと異なりドメインベースルーティングが不可能なため、
**共有Traefikインスタンスの決定的ポート割当**でworktree間を分離する。

- 全worktreeが1つのTraefikコンテナのTCP entrypointを共有
- DB_PORTはworktree名のハッシュから決定的に算出（同じworktreeは常に同じポート）
- compose.yamlに`ports:`は不使用（Traefik TCPラベルで一元管理）

#### 自動化

- `make dev` 実行時に `PROJECT_BASE-WORKTREE_ID` から DB_PORT を決定的に自動計算（範囲 5465-5484、Traefik listen 範囲に揃える）
- `COMPOSE_PROJECT_NAME` でDBコンテナ・ボリュームが自動分離
- `.env` の `DB_PORT` は `make up` 時に自動更新（Prismaローカル実行対応）

### URL体系

`PROJECT_BASE` は `scripts/resolveProjectBase.mjs` で算出される動的値（`<package.json name>-<メインリポジトリ basename>`）。
実際の値は `node scripts/resolveProjectBase.mjs` で確認できる。

| 環境 | URL |
|------|-----|
| main | `https://<PROJECT_BASE>.localhost:1355` |
| worktree | `https://worktree-<branch>.<PROJECT_BASE>.localhost:1355` |

例（このテンプレートを `my-app/` にクローン、package.json name=`my-app` の場合）:

- main: `https://my-app-my-app.localhost:1355`
- worktree `feat-x`: `https://worktree-feat-x.my-app-my-app.localhost:1355`

`portless list` で全アクティブルートを確認可能。

### 注意事項

- `pnpm dev` 単体実行は可能だがDBが起動しない。必ず `make dev` を使うこと
- `NEXT_PUBLIC_BASE_URL` と `AUTH_URL` は portless 起動後に `.env` に設定が必要
- Traefik共有ネットワークへの接続が必要なため、Traefikコンテナが事前に起動していること
- **IMPORTANT: devサーバー起動後は、アクセスURLとDebug Credentialsをユーザーに必ず通知すること**
- **IMPORTANT: TypedSQL 使用時の worktree セットアップ**: `prisma/sql/` ディレクトリが存在する場合、
  devサーバーが不要な作業でも `make up` を実行してDB起動 + TypedSQL型生成を行うこと。
  `postinstall` の `prisma generate` では通常のPrisma Clientのみ生成され、TypedSQL (`--sql`) はDB接続が必要。
  省略すると pre-push hook の `tsc --noEmit` が失敗する
- **CRITICAL: worktree クリーンアップ時は必ず `make down` を最優先で先に実行する**:
  hook (PreToolUse 等) や `git worktree remove` の権限制御が走り出すと、後追いでホスト側プロセスを
  正しく停止しきれずに next-server / portless / prisma watch / prisma studio が孤児プロセスとして残り、
  CPU/RAM を食い続ける事故が発生する(`worktree cleanup` よりも前にプロセス停止が完了している必要がある)。
  `make down` は内部で `stop-procs` を前段に呼び、自 worktree CWD で動いている dev 関連プロセス
  (next-server / next dev / portless / prisma generate --watch / prisma studio) を `kill -TERM`(2 回)
  → `kill -KILL` で確実に停止してから `docker compose down` する。
  Docker コンテナが残ると Traefik TCP entrypoint も占有し続けるため、`make down` 必須。
  正しい順序: `make down`(プロセス + DB停止) → `git worktree remove` → ブランチ削除
  DBデータも消す場合: `make clean` を使用(`stop-procs` + `docker compose down -v` + ボリューム削除)
- **旧 BACKUP ディレクトリの移行**: `PROJECT_BASE` の算出式は `<pkg-name>-<main-repo-dir>` に統一された。
  旧テンプレート（`PROJECT_BASE = <pkg-name>` 時代）から移行する場合、
  `~/Documents/db-backups/<old-pkg-name>/` の中身を `~/Documents/db-backups/<new-PROJECT_BASE>/` に手動で `mv` すること。
  （移行しなくても動作はするが、過去の auto/named バックアップが参照されなくなる）

---

## Essential Patterns

### Result Type

全 UseCase は Result 型を返却。例外スロー禁止。

```typescript
import { ok, Result } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';
async execute(req: Request): Promise<Result<Response, AppError>> {
  return ok(response); // 詳細は best-practices スキル + neverthrow-patterns スキル
}
```

### Dependency Injection

Service: `@injectable()` + コンストラクター注入 | Server Action: `resolve()` 関数
**詳細**: `best-practices` スキル

### Layer Dependencies (Biome強制)

Domain → なし | Application → Domain | Infrastructure → Domain + Application | Presentation → すべて

**詳細**: `coding-standards` スキルまたは `_DOCS/architecture/principles.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
