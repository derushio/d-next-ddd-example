# 依存性注入パターン 💉

型安全で保守可能な依存関係管理による品質向上

---

## 🎯 依存性注入の目的

### 解決する問題

```mermaid
graph TB
    subgraph "❌ 従来の直接依存 (問題)"
        A1[UserService] -->|new| B1[PrismaClient]
        A1 -->|new| C1[SMTPEmailService]

        PROB1[テスト困難]
        PROB2[結合度高]
        PROB3[変更困難]
    end

    subgraph "✅ 依存性注入 (解決)"
        A2[UserService] -->|Interface| B2[IUserRepository]
        A2 -->|Interface| C2[IEmailService]
        DI[DI Container] -->|inject| B3[PrismaUserRepository]
        DI -->|inject| C3[SMTPEmailService]

        SOLV1[テスト容易]
        SOLV2[疎結合]
        SOLV3[変更容易]
    end

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style B1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style C1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B2 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style C2 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style DI fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

### 実現される価値

```mermaid
graph LR
    subgraph "開発効率"
        MOCK[モック容易]
        TEST[テスト高速]
        DEBUG[デバッグ簡単]
    end

    subgraph "保守性"
        LOOSE[疎結合]
        CHANGE[変更容易]
        EXTEND[拡張容易]
    end

    subgraph "品質"
        TYPE[型安全]
        RELIABLE[信頼性]
        CONSISTENT[一貫性]
    end

    MOCK --> LOOSE
    TEST --> CHANGE
    DEBUG --> EXTEND

    LOOSE --> TYPE
    CHANGE --> RELIABLE
    EXTEND --> CONSISTENT

    style TYPE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style RELIABLE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style CONSISTENT fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 🏗️ 分離DIコンテナアーキテクチャ

### レイヤー別コンテナ設計

```mermaid
graph TB
    subgraph "🔷 Core Container"
        CORE_SERVICES[基盤サービス<br/>PrismaClient, ConfigService]
    end

    subgraph "🔧 Infrastructure Container"
        INFRA_SERVICES[技術実装サービス<br/>HashService, Logger, Repository実装]
    end

    subgraph "👑 Domain Container"
        DOMAIN_SERVICES[ドメインサービス<br/>UserDomainService, OrderDomainService]
    end

    subgraph "📋 Application Container"
        APP_SERVICES[アプリケーションサービス<br/>UseCase, ApplicationService]
    end

    CORE_SERVICES --> INFRA_SERVICES
    INFRA_SERVICES --> DOMAIN_SERVICES
    DOMAIN_SERVICES --> APP_SERVICES

    style CORE_SERVICES fill:#1e3a8a,stroke:#1e40af,stroke-width:2px,color:#ffffff
    style INFRA_SERVICES fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style DOMAIN_SERVICES fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style APP_SERVICES fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

### 継承関係と依存方向

```mermaid
graph TB
    subgraph "コンテナ継承チェーン"
        CORE[Core Container<br/>基盤層] --> INFRA[Infrastructure Container<br/>インフラ層]
        INFRA --> DOMAIN[Domain Container<br/>ドメイン層]
        DOMAIN --> APP[Application Container<br/>アプリケーション層]
    end

    subgraph "サービス利用範囲"
        CORE_ONLY[Coreサービスのみ]
        CORE_INFRA[Core + Infrastructureサービス]
        CORE_DOMAIN[Core + Infrastructure + Domainサービス]
        ALL_SERVICES[全サービス利用可能]
    end

    CORE --> CORE_ONLY
    INFRA --> CORE_INFRA
    DOMAIN --> CORE_DOMAIN
    APP --> ALL_SERVICES

    subgraph "重要原則"
        PRINCIPLE1[下位層から上位層への依存のみ]
        PRINCIPLE2[循環依存の完全防止]
        PRINCIPLE3[責任の明確な分離]
    end
