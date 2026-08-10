# よくある問題と解決策 🔧

開発中に遭遇する一般的な問題の効率的な解決方法

---

## 🎯 問題解決アプローチ

### 問題分類と対処方針

```mermaid
graph TB
    subgraph "🔍 問題の種類"
        SYNTAX[構文エラー]
        TYPE[型エラー]
        RUNTIME[実行時エラー]
        LOGIC[ロジックエラー]
        CONFIG[設定エラー]
    end

    subgraph "⚡ 解決手順"
        IDENTIFY[問題特定]
        ISOLATE[原因分離]
        RESOLVE[解決実施]
        VERIFY[検証]
    end

    subgraph "🛠️ 支援ツール"
        DEBUGGER[デバッガー]
        LOGGING[ログ出力]
        TESTING[テスト実行]
        DOCS[ドキュメント]
    end

    SYNTAX --> IDENTIFY
    TYPE --> ISOLATE
    RUNTIME --> RESOLVE
    LOGIC --> VERIFY

    IDENTIFY --> DEBUGGER
    ISOLATE --> LOGGING
    RESOLVE --> TESTING
    VERIFY --> DOCS

    style IDENTIFY fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style DEBUGGER fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### トラブルシューティング手順

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant ERROR as Error Message
    participant LOG as Logs
    participant TEST as Tests
    participant DOC as Documentation
    participant SOLUTION as Solution

    DEV->>ERROR: 問題発生を認識
    ERROR->>LOG: ログ・エラー詳細確認
    LOG->>TEST: 関連テスト実行
    TEST->>DOC: ドキュメント参照
    DOC->>SOLUTION: 解決策適用
    SOLUTION->>DEV: 問題解決確認
```

---

## 💉 依存性注入 (DI) 関連問題

### 🔄 循環依存エラー

**症状：**

```
ReferenceError: Cannot access 'applicationContainer' before initialization
```

**原因分析：**

```mermaid
graph TB
    subgraph "❌ 問題のパターン"
        A[ServiceA] -->|@inject| B[ServiceB]
        B -->|"resolve関数"| A
        C[循環依存発生]
    end

    subgraph "✅ 解決パターン"
        A1[ServiceA] -->|@inject| IFACE[Interface]
        B1[ServiceB] -->|implements| IFACE
        D[依存方向の統一]
    end

    style A fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style B fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決手順：**

1. **問題箇所の特定**

   - サービス層で `resolve()` 関数を使用していないか確認
   - DIコンテナの初期化順序を確認

2. **修正方法**

   - サービス層では `@inject()` コンストラクター注入を使用
   - `resolve()` はPresentation層でのみ使用

3. **検証**
   - アプリケーション起動確認
   - テスト実行確認

### 🔍 依存関係解決エラー

**症状：**

```
Error: Cannot resolve dependency 'ServiceName'
```

**解決チェックリスト：**

```mermaid
graph LR
    subgraph "✅ 確認項目"
        TOKEN[Token定義確認]
        IMPORT[Import文確認]
        REGISTER[Container登録確認]
        TYPE[TypeMap定義確認]
    end

    subgraph "🔧 修正箇所"
        TOKENS_TS[tokens.ts]
        CONTAINER_TS[container.ts]
        SERVICE_TS[service.ts]
    end

    TOKEN --> TOKENS_TS
    IMPORT --> TOKENS_TS
    REGISTER --> CONTAINER_TS
    TYPE --> SERVICE_TS

    style TOKEN fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style TOKENS_TS fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

**修正手順：**

1. `tokens.ts` でトークン定義を確認
2. `ServiceTypeMap` に型定義を追加
3. 適切なコンテナファイルに登録
4. `@injectable()` デコレータ確認

---

## 🧪 テスト関連問題

### 🎭 vitest-mock-extended 設定問題

**症状：**

```typescript
TypeError: mock<IService> is not a function
```

**解決手順：**

