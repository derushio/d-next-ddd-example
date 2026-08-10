# クリーンアーキテクチャ概念解説 🏛️

このドキュメントでは、クリーンアーキテクチャの概念と理論について詳しく説明します。

---

## 概要 📐

### クリーンアーキテクチャとは

**クリーンアーキテクチャ**は、Robert C. Martin（Uncle Bob）が提唱したソフトウェア設計手法で、**依存関係の方向を内側に向ける**ことで、ビジネスロジックを外部システムから独立させる設計パターンです。

### 核心となる原則

```mermaid
graph TD
    A[依存関係の逆転] --> B[関心の分離]
    B --> C[テスタビリティ]
    C --> D[ビジネスロジックの独立性]
    D --> A

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style B fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style C fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style D fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

1. **依存関係の逆転 (Dependency Inversion)** - 上位レイヤーが下位レイヤーの詳細に依存しない
2. **関心の分離 (Separation of Concerns)** - 各レイヤーが明確な責務を持つ
3. **テスタビリティ (Testability)** - ビジネスロジックのテストが容易
4. **ビジネスロジックの独立性** - フレームワークやDBに依存しない

---

## クリーンアーキテクチャの動機 🤔

### 問題：従来のアーキテクチャの課題

```mermaid
graph TD
    UI[UI Layer] --> BL[Business Logic]
    BL --> DB[Database]
    BL --> EXT[External API]

    style UI fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style BL fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style DB fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style EXT fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff

    note1[❌ ビジネスロジックがDB/APIに直接依存<br/>❌ テストが困難<br/>❌ 変更の影響範囲が広い]
```

**具体的な問題例：**

```typescript
// ❌ 悪い例：直接依存
class UserService {
 async createUser(data: any) {
  // データベースに直接依存
  const user = await prisma.user.create({ data });

  // 外部APIに直接依存
  await sendWelcomeEmail(user.email);

  return user;
 }
}

// この場合の問題：
// 1. テスト時にDBとメールAPI両方をモックする必要
// 2. DBスキーマ変更でビジネスロジックも修正必要
// 3. メールサービス変更でもコード修正必要
```

### 解決：クリーンアーキテクチャのメリット

#### 1. テスタビリティ 🧪

**なぜテストしやすいのか？**

```mermaid
graph LR
    subgraph "従来のアーキテクチャ"
        A1[Business Logic] --> B1[Real Database]
        A1 --> C1[Real Email Service]
        note1[テスト時も実際のDB/APIが必要]
    end

    subgraph "クリーンアーキテクチャ"
        A2[Business Logic] --> B2[Repository Interface]
        A2 --> C2[Email Service Interface]
        B2 -.-> D2[Mock Repository]
        C2 -.-> E2[Mock Email Service]
        note2[テスト時はモックで代替可能]
    end

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

#### 2. 保守性の向上 🔧

**なぜ保守しやすいのか？**

```mermaid
graph TD
    subgraph "変更の影響範囲"
        A[DB Schema 変更] --> B[Repository Implementation のみ]
        C[Email Provider 変更] --> D[Email Service Implementation のみ]
        E[UI Framework 変更] --> F[Presentation Layer のみ]
    end

    G[Business Logic]
    G -.-> H[影響を受けない]

    style G fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style H fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**ORM変更時の影響範囲：**

#### ❌ 従来のアーキテクチャ：大きな影響範囲

```mermaid
graph TD
    A[Use Case 1] -->|直接依存| P1[Prisma Client]
    B[Use Case 2] -->|直接依存| P2[Prisma Client]
    C[Use Case 3] -->|直接依存| P3[Prisma Client]
    P1 --> DB[(Database)]
    P2 --> DB
    P3 --> DB

    subgraph "ORM変更時の修正箇所"
        M1[Use Case 1 修正必要]
        M2[Use Case 2 修正必要]
        M3[Use Case 3 修正必要]
        M4[大量のコード修正]
        M5[テスト全面修正]
    end

    style A fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style B fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style C fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style M4 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style M5 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
