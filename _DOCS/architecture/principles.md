# 設計原則とパターン 🎯

持続可能な高品質ソフトウェアを実現する設計思想と実装原則

---

## 🏛️ 基本設計原則

### SOLID原則の実践

```mermaid
graph TB
    subgraph "SOLID原則"
        S[Single Responsibility<br/>単一責任原則]
        O[Open/Closed<br/>開放閉鎖原則]
        L[Liskov Substitution<br/>リスコフの置換原則]
        I[Interface Segregation<br/>インターフェース分離原則]
        D[Dependency Inversion<br/>依存性逆転原則]
    end

    subgraph "実装例"
        UC[UseCase単一責務]
        EXT[Extension Point]
        POLY[Polymorphism]
        IFACE[小さなInterface]
        DI[依存性注入]
    end

    S --> UC
    O --> EXT
    L --> POLY
    I --> IFACE
    D --> DI

    style S fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style O fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style L fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style D fill:#1e3a8a,stroke:#1e40af,stroke-width:2px,color:#ffffff
```

### Clean Architecture 4原則

```mermaid
graph TB
    subgraph "Clean Architecture核心原則"
        INDEP[独立性<br/>Independence]
        TEST[テスタビリティ<br/>Testability]
        UI_INDEP[UI独立性<br/>UI Independence]
        DB_INDEP[DB独立性<br/>Database Independence]
    end

    subgraph "実現手法"
        LAYER[レイヤー分離]
        MOCK[モック活用]
        ABSTRACT[抽象化]
        INTERFACE[Interface駆動]
    end

    INDEP --> LAYER
    TEST --> MOCK
    UI_INDEP --> ABSTRACT
    DB_INDEP --> INTERFACE

    style INDEP fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style TEST fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style UI_INDEP fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style DB_INDEP fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

---

## 🎭 レイヤー設計原則

### 依存関係の方向性

```mermaid
graph TB
    subgraph "❌ 禁止される依存関係"
        D1[Domain] -.->|禁止| I1[Infrastructure]
        D1 -.->|禁止| A1[Application]
        I1 -.->|禁止| A2[Application]
        I1 -.->|禁止| P1[Presentation]
    end

    subgraph "✅ 許可される依存関係"
        P2[Presentation] --> A3[Application]
        A3 --> D2[Domain]
        A3 --> I2[Infrastructure]
        I2 --> D2
    end

    subgraph "🔄 依存性逆転の実現"
        APP[Application] -->|Interface| IFACE[Repository Interface]
        IMPL[Repository Impl] -->|implements| IFACE
        DI[DI Container] -->|inject| IMPL
    end

    style D1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style I1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style P2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style A3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### レイヤー責務の明確化

| 原則           | Description                    | 実装例                                   | 効果                 |
| -------------- | ------------------------------ | ---------------------------------------- | -------------------- |
| **単一責任**   | 各レイヤーは明確な責務のみ持つ | Presentation=UI, Domain=ビジネスロジック | 変更の影響範囲限定   |
| **関心の分離** | 技術的関心とビジネス関心を分離 | Repository=技術, UseCase=ビジネス        | 独立した開発・テスト |
| **安定依存**   | 安定したものに依存する         | Interface依存, 具象避ける                | 変更に強い設計       |
| **抽象化**     | 詳細ではなく抽象に依存         | IRepository, IService                    | 実装の差し替え容易   |

---

## 🔄 主要設計パターン

### 1. Result型パターン

**目的**: 型安全なエラーハンドリングによる品質向上

```mermaid
graph TB
    subgraph "従来の例外処理の問題"
        A1[メソッド実行] --> B1{例外発生？}
        B1 -->|Yes| C1[Exception throw]
        B1 -->|No| D1[成功値return]
        C1 --> E1[try-catch必須]
        E1 --> F1[エラー処理漏れリスク]
    end

    subgraph "Result型パターンの解決"
        A2[メソッド実行] --> B2[Result型返却]
        B2 --> C2{isSuccess判定}
        C2 -->|true| D2[success.data取得]
        C2 -->|false| E2[failure.error処理]
        E2 --> F2[エラー処理必須]
    end

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style F1 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style A2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style F2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

**適用ルール**:

- 全UseCase戻り値: `Promise<Result<T>>`
- エラー分類: ValidationError / DomainError / InfrastructureError
- パターンマッチング: `isSuccess()` / `isFailure()`必須使用

### 2. 依存性注入パターン

**目的**: レイヤー間疎結合とテスタビリティ向上

```mermaid
graph TB
    subgraph "分離DIコンテナ階層"
        CORE[Core Container<br/>基盤サービス]
        INFRA[Infrastructure Container<br/>技術実装サービス]
        DOMAIN[Domain Container<br/>ドメインサービス]
        APP[Application Container<br/>ユースケース]
    end

    subgraph "注入パターン選択"
        CONSTRUCTOR[コンストラクター注入<br/>@injectパターン]
        RESOLVE[resolve関数<br/>必要時取得]
    end

    subgraph "使い分けルール"
        SERVICE[サービス層] --> CONSTRUCTOR
        UI[UI層] --> RESOLVE
    end

    CORE --> INFRA
    INFRA --> DOMAIN
    DOMAIN --> APP

    style CORE fill:#1e3a8a,stroke:#1e40af,stroke-width:2px,color:#ffffff
    style INFRA fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style DOMAIN fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style APP fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

