# 開発フロー 🔄

効率的で品質の高い機能開発のための実践的ワークフロー

---

## 📖 このドキュメントについて

### 🎯 対象読者と利用タイミング

- **新規開発者** - 開発手順の習得時
- **既存メンバー** - 新機能開発の標準手順確認時
- **チームリード** - 品質基準とプロセス確認時

### 📚 前提知識

- **必須**: [アーキテクチャ概要](../../architecture/overview.md) 読了
- **推奨**: [環境セットアップ](../setup.md) 完了
- **参考**: [設計原則](../../architecture/principles.md) | [テスト戦略](../../testing/strategy.md)

### 📍 このドキュメントの使い方

```mermaid
graph LR
    subgraph "🚀 初回（45分）"
        A1[全体フロー理解] --> A2[各Phase詳細確認] --> A3[ツール・コマンド習得]
    end

    subgraph "🔄 日常利用（5-10分）"
        B1[該当Phase確認] --> B2[チェックリスト実行] --> B3[品質基準確認]
    end

    subgraph "🔍 問題解決"
        C1[問題Phase特定] --> C2[トラブルシューティング] --> C3[改善実施]
    end

    A3 --> B1
    B3 --> C1

    style A1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B1 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style C1 fill:#dc2626,stroke:#ef4444,stroke-width:2px,color:#ffffff
```

### 🔗 関連ドキュメントとの関係

- **前提**: [最初の機能実装](first-feature.md) - 基本的な実装体験
- **詳細**: [UseCase実装](usecase.md) | [Domain実装](domain.md) | [Repository実装](repository.md)
- **品質**: [テスト戦略](../../testing/strategy.md) | [コーディング規約](../standards/coding.md)
- **問題解決**: [よくある問題](../../troubleshooting/common-issues.md)

---

## 🚀 開発フロー概要

### 標準開発サイクル

```mermaid
graph TB
    subgraph "📋 計画・設計"
        PLAN[要件分析]
        DESIGN[設計検討]
        ARCH[アーキテクチャ確認]
    end

    subgraph "⚡ 実装"
        UC[UseCase実装]
        DOMAIN[Domain実装]
        REPO[Repository実装]
        UI[UI実装]
    end

    subgraph "🧪 品質保証"
        UNIT[Unit Test]
        INTEGRATION[Integration Test]
        E2E[E2E Test]
    end

    subgraph "🚢 デプロイ"
        REVIEW[Code Review]
        CI[CI/CD Pipeline]
        DEPLOY[Production Deploy]
    end

    PLAN --> UC
    DESIGN --> DOMAIN
    ARCH --> REPO

    UC --> UNIT
    DOMAIN --> INTEGRATION
    REPO --> E2E
    UI --> UNIT

    UNIT --> REVIEW
    INTEGRATION --> CI
    E2E --> DEPLOY

    style UC fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style UNIT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style REVIEW fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

### 開発原則

```mermaid
graph LR
    subgraph "🎯 品質原則"
        TDD[Test Driven Development]
        CLEAN[Clean Code]
        REFACTOR[Continuous Refactoring]
    end

    subgraph "🏗️ アーキテクチャ原則"
        LAYER[Layer Separation]
        DI[Dependency Injection]
        RESULT[Result Pattern]
    end

    subgraph "🔄 プロセス原則"
        SMALL[Small Iterations]
        FEEDBACK[Fast Feedback]
        CONTINUOUS[Continuous Integration]
    end

    TDD --> LAYER
    CLEAN --> DI
    REFACTOR --> RESULT

    LAYER --> SMALL
    DI --> FEEDBACK
    RESULT --> CONTINUOUS
```

---

## 📋 新機能開発プロセス

### Phase 1: 計画・設計

```mermaid
sequenceDiagram
    participant PM as Product Manager
    participant DEV as Developer
    participant ARCH as Architect
    participant DOC as Documentation

    PM->>DEV: 機能要件定義
    DEV->>ARCH: アーキテクチャ相談
    ARCH->>DEV: 設計ガイダンス
    DEV->>DOC: 設計ドキュメント確認
    DOC->>DEV: 実装パターン提供
    DEV->>DEV: 実装計画策定
