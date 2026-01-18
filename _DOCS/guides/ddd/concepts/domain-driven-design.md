# Domain-Driven Design (DDD) 詳細解説 🧠

このドキュメントでは、DDD（ドメイン駆動設計）の概念、理想的な形、そして本プロジェクトでの実装について詳しく説明します。

---

## DDD の概要 📚

### Domain-Driven Design とは

**Domain-Driven Design (DDD)** は、Eric Evans が提唱したソフトウェア設計手法で、**複雑なビジネスドメインをソフトウェア設計の中心に据える**アプローチです。

### 核心となる哲学

```mermaid
graph TD
    A[複雑なビジネスドメイン] --> B[ドメインエキスパートとの対話]
    B --> C[ユビキタス言語の確立]
    C --> D[ドメインモデルの構築]
    D --> E[設計とコードに反映]
    E --> A

    style A fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style B fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style C fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style E fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

**基本原則：**

1. **ドメインとモデルの一致** - ビジネスの概念がコードに直接反映される
2. **ユビキタス言語** - 開発者とドメインエキスパートが共通の言語を使用
3. **境界づけられたコンテキスト** - 複雑なドメインを管理可能な単位に分割
4. **ドメインの独立性** - ビジネスロジックが技術的関心事から分離

---

## なぜ DDD なのか？ 🤔

### 問題：従来のデータ中心設計

```mermaid
graph TD
    subgraph "❌ データ中心設計"
        DB1[(Database)] --> MODEL1[Data Model]
        MODEL1 --> SERVICE1[Business Logic]
        SERVICE1 --> UI1[UI]

        note1[データベース構造が<br/>ビジネスロジックを決定]
    end

    subgraph "⚠️ 問題点"
        PROB1[ビジネスルールが散在]
        PROB2[ドメインエキスパートとの乖離]
        PROB3[変更に脆い設計]
    end

    style DB1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style MODEL1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style SERVICE1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style UI1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
```

**データ中心設計の問題例：**

```mermaid
graph TB
    subgraph "❌ データ中心設計の問題"
        A[UserService.promoteUser] --> B[データベース直接依存]
        B --> C[user.experience_points >= 1000]
        C --> D[level + 1]
        C --> E[status = 'premium']
        D --> F[DB更新]
        E --> F
        F --> G[メール送信]
    end

    subgraph "問題点"
        H[🚫 ビジネスルールが不明確]
        I[🚫 DB構造変更で影響大]
        J[🚫 ドメインエキスパート理解困難]
        K[🚫 テストが困難]
    end

    style A fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style B fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style F fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style H fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style I fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style J fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style K fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
```

### 解決：DDD アプローチの利点

#### 1. ドメインロジックの集約 🎯

**なぜドメインロジックを集約するのか？**

```mermaid
graph LR
    subgraph "DDD アプローチ"
        EXPERT[ドメインエキスパート] --> LANG[ユビキタス言語]
        LANG --> DOMAIN[Domain Service]
        DOMAIN --> CODE[実装コード]
    end

    subgraph "メリット"
        BENEFIT1[ビジネスルールの可視化]
        BENEFIT2[変更の局所化]
        BENEFIT3[テストの容易性]
    end

    style DOMAIN fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style BENEFIT1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style BENEFIT2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style BENEFIT3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

**DDDアプローチの解決例：**

```mermaid
graph TB
    subgraph "✅ DDDアプローチ"
        A[UserDomainService] --> B[canPromoteUser]
        B --> C[experiencePoints >= 1000]
        B --> D[accountStatus === 'active']
        B --> E[membershipDuration >= 30]
        C --> F{昇格可能？}
        D --> F
        E --> F
        F -->|Yes| G[PromotedUser作成]
        F -->|No| H[DomainError]
        G --> I[level + 1]
        G --> J[status = 'premium']
        G --> K[promotedAt設定]
    end

    subgraph "メリット"
        L[✅ ビジネスルール集約]
        M[✅ ドメインエキスパート理解可能]
        N[✅ 変更容易]
        O[✅ テスト独立]
    end

    style A fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style G fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style L fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style N fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style O fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

#### 2. 複雑性の管理 📊

**境界づけられたコンテキストによる分割**

```mermaid
graph TD
    subgraph "User Management Context"
        U1[User Registration]
        U2[User Profile]
        U3[User Authentication]
    end

    subgraph "Order Management Context"
        O1[Order Creation]
        O2[Payment Processing]
        O3[Shipping]
    end

    subgraph "Product Catalog Context"
        P1[Product Information]
        P2[Inventory Management]
        P3[Pricing]
    end

    U1 -.-> O1
    O1 -.-> P1

    style U1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style O1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style P1 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff

    note1[各コンテキストは独立して<br/>発展・変更可能]
