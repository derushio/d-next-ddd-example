# Skill Catalog

このプロジェクトで利用可能な全スキルの一覧と概要（61スキル）。

---

## 1. アーキテクチャ・レイヤー実装

| スキル | 説明 |
|--------|------|
| `best-practices` | Clean Architecture + DDD のベストプラクティスを自動適用。レイヤー構造・DIP・DRY・SRP の全フェーズチェックリスト |
| `domain-impl` | Domain層（Entity、Value Object、Repository Interface、Domain Service）の実装パターン |
| `application-impl` | Application層（UseCase、DTO、Application Service）の実装パターン。Result型によるビジネスフロー制御 |
| `infrastructure-impl` | Infrastructure層の実装パターン。Repository実装・外部API連携・DIP遵守 |
| `presentation-impl` | Presentation層（Server Actions）の実装パターン。FormData処理・バリデーション・リダイレクト |
| `frontend-patterns` | Next.js App Router + shadcn/ui + TailwindCSS v4.2+ でのフロントエンド実装パターン。ドーナツ構造・Server Component優先 |

---

## 2. コーディング規約・品質

| スキル | 説明 |
|--------|------|
| `coding-standards` | コーディング規約の自動適用。`@/` alias必須・命名規約・CSS規約・コメント規約（Why重視） |
| `commit-review` | コミット前のコードレビュー観点とConventional Commits形式を自動適用 |
| `security-review` | IPA「安全なウェブサイトの作り方」第7版 + OWASP Top 10 2021 準拠のセキュリティレビュー |
| `typescript-patterns` | TypeScript 6 の実装パターン。`satisfies`・`const`アサーション・設定オブジェクトの型安全な定義 |
| `file-placement-rules` | UseCase/Entity/Repository/VO のディレクトリ配置ルール。ドメイン名・機能名によるパス規則 |
| `dead-code-detection` | デッドコード検出・削除の判断基準と手順。参照確認方法論・`@deprecated` 管理ワークフロー |
| `deprecated-import-cleanup` | `@deprecated` コメントを含むモジュールの検出と直接 import への書き換え促進 |
| `di-hygiene` | DIコンテナの衛生管理。未使用 `@inject` 検出・`@deprecated` トークン管理・循環依存防止 |
| `magic-number-constants` | UI/ビジネスロジックのマジックナンバーを定数化するルール。ページサイズ・リトライ回数等 |
| `constructor-readonly` | TSyringe `@injectable` クラスのコンストラクタパラメータに `private readonly` を強制 |
| `hook-naming-convention` | React Hooks の命名規則強制。`src/hooks/` 配下のファイルに `use` プレフィックス必須 |

---

## 3. Zodバリデーション

| スキル | 説明 |
|--------|------|
| `zod-error-handling` | Server Action での ZodError をユーザー向けエラーレスポンスに変換するパターン |
| `zod-schema-reuse` | 認証系 Zod スキーマの定義・再利用パターン。Server Action と UseCase でのスキーマ共有 |
| `usecase-input-validation` | UseCase の入力検証パターン。Zodスキーマによる統一的な入力検証と手動 if バリデーション禁止 |
| `usecase-zod-consistency` | 全 UseCase で Zod スキーマによる入力検証を必須化。手書き if バリデーションの排除 |
| `usecase-validation-order` | UseCase の `_execute()` メソッド内での処理順序を強制。「入力バリデーション → 認可 → ビジネスロジック」 |

---

## 4. Result型・エラーハンドリング

| スキル | 説明 |
|--------|------|
| `neverthrow-patterns` | neverthrow による Result/ResultAsync の API と合成パターン。`ok()/err()/andThen()/match()` |
| `resultasync-patterns` | ResultAsync を使った非同期 UseCase の実装パターン。`fromPromise`・`fromSafePromise` の使い分け |
| `error-handling-utils` | Repository・Service 実装時のエラーハンドリングユーティリティ。`toError()`・catch ブロックのログ出力パターン |
| `prisma-error-handling` | Prismaランタイムエラーの共通ハンドリングパターン。`mapPrismaError()` による一元変換 |

---

## 5. React 19・フロントエンド

