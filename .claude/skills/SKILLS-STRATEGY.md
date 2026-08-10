# Skills 戦略

## 原則: コーディングユースケース単位の分離

各Skillは「AIが◯◯を書こうとしたとき」をトリガーとし、そのユースケースに必要なルールを集約する。

## スキルマップ

| AIが書こうとするもの | Primary Skill | Supporting Skills |
|---|---|---|
| UseCase `_execute()` | `application-impl` | `resultasync-patterns`, `usecase-validation-patterns` |
| Server Action | `presentation-impl` | `react19-form-patterns` |
| Repository 実装 | `infrastructure-impl` | `prisma-error-handling`, `prisma-query-semantics` |
| Entity / Value Object | `domain-impl` | `best-practices` |
| テストファイル | `test-patterns` | `test-di-setup`, `test-factory-patterns` |
| フォームコンポーネント | `react19-form-patterns` | `form-field-consistency`, `frontend-patterns` |
| UIアイコン配置 | `frontend-patterns` | `icon-consistency` |
| Prisma クエリ | `prisma-v7-patterns` | `prisma-query-semantics`, `prisma-error-handling` |
| @injectable クラス | `best-practices` | `constructor-readonly`, `di-hygiene` |
| Result/ResultAsync | `neverthrow-patterns` | `resultasync-patterns` |
| 環境変数アクセス | `env-management` | |
| 日付フォーマット | `date-formatting` | |
| コミット準備 | `commit-review` | `coding-standards` |
| セキュリティ確認 | `security-review` | `token-generation`, `password-hashing` |
| 検索・一覧UI（ページネーション） | `frontend-patterns` | `react19-form-patterns` |
| URL state管理 | `frontend-patterns` | `typesafe-routing` |
| ログマスキング実装 | `pino-logging` | `coding-standards` |
| Server Action の Zod エラーレスポンス構築 | `zod-error-handling` | `presentation-impl` |
| 認証系 Zod スキーマの定義・使用 | `zod-schema-reuse` | `zod-error-handling`, `usecase-validation-patterns` |
| TSX ファイルの Tailwind クラス記述 | `tailwind-v4-utilities` | `frontend-patterns`, `icon-consistency` |
| 設定オブジェクト（定数）の型安全な定義 | `typescript-patterns` | `coding-standards` |
| catch ブロックのエラーログ出力 | `prisma-error-handling` | `pino-logging` |
| Server Action フォームHook | `server-action-form-hook` | `react19-form-patterns` |
| 重いUIコンポーネントの遅延ロード | `next-dynamic-import` | `frontend-patterns` |
| 検索・ページネーション一覧画面 | `url-search-pagination` | `frontend-patterns` |
| 見出し/段落のテキスト折り返し | `tailwind-v4-utilities` | `frontend-patterns` |
| error.tsx による Error Boundary | `nextjs-error-boundary` | `frontend-patterns` |
| Zod スキーマ定義（Zod 4 API） | `zod-v4-modern-api` | `usecase-validation-patterns`, `zod-schema-reuse` |
| Server Component データ取得 | `react-cache-dedup` | `frontend-patterns` |
| Repository の読み取り/書き込みエラーパターン選択 | `prisma-error-handling` | `infrastructure-impl` |
| Zod スキーマの定義場所・所有権判断 | `zod-schema-ownership` | `zod-v4-modern-api`, `usecase-validation-patterns`, `zod-schema-reuse` |
| ActionResult エラーコード設計 | `action-error-granularity` | `server-action-result-mapping`, `prisma-error-handling` |
| レートリミット UX（retryAfterMs, カウントダウン） | `rate-limit-ux` | `action-error-granularity`, `security-review` |
| UseCase 一括 DI 登録 | `usecase-batch-registration` | `di-hygiene`, `application-impl` |
| UseCase ログ密度の設計 | `usecase-logging-levels` | `pino-logging`, `application-impl` |
| リクエスト相関ID（トレーシング） | `correlation-id` | `pino-logging`, `security-review` |
| ダークモード OKLCH テーマ実装 | `dark-mode-oklch` | `frontend-patterns`, `tailwind-v4-utilities` |
| useMemo / useCallback にコメントを付ける | `react19-compiler-readiness` | `react19-modern-patterns`, `frontend-patterns` |
| Next.js キャッシュ無効化（revalidateTag 等） | `nextjs-cache-strategy` | `react-cache-dedup`, `frontend-patterns` |
| page.tsx 作成時の loading.tsx 追加 | `loading-boundary-completeness` | `nextjs-error-boundary`, `frontend-patterns` |
| userId / name を UseCase スキーマで定義 | `shared-validation-schemas` | `zod-schema-reuse`, `usecase-validation-patterns` |
| ページネーション定数（DEFAULT_PAGE_SIZE 等） | `pagination-constants` | `magic-number-constants`, `url-search-pagination` |
| 並列データ取得（Promise.all, waterfall回避） | `parallel-data-fetching` | `react-cache-dedup`, `frontend-patterns` |
| Server Component データ設計・フェッチ戦略 | `server-component-data-patterns` | `parallel-data-fetching`, `react-cache-dedup` |
| 楽観的UI更新（useOptimistic） | `optimistic-ui-patterns` | `react19-modern-patterns`, `react19-form-patterns` |
| Prisma トランザクション（$transaction） | `prisma-transactions` | `prisma-v7-patterns`, `prisma-error-handling` |
| shadcn/ui コンポーネントカスタマイズ | `shadcn-component-customization` | `frontend-patterns`, `tailwind-v4-utilities` |
| Suspense / Streaming SSR パターン | `streaming-ssr-patterns` | `parallel-data-fetching`, `nextjs-error-boundary` |
| proxy.ts (middleware) 設計・実装 | `middleware-proxy-patterns` | `nextauth-v5-patterns`, `correlation-id` |
| Next.js Image 最適化 | `image-optimization` | `frontend-patterns` |
| TSX リテラルカラー → 意味論的クラス変換 | `semantic-color-classes` | `dark-mode-oklch`, `tailwind-v4-utilities` |
| クリック可能要素への cursor-pointer 付与 | `cursor-pointer-enforcement` | `frontend-patterns` |
| React import パターン（named import 統一） | `react-import-hygiene` | `coding-standards`, `typescript-patterns` |
| 型エラーを as アサーションで解決しようとしたとき | `type-assertion-safety` | `typescript-patterns`, `coding-standards` |
| Prisma TLS 接続エラー（P1011）の診断・解決 | `prisma-tls-workaround` | `prisma-v7-troubleshooting`, `dev-environment` |
| 日付演算（isPast/addMilliseconds等） | `date-formatting` | `coding-standards` |
| Biome import エラー / レイヤー依存違反 | `biome-layer-enforcement` | `coding-standards` |
| Promise 並列処理（all/allSettled） | `promise-concurrency-patterns` | `parallel-data-fetching` |