```

**実施内容：**

- 要件分析とビジネス価値の確認
- 既存アーキテクチャへの適合性検討
- レイヤー責務の明確化
- 必要なインターフェース設計

### Phase 2: ドメイン設計

```mermaid
graph TB
    subgraph "👑 Domain Layer設計"
        ENTITY[Entity設計]
        VO[Value Object設計]
        DS[Domain Service設計]
        RULE[Business Rule定義]
    end

    subgraph "🎯 設計考慮点"
        INVARIANT[不変条件]
        VALIDATION[バリデーション]
        ENCAPSULATION[カプセル化]
    end

    ENTITY --> INVARIANT
    VO --> VALIDATION
    DS --> ENCAPSULATION
    RULE --> INVARIANT

    style ENTITY fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style INVARIANT fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### Phase 3: アプリケーション層実装

```mermaid
graph TB
    subgraph "📋 Application Layer実装順序"
        INTERFACE[Repository Interface定義]
        DTO[DTO設計]
        USECASE[UseCase実装]
        INTEGRATION[統合テスト]
    end

    subgraph "🎯 実装パターン"
        RESULT_TYPE[Result型パターン]
        DI_PATTERN[DI パターン]
        TRANSACTION[Transaction管理]
    end

    INTERFACE --> RESULT_TYPE
    DTO --> DI_PATTERN
    USECASE --> TRANSACTION
    INTEGRATION --> RESULT_TYPE

    style USECASE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style RESULT_TYPE fill:#f3e8ff,stroke:#8b5cf6,stroke-width:1px,color:#7c3aed
```

---

## 🛠️ 実装手順詳細

### 1. UseCase First開発

```mermaid
graph LR
    subgraph "🎯 UseCase設計"
        SCENARIO[シナリオ定義]
        INPUT[Input DTO]
        OUTPUT[Output DTO]
        FLOW[Business Flow]
    end

    subgraph "🧪 Test First"
        HAPPY[Happy Path Test]
        ERROR[Error Case Test]
        EDGE[Edge Case Test]
    end

    subgraph "⚡ 実装"
        IMPLEMENT[UseCase実装]
        REFACTOR[リファクタリング]
        OPTIMIZE[最適化]
    end

    SCENARIO --> HAPPY
    INPUT --> ERROR
    OUTPUT --> EDGE
    FLOW --> IMPLEMENT

    HAPPY --> IMPLEMENT
    ERROR --> REFACTOR
    EDGE --> OPTIMIZE
```

**実装ステップ：**

1. **シナリオ定義**

   - ユーザーストーリーからUseCaseを抽出
   - 成功パスと失敗パスの明確化

2. **テスト作成**

   - Result型パターンでのテスト実装
   - 包括的エラーケースの網羅

3. **UseCase実装**
   - Result型戻り値での統一
   - 適切な依存性注入

### 2. Domain Object実装

```mermaid
graph TB
    subgraph "👑 Domain設計パターン"
        ENTITY_DESIGN[Entity設計]
        VO_DESIGN[Value Object設計]
        SERVICE_DESIGN[Domain Service設計]
    end

    subgraph "🎯 実装方針"
        PURE[Pure TypeScript]
        IMMUTABLE[Immutable Design]
        ENCAPSULATION[Encapsulation]
    end

    subgraph "🧪 テスト戦略"
        UNIT_TEST[Unit Test]
        PROPERTY_TEST[Property Test]
        BEHAVIOR_TEST[Behavior Test]
    end

    ENTITY_DESIGN --> PURE
    VO_DESIGN --> IMMUTABLE
    SERVICE_DESIGN --> ENCAPSULATION

    PURE --> UNIT_TEST
    IMMUTABLE --> PROPERTY_TEST
    ENCAPSULATION --> BEHAVIOR_TEST
```

