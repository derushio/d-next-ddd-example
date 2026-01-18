# レイヤード アーキテクチャ概要 🏗️

Clean Architectureに基づく論理的レイヤー分離設計

---

## 🎯 レイヤードアーキテクチャとは

### 基本概念

**レイヤードアーキテクチャ**は、アプリケーションを論理的に独立した複数の層に分割し、**関心の分離**と**依存関係の制御**を実現する設計パターンです。

```mermaid
graph TB
    subgraph "🌊 依存関係の流れ (外側→内側)"
        OUTER[外側レイヤー<br/>変更頻度高] --> INNER[内側レイヤー<br/>変更頻度低]
    end

    subgraph "🎯 Clean Architecture構成"
        UI[🎨 User Interface<br/>Next.js Components]
        CTRL[🎛️ Controllers<br/>Server Actions]
        UC[📋 Use Cases<br/>Business Flows]
        ENT[👑 Entities<br/>Business Rules]
    end

    UI --> CTRL
    CTRL --> UC
    UC --> ENT

    subgraph "💡 核心原則"
        INDEP[独立性<br/>Independence]
        TEST[テスタビリティ<br/>Testability]
        FLEX[柔軟性<br/>Flexibility]
    end

    style OUTER fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style INNER fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style ENT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style INDEP fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 🏛️ レイヤー構成と責務

### 4層アーキテクチャ

```mermaid
graph TB
    subgraph "🎨 Presentation Layer"
        P_UI[Next.js Pages/Components]
        P_SA[Server Actions]
        P_FORM[Form Handling]
        P_STATE[UI State Management]
    end

    subgraph "📋 Application Layer"
        A_UC[Use Cases]
        A_DTO[DTOs]
        A_TRANS[Transaction Management]
        A_AUTH[Authorization]
    end

    subgraph "👑 Domain Layer"
        D_ENT[Entities]
        D_VO[Value Objects]
        D_SERV[Domain Services]
        D_REPO[Repository Interfaces]
    end

    subgraph "🔧 Infrastructure Layer"
        I_REPO[Repository Implementations]
        I_EXT[External Services]
        I_CONFIG[Configuration]
        I_LOG[Logging]
    end

    P_UI --> A_UC
    P_SA --> A_UC
    A_UC --> D_ENT
    A_UC --> D_SERV
    A_UC --> D_REPO
    D_REPO <--> I_REPO
    I_EXT --> A_UC

    classDef presentation fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef application fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    classDef domain fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    classDef infrastructure fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

### レイヤー責務マトリックス

| レイヤー              | 主要責務             | 含むもの                                 | 除外するもの                 |
| --------------------- | -------------------- | ---------------------------------------- | ---------------------------- |
| **🎨 Presentation**   | UI・ユーザー入力処理 | コンポーネント、Server Actions、フォーム | ビジネスロジック、DB操作     |
| **📋 Application**    | ビジネスフロー制御   | UseCase、DTO、トランザクション           | UI詳細、技術実装詳細         |
| **👑 Domain**         | ビジネスルール実装   | Entity、Value Object、ドメインサービス   | フレームワーク、外部システム |
| **🔧 Infrastructure** | 技術実装詳細         | Repository実装、外部API、設定            | ビジネスロジック、UI処理     |

---

## 🔄 依存関係の原則

### 依存性逆転の原則 (DIP)