## 新規Skill追加の判断基準

### 新規Skillを作成すべき場合

1. **新しいコーディングユースケース**: 既存Skillがカバーしないケース
2. **独立したツール/ライブラリのパターン**: lucide-react, fishery/faker 等
3. **繰り返し発生するミス**: 複数回同じ修正が発生したパターン

### 既存Skillを拡張すべき場合

1. **同一ユースケース内の追加ルール**: UseCase実装時の新ルール → `application-impl`
2. **既存パターンの補足**: ResultAsync の追加禁止パターン → `resultasync-patterns`
3. **クロスカッティングな規約**: readonly強制 → `coding-standards` or 専用Skill

### 判断フローチャート

```
新しいルールが発見された
  ↓
既存Skillのユースケースに属するか？
  → Yes → 既存Skillに追加
  → No  → 新規Skillを作成
        ↓
ルールのスコープは？
  → 特定ファイル/ディレクトリ → 専用Skill
  → プロジェクト横断       → coding-standards に追加
```

## トリガー設計ガイドライン

### description フィールドの書き方

1. **1行目**: Skillの目的を簡潔に記述
2. **2-3行目**: カバーする技術/パターンを列挙
3. **トリガー例**: ユーザー発話、コードパターン、ファイルパスの3カテゴリ

```yaml
description: |
  [目的の1行要約]
  [カバーする技術・パターン]

  トリガー例:
  - 「キーワード1」「キーワード2」        # ユーザー発話
  - pattern.method() を書こうとしたとき    # コードパターン
  - src/layers/xxx/ 配下のファイル編集時    # ファイルパス
```

### 命名規約

- **ケバブケース**: `usecase-input-validation`
- **ユースケースを表す名前**: 何をするときに使うかが名前から分かること
- **略語は避ける**: `di-setup` ではなく `test-di-setup`（テスト用であることを明示）

## Skill間の依存関係ルール

- **Primary → Supporting**: Primary Skill内で Supporting Skill を「詳細は ○○ スキル参照」と相互参照
- **Supporting → Primary**: Supporting Skill内で「このスキルは ○○ の補足」と位置づけを明記
- **循環参照禁止**: A→B→A のような循環は作らない

---

## Skills 設計原則

### 原則1: コーディングユースケース単位の分離

「AIが◯◯を書こうとしたとき」の粒度でSkillを分離する。

| 新Skillを作る | 既存Skillに追記する |
|-------------|-----------------|
| 新しいライブラリ・ツールの導入 | 同じライブラリの追加パターン |
| 独立したコーディング判断が発生 | 既存判断の例外・補足 |
| トリガーワードが明確に異なる | トリガーが重複する |

### 原則2: Skill粒度

- 1スキル = 1-2ページの集中した知識
- チェックリストが10項目を超えたら分割を検討
- 参照リファレンスは `references/` サブディレクトリに分離

### 原則3: Primary / Supporting 関係