### 3. Infrastructure実装

```mermaid
graph LR
    subgraph "🔧 Infrastructure実装"
        REPO_IMPL[Repository実装]
        EXT_SERVICE[External Service]
        CONFIG[Configuration]
    end

    subgraph "🎯 実装パターン"
        INTERFACE_IMPL[Interface実装]
        ERROR_HANDLE[Error Handling]
        LOGGING[Logging]
    end

    subgraph "🧪 テスト手法"
        MOCK[Mock Testing]
        INTEGRATION[Integration Testing]
        CONTRACT[Contract Testing]
    end

    REPO_IMPL --> INTERFACE_IMPL
    EXT_SERVICE --> ERROR_HANDLE
    CONFIG --> LOGGING

    INTERFACE_IMPL --> MOCK
    ERROR_HANDLE --> INTEGRATION
    LOGGING --> CONTRACT
```

---

## 🧪 品質保証プロセス

### テスト駆動開発 (TDD)

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant TEST as Test
    participant CODE as Implementation
    participant REFACTOR as Refactoring

    loop TDD Cycle
        DEV->>TEST: 🔴 Write Failing Test
        TEST->>CODE: 🟢 Make Test Pass
        CODE->>REFACTOR: 🔵 Refactor Code
        REFACTOR->>TEST: Verify Tests Still Pass
    end
```

### 品質チェックポイント

```mermaid
graph TB
    subgraph "📊 自動品質チェック"
        LINT[ESLint Check]
        TYPE[TypeScript Check]
        FORMAT[Prettier Format]
        TEST[Test Execution]
    end

    subgraph "🎯 品質基準"
        COVERAGE[Coverage ≥ 94%]
        COMPLEXITY[Low Complexity]
        SECURITY[Security Scan]
    end

    subgraph "✅ 合格条件"
        ALL_PASS[All Tests Pass]
        NO_LINT[No Lint Errors]
        TYPE_SAFE[Type Safe]
    end

    LINT --> NO_LINT
    TYPE --> TYPE_SAFE
    TEST --> ALL_PASS
    COVERAGE --> ALL_PASS

    style ALL_PASS fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style NO_LINT fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style TYPE_SAFE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 🔧 DI設定プロセス

### 新しいサービス追加フロー

```mermaid
graph TB
    subgraph "1️⃣ Interface定義"
        INTERFACE[Interface作成]
        CONTRACT[契約定義]
        DOC[Documentation]
    end

    subgraph "2️⃣ 実装作成"
        IMPLEMENT[Implementation作成]
        INJECTABLE[Injectable Decorator]
        DEPENDENCIES[Dependencies注入]
    end

    subgraph "3️⃣ DI登録"
        TOKEN[Token定義]
        TYPE_MAP[Type Map追加]
        CONTAINER[Container登録]
    end

    subgraph "4️⃣ テスト作成"
        MOCK[Mock作成]
        UNIT_TEST[Unit Test]
        INTEGRATION_TEST[Integration Test]
    end

    INTERFACE --> IMPLEMENT
    CONTRACT --> INJECTABLE
    DOC --> DEPENDENCIES

    IMPLEMENT --> TOKEN
    INJECTABLE --> TYPE_MAP
    DEPENDENCIES --> CONTAINER

    TOKEN --> MOCK
    TYPE_MAP --> UNIT_TEST
    CONTAINER --> INTEGRATION_TEST
```

### DI設定チェックリスト