```

---

## 🎭 注入パターンの使い分け

### パターン選択指針

```mermaid
graph TB
    subgraph "🔧 コンストラクター注入 (推奨)"
        SERVICE_LAYER[サービス層]
        STABLE[安定した依存関係]
        LIFECYCLE[ライフサイクル管理]
    end

    subgraph "⚡ resolve関数 (限定使用)"
        UI_LAYER[UI層]
        DYNAMIC[動的な依存解決]
        ONDEMAND[必要時取得]
    end

    subgraph "使い分けルール"
        RULE1[サービス層: @inject必須]
        RULE2[UI層: resolve許可]
        RULE3[混在禁止]
    end

    SERVICE_LAYER --> RULE1
    UI_LAYER --> RULE2
    LIFECYCLE --> RULE3

    style SERVICE_LAYER fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style UI_LAYER fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style RULE1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style RULE2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style RULE3 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
```

### 適用レイヤーマトリックス

| レイヤー           | 推奨パターン | 理由                      | 使用例                       |
| ------------------ | ------------ | ------------------------- | ---------------------------- |
| **Infrastructure** | `@inject()`  | 安定した依存関係          | Repository, External Service |
| **Domain**         | `@inject()`  | ドメインサービス間協調    | DomainService, Specification |
| **Application**    | `@inject()`  | UseCase間でのサービス共有 | UseCase, ApplicationService  |
| **Presentation**   | `resolve()`  | 必要時のみサービス取得    | Server Actions, Components   |

> **注記**: 実コードでは `registerSingleton()` / `register()` + `Symbol.for()` トークンによる登録が主要パターンです。`@inject()` はコンストラクター注入時に実装でも使用されるパターンの一つです。

---

## 🔄 依存関係ライフサイクル

### サービス登録パターン

```mermaid
graph TB
    subgraph "Singleton (推奨)"
        STATELESS[ステートレスサービス]
        SHARED[共有リソース]
        EXPENSIVE[高コスト初期化]
    end

    subgraph "Transient (限定使用)"
        STATEFUL[ステートフルサービス]
        ISOLATED[隔離が必要]
        LIGHTWEIGHT[軽量オブジェクト]
    end

    subgraph "Instance (特殊用途)"
        PRECONFIGURED[事前設定済み]
        EXTERNAL[外部作成]
        MANUAL[手動管理]
    end

    STATELESS --> SHARED
    SHARED --> EXPENSIVE
    STATEFUL --> ISOLATED
    ISOLATED --> LIGHTWEIGHT
    PRECONFIGURED --> EXTERNAL
    EXTERNAL --> MANUAL

    style STATELESS fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style SHARED fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style EXPENSIVE fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### ライフサイクル管理戦略

```mermaid
sequenceDiagram
    participant App as Application Startup
    participant Core as Core Container
    participant Infra as Infrastructure Container
    participant Domain as Domain Container
    participant AppC as Application Container

    App->>Core: 1. Initialize Core Services
    Note over Core: PrismaClient, ConfigService

    App->>Infra: 2. Initialize Infrastructure Services
    Note over Infra: HashService, Logger, Repositories

    App->>Domain: 3. Initialize Domain Services
    Note over Domain: DomainServices, Specifications

    App->>AppC: 4. Initialize Application Services
    Note over AppC: UseCases, ApplicationServices

    Note over App: All services ready for use
```

---

## 🛡️ 型安全性の確保

### トークンベース型推論

```mermaid
graph TB
    subgraph "トークン定義"
        SYMBOL["Symbol.for('ServiceName')"]
        TYPE[ServiceTypeMap]
        INFERENCE[自動型推論]
    end

    subgraph "型安全な解決"
        RESOLVE["resolve('ServiceName')"]
        TYPED[型付きサービス取得]
        COMPILE[コンパイル時検証]
    end

    SYMBOL --> RESOLVE
    TYPE --> TYPED
    INFERENCE --> COMPILE

    style SYMBOL fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style TYPED fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style COMPILE fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### インターフェース駆動設計

```mermaid
graph LR
    subgraph "Interface First"
        IFACE_DEF[Interface定義]
        CONTRACT[契約仕様]
        ABSTRACT[抽象化レベル]
    end

    subgraph "Implementation"
        CONCRETE[具象実装]
        MULTIPLE[複数実装可能]
        SWITCH[実装切り替え]
    end

    subgraph "DI Registration"
        BIND[Interface→Implementation]
        LIFECYCLE[ライフサイクル管理]
        SCOPE[スコープ制御]
    end

    IFACE_DEF --> CONCRETE
    CONTRACT --> MULTIPLE
    ABSTRACT --> SWITCH

    CONCRETE --> BIND
    MULTIPLE --> LIFECYCLE
    SWITCH --> SCOPE