```

#### 3. ビジネスとコードの一致 🔗

**ユビキタス言語の効果**

```mermaid
sequenceDiagram
    participant BE as ビジネスエキスパート
    participant DEV as 開発者
    participant CODE as コード

    BE->>DEV: "ユーザーが条件を満たした時に昇格"
    DEV->>CODE: canPromoteUser(), promoteUser()
    CODE->>DEV: 実装完了
    DEV->>BE: "昇格ロジックをレビューしてください"
    BE->>CODE: 直接コードの構造を理解可能

    Note over BE,CODE: 同じ言語・概念を共有
```

---

## 理想的な DDD 設計 🎯

### DDD の戦術的パターン

```mermaid
graph TB
    subgraph "Value Objects"
        VO1[Email]
        VO2[UserId]
        VO3[Money]
    end

    subgraph "Entities"
        E1[User]
        E2[Order]
        E3[Product]
    end

    subgraph "Aggregates"
        AGG1[User Aggregate]
        AGG2[Order Aggregate]
    end

    subgraph "Domain Services"
        DS1[UserDomainService]
        DS2[OrderDomainService]
    end

    subgraph "Repositories"
        R1[UserRepository]
        R2[OrderRepository]
    end

    VO1 --> E1
    VO2 --> E1
    E1 --> AGG1
    E2 --> AGG2
    AGG1 --> DS1
    AGG2 --> DS2
    AGG1 --> R1
    AGG2 --> R2

    classDef vo fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    classDef entity fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    classDef aggregate fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef service fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    classDef repo fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

### 各パターンの役割

| パターン           | 責務                                   | 特徴                                   |
| ------------------ | -------------------------------------- | -------------------------------------- |
| **Value Object**   | 値の表現・バリデーション               | 不変、等価性で比較                     |
| **Entity**         | 一意性を持つオブジェクト               | IDによる識別、ライフサイクル管理       |
| **Aggregate**      | 一貫性境界の定義                       | トランザクション単位、変更の整合性確保 |
| **Domain Service** | エンティティに属さないビジネスロジック | 複数のエンティティにまたがる処理       |
| **Repository**     | ドメインオブジェクトの永続化           | ドメインから技術的詳細を隠蔽           |

---

## 本プロジェクトでの DDD 実装 🛠️

### 実装状況とマッピング

```mermaid
graph TB
    subgraph "本プロジェクトの構造"
        subgraph "Domain Layer"
            DS[Domain Services<br/>src/layers/domain/services/]
            DE[Domain Entities<br/>src/layers/domain/entities/]
        end

        subgraph "Application Layer"
            UC[Use Cases<br/>src/layers/application/usecases/]
        end

        subgraph "Infrastructure Layer"
            REPO[Repositories<br/>src/layers/infrastructure/repositories/]
        end
    end

    subgraph "DDD パターンとの対応"
        DS_DDD[Domain Services]
        ENT_DDD[Entities & Value Objects]
        AGG_DDD[Aggregates]
        REPO_DDD[Repositories]
    end

    DS --> DS_DDD
    DE --> ENT_DDD
    DE --> AGG_DDD
    REPO --> REPO_DDD

    style DS fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style DE fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style UC fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style REPO fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

### 実装例：User ドメイン

**1. Value Objects 実装パターン**

```mermaid
graph TB
    subgraph "Email Value Object"
        A[constructor] --> B{isValid?}
        B -->|Yes| C[value設定]
        B -->|No| D[DomainError]
        C --> E[toString()]
        C --> F[equals()]
    end

    subgraph "UserId Value Object"
        G[constructor] --> H{value有効？}
        H -->|Yes| I[value設定]
        H -->|No| J[DomainError]
        I --> K[toString()]
    end

    subgraph "Value Objectの特徴"
        L[✅ 不変性]
        M[✅ 等価性比較]
        N[✅ バリデーション]
        O[✅ 型安全性]
    end

    style A fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style G fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style C fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style L fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style N fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style O fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