```mermaid
graph TB
    subgraph "📦 インストール確認"
        INSTALL[pnpm add -D vitest-mock-extended]
        VERSION[バージョン確認]
        DEPENDENCY[依存関係確認]
    end

    subgraph "⚙️ 設定確認"
        SETUP[setup.ts設定]
        CONFIG[vitest.config.ts]
        TYPES[型定義確認]
    end

    subgraph "🔧 修正実施"
        REIMPORT[再インポート]
        RESTART[サーバー再起動]
        CACHE[キャッシュクリア]
    end

    INSTALL --> SETUP
    VERSION --> CONFIG
    DEPENDENCY --> TYPES

    SETUP --> REIMPORT
    CONFIG --> RESTART
    TYPES --> CACHE
```

1. **インストール確認**

   ```bash
   pnpm add -D vitest-mock-extended
   ```

2. **import文確認**

   ```typescript
   import { mock, MockProxy } from 'vitest-mock-extended';
   ```

3. **型定義確認**

   ```typescript
   const mockService: MockProxy<IService> = mock<IService>();
   ```

### 🧪 テスト独立性問題

**症状：**

```
Tests are interfering with each other
```

**解決パターン：**

```mermaid
graph LR
    subgraph "❌ 問題"
        SHARED[共有状態]
        LEAK[状態リーク]
        DEPENDENCY[テスト間依存]
    end

    subgraph "✅ 解決"
        ISOLATION[分離設計]
        CLEANUP[クリーンアップ]
        INDEPENDENT[独立実行]
    end

    SHARED --> ISOLATION
    LEAK --> CLEANUP
    DEPENDENCY --> INDEPENDENT

    style SHARED fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style ISOLATION fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**修正方法：**

1. **`setupTestEnvironment()` 使用**

   ```typescript
   import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

   describe('TestSuite', () => {
    setupTestEnvironment(); // DIコンテナリセット
   });
   ```

2. **beforeEach でのクリーンアップ**

   ```typescript
   beforeEach(() => {
    container.clearInstances();
   });
   ```

---

## 📝 TypeScript関連問題

### 🔍 型エラー

**よくある型エラーと解決策：**

```mermaid
graph TB
    subgraph "❌ よくある型エラー"
        ANY[any型使用]
        UNDEFINED[undefined可能性]
        GENERIC[Generic型問題]
        IMPORT[Import型問題]
    end

    subgraph "✅ 解決策"
        STRICT[厳密型付け]
        GUARD[型ガード]
        EXPLICIT[明示的型指定]
        PROPER[適切なimport]
    end

    ANY --> STRICT
    UNDEFINED --> GUARD
    GENERIC --> EXPLICIT
    IMPORT --> PROPER

    style ANY fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style STRICT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決例：**

1. **any型の削除**

   ```typescript
   // ❌ 悪い例
   const result: any = await useCase.execute(input);

   // ✅ 良い例
   const result: Result<CreateUserResponse, AppError> = await useCase.execute(input);
   ```

2. **undefined チェック**

   ```typescript
   // ❌ 悪い例
   user.name.toLowerCase(); // userがundefinedの可能性

   // ✅ 良い例（public readonlyで直接アクセス）
   if (user) {
    user.name.toLowerCase();
   }
   ```

### 🔧 Import/Export 問題

**症状：**

```
Module not found or Cannot find module
```

**解決チェックリスト：**

| 問題              | 確認項目                       | 修正方法             |
| ----------------- | ------------------------------ | -------------------- |
| **相対パス使用**  | `../`, `./` を使用していないか | `@/*` エイリアス使用 |
| **index.ts 参照** | `@/components/ui` 形式の参照   | 個別import使用       |
| **拡張子問題**    | `.ts`, `.tsx` 拡張子           | 自動解決設定確認     |
| **大文字小文字**  | ファイル名の大文字小文字       | 正確なファイル名使用 |

---

## 🎨 フロントエンド関連問題

### 🔄 Server Actions エラー

**症状：**

```
Error: Functions cannot be passed directly to Client Components
```

**解決パターン：**