```

#### ✅ クリーンアーキテクチャ：最小限の影響

```mermaid
graph TD
    A[Use Case 1] -->|インターフェース| I[IUserRepository]
    B[Use Case 2] -->|インターフェース| I
    C[Use Case 3] -->|インターフェース| I

    P[PrismaUserRepository] -->|implements| I
    D[DrizzleUserRepository] -->|implements| I

    P --> DB[(Database)]
    D --> DB

    subgraph "ORM変更時の修正箇所"
        C1[✅ Repository実装のみ変更]
        C2[✅ UseCase変更不要]
        C3[✅ ビジネスロジック保護]
        C4[✅ テスト影響最小]
    end

    style A fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style C fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style C1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style C2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style C3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style C4 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

#### 3. スケーラビリティの確保 📈

**なぜスケールしやすいのか？**

```mermaid
graph LR
    subgraph "機能追加時"
        A[新しいUseCase] --> B[既存のDomain Service]
        A --> C[既存のRepository]
        A --> D[新しいDomain Service]

        note1[既存コードに影響せず機能追加可能]
    end

    style A fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style C fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style D fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**新機能追加時の安全性：**

```mermaid
graph TB
    subgraph "既存の機能（変更不要）"
        CUC[CreateUserUseCase]
        LUC[LoginUseCase]
        UUC[UpdateUserUseCase]
    end

    subgraph "新機能追加"
        DUC[DeleteUserUseCase<br/>🆕 新規追加]
    end

    subgraph "既存の共有コンポーネント（再利用）"
        REPO[IUserRepository<br/>♻️ 再利用]
        DS[UserDomainService<br/>♻️ 再利用]
        ENT[User Entity<br/>♻️ 再利用]
    end

    CUC --> REPO
    CUC --> DS
    LUC --> REPO
    LUC --> DS
    UUC --> REPO
    UUC --> DS

    DUC --> REPO
    DUC --> DS

    REPO --> ENT
    DS --> ENT

    subgraph "追加機能のメリット"
        M1[✅ 既存コード変更なし]
        M2[✅ 既存機能への影響ゼロ]
        M3[✅ 共有コンポーネント再利用]
        M4[✅ 安全で高速な開発]
    end

    style CUC fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style LUC fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style UUC fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style DUC fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style REPO fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style DS fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style ENT fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style M1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M4 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## クリーンアーキテクチャの理論 🎯

### レイヤー構成

```mermaid
graph TB
    subgraph "外側（変更される可能性が高い）"
        UI[UI・Web・デバイス]
        DB[データベース]
        EXT[外部サービス・API]
    end

    subgraph "Interface Adapters"
        CTRL[Controllers]
        GATE[Gateways]
        PRES[Presenters]
    end

    subgraph "Application Business Rules"
        UC[Use Cases]
    end

    subgraph "Enterprise Business Rules"
        ENT[Entities]
    end

    UI --> CTRL
    CTRL --> UC
    UC --> ENT
    UC --> GATE
    GATE --> DB
    PRES --> UI
    UC --> PRES
    EXT --> GATE

    classDef external fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    classDef adapter fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    classDef application fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef enterprise fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

### 各レイヤーの責務

| レイヤー                       | 責務                                 | 依存先             | なぜこの責務なのか                         |
| ------------------------------ | ------------------------------------ | ------------------ | ------------------------------------------ |
| **Enterprise Business Rules**  | 核となるビジネスエンティティ         | なし               | 最も安定したビジネスルールを保護するため   |
| **Application Business Rules** | アプリケーション固有のビジネスルール | Entities           | アプリケーション特有のフローを管理するため |
| **Interface Adapters**         | データ形式の変換・外部システム連携   | Use Cases          | 外部システムの変更影響を局所化するため     |
| **Frameworks & Drivers**       | UI・DB・Web等の具体的技術            | Interface Adapters | 技術的変更の影響を最外層に限定するため     |

### 依存関係のルール

```mermaid
graph TB
    subgraph "依存の方向（内側へ）"
        F[Frameworks & Drivers] --> I[Interface Adapters]
        I --> A[Application Rules]
        A --> E[Enterprise Rules]
    end

    subgraph "禁止される依存"
        E2[Enterprise Rules] -.->|❌| A2[Application]
        A2 -.->|❌| I2[Interface Adapters]
        I2 -.->|❌| F2[Frameworks]
    end

    style F fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style I fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style E fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