```mermaid
graph LR
    subgraph "✅ 必須確認事項"
        TOKEN_DEF[Token定義済み]
        TYPE_MAP[TypeMap追加済み]
        CONTAINER_REG[Container登録済み]
        INJECTABLE[Injectable追加済み]
    end

    subgraph "🔍 品質確認"
        NO_CIRCULAR[循環依存なし]
        TYPE_SAFE[型安全性確認]
        TEST_PASS[テスト通過]
    end

    TOKEN_DEF --> NO_CIRCULAR
    TYPE_MAP --> TYPE_SAFE
    CONTAINER_REG --> TEST_PASS
    INJECTABLE --> NO_CIRCULAR

    style TOKEN_DEF fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style NO_CIRCULAR fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 🎨 UI実装プロセス

### Server-First開発

```mermaid
graph TB
    subgraph "🎨 UI実装優先順位"
        RSC[React Server Components]
        SA[Server Actions]
        CLIENT[Client Components (最小限)]
    end

    subgraph "🔄 実装パターン"
        FORM[Form Handling]
        STATE[State Management]
        ERROR[Error Display]
    end

    subgraph "🧪 テスト戦略"
        COMPONENT[Component Test]
        E2E[E2E Test]
        ACCESSIBILITY[Accessibility Test]
    end

    RSC --> FORM
    SA --> STATE
    CLIENT --> ERROR

    FORM --> COMPONENT
    STATE --> E2E
    ERROR --> ACCESSIBILITY

    style RSC fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style COMPONENT fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### Enhanced Components活用

```mermaid
graph LR
    subgraph "🧩 Component選択"
        BRIDGE[Bridge System]
        ENHANCED[Enhanced Components]
        STANDARD[Standard shadcn/ui]
    end

    subgraph "🎯 機能統合"
        EXISTING[既存機能活用]
        NEW[新機能追加]
        MIGRATION[段階的移行]
    end

    BRIDGE --> EXISTING
    ENHANCED --> NEW
    STANDARD --> MIGRATION

    style BRIDGE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style EXISTING fill:#f3e8ff,stroke:#8b5cf6,stroke-width:1px,color:#7c3aed
```

---

## 📊 コード品質管理

### 継続的品質改善

```mermaid
graph TB
    subgraph "📈 メトリクス監視"
        COVERAGE[Test Coverage]
        COMPLEXITY[Code Complexity]
        DEBT[Technical Debt]
    end

    subgraph "🔍 品質分析"
        HOTSPOT[Quality Hotspots]
        TREND[Quality Trends]
        RISK[Risk Assessment]
    end

    subgraph "⚡ 改善アクション"
        REFACTOR[Refactoring]
        TEST_ADD[Test Addition]
        ARCHITECTURE[Architecture Improvement]
    end

    COVERAGE --> HOTSPOT
    COMPLEXITY --> TREND
    DEBT --> RISK

    HOTSPOT --> REFACTOR
    TREND --> TEST_ADD
    RISK --> ARCHITECTURE
```

### コードレビュープロセス

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant PR as Pull Request
    participant REVIEWER as Reviewer
    participant CI as CI Pipeline
    participant MERGE as Merge

    DEV->>PR: Create Pull Request
    PR->>CI: Trigger Automated Checks
    CI->>PR: Report Results
    PR->>REVIEWER: Request Review
    REVIEWER->>PR: Provide Feedback
    PR->>DEV: Address Feedback
    DEV->>PR: Update Changes
    REVIEWER->>MERGE: Approve
    MERGE->>CI: Final Validation
    CI->>MERGE: Deploy
```

---

## 🚀 デプロイメントフロー

### CI/CD パイプライン

```mermaid
graph LR
    subgraph "🔄 Continuous Integration"
        BUILD[Build]
        TEST[Test]
        QUALITY[Quality Gate]
    end

    subgraph "🚢 Continuous Deployment"
        STAGING[Staging Deploy]
        VALIDATION[Validation]
        PRODUCTION[Production Deploy]
    end

    subgraph "📊 Monitoring"
        HEALTH[Health Check]
        METRICS[Performance Metrics]
        ALERTS[Alert System]
    end

    BUILD --> STAGING
    TEST --> VALIDATION
    QUALITY --> PRODUCTION

    STAGING --> HEALTH
    VALIDATION --> METRICS
    PRODUCTION --> ALERTS