**2. Entity & Aggregate 実装パターン**

```mermaid
graph TB
    subgraph "User Entity（Aggregate Root）"
        A[User] --> B[id: UserId]
        A --> C[email: Email]
        A --> D[name: string]
        A --> E[experiencePoints: number]
        A --> F[level: number]
        A --> G[createdAt: Date]
    end

    subgraph "ビジネスルール"
        H[canLevelUp] --> I{level * 1000 <= experiencePoints?}
        I -->|Yes| J[昇格可能]
        I -->|No| K[昇格不可]

        L[levelUp] --> H
        J --> M[level += 1]
        K --> N[DomainError]

        O[addExperience] --> P{points > 0?}
        P -->|Yes| Q[experiencePoints += points]
        P -->|No| R[DomainError]
    end

    subgraph "Entityの特徴"
        S[✅ 一意なID]
        T[✅ ライフサイクル]
        U[✅ ビジネスルール内包]
        V[✅ 不変条件保証]
    end

    style A fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style M fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style Q fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style S fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style T fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style U fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style V fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

**3. Domain Service 実装パターン**

```mermaid
graph TB
    subgraph "UserDomainService"
        A[canPromoteUser] --> B{user.canLevelUp?}
        B -->|No| C[false]
        B -->|Yes| D[membershipService.getMembership]
        D --> E{membership.duration >= 30?}
        E -->|No| F[false]
        E -->|Yes| G{user.level < 10?}
        G -->|Yes| H[true]
        G -->|No| I[false]

        J[calculatePromotionBonus] --> K[baseBonus = 100]
        K --> L[levelMultiplier = level * 0.1]
        L --> M[bonus = baseBonus * (1 + multiplier)]

        N[validateUserData] --> O{name.length >= 2?}
        O -->|No| P[DomainError]
        O -->|Yes| Q[new Email(email)]
        Q --> R{email valid?}
        R -->|No| S[DomainError]
        R -->|Yes| T[Validation OK]
    end

    subgraph "Domain Serviceの特徴"
        U[✅ 複数Entity協調]
        V[✅ ステートレス]
        W[✅ ビジネスルール実装]
        X[✅ Entity間の調整]
    end

    style A fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style J fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style N fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style H fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style M fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style T fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style U fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style V fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style W fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style X fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

**4. Repository パターン**

```mermaid
graph TB
    subgraph "Domain Layer"
        A[IUserRepository<br/>Interface] --> B[save]
        A --> C[findById]
        A --> D[findByEmail]
        A --> E[delete]
    end

    subgraph "Infrastructure Layer"
        F[PrismaUserRepository<br/>Implementation] --> G[Domain → DB変換]
        F --> H[DB操作実行]
        F --> I[DB → Domain変換]
    end

    subgraph "変換の流れ"
        J[User Domain Object] --> K[userData JSON]
        K --> L[Prisma操作]
        L --> M[DB Result]
        M --> N[User Domain Object]
    end

    F -.->|implements| A
    B --> G
    C --> I

    subgraph "Repositoryの特徴"
        O[✅ ドメインオブジェクト使用]
        P[✅ 技術詳細隠蔽]
        Q[✅ テスト可能性]
        R[✅ 実装交換可能]
    end

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style F fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style G fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style O fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style P fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style Q fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style R fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## DDD vs 従来手法の比較 ⚖️

### アプローチ比較：ユーザー昇格機能

```mermaid
graph TB
    subgraph "❌ 従来のサービス層中心設計"
        A1[UserService.promoteUser] --> A2[DB検索: findById]
        A2 --> A3{experience_points >= level * 1000?}
        A3 -->|Yes| A4[DB更新: level + 1]
        A4 --> A5[通知送信]
        A3 -->|No| A6[何もしない]
    end

    subgraph "従来手法の問題"
        P1[🚫 ビジネスルール散在]
        P2[🚫 DB構造がロジック決定]
        P3[🚫 ドメインエキスパート理解困難]
        P4[🚫 テスト複雑]
    end

    subgraph "✅ DDDアプローチ"
        B1[PromoteUserUseCase] --> B2[UserRepository.findById]
        B2 --> B3[UserDomainService.canPromoteUser]
        B3 --> B4{昇格可能？}
        B4 -->|Yes| B5[User.levelUp]
        B5 --> B6[UserRepository.save]
        B6 --> B7[NotificationUseCase]
        B4 -->|No| B8[DomainError]
    end

    subgraph "DDDアプローチの利点"
        M1[✅ ビジネスルール集約]
        M2[✅ ドメインエキスパート理解可能]
        M3[✅ 単体テスト容易]
        M4[✅ 変更影響範囲明確]
    end

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A4 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style P1 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style P2 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style P3 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style P4 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626

    style B1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B3 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B5 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style M1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M4 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## DDD の効果測定 📈