```mermaid
graph TB
    subgraph "❌ 問題のパターン"
        CLIENT[Client Component]
        FUNCTION[Server Function直接渡し]
        ERROR[Serialization Error]
    end

    subgraph "✅ 解決パターン"
        ACTION[Server Action]
        FORM[Form Action]
        PROPER[適切な呼び出し]
    end

    CLIENT --> ACTION
    FUNCTION --> FORM
    ERROR --> PROPER

    style CLIENT fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style ACTION fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**修正方法：**

1. **Server Action として定義**

   ```typescript
   'use server';
   export async function createUser(formData: FormData) {
    // Server Action実装
   }
   ```

2. **Form action として使用**

   ```typescript
   <form action={createUser}>
     {/* form content */}
   </form>
   ```

### 🎨 Styling 問題

**よくある問題：**

```mermaid
graph LR
    subgraph "🎨 CSS問題"
        OVERRIDE[スタイル競合]
        SPECIFICITY[優先度問題]
        RESPONSIVE[レスポンシブ問題]
    end

    subgraph "🔧 解決手法"
        UTILITY[Utility Class]
        IMPORTANT[!important回避]
        MOBILE_FIRST[Mobile First]
    end

    OVERRIDE --> UTILITY
    SPECIFICITY --> IMPORTANT
    RESPONSIVE --> MOBILE_FIRST

    style OVERRIDE fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style UTILITY fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決例：**

1. **TailwindCSS v4.2+ 活用**

   ```typescript
   // ✅ 推奨: Utility Classes
   className = 'bg-primary hover:bg-primary-hover';

   // ❌ 避ける: カスタムCSS
   className = 'custom-button-style';
   ```

2. **テーマ変数使用**

   ```typescript
   // ✅ テーマ統一
   className = 'bg-[var(--primary)] text-[var(--text-inverse)]';
   ```

---

## 🏗️ ビルド・実行時問題

### 🚀 Next.js ビルドエラー

**よくあるエラーと解決策：**

```mermaid
graph TB
    subgraph "⚠️ ビルドエラー"
        MEMORY[メモリ不足]
        IMPORT[Import循環]
        TYPE[型エラー]
        ENV[環境変数]
    end

    subgraph "🔧 解決方法"
        HEAP[ヒープサイズ増加]
        RESTRUCTURE[構造リファクタ]
        STRICT[厳密チェック]
        CONFIG[設定確認]
    end

    MEMORY --> HEAP
    IMPORT --> RESTRUCTURE
    TYPE --> STRICT
    ENV --> CONFIG

    style MEMORY fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style HEAP fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決手順：**

1. **メモリ不足の解決**

   ```bash
   # ヒープサイズ増加
   NODE_OPTIONS="--max-old-space-size=4096" pnpm build
   ```

2. **Import循環の解決**

   - 依存関係グラフの確認
   - インターフェース分離

3. **型エラーの解決**

   ```bash
   # 型チェック実行
   pnpm type-check
   ```

### 🗄️ Database 関連問題

**Prisma関連エラー：**

```mermaid
graph LR
    subgraph "🗄️ DB問題"
        MIGRATION[マイグレーション]
        SCHEMA[スキーマ同期]
        CONNECTION[接続エラー]
    end

    subgraph "🔧 解決手順"
        RESET[DB リセット]
        GENERATE[コード生成]
        ENV_CHECK[環境確認]
    end

    MIGRATION --> RESET
    SCHEMA --> GENERATE
    CONNECTION --> ENV_CHECK

    style MIGRATION fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style RESET fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決コマンド：**

```bash
# Prisma関連問題の解決
pnpm db:generate    # Prismaクライアント再生成
pnpm db:push        # スキーマプッシュ
pnpm db:migrate:dev # 開発用マイグレーション
```

---

## 🔒 セキュリティ関連問題

### 🛡️ 認証・認可エラー

**NextAuth.js関連問題：**

```mermaid
graph TB
    subgraph "🔐 認証問題"
        SECRET[AUTH_SECRET]
        SESSION[セッション管理]
        PROVIDER[プロバイダー設定]
    end

    subgraph "🔧 確認項目"
        ENV_VAR[環境変数確認]
        CONFIG[設定ファイル]
        CALLBACK[コールバックURL]
    end

    SECRET --> ENV_VAR
    SESSION --> CONFIG
    PROVIDER --> CALLBACK

    style SECRET fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style ENV_VAR fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**解決チェックリスト：**

1. **環境変数確認**

   ```bash
   # .env.local ファイル確認
   AUTH_SECRET="your-secret-key"
   AUTH_URL="http://localhost:3000"
   ```

2. **設定ファイル確認**
   - NextAuth設定の確認
   - プロバイダー設定の確認

### 🔍 ログ・エラー情報の取得

**デバッグ情報収集：**

```mermaid
graph LR
    subgraph "📊 情報収集"
        CONSOLE[コンソールログ]
        NETWORK[ネットワークタブ]
        ERROR[エラーメッセージ]
    end

    subgraph "🔍 分析手法"
        PATTERN[パターン分析]
        TIMING[タイミング分析]
        CONTEXT[コンテキスト分析]
    end

    CONSOLE --> PATTERN
    NETWORK --> TIMING
    ERROR --> CONTEXT

    style CONSOLE fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style PATTERN fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 📋 問題解決チェックリスト