```mermaid
graph TB
    subgraph "❌ 従来の依存関係 (問題)"
        HL1[High Level Module] --> LL1[Low Level Module]
        note1[具象に依存<br/>変更に弱い]
    end

    subgraph "✅ 依存性逆転後 (解決)"
        HL2[High Level Module] --> IFACE[Interface]
        LL2[Low Level Module] --> IFACE
        note2[抽象に依存<br/>変更に強い]
    end

    subgraph "🎯 実装例"
        UC[UseCase] --> IREPO[IUserRepository]
        PRISMA[PrismaUserRepository] --> IREPO
        note3[DBからORMへの変更も<br/>UseCaseに影響なし]
    end

    style HL1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style LL1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style HL2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style IFACE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style LL2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### 依存関係ルール

```mermaid
graph TB
    subgraph "✅ 許可される依存関係"
        P1[Presentation] --> A1[Application]
        A1 --> D1[Domain]
        I1[Infrastructure] --> D1
    end

    subgraph "❌ 禁止される依存関係"
        D2[Domain] -.->|禁止| I2[Infrastructure]
        D2 -.->|禁止| A2[Application]
        D2 -.->|禁止| P2[Presentation]
        I3[Infrastructure] -.->|禁止| A3[Application]
        I3 -.->|禁止| P3[Presentation]
    end

    subgraph "📋 ルール説明"
        RULE1[内側レイヤーは外側を知らない]
        RULE2[外側レイヤーは内側に依存可能]
        RULE3[同じレイヤー内の依存は最小限]
    end

    style P1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style A1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style I2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style P2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
```

---

## 📊 データフローパターン

### 典型的なリクエストフロー

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🎨 UI Component
    participant SA as 🎨 Server Action
    participant UC as 📋 Use Case
    participant DS as 👑 Domain Service
    participant ENT as 👑 Entity
    participant REPO as 🔧 Repository
    participant DB as 🗄️ Database

    User->>UI: ユーザー操作
    UI->>SA: フォーム送信
    SA->>UC: ビジネス処理要求
    UC->>DS: ドメインルール検証
    DS->>ENT: エンティティ操作
    ENT-->>DS: 検証結果
    DS-->>UC: ドメイン処理結果
    UC->>REPO: データ永続化
    REPO->>DB: SQL実行
    DB-->>REPO: データ返却
    REPO-->>UC: ドメインオブジェクト
    UC-->>SA: Result[T]
    SA-->>UI: 処理結果
    UI-->>User: UI更新
```

### エラーハンドリングフロー

```mermaid
sequenceDiagram
    participant SA as 🎨 Server Action
    participant UC as 📋 Use Case
    participant DS as 👑 Domain Service
    participant REPO as 🔧 Repository

    SA->>UC: execute()
    UC->>DS: validateBusinessRules()
    DS-->>UC: DomainError
    UC->>UC: catch DomainError
    UC-->>SA: failure(message, code)

    alt Repository Error
        UC->>REPO: save()
        REPO-->>UC: InfrastructureError
        UC->>UC: catch InfrastructureError
        UC-->>SA: failure(message, 'INFRASTRUCTURE_ERROR')
    end

    SA->>SA: isFailure(result)
    SA-->>SA: return error response
```

---

## 🎭 レイヤー詳細設計

### Presentation Layer (プレゼンテーション層)

```mermaid
graph TB
    subgraph "🎨 Presentation Layer Components"
        RSC[React Server Components<br/>サーバーサイド描画]
        RCC[React Client Components<br/>クライアント側操作]
        SA[Server Actions<br/>フォーム処理]
        PROXY[Proxy<br/>認証・認可]
    end

    subgraph "責務"
        UI_RENDER[UI描画・表示]
        USER_INPUT[ユーザー入力受付]
        STATE_MGMT[UI状態管理]
        ROUTING[ページ遷移]
    end

    RSC --> UI_RENDER
    RCC --> USER_INPUT
    SA --> STATE_MGMT
    PROXY --> ROUTING

    style RSC fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style UI_RENDER fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### Application Layer (アプリケーション層)

```mermaid
graph TB
    subgraph "📋 Application Layer Components"
        UC[Use Cases<br/>ビジネスフロー]
        DTO[DTOs<br/>データ転送]
        TRANS[Transaction<br/>トランザクション]
        AUTH[Authorization<br/>認可処理]
    end

    subgraph "特徴"
        ORCHESTRATE[オーケストレーション]
        COORD[複数サービス協調]
        FLOW[フロー制御]
        CONVERT[データ変換]
    end

    UC --> ORCHESTRATE
    DTO --> COORD
    TRANS --> FLOW
    AUTH --> CONVERT

    style UC fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style ORCHESTRATE fill:#f3e8ff,stroke:#8b5cf6,stroke-width:1px,color:#7c3aed