```

### デプロイメント品質基準

```mermaid
graph TB
    subgraph "✅ デプロイ前チェック"
        ALL_TEST[全テスト通過]
        COVERAGE[カバレッジ達成]
        SECURITY[セキュリティスキャン]
        PERFORMANCE[パフォーマンステスト]
    end

    subgraph "🎯 品質ゲート"
        GATE1[Unit Test: 100%]
        GATE2[Integration Test: 100%]
        GATE3[E2E Test: 100%]
        GATE4[Security Scan: Pass]
    end

    ALL_TEST --> GATE1
    COVERAGE --> GATE2
    SECURITY --> GATE3
    PERFORMANCE --> GATE4

    style GATE1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style GATE2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style GATE3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style GATE4 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

---

## 🔧 開発ツール活用

### 必須開発コマンド

```mermaid
graph TB
    subgraph "⚡ 開発コマンド"
        DEV[pnpm dev]
        BUILD[pnpm build]
        TEST[pnpm test]
        LINT[pnpm lint]
    end

    subgraph "🧪 テストコマンド"
        UNIT[pnpm test:unit]
        E2E[pnpm test:e2e]
        COVERAGE[pnpm test:coverage]
        WATCH[pnpm test:watch]
    end

    subgraph "🔧 品質コマンド"
        TYPE_CHECK[pnpm type-check]
        FORMAT[pnpm format]
        CLEAN[pnpm clean]
    end

    DEV --> UNIT
    BUILD --> E2E
    TEST --> COVERAGE
    LINT --> TYPE_CHECK

    style DEV fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style TYPE_CHECK fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### 開発環境最適化

| ツール        | 目的               | 設定                     | 効果               |
| ------------- | ------------------ | ------------------------ | ------------------ |
| **Turbopack** | 高速ビルド         | Next.js 15統合           | 開発速度向上       |
| **Vitest**    | 高速テスト         | 並列実行、ウォッチモード | 即座フィードバック |
| **ESLint**    | コード品質         | 厳格ルール、自動修正     | 一貫性確保         |
| **Prettier**  | コードフォーマット | 自動整形                 | 可読性向上         |

---

## 📚 学習・成長プロセス

### 段階的スキル習得

```mermaid
graph TB
    subgraph "🌱 初級 (1-2週間)"
        BASIC[基本概念理解]
        SIMPLE[簡単な機能実装]
        TEST_BASIC[基本テスト作成]
    end

    subgraph "🚀 中級 (3-4週間)"
        PATTERN[パターン活用]
        COMPLEX[複雑機能実装]
        QUALITY[品質意識向上]
    end

    subgraph "⭐ 上級 (2-3ヶ月)"
        ARCHITECTURE[アーキテクチャ設計]
        OPTIMIZATION[最適化実装]
        LEADERSHIP[チーム貢献]
    end

    BASIC --> PATTERN
    SIMPLE --> COMPLEX
    TEST_BASIC --> QUALITY

    PATTERN --> ARCHITECTURE
    COMPLEX --> OPTIMIZATION
    QUALITY --> LEADERSHIP
```

### 継続的学習

```mermaid
graph LR
    subgraph "📖 学習リソース"
        DOC[Documentation]
        CODE_REVIEW[Code Review]
        PAIRING[Pair Programming]
    end

    subgraph "🎯 実践練習"
        KATA[Code Kata]
        REFACTOR[Refactoring Exercise]
        DESIGN[Design Exercise]
    end

    subgraph "🤝 知識共有"
        SHARE[Knowledge Sharing]
        MENTOR[Mentoring]
        COMMUNITY[Community Contribution]
    end

    DOC --> KATA
    CODE_REVIEW --> REFACTOR
    PAIRING --> DESIGN

    KATA --> SHARE
    REFACTOR --> MENTOR
    DESIGN --> COMMUNITY