### 開発体験の向上

```mermaid
graph LR
    subgraph "ビジネス理解"
        B1[要件定義の精度向上] --> B2[ドメインエキスパートとの対話改善]
        B2 --> B3[仕様変更への対応力向上]
    end

    subgraph "開発効率"
        D1[ビジネスロジックのテスト容易性] --> D2[デバッグの効率化]
        D2 --> D3[新機能開発の高速化]
    end

    subgraph "保守性"
        M1[変更の影響範囲限定] --> M2[コードの可読性向上]
        M2 --> M3[技術的負債の削減]
    end

    style B1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style M1 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
```

### 具体的な効果例

**1. テストの簡易化**

```typescript
// DDDにより、ビジネスロジックのテストが簡単に
describe('UserDomainService', () => {
 it('昇格条件を満たすユーザーは昇格可能', () => {
  // Given: ドメインオブジェクトの準備
  const user = new User(
   new UserId('123'),
   new Email('test@example.com'),
   'テストユーザー',
   1000, // 経験値
   1, // レベル
   new Date(),
  );

  // When: ビジネスルールの実行
  const canLevelUp = user.canLevelUp();

  // Then: 結果の検証
  expect(canLevelUp).toBe(true);
 });

 // データベースや外部システム不要でテスト可能
});
```

**2. 仕様変更への対応**

```typescript
// 昇格条件の変更例：「レベル5以上はVIPメンバーのみ昇格可能」
export class UserDomainService {
 async canPromoteUser(
  user: User,
  membershipService: MembershipService,
 ): Promise<boolean> {
  if (!user.canLevelUp()) {
   return false;
  }

  // 新しいビジネスルール追加
  if (user.level >= 5) {
   const membership = await membershipService.getMembership(user.id);
   return membership.isVip();
  }

  return true;
 }
}

// 変更箇所：
// ✅ Domain Serviceの1箇所のみ
// ✅ 既存のテストは継続動作
// ✅ 新しいテストケース追加のみで対応
```

---

## まとめ 🎯

### DDD のプロジェクトでの価値

1. **ビジネス価値の最大化**

   - ドメインエキスパートとの協働によるビジネス理解の深化
   - 要件定義の精度向上による手戻りの削減

2. **開発効率の向上**

   - ビジネスロジックの局所化による変更の容易性
   - テストの独立性による開発速度向上

3. **長期的な保守性**
   - ドメインモデルによる複雑性の管理
   - 技術的変更からの業務ロジック保護

### 本プロジェクトでの DDD 成功要因

```mermaid
graph TD
    A[Clean Architecture] --> B[DDD の実装基盤]
    B --> C[依存注入による疎結合]
    C --> D[テスタブルなドメインロジック]
    D --> E[継続的な改善]
    E --> A

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style B fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style C fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style D fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style E fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

**相乗効果：**

- **Clean Architecture** が DDD の基盤を提供
- **依存注入** がドメインサービスのテストを容易化
- **レイヤー分離** がドメインロジックの独立性を確保

---

## 関連ドキュメント 📚

- [クリーンアーキテクチャ詳細解説](./clean-architecture.md) - アーキテクチャとの関係
- [アーキテクチャ概要](../../../architecture/overview.md) - 全体設計との連携
- [開発ワークフロー](../../development/workflow.md) - 実装手順
- [テスト戦略](../../../testing/strategy.md) - ドメインロジックのテスト手法