- Primary → そのユースケースのメインガイド
- Supporting → 特定の側面を深掘りする専門スキル
- Primary から Supporting へ「詳細は ○○ スキル参照」と明記
- 循環参照禁止（A → B → A は作らない）

### 原則4: トリガー設計

description フィールドに必ず3カテゴリのトリガーを含める:
1. **ユーザー発話トリガー**: 「ZodError」「認証」等のキーワード
2. **コードパターントリガー**: `z.string().min(8` 等の実際のコードパターン
3. **ファイルパストリガー**: `src/app/server-actions/` 等のパス

## トリガー品質ガイドライン

### globs フィールドの推奨

ファイルパスベースの自動起動は最も信頼性が高い。新規スキル作成時は必ず `globs:` を設定すること。

### 避けるべきトリガー

- 「TSXファイルを編集するとき」のような広すぎるトリガー → 具体的なパターンに変更
- 「src/layers/ 配下のファイルを編集するとき」 → レイヤー固有のスキルに委譲

### 推奨トリガー設計

1. **globs**: ファイルパスパターン（最優先）
2. **キーワード**: 具体的なAPI名やパターン名（「useOptimistic」「$transaction」等）
3. **タスク記述**: ユーザーの意図に基づくトリガー（「楽観的更新」「トランザクション」等）

---

### 将来のSkillsロードマップ

| 時期 | スキル名 | ユースケース |
|------|---------|------------|
| ✅ 実装済み | `url-search-pagination` | ページネーションUI実装（`pagination-patterns` に相当） |
| ✅ 実装済み | `nextjs-error-boundary` | error.tsx, loading.tsx 設計（`error-boundary-patterns` に相当） |
| ✅ 実装済み | `next-dynamic-import` | 重いUIコンポーネントの遅延ロード |
| ✅ 実装済み | `server-action-form-hook` | useServerAction Hook によるフォーム実装 |
| ✅ 実装済み | `tailwind-v4-text-utilities` | text-balance / text-pretty テキスト折り返し |
| ✅ 実装済み | `zod-v4-modern-api` | Zod 4 ネイティブ API（top-level validators, z.pipe()） |
| ✅ 実装済み | `react-cache-dedup` | Server Component データ取得デデュプリケーション |
| ✅ 実装済み | `repository-error-patterns` | repositoryOperation vs manual try-catch の使い分け |
| ✅ 実装済み | `zod-schema-ownership` | Zod スキーマの所有権ルール |
| ✅ 実装済み | `action-error-granularity` | ActionResult エラーコード分類 |
| ✅ 実装済み | `rate-limit-ux` | retryAfterMs のクライアント公開パターン |
| ✅ 実装済み | `usecase-batch-registration` | batchRegister() ヘルパーによる一括登録 |
| ✅ 実装済み | `usecase-logging-levels` | UseCase カテゴリ別ログ密度ガイドライン |
| ✅ 実装済み | `correlation-id` | x-request-id によるリクエストトレーシング |
| ✅ 実装済み | `dark-mode-oklch` | OKLCH ダークモードテーマ実装 |
| ✅ 実装済み | `nextjs-cache-strategy` | revalidateTag 統一キャッシュ無効化戦略 |
| ✅ 実装済み | `parallel-data-fetching` | Promise.all, Suspense, waterfall回避 |
| ✅ 実装済み | `server-component-data-patterns` | Server Component データ設計・フェッチ戦略 |
| ✅ 実装済み | `optimistic-ui-patterns` | useOptimistic による楽観的UI更新 |
| ✅ 実装済み | `prisma-transactions` | $transaction による複合操作 |
| ✅ 実装済み | `shadcn-component-customization` | shadcn/ui コンポーネントカスタマイズ |
| ✅ 実装済み | `streaming-ssr-patterns` | Suspense / Streaming SSR パターン |
| ✅ 実装済み | `middleware-proxy-patterns` | proxy.ts (middleware) 設計・実装 |
| ✅ 実装済み | `image-optimization` | Next.js Image 最適化 |
| ✅ 実装済み | `semantic-color-classes` | リテラルカラー → 意味論的クラス（ダークモード対応） |
| ✅ 実装済み | `cursor-pointer-enforcement` | クリック可能要素への cursor-pointer 明示 |
| ✅ 実装済み | `react-import-hygiene` | React named import 統一・namespace import 禁止 |
| ✅ 実装済み | `type-assertion-safety` | 型アサーション安全化・satisfies/型ガード優先 |
| ✅ 実装済み | `prisma-tls-workaround` | Prisma TLS 接続エラー（P1011）— Traefik TCP 環境の sslmode 設定 |
| ✅ 実装済み | `biome-layer-enforcement` | Biome noRestrictedImports によるレイヤー依存制御 |
| ✅ 実装済み | `promise-concurrency-patterns` | Promise.all / allSettled / ResultAsync.combine 使い分け |
| 長期 | `realtime-patterns` | SSE, WebSocket |
| 長期 | `i18n-patterns` | 多言語対応 |
| 長期 | `observability-patterns` | OpenTelemetry, Sentry |