**注入パターンルール**:

- **サービス層**: `@inject()` コンストラクター注入必須
- **UI層**: `resolve()` 関数による必要時取得OK
- **循環依存**: サービス層での `resolve()` 使用禁止

### 3. Repository パターン

**目的**: ドメイン層の技術的詳細からの独立性確保

```mermaid
graph LR
    subgraph "Interface定義 (Domain Layer)"
        IUSER[IUserRepository]
        IORDER[IOrderRepository]
    end

    subgraph "具象実装 (Infrastructure Layer)"
        PRISMA[PrismaUserRepository]
        MOCK[MockUserRepository]
        MEMORY[InMemoryUserRepository]
    end

    subgraph "使用側 (Application Layer)"
        UC[UseCase]
        DS[Domain Service]
    end

    UC --> IUSER
    DS --> IUSER
    IUSER <--> PRISMA
    IUSER <--> MOCK
    IUSER <--> MEMORY

    style IUSER fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style UC fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style PRISMA fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

---

## 🧩 Domain Driven Design原則

### 戦略的設計

```mermaid
graph TB
    subgraph "境界付きコンテキスト"
        USER_CTX[User Context<br/>ユーザー管理]
        ORDER_CTX[Order Context<br/>注文管理]
        PAYMENT_CTX[Payment Context<br/>決済管理]
    end

    subgraph "ドメインモデル"
        ENTITY[Entity<br/>同一性重要]
        VO[Value Object<br/>値の等価性]
        AGGREGATE[Aggregate<br/>整合性境界]
    end

    subgraph "ドメインサービス"
        RULE[Business Rule<br/>ビジネスルール]
        POLICY[Domain Policy<br/>ドメインポリシー]
        CALC[Calculation<br/>計算ロジック]
    end

    USER_CTX --> ENTITY
    ORDER_CTX --> VO
    PAYMENT_CTX --> AGGREGATE

    ENTITY --> RULE
    VO --> POLICY
    AGGREGATE --> CALC
```

### 戦術的設計パターン

| パターン           | 目的                        | 実装指針                 | 使用場面           |
| ------------------ | --------------------------- | ------------------------ | ------------------ |
| **Entity**         | 同一性とライフサイクル管理  | 不変ID、状態変更メソッド | User, Order等      |
| **Value Object**   | 値の表現と検証              | 不変性、等価比較         | Email, Money等     |
| **Aggregate**      | 整合性境界定義              | ルート経由アクセス       | Order+OrderItem    |
| **Domain Service** | Entity/VOに属さないロジック | ステートレス、純粋関数   | 複雑計算、外部判定 |

---

## 🎨 UI設計原則

### Server-First設計

```mermaid
graph TB
    subgraph "Server Components優先"
        SSR[Server Side Rendering]
        SA[Server Actions]
        STATIC[Static Generation]
    end

    subgraph "Client Components最小化"
        INTERACTIVE[対話処理のみ]
        STATE[クライアント状態管理]
        EVENT[イベントハンドリング]
    end

    subgraph "パフォーマンス最適化"
        BUNDLE[バンドルサイズ削減]
        HYDRATION[ハイドレーション最適化]
        STREAMING[ストリーミング]
    end

    SSR --> BUNDLE
    SA --> HYDRATION
    STATIC --> STREAMING

    style SSR fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style BUNDLE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### Enhanced Components設計

```mermaid
graph LR
    subgraph "既存システム"
        LEGACY[Legacy Components]
        FEATURES[独自機能]
        THEME[テーマシステム]
    end

    subgraph "shadcn/ui統合"
        STANDARD[Standard Components]
        VARIANTS[標準Variants]
        COMPOSE[Composability]
    end

    subgraph "Bridge System"
        ENHANCED[Enhanced Components]
        HYBRID[ハイブリッド機能]
        MIGRATION[段階的移行]
    end

    LEGACY --> ENHANCED
    STANDARD --> ENHANCED
    FEATURES --> HYBRID
    VARIANTS --> HYBRID
    ENHANCED --> MIGRATION
```

---

## 🧪 テスト設計原則

### テストピラミッド実践

```mermaid
graph TB
    subgraph "E2E Tests (少数・高価値)"
        SCENARIO[重要シナリオ]
        SECURITY[セキュリティ監視]
        INTEGRATION[エンドツーエンド]
    end

    subgraph "Integration Tests (中程度)"
        USECASE[UseCase統合]
        REPOSITORY[Repository統合]
        SERVICE[Service統合]
    end

    subgraph "Unit Tests (多数・高速)"
        DOMAIN[Domain Logic]
        VALIDATION[Validation]
        CALCULATION[Calculation]
    end

    SCENARIO --> USECASE
    USECASE --> DOMAIN
    SECURITY --> REPOSITORY
    REPOSITORY --> VALIDATION
    INTEGRATION --> SERVICE
    SERVICE --> CALCULATION

    style SCENARIO fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style USECASE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style DOMAIN fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### 自動モック戦略

```mermaid
graph LR
    subgraph "vitest-mock-extended活用"
        AUTO[自動モック生成]
        TYPE[型安全性保証]
        MAINTAIN[メンテナンス不要]
    end

    subgraph "テスト品質向上"
        COVERAGE[高カバレッジ達成]
        RELIABLE[信頼性向上]
        SPEED[高速実行]
    end

    AUTO --> COVERAGE
    TYPE --> RELIABLE
    MAINTAIN --> SPEED

    style AUTO fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style COVERAGE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 📊 品質保証原則