```

---

## 🧪 テスト戦略統合

### モック注入パターン

```mermaid
graph TB
    subgraph "本番環境"
        PROD[Production Container]
        REAL[Real Services]
        DB[Actual Database]
    end

    subgraph "テスト環境"
        TEST[Test Container]
        MOCK[Mock Services]
        MEMORY[In-Memory Database]
    end

    subgraph "テストヘルパー"
        SETUP["setupTestEnvironment()"]
        AUTO_MOCK[Automatic Mock Creation]
        CLEANUP[Container Reset]
    end

    PROD --> TEST
    REAL --> MOCK
    DB --> MEMORY

    TEST --> SETUP
    MOCK --> AUTO_MOCK
    MEMORY --> CLEANUP

    style TEST fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style MOCK fill:#f3e8ff,stroke:#8b5cf6,stroke-width:1px,color:#7c3aed
    style AUTO_MOCK fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### テスト独立性確保

```mermaid
sequenceDiagram
    participant Test1 as Test Case 1
    participant Helper as Test Helper
    participant Container as DI Container
    participant Test2 as Test Case 2

    Test1->>Helper: setupTestEnvironment()
    Helper->>Container: clearInstances()
    Helper->>Container: registerMocks()
    Test1->>Container: resolve services
    Note over Test1: Test execution

    Test2->>Helper: setupTestEnvironment()
    Helper->>Container: clearInstances()
    Helper->>Container: registerMocks()
    Test2->>Container: resolve services
    Note over Test2: Independent execution
```

---

## ⚠️ アンチパターンと対策

### よくある問題と解決策

```mermaid
graph TB
    subgraph "❌ 循環依存"
        CIRCULAR[ServiceA → ServiceB → ServiceA]
        PROB1[初期化エラー]
        UNSTABLE[システム不安定]
    end

    subgraph "✅ 解決策"
        INTERFACE[Interface分離]
        EVENT[Event駆動]
        MEDIATOR[Mediatorパターン]
    end

    subgraph "❌ Service Locator"
        LOCATOR[グローバルアクセス]
        HIDDEN[隠れた依存関係]
        TEST_HARD[テスト困難]
    end

    subgraph "✅ 改善策"
        EXPLICIT[明示的注入]
        CONSTRUCTOR[コンストラクター注入]
        TRANSPARENT[透明な依存関係]
    end

    CIRCULAR --> INTERFACE
    PROB1 --> EVENT
    UNSTABLE --> MEDIATOR

    LOCATOR --> EXPLICIT
    HIDDEN --> CONSTRUCTOR
    TEST_HARD --> TRANSPARENT

    style CIRCULAR fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style LOCATOR fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style INTERFACE fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style EXPLICIT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### 避けるべきパターン

| アンチパターン      | 問題                   | 対策             | 効果                 |
| ------------------- | ---------------------- | ---------------- | -------------------- |
| **New演算子多用**   | 硬い結合、テスト困難   | DI Container使用 | 疎結合、モック容易   |
| **Static依存**      | グローバル状態、副作用 | Instance注入     | 状態管理、テスト独立 |
| **Fat Constructor** | 複雑な初期化、責務過多 | Builder/Factory  | 単純化、責務分離     |
| **Mixed Patterns**  | 一貫性欠如、混乱       | 統一パターン     | 予測可能性、保守性   |

---

## 🚀 パフォーマンス最適化

### 遅延初期化戦略

```mermaid
graph TB
    subgraph "Eager Loading"
        STARTUP[アプリ起動時]
        ALL_SERVICES[全サービス初期化]
        HIGH_MEMORY[メモリ使用量大]
    end

    subgraph "Lazy Loading"
        ON_DEMAND[必要時初期化]
        SELECTIVE[選択的ロード]
        LOW_MEMORY[メモリ効率的]
    end

    subgraph "Hybrid Approach"
        CRITICAL[重要サービス: Eager]
        OPTIONAL[オプション: Lazy]
        BALANCED[バランス型]
    end

    STARTUP --> ON_DEMAND
    ALL_SERVICES --> SELECTIVE
    HIGH_MEMORY --> LOW_MEMORY

    ON_DEMAND --> CRITICAL
    SELECTIVE --> OPTIONAL
    LOW_MEMORY --> BALANCED

    style LOW_MEMORY fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style BALANCED fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### メモリ管理最適化