| スキル | 説明 |
|--------|------|
| `react19-form-patterns` | React 19 の `useTransition` + react-hook-form の共存パターン。Server Actions との連携 |
| `react19-modern-patterns` | React 19 の最新 API。`useFormStatus`・`useOptimistic`・`use()` の活用パターン |
| `form-field-consistency` | フォームフィールドの一貫した実装。`TextFormField` コンポーネントの標準パターン |
| `icon-consistency` | UIアイコン使用の一貫性強制。`lucide-react` を唯一のアイコンソースとして強制 |
| `tailwind-v4-shorthands` | TailwindCSS v4 の TSX ファイルへの Tailwind クラス記述パターン。OKLCH色空間・`@theme inline` 活用 |

---

## 6. テスト

| スキル | 説明 |
|--------|------|
| `test-patterns` | vitest-mock-extended・`setupTestEnvironment`・Result型テストのベストプラクティス |
| `e2e-principles` | E2Eテストの原則と哲学。本末転倒の対応禁止・データのスタンドアロン性の徹底 |
| `test-factory-patterns` | fishery + `@faker-js/faker` による型安全なテストデータファクトリーの実装パターン |
| `test-di-setup` | テストファイルの DIコンテナセットアップを効率化。`registerMockServices()` パターン |
| `test-config-optimization` | テスト設定の最適化。`environmentMatchGlobs` による Node/jsdom 切り替え・グローバル設定統一 |
| `vitest-config-patterns` | `vitest.config.ts` の設定最適化。`clearMocks/resetMocks/restoreMocks` の使い分け |
| `vitest-project-config` | `vitest.config.ts` の `projects` 設定パターン。トップレベル設定との分離・unit/e2e 構成 |

---

## 7. Prisma

| スキル | 説明 |
|--------|------|
| `prisma-v7-patterns` | Prisma v7 固有の機能・設定パターン。Driver Adapters・TypedSQL・`PrismaPg`・N+1対策 |
| `prisma-v7-troubleshooting` | Prisma v7 固有のエラー・移行・互換性問題の解決。`P2002`・Turbopack 互換・v6→v7 移行 |
| `prisma-error-handling` | Prismaランタイムエラーの共通ハンドリングパターン。`mapPrismaError()` による一元変換 |
| `prisma-query-semantics` | Prismaクエリのセマンティクス（意味論的な使い分け）。`findUnique` vs `findFirst` 等 |
| `db-seed-idempotency` | DBシードの冪等性を強制。全 seed 操作で `upsert` を使用し `create/createMany` 禁止 |

---

## 8. Auth.js・認証認可

| スキル | 説明 |
|--------|------|
| `nextauth-v5-setup` | Auth.js v5 の設定構造・初期セットアップ。Credentials Provider・JWT callback・型拡張 |
| `nextauth-v5-patterns` | Auth.js v5 を使った認証チェック・保護パターン。`proxy.ts` での JWT検証・ブルートフォース対策 |
| `authorization` | CASL による RBAC/ABAC の型安全な認可実装パターン。Role enum・Ability定義・Server Action統合 |

---

## 9. ユーティリティ・ライブラリ

| スキル | 説明 |
|--------|------|
| `es-toolkit-basics` | es-toolkit の基本ルール・import 規約・lodash 移行ガイド |
| `es-toolkit-collection` | es-toolkit を使った配列・オブジェクト操作パターン。データ変換・フィルタリング |
| `es-toolkit-function` | es-toolkit の関数ユーティリティ・タイミング制御。`debounce`・`throttle`・`memoize` |
| `date-formatting` | `dfUtils.ts` 経由の日付フォーマット統一。`toLocaleDateString()` 直接使用禁止 |
| `web-crypto-patterns` | Web Crypto API vs `node:crypto` の使い分けガイド。Edge Runtime 対応 |
| `token-generation` | 安全なトークン生成のルールと実装パターン。`Date.now()` プレフィックス禁止・`randomBytes` 推奨 |
| `password-hashing` | Argon2id（OWASP 2026推奨）によるパスワードハッシュ化の標準実装。bcrypt 使用禁止 |
| `env-management` | `@t3-oss/env-nextjs` による環境変数の型安全な管理。`process.env` 直接アクセス禁止 |