### 🔍 基本診断手順

```mermaid
graph TB
    subgraph "1️⃣ 情報収集"
        ERROR_MSG[エラーメッセージ確認]
        LOGS[ログ出力確認]
        REPRODUCE[再現手順確認]
    end

    subgraph "2️⃣ 原因分析"
        ISOLATE[問題切り分け]
        MINIMAL[最小再現例作成]
        DOCS[ドキュメント確認]
    end

    subgraph "3️⃣ 解決・検証"
        FIX[修正実施]
        TEST[テスト実行]
        VALIDATE[動作確認]
    end

    ERROR_MSG --> ISOLATE
    LOGS --> MINIMAL
    REPRODUCE --> DOCS

    ISOLATE --> FIX
    MINIMAL --> TEST
    DOCS --> VALIDATE
```

### ✅ 解決後の確認事項

| 確認項目       | 実施内容           | 合格基準           |
| -------------- | ------------------ | ------------------ |
| **機能動作**   | 修正箇所の動作確認 | 期待通りに動作     |
| **回帰テスト** | 関連機能の動作確認 | 既存機能に影響なし |
| **テスト実行** | 自動テスト実行     | 全テスト通過       |
| **ビルド確認** | 本番ビルド実行     | エラーなく完了     |
| **コード品質** | Lint・型チェック   | エラーなし         |

---

## 🚨 緊急事態対応

### 🔥 本番環境問題

**対応プライオリティ：**

```mermaid
graph TB
    subgraph "🚨 Critical (即座対応)"
        SYSTEM_DOWN[システム停止]
        DATA_LOSS[データ損失]
        SECURITY[セキュリティ侵害]
    end

    subgraph "⚠️ High (1時間以内)"
        FEATURE_BROKEN[主要機能停止]
        PERFORMANCE[重大パフォーマンス劣化]
        AUTH_ISSUE[認証問題]
    end

    subgraph "📝 Medium (24時間以内)"
        UI_ISSUE[UI表示問題]
        MINOR_BUG[軽微なバグ]
        ENHANCEMENT[機能改善]
    end

    style SYSTEM_DOWN fill:#dc2626,stroke:#b91c1c,stroke-width:3px,color:#ffffff
    style FEATURE_BROKEN fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff
    style UI_ISSUE fill:#6b7280,stroke:#374151,stroke-width:1px,color:#ffffff
```

### 🛠️ 緊急対応手順

1. **影響範囲の確認**
2. **一時的な回避策の実施**
3. **根本原因の調査**
4. **恒久的な修正の実施**
5. **再発防止策の検討**

---

## 🔗 関連ドキュメント

### 問題別詳細ガイド

- **[Prismaモック設定](development/prisma-mock-setup.md)** - Prismaテストのトラブルシューティング
- **[vitest-mock-extended設定](development/vitest-mock-extended-setup.md)** - 自動モックのセットアップ
- **[Emailバリデーション](development/email-validation-issues.md)** - Email検証問題の解決
- **[Entity比較問題](development/entity-timestamp-comparison.md)** - タイムスタンプ比較問題

### 開発・設定

- **[開発フロー](../guides/development/workflow.md)** - 正しい開発手順
- **[依存性注入](../architecture/patterns/dependency-injection.md)** - DI設定ガイド
- **[コマンドリファレンス](../reference/commands.md)** - 実行コマンド一覧

### 品質保証

- **[テスト戦略](../testing/strategy.md)** - 包括的テスト手法
- **[コーディング規約](../guides/standards/coding.md)** - 実装標準
- **[アーキテクチャ原則](../architecture/principles.md)** - 設計思想

---

**🔧 適切な問題解決により、安定した開発体験を維持しましょう！**