### カバレッジ品質基準

| レイヤー           | 目標カバレッジ | 重点観点           | 品質指標                 |
| ------------------ | -------------- | ------------------ | ------------------------ |
| **Application**    | 94%以上        | エラーケース網羅   | Result型変換の完全性     |
| **Domain**         | 90%以上        | ビジネスルール検証 | 不変条件とバリデーション |
| **Infrastructure** | 85%以上        | 外部連携エラー対応 | モック設定とデータ変換   |
| **Presentation**   | 80%以上        | ユーザビリティ     | エラー表示と入力検証     |

### 継続的品質改善

```mermaid
graph TB
    subgraph "品質監視"
        AUTO[自動テスト実行]
        COVERAGE[カバレッジ計測]
        SECURITY[セキュリティ監視]
    end

    subgraph "品質分析"
        TREND[品質トレンド分析]
        HOTSPOT[問題箇所特定]
        METRICS[品質メトリクス]
    end

    subgraph "継続改善"
        REFACTOR[リファクタリング]
        ENHANCE[品質向上]
        OPTIMIZE[最適化]
    end

    AUTO --> TREND
    COVERAGE --> HOTSPOT
    SECURITY --> METRICS

    TREND --> REFACTOR
    HOTSPOT --> ENHANCE
    METRICS --> OPTIMIZE
```

---

## 🚀 スケーラビリティ原則

### 水平スケーリング設計

```mermaid
graph LR
    subgraph "モジュール分離"
        FEATURE[機能別モジュール]
        BOUNDED[境界付きコンテキスト]
        LOOSE[疎結合設計]
    end

    subgraph "チーム開発"
        PARALLEL[並行開発可能]
        OWNERSHIP[明確な所有権]
        INTERFACE[契約駆動開発]
    end

    FEATURE --> PARALLEL
    BOUNDED --> OWNERSHIP
    LOOSE --> INTERFACE

    style FEATURE fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style PARALLEL fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### 拡張ポイント設計

```mermaid
graph TB
    subgraph "Extension Points"
        PLUGIN[Plugin Architecture]
        STRATEGY[Strategy Pattern]
        OBSERVER[Observer Pattern]
    end

    subgraph "Configuration"
        ENV[Environment Config]
        FEATURE_FLAG[Feature Flags]
        DYNAMIC[Dynamic Loading]
    end

    PLUGIN --> ENV
    STRATEGY --> FEATURE_FLAG
    OBSERVER --> DYNAMIC
```

---

## 📋 実装チェックリスト

### 新機能実装時の必須確認

```mermaid
graph TB
    subgraph "設計確認"
        LAYER[適切なレイヤー配置]
        DEPEND[依存関係の方向性]
        INTERFACE[Interface設計]
    end

    subgraph "実装確認"
        RESULT[Result型パターン]
        DI[依存性注入]
        TEST[テスト実装]
    end

    subgraph "品質確認"
        COVERAGE[カバレッジ達成]
        SECURITY[セキュリティ考慮]
        PERFORMANCE[パフォーマンス]
    end

    LAYER --> RESULT
    DEPEND --> DI
    INTERFACE --> TEST

    RESULT --> COVERAGE
    DI --> SECURITY
    TEST --> PERFORMANCE
```

### コードレビューチェックポイント

| 観点               | チェック項目         | 合格基準               |
| ------------------ | -------------------- | ---------------------- |
| **アーキテクチャ** | レイヤー責務遵守     | 各レイヤーの責務に適合 |
| **パターン**       | Result型パターン使用 | 全UseCase適用          |
| **品質**           | テストカバレッジ     | 層別目標達成           |
| **セキュリティ**   | 機密情報処理         | ログマスク等適切実装   |
| **パフォーマンス** | 不要な処理なし       | 効率的な実装           |

---

## 🔗 関連ドキュメント

### 詳細実装ガイド

- **[レイヤー構成](layers/overview.md)** - 各レイヤーの詳細設計
- **[設計パターン詳細](patterns/)** - パターン実装方法
- **[開発フロー](../guides/development/workflow.md)** - 実践的開発手順

### 品質保証

- **[テスト戦略](../testing/strategy.md)** - 包括的テスト手法
- **[コーディング規約](../guides/standards/coding.md)** - 実装標準
- **[トラブルシューティング](../troubleshooting/)** - 問題解決

---

**🎯 これらの原則により、持続可能で高品質なソフトウェア開発を実現しましょう！**