**重要な原則：**

1. **内側のレイヤーは外側について何も知らない**
2. **外側のレイヤーは内側のレイヤーを知ってよい**
3. **データフローは依存関係を越えて両方向に流れる**
4. **境界を越えるデータは単純な構造（DTO等）にする**

---

## データフローパターン 🔄

### 理想的なデータフロー

```mermaid
sequenceDiagram
    participant UI as UI
    participant CTL as Controller
    participant UC as Use Case
    participant ENT as Entity
    participant GW as Gateway
    participant DB as Database

    UI->>CTL: Request
    CTL->>UC: Execute Business Logic
    UC->>ENT: Business Rule Validation
    ENT->>UC: Valid/Invalid
    UC->>GW: Data Operation Request
    GW->>DB: SQL/NoSQL Query
    DB->>GW: Raw Data
    GW->>UC: Domain Object
    UC->>CTL: Response DTO
    CTL->>UI: Formatted Response
```

### 依存関係逆転の実現

```mermaid
graph TB
    subgraph "Application Layer（高レベル）"
        UC[CreateUserUseCase]
        IFACE[IUserRepository<br/>インターフェース定義]
    end

    subgraph "Infrastructure Layer（低レベル）"
        IMPL[PrismaUserRepository<br/>具象実装]
    end

    subgraph "DI Container"
        DI[依存性注入]
    end

    UC -->|依存| IFACE
    IMPL -->|implements| IFACE
    DI -->|inject| UC
    DI -->|具象クラス提供| IMPL

    subgraph "逆転の効果"
        E1[✅ 高レベルが低レベルに依存しない]
        E2[✅ インターフェースが詳細を決定]
        E3[✅ テスト時はモック注入可能]
        E4[✅ 実装変更が容易]
    end

    subgraph "従来の依存関係（問題）"
        UC2[UseCase] -->|直接依存| IMPL2[Prisma実装]
        PROB[❌ 高レベル → 低レベル依存]
    end

    style UC fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style IFACE fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style IMPL fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style DI fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#d97706
    style UC2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style IMPL2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style PROB fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style E1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style E2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style E3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style E4 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## よくある誤解と注意点 ⚠️

### 誤解1：レイヤー数の混同

```mermaid
graph TB
    subgraph "❌ よくある誤解"
        A1[Presentation] --> B1[Business]
        B1 --> C1[Data]
        note1[3層アーキテクチャと混同]
    end

    subgraph "✅ クリーンアーキテクチャ"
        A2[Frameworks] --> B2[Interface Adapters]
        B2 --> C2[Application Rules]
        C2 --> D2[Enterprise Rules]
        note2[責務による分離]
    end

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

### 誤解2：すべてをインターフェース化

```typescript
// ❌ 過度なインターフェース化
interface IStringValidator {
 validate(str: string): boolean;
}

// ✅ 適切な境界でのみインターフェース化
interface IUserRepository {
 // 外部システム（DB）との境界
}

interface IEmailService {
 // 外部システム（メールAPI）との境界
}
```

### 誤解3：パフォーマンスへの悪影響

**実際は：**

- 抽象化によるオーバーヘッドは現代のJSエンジンでは無視できる
- テストの高速化により開発効率が大幅向上
- 保守性向上により長期的なパフォーマンス向上

---

## まとめ 🎯

### クリーンアーキテクチャの価値

1. **テストしやすさ** - モックによる独立したテスト
2. **変更に強い** - 影響範囲の局所化
3. **理解しやすい** - 明確な責務分離
4. **再利用しやすい** - ビジネスロジックの独立性

### 導入時の考慮点

- **学習コスト** - チーム全体での理解が必要
- **初期設計時間** - 適切な境界設計が重要
- **プロジェクト規模** - 小規模では過剰になる可能性

---

## 関連ドキュメント 📚

- [アーキテクチャ比較](./architecture-comparison.md) - 他の設計選択肢との比較
- [テスト戦略](../../testing-with-clean-architecture.md) - クリーンアーキテクチャでのテスト手法
- [Next.js統合パターン](../../nextjs-integration-patterns.md) - Next.jsとの統合方法