```

### Domain Layer (ドメイン層)

```mermaid
graph TB
    subgraph "👑 Domain Layer Components"
        ENT[Entities<br/>エンティティ]
        VO[Value Objects<br/>値オブジェクト]
        DS[Domain Services<br/>ドメインサービス]
        REPO_I[Repository Interfaces<br/>リポジトリインターフェース]
    end

    subgraph "特徴"
        PURE[純粋なビジネスロジック]
        INVARIANT[不変条件保証]
        ISOLATED[技術非依存]
        TESTABLE[テスト容易]
    end

    ENT --> PURE
    VO --> INVARIANT
    DS --> ISOLATED
    REPO_I --> TESTABLE

    style ENT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style PURE fill:#ecfdf5,stroke:#10b981,stroke-width:1px,color:#065f46
```

### Infrastructure Layer (インフラストラクチャ層)

```mermaid
graph TB
    subgraph "🔧 Infrastructure Layer Components"
        REPO_IMPL[Repository Implementations<br/>リポジトリ実装]
        EXT_API[External APIs<br/>外部API]
        CONFIG[Configuration<br/>設定管理]
        LOG[Logging<br/>ログ出力]
    end

    subgraph "特徴"
        CONCRETE[具象実装]
        TECH_DETAIL[技術詳細]
        EXTERNAL[外部システム連携]
        INFRASTRUCTURE[インフラ処理]
    end

    REPO_IMPL --> CONCRETE
    EXT_API --> TECH_DETAIL
    CONFIG --> EXTERNAL
    LOG --> INFRASTRUCTURE

    style REPO_IMPL fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style CONCRETE fill:#fef3c7,stroke:#f59e0b,stroke-width:1px,color:#92400e
```

---

## 🔥 アンチパターンと解決策

### よくある設計問題

```mermaid
graph TB
    subgraph "❌ アンチパターン"
        AP1[God Object<br/>巨大オブジェクト]
        AP2[Circular Dependency<br/>循環依存]
        AP3[Layer Violation<br/>レイヤー違反]
        AP4[Anemic Domain<br/>貧血ドメイン]
    end

    subgraph "✅ 解決策"
        SOL1[Single Responsibility<br/>単一責任原則]
        SOL2[Dependency Injection<br/>依存性注入]
        SOL3[Interface Segregation<br/>インターフェース分離]
        SOL4[Rich Domain Model<br/>豊富なドメインモデル]
    end

    AP1 --> SOL1
    AP2 --> SOL2
    AP3 --> SOL3
    AP4 --> SOL4

    style AP1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style AP2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style AP3 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style AP4 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style SOL1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style SOL2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style SOL3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style SOL4 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### 具体的な違反例と対策

| 違反パターン                  | 問題                 | 対策                   | 効果               |
| ----------------------------- | -------------------- | ---------------------- | ------------------ |
| **Domain→Infrastructure依存** | テスト困難、技術結合 | Interface + DI         | テスタビリティ向上 |
| **UseCase内でのSQL記述**      | 責務混在、保守困難   | Repository分離         | 関心の分離         |
| **Entity内でのFramework使用** | ドメイン汚染         | Pure TypeScript        | ドメイン純粋性     |
| **UI内でのビジネスロジック**  | 重複、テスト困難     | Domain/Application分離 | 再利用性向上       |

---

## 🎯 設計品質指標

### レイヤー健全性メトリクス