---

## 10. ロギング

| スキル | 説明 |
|--------|------|
| `pino-logging` | pino ロガーの使い方と構造化ログパターン。`ILogger` インターフェース経由の DI 注入 |

---

## 11. インフラ・環境

| スキル | 説明 |
|--------|------|
| `dev-environment` | 開発環境の起動・リセット・トラブルシューティング。`make up/clean/dev` の使い分け |
| `portless-hmr-fix` | portless 経由の Next.js devサーバーで WebSocket HMR 接続が失敗する問題の診断と修正 |
| `background-jobs` | バックグラウンドジョブ・非同期処理の実装パターン。Inngest/Trigger.dev・Resend + React Email |

---

## 12. ルーティング

| スキル | 説明 |
|--------|------|
| `typesafe-routing` | Next.js typedRoutes + `routes` 定数による型安全なルーティング。文字列リテラル直書き禁止 |

---

## 13. ナビゲーション・管理

| スキル | 説明 |
|--------|------|
| `skill-navigator` | タスク・ファイル・機能の分類と適切なスキルへのナビゲーション（本スキル） |
| `claude-config-creator` | Claude Code の `.claude` 設定（commands/skills/agents/hooks）を作成・管理 |
| `code-generation` | Hygen コード生成ツール（UseCase/Entity/Repository/Server Action/VO）の対話的ガイド |

---

## スキル成熟度マトリクス（全61スキル）