```mermaid
graph LR
    subgraph "メモリ効率化"
        SINGLETON[Singleton Services]
        WEAK_REF[Weak References]
        DISPOSAL[適切な破棄]
    end

    subgraph "パフォーマンス監視"
        METRICS[メトリクス計測]
        PROFILING[プロファイリング]
        OPTIMIZATION[最適化実施]
    end

    SINGLETON --> METRICS
    WEAK_REF --> PROFILING
    DISPOSAL --> OPTIMIZATION

    style METRICS fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style PROFILING fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style OPTIMIZATION fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 🔧 実装ベストプラクティス

### サービス設計原則

```mermaid
graph TB
    subgraph "設計原則"
        SINGLE[Single Responsibility<br/>単一責任]
        STATELESS[Stateless Design<br/>ステートレス設計]
        IMMUTABLE[Immutable State<br/>不変状態]
    end

    subgraph "実装パターン"
        INTERFACE[Interface定義必須]
        VALIDATION[入力検証実装]
        ERROR[エラーハンドリング]
    end

    subgraph "品質保証"
        UNIT_TEST[単体テスト]
        INTEGRATION[統合テスト]
        MOCK[モックテスト]
    end

    SINGLE --> INTERFACE
    STATELESS --> VALIDATION
    IMMUTABLE --> ERROR

    INTERFACE --> UNIT_TEST
    VALIDATION --> INTEGRATION
    ERROR --> MOCK

    style SINGLE fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style INTERFACE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style UNIT_TEST fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

### コード品質チェックリスト

| チェック項目         | 確認内容                    | 合格基準 |
| -------------------- | --------------------------- | -------- |
| **Interface定義**    | すべてのサービスにInterface | 100%     |
| **注入方式統一**     | レイヤー別適切なパターン    | 100%     |
| **循環依存チェック** | 依存関係グラフ検証          | 0件      |
| **テストカバレッジ** | DI関連テスト                | 90%以上  |
| **型安全性**         | any型使用なし               | 100%     |

---

## 🔗 関連ドキュメント

### 設計・実装

- **[レイヤー概要](../layers/overview.md)** - レイヤードアーキテクチャ全体像
- **[エラーハンドリング](../../guides/ddd/cross-cutting/error-handling.md)** - Result型パターン統合
- **[Repository実装](../../guides/ddd/layers/components/repository-implementations.md)** - データアクセス抽象化

### 開発・実践

- **[開発フロー](../../guides/development/workflow.md)** - 実際の開発手順
- **[UseCase実装](../../guides/ddd/layers/components/use-cases.md)** - UseCase開発詳細
- **[テスト戦略](../../testing/strategy.md)** - テスト実装手法

### 問題解決

- **[DIコンテナ](../../guides/ddd/layers/components/di-container.md)** - DI設定詳細
- **[よくある問題](../../troubleshooting/common-issues.md)** - トラブルシューティング
- **[コマンドリファレンス](../../reference/commands.md)** - 開発コマンド

---

**💉 依存性注入により、テスタブルで保守可能な高品質ソフトウェアを実現しましょう！**