```

---

## 🎯 Phase別次のステップ

### 🚀 **新機能開発を始める方**

```mermaid
graph TB
    subgraph "準備Phase"
        A1[要件確認<br/>business requirements] --> A2[アーキテクチャ適合性<br/>../../architecture/overview.md]
        A2 --> A3[技術選択確認<br/>../../reference/technologies.md]
    end

    subgraph "実装Phase"
        A3 --> B1[UseCase実装<br/>usecase.md]
        B1 --> B2[Domain実装<br/>domain.md]
        B2 --> B3[Repository実装<br/>repository.md]
        B3 --> B4[UI実装<br/>../frontend/components.md]
    end

    style A1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style B1 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

### 🧪 **品質向上を目指す方**

```mermaid
graph LR
    subgraph "テスト充実"
        C1[ユニットテスト<br/>../../testing/unit/overview.md] --> C2[自動モック<br/>../../testing/unit/mocking.md]
        C2 --> C3[E2Eテスト<br/>../../testing/e2e/overview.md]
    end

    subgraph "継続改善"
        C3 --> D1[コード品質<br/>../standards/coding.md]
        D1 --> D2[パフォーマンス<br/>../advanced/performance.md]
    end

    style C1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D1 fill:#f59e0b,stroke:#fbbf24,stroke-width:2px,color:#ffffff
```

### 🔧 **問題解決が必要な方**