| スキル | ステータス | カバー範囲 | 優先度 |
|--------|-----------|-----------|--------|
| `skill-navigator` | ✅ 実装済み | 全体ナビゲーション | 🔥 High |
| `best-practices` | ✅ 実装済み | 全レイヤー実装指針 | 🔥 High |
| `test-patterns` | ✅ 実装済み | 全レイヤーテスト | 🔥 High |
| `commit-review` | ✅ 実装済み | コミット品質 | 🔥 High |
| `security-review` | ✅ 実装済み | IPAセキュリティ基準 | 🔥 High |
| `coding-standards` | ✅ 実装済み | コーディング規約 | 🔥 High |
| `presentation-impl` | ✅ 実装済み | Presentation層特化 | 🔥 High |
| `application-impl` | ✅ 実装済み | Application層特化 | 🔥 High |
| `domain-impl` | ✅ 実装済み | Domain層特化 | 🔥 High |
| `infrastructure-impl` | ✅ 実装済み | Infrastructure層 | ⭐ Medium |
| `frontend-patterns` | ✅ 実装済み | Frontend実装 | ⭐ Medium |
| `typescript-patterns` | ✅ 実装済み | TypeScript 6パターン | ⭐ Medium |
| `file-placement-rules` | ✅ 実装済み | ファイル配置規則 | ⭐ Medium |
| `dead-code-detection` | ✅ 実装済み | デッドコード管理 | ⭐ Medium |
| `deprecated-import-cleanup` | ✅ 実装済み | deprecated整理 | ⭐ Medium |
| `di-hygiene` | ✅ 実装済み | DI衛生管理 | ⭐ Medium |
| `magic-number-constants` | ✅ 実装済み | マジックナンバー定数化 | ⭐ Medium |
| `constructor-readonly` | ✅ 実装済み | TSyringe readonly強制 | ⭐ Medium |
| `hook-naming-convention` | ✅ 実装済み | Hooks命名規則 | ⭐ Medium |
| `zod-error-handling` | ✅ 実装済み | ZodErrorレスポンス変換 | ⭐ Medium |
| `zod-schema-reuse` | ✅ 実装済み | Zodスキーマ再利用 | ⭐ Medium |
| `usecase-input-validation` | ✅ 実装済み | UseCase入力検証 | ⭐ Medium |
| `usecase-zod-consistency` | ✅ 実装済み | Zod検証一貫性 | ⭐ Medium |
| `usecase-validation-order` | ✅ 実装済み | UseCase処理順序 | ⭐ Medium |
| `neverthrow-patterns` | ✅ 実装済み | Result/ResultAsync合成 | ⭐ Medium |
| `resultasync-patterns` | ✅ 実装済み | 非同期UseCase実装 | ⭐ Medium |
| `error-handling-utils` | ✅ 実装済み | エラーハンドリングUtil | ⭐ Medium |
| `prisma-error-handling` | ✅ 実装済み | Prismaエラー一元変換 | ⭐ Medium |
| `react19-form-patterns` | ✅ 実装済み | React 19フォームパターン | ⭐ Medium |
| `react19-modern-patterns` | ✅ 実装済み | React 19モダンAPI | ⭐ Medium |
| `form-field-consistency` | ✅ 実装済み | フォームフィールド統一 | ⭐ Medium |
| `icon-consistency` | ✅ 実装済み | lucide-react統一 | ⭐ Medium |
| `tailwind-v4-shorthands` | ✅ 実装済み | Tailwind v4クラス記述 | ⭐ Medium |
| `e2e-principles` | ✅ 実装済み | E2Eテスト原則 | ⭐ Medium |
| `test-factory-patterns` | ✅ 実装済み | faker+fisheryファクトリー | ⭐ Medium |
| `test-di-setup` | ✅ 実装済み | テストDIセットアップ | ⭐ Medium |
| `test-config-optimization` | ✅ 実装済み | テスト設定最適化 | ⭐ Medium |
| `vitest-config-patterns` | ✅ 実装済み | vitest設定パターン | ⭐ Medium |
| `vitest-project-config` | ✅ 実装済み | vitest projects設定 | ⭐ Medium |
| `prisma-v7-patterns` | ✅ 実装済み | Prisma v7パターン | ⭐ Medium |
| `prisma-v7-troubleshooting` | ✅ 実装済み | Prisma v7障害対応 | ⭐ Medium |
| `prisma-query-semantics` | ✅ 実装済み | Prismaクエリ意味論 | ⭐ Medium |
| `db-seed-idempotency` | ✅ 実装済み | DBシード冪等性 | ⭐ Medium |
| `nextauth-v5-setup` | ✅ 実装済み | Auth.js設定 | ⭐ Medium |
| `nextauth-v5-patterns` | ✅ 実装済み | Auth.js認証パターン | ⭐ Medium |
| `authorization` | ✅ 実装済み | CASL RBAC/ABACパターン | ⭐ Medium |
| `es-toolkit-basics` | ✅ 実装済み | es-toolkit基礎 | ⭐ Medium |
| `es-toolkit-collection` | ✅ 実装済み | 配列・オブジェクト操作 | ⭐ Medium |
| `es-toolkit-function` | ✅ 実装済み | debounce/throttle等 | ⭐ Medium |
| `date-formatting` | ✅ 実装済み | 日付フォーマット統一 | ⭐ Medium |
| `web-crypto-patterns` | ✅ 実装済み | Web Crypto API | ⭐ Medium |
| `token-generation` | ✅ 実装済み | 安全なトークン生成 | ⭐ Medium |
| `password-hashing` | ✅ 実装済み | Argon2idハッシュ化 | ⭐ Medium |
| `env-management` | ✅ 実装済み | 型安全な環境変数管理 | ⭐ Medium |
| `pino-logging` | ✅ 実装済み | 構造化ログ・DI注入 | ⭐ Medium |
| `dev-environment` | ✅ 実装済み | 開発環境管理 | ⭐ Medium |
| `portless-hmr-fix` | ✅ 実装済み | portless HMR修正 | ⭐ Medium |
| `background-jobs` | ✅ 実装済み | Inngest/Trigger.devジョブ設計 | ⭐ Medium |
| `typesafe-routing` | ✅ 実装済み | routes定数・typedRoutes | ⭐ Medium |
| `claude-config-creator` | ✅ 実装済み | .claude設定 | ⭐ Medium |
| `code-generation` | ✅ 実装済み | 新規ファイル生成 | ⭐ Medium |

---

## 関連リソース

- **[CLAUDE.md](../../../CLAUDE.md)** — プロジェクト全体の指示
- **[SKILLS-STRATEGY.md](../../SKILLS-STRATEGY.md)** — スキルマップと設計原則
- **[_DOCS/](_DOCS/)** — 詳細ドキュメント
- **[Layer Decision Tree](./layer-decision-tree.md)** — レイヤー判定フローチャート