```mermaid
graph TB
    subgraph "📊 品質指標"
        COUPLING[結合度<br/>Coupling]
        COHESION[凝集度<br/>Cohesion]
        STABILITY[安定度<br/>Stability]
        COMPLEXITY[複雑度<br/>Complexity]
    end

    subgraph "目標値"
        LOW_COUPLING[低結合<br/>Loose Coupling]
        HIGH_COHESION[高凝集<br/>High Cohesion]
        STABLE_ABSTRACTION[安定抽象<br/>Stable Abstraction]
        LOW_COMPLEXITY[低複雑度<br/>Low Complexity]
    end

    COUPLING --> LOW_COUPLING
    COHESION --> HIGH_COHESION
    STABILITY --> STABLE_ABSTRACTION
    COMPLEXITY --> LOW_COMPLEXITY

    style LOW_COUPLING fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style HIGH_COHESION fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style STABLE_ABSTRACTION fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style LOW_COMPLEXITY fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### 測定可能な品質基準

| 指標                 | 測定方法           | 目標値                        | 改善手法           |
| -------------------- | ------------------ | ----------------------------- | ------------------ |
| **循環依存**         | 依存関係グラフ解析 | 0件                           | DI Container分離   |
| **レイヤー違反**     | Import文静的解析   | 0件                           | Biome rules        |
| **Interface使用率**  | 具象依存率計測     | 95%以上                       | Repository pattern |
| **テストカバレッジ** | レイヤー別計測     | Domain 90%+, Application 94%+ | 自動テスト         |

---

## 🚀 スケーリング戦略

### 水平スケーリング

```mermaid
graph LR
    subgraph "モジュール分割"
        USER_MODULE[User Module]
        ORDER_MODULE[Order Module]
        PAYMENT_MODULE[Payment Module]
    end

    subgraph "独立開発"
        TEAM_A[Team A<br/>User Context]
        TEAM_B[Team B<br/>Order Context]
        TEAM_C[Team C<br/>Payment Context]
    end

    subgraph "統合"
        API_GATEWAY[API Gateway]
        EVENT_BUS[Event Bus]
        SHARED_KERNEL[Shared Kernel]
    end

    USER_MODULE --> TEAM_A
    ORDER_MODULE --> TEAM_B
    PAYMENT_MODULE --> TEAM_C

    TEAM_A --> API_GATEWAY
    TEAM_B --> EVENT_BUS
    TEAM_C --> SHARED_KERNEL
```

### マイクロサービス移行

```mermaid
graph TB
    subgraph "Current Monolith"
        MONO[Monolithic Application<br/>Single Deployment]
    end

    subgraph "Transition Phase"
        MODULAR[Modular Monolith<br/>Module Boundaries]
    end

    subgraph "Target Microservices"
        MS1[User Service]
        MS2[Order Service]
        MS3[Payment Service]
    end

    MONO --> MODULAR
    MODULAR --> MS1
    MODULAR --> MS2
    MODULAR --> MS3

    style MONO fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style MODULAR fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style MS1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style MS2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style MS3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

---

## 🔗 関連ドキュメント

### 各レイヤー詳細

- **[Presentation Layer](../../guides/ddd/layers/presentation-layer.md)** - UI・Server Actions実装詳細
- **[Application Layer](../../guides/ddd/layers/application-layer.md)** - UseCase・ビジネスフロー詳細
- **[Domain Layer](../../guides/ddd/layers/domain-layer.md)** - Entity・ドメインロジック詳細
- **[Infrastructure Layer](../../guides/ddd/layers/infrastructure-layer.md)** - Repository・外部サービス詳細

### 設計パターン

- **[依存性注入](../patterns/dependency-injection.md)** - DI実装詳細
- **[エラーハンドリング](../../guides/ddd/cross-cutting/error-handling.md)** - Result型パターン詳細
- **[Repository実装](../../guides/ddd/layers/components/repository-implementations.md)** - データアクセス抽象化

### 実装ガイド

- **[開発フロー](../../guides/development/workflow.md)** - 実際の開発手順
- **[テスト戦略](../../testing/strategy.md)** - レイヤー別テスト手法
- **[よくある問題](../../troubleshooting/common-issues.md)** - トラブルシューティング

---

**🏗️ レイヤードアーキテクチャにより、持続可能で高品質なソフトウェア開発を実現しましょう！**