```mermaid
graph LR
    subgraph "問題特定"
        E1[症状確認<br/>../../troubleshooting/common-issues.md] --> E2[分野別調査<br/>../../troubleshooting/]
    end

    subgraph "解決実施"
        E2 --> F1[修正実装<br/>このワークフロー]
        F1 --> F2[再発防止<br/>../../testing/strategy.md]
    end

    style E1 fill:#dc2626,stroke:#ef4444,stroke-width:2px,color:#ffffff
    style F1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

---

## 🔗 詳細クロスリファレンス

### 📋 **開発Phase別必読ドキュメント**

| Phase              | 主要ドキュメント                                     | 関連実装                                                  | 品質確認                                                      | トラブル対応                                                        |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| **計画・設計**     | [アーキテクチャ概要](../../architecture/overview.md) | [設計原則](../../architecture/principles.md)              | [設計判断記録](../../architecture/decisions/)                 | [設計相談](../../troubleshooting/development/)                      |
| **Domain実装**     | [Domain実装](domain.md)                              | [エンティティ](../../architecture/layers/domain.md)       | [Value Object](../../architecture/patterns/value-objects.md)  | [Domain問題](../../troubleshooting/development/domain.md)           |
| **UseCase実装**    | [UseCase実装](usecase.md)                            | [Result型](../../architecture/patterns/result-pattern.md) | [DI設定](../../architecture/patterns/dependency-injection.md) | [DI問題](../../troubleshooting/development/dependency-injection.md) |
| **Repository実装** | [Repository実装](repository.md)                      | [インフラ層](../../architecture/layers/infrastructure.md) | [統合テスト](../../testing/integration/)                      | [DB問題](../../troubleshooting/development/database.md)             |
| **UI実装**         | [コンポーネント開発](../frontend/components.md)      | [Server Actions](../frontend/server-actions.md)           | [E2Eテスト](../../testing/e2e/overview.md)                    | [UI問題](../../troubleshooting/frontend/)                           |
| **テスト実装**     | [テスト戦略](../../testing/strategy.md)              | [自動モック](../../testing/unit/mocking.md)               | [カバレッジ確認](../../testing/unit/coverage.md)              | [テスト問題](../../troubleshooting/testing/)                        |

### 🛠️ **実装詳細ガイド**

#### **UseCase開発**

```
前提: [アーキテクチャ理解](../../architecture/overview.md) → [DI理解](../../architecture/patterns/dependency-injection.md)
実装: [UseCase詳細](usecase.md) → [Result型活用](../../architecture/patterns/result-pattern.md)
テスト: [ユニットテスト](../../testing/unit/overview.md) → [モック活用](../../testing/unit/mocking.md)
問題解決: [DI問題](../../troubleshooting/development/dependency-injection.md)
```

#### **Repository開発**

```
前提: [インフラ層理解](../../architecture/layers/infrastructure.md) → [Repository概念](../../architecture/patterns/repository-pattern.md)
実装: [Repository詳細](repository.md) → [Prisma統合](../../reference/configuration/database.md)
テスト: [統合テスト](../../testing/integration/) → [DB テスト](../../testing/integration/database.md)
問題解決: [DB関連問題](../../troubleshooting/development/database.md)
```

#### **UI開発**

```
前提: [プレゼンテーション層](../../architecture/layers/presentation.md) → [UI システム](../frontend/ui-system.md)
実装: [コンポーネント開発](../frontend/components.md) → [Server Actions](../frontend/server-actions.md)
テスト: [E2Eテスト](../../testing/e2e/overview.md) → [UI テスト](../../testing/e2e/ui-testing.md)
問題解決: [フロントエンド問題](../../troubleshooting/frontend/)
```

### 🔧 **ツール・コマンド活用**

| 開発段階       | 主要コマンド         | 詳細ガイド                                           | 最適化                                             |
| -------------- | -------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| **開発開始**   | `pnpm dev`           | [環境セットアップ](../setup.md)                      | [開発効率化](../advanced/productivity.md)          |
| **実装中**     | `pnpm test:watch`    | [テスト実行](../../testing/unit/overview.md)         | [ウォッチモード](../../testing/unit/watch-mode.md) |
| **品質確認**   | `pnpm test:coverage` | [カバレッジ分析](../../testing/unit/coverage.md)     | [品質指標](../standards/quality.md)                |
| **統合確認**   | `pnpm test:e2e:ui`   | [E2E テスト](../../testing/e2e/overview.md)          | [UI Mode活用](../../testing/e2e/ui-mode.md)        |
| **デプロイ前** | `pnpm build`         | [ビルド設定](../../reference/configuration/build.md) | [最適化設定](../advanced/build-optimization.md)    |

### 📚 **学習リソース**

#### **レベル別推奨学習パス**

- **初心者**: [最初の機能実装](first-feature.md) → [基本パターン習得](../../architecture/patterns/basic/)
- **中級者**: このドキュメント → [高度な実装](../advanced/) → [最適化手法](../advanced/optimization/)
- **上級者**: [アーキテクチャ拡張](../../architecture/advanced/) → [チーム開発](../team/)

#### **継続的スキル向上**

- **日次**: [コーディング規約](../standards/coding.md) 確認
- **週次**: [テスト品質](../../testing/strategy.md) 見直し
- **月次**: [アーキテクチャ原則](../../architecture/principles.md) 振り返り

---

## 💡 効率化のコツ

### 🚀 **開発速度向上**

1. **テンプレート活用** - [コードテンプレート](../templates/) で定型作業削減
2. **自動化推進** - [開発ツール](../../reference/tools.md) でルーチン作業自動化
3. **品質向上** - [Lint・フォーマット](../standards/formatting.md) で修正時間削減

### 🎯 **品質安定化**

1. **TDD実践** - [テスト駆動開発](../../testing/tdd.md) で設計品質向上
2. **継続リファクタリング** - [リファクタリング手法](../advanced/refactoring.md) で保守性向上
3. **定期レビュー** - [コードレビュー](../team/code-review.md) で知識共有

### 🔄 **継続改善**

1. **振り返り実施** - 開発プロセスの定期見直し
2. **メトリクス活用** - [品質指標](../standards/quality.md) による客観的評価
3. **チーム学習** - [知識共有](../team/knowledge-sharing.md) で全体底上げ

---

**🔄 このワークフローにより、効率的で高品質な機能開発を実現しましょう！**
