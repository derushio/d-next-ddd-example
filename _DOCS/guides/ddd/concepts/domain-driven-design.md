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

**具体的な問題例：**

```typescript
// ❌ データ中心設計の例
class UserService {
  async promoteUser(userId: string) {
    // データベースの構造に依存したロジック
    const user = await this.db.users.findById(userId);
    
    // ビジネスルールがサービス層に散在
    if (user.experience_points >= 1000) {
      await this.db.users.update(userId, { 
        level: user.level + 1,
        status: 'premium' 
      });
      
      // 副作用の処理も混在
      await this.emailService.sendPromotion(user.email);
    }
  }
}

// 問題：
// 1. "昇格"のビジネスルールがわからない
// 2. データベース構造変更でロジックも変更必要
// 3. ドメインエキスパートにとって理解困難
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

**具体例：ユーザー昇格のDDD実装**

```typescript
// ✅ DDD アプローチ
export class UserDomainService {
  // ビジネスルールが明確
  canPromoteUser(user: User): boolean {
    // ドメインエキスパートと合意したルール
    return user.experiencePoints >= 1000 && 
           user.accountStatus === 'active' &&
           user.membershipDuration >= 30; // 30日以上の利用
  }
  
  promoteUser(user: User): PromotedUser {
    if (!this.canPromoteUser(user)) {
      throw new DomainError(
        'ユーザーは昇格条件を満たしていません',
        'PROMOTION_CRITERIA_NOT_MET'
      );
    }
    
    // ドメインの知識に基づいた昇格処理
    return new PromotedUser({
      ...user,
      level: user.level + 1,
      status: 'premium',
      promotedAt: new Date(),
    });
  }
}

// メリット：
// 1. ビジネスルールが一箇所に集約
// 2. ドメインエキスパートが理解可能
// 3. 昇格条件の変更が簡単
// 4. ビジネスロジックのテストが独立して可能
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

| パターン | 責務 | 特徴 |
|---------|------|------|
| **Value Object** | 値の表現・バリデーション | 不変、等価性で比較 |
| **Entity** | 一意性を持つオブジェクト | IDによる識別、ライフサイクル管理 |
| **Aggregate** | 一貫性境界の定義 | トランザクション単位、変更の整合性確保 |
| **Domain Service** | エンティティに属さないビジネスロジック | 複数のエンティティにまたがる処理 |
| **Repository** | ドメインオブジェクトの永続化 | ドメインから技術的詳細を隠蔽 |

---

## 本プロジェクトでの DDD 実装 🛠️

### 実装状況とマッピング

```mermaid
graph TB
    subgraph "本プロジェクトの構造"
        subgraph "Domain Layer"
            DS[Domain Services<br/>src/services/domain/]
            DE[Domain Entities<br/>src/types/domain/]
        end
        
        subgraph "Application Layer"
            UC[Use Cases<br/>src/usecases/]
        end
        
        subgraph "Infrastructure Layer"
            REPO[Repositories<br/>src/repositories/]
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

**1. Value Objects**

```typescript
// src/types/domain/User.ts
export class Email {
  private readonly value: string;
  
  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new DomainError('無効なメールアドレスです', 'INVALID_EMAIL');
    }
    this.value = email;
  }
  
  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  toString(): string {
    return this.value;
  }
  
  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class UserId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new DomainError('ユーザーIDは必須です', 'INVALID_USER_ID');
    }
  }
  
  toString(): string {
    return this.value;
  }
}
```

**2. Entity & Aggregate**

```typescript
// src/types/domain/User.ts
export class User {
  constructor(
    private readonly id: UserId,
    private readonly email: Email,
    private name: string,
    private experiencePoints: number,
    private level: number,
    private readonly createdAt: Date
  ) {}
  
  // ビジネスルールの実装
  canLevelUp(): boolean {
    const requiredPoints = this.level * 1000;
    return this.experiencePoints >= requiredPoints;
  }
  
  levelUp(): void {
    if (!this.canLevelUp()) {
      throw new DomainError(
        '経験値が不足しています',
        'INSUFFICIENT_EXPERIENCE'
      );
    }
    
    this.level += 1;
  }
  
  addExperience(points: number): void {
    if (points <= 0) {
      throw new DomainError(
        '経験値は正の値である必要があります',
        'INVALID_EXPERIENCE_POINTS'
      );
    }
    
    this.experiencePoints += points;
  }
  
  // Getters
  getId(): UserId { return this.id; }
  getEmail(): Email { return this.email; }
  getName(): string { return this.name; }
  getLevel(): number { return this.level; }
  getExperiencePoints(): number { return this.experiencePoints; }
}
```

**3. Domain Service**

```typescript
// src/services/domain/UserDomainService.ts
export class UserDomainService {
  // 複数のエンティティにまたがるビジネスロジック
  async canPromoteUser(user: User, membershipService: MembershipService): Promise<boolean> {
    // ユーザー自身のルール
    if (!user.canLevelUp()) {
      return false;
    }
    
    // メンバーシップに関するルール
    const membership = await membershipService.getMembership(user.getId());
    if (membership.getDurationInDays() < 30) {
      return false;
    }
    
    // 昇格条件の判定
    return user.getLevel() < 10; // 最大レベル制限
  }
  
  calculatePromotionBonus(user: User): number {
    // ビジネスルールに基づくボーナス計算
    const baseBonus = 100;
    const levelMultiplier = user.getLevel() * 0.1;
    
    return Math.floor(baseBonus * (1 + levelMultiplier));
  }
  
  validateUserData(name: string, email: string): void {
    // 統合バリデーション
    if (name.length < 2) {
      throw new DomainError(
        'ユーザー名は2文字以上である必要があります',
        'INVALID_USER_NAME'
      );
    }
    
    // EmailはValue Objectのコンストラクタでバリデーション
    new Email(email);
  }
}
```

**4. Repository インターフェース**

```typescript
// src/repositories/interfaces/IUserRepository.ts
export interface IUserRepository {
  // ドメインオブジェクトを使用
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  delete(id: UserId): Promise<void>;
}

// 実装は Infrastructure層
// src/repositories/implementations/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    // ドメインオブジェクトをデータベース形式に変換
    const userData = {
      id: user.getId().toString(),
      email: user.getEmail().toString(),
      name: user.getName(),
      level: user.getLevel(),
      experiencePoints: user.getExperiencePoints(),
    };
    
    await this.prisma.user.upsert({
      where: { id: userData.id },
      create: userData,
      update: userData,
    });
  }
  
  async findById(id: UserId): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { id: id.toString() }
    });
    
    if (!userData) return null;
    
    // データベース形式からドメインオブジェクトに変換
    return new User(
      new UserId(userData.id),
      new Email(userData.email),
      userData.name,
      userData.experiencePoints,
      userData.level,
      userData.createdAt
    );
  }
}
```

---

## DDD vs 従来手法の比較 ⚖️

### コード比較例：ユーザー昇格機能

**従来のアプローチ**

```typescript
// ❌ 従来のサービス層中心設計
class UserService {
  async promoteUser(userId: string) {
    // データベース中心の処理
    const user = await this.userRepository.findById(userId);
    
    // ビジネスルールが散在
    if (user.experience_points >= user.level * 1000) {
      // データベース操作が中心
      await this.userRepository.update(userId, {
        level: user.level + 1,
        updated_at: new Date()
      });
      
      // 副作用の処理
      await this.notificationService.sendLevelUpNotification(user);
    }
  }
}

// 問題：
// 1. ビジネスルールがサービス層に散在
// 2. データベースの構造がロジックを決定
// 3. ドメインエキスパートには理解困難
// 4. テストが複雑（DBモックが必要）
```

**DDD アプローチ**

```typescript
// ✅ DDD による設計
// UseCase (Application Layer)
export class PromoteUserUseCase {
  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(new UserId(userId));
    
    if (!user) {
      throw new DomainError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }
    
    // ドメインサービスでビジネスルール判定
    const canPromote = await this.userDomainService.canPromoteUser(
      user, 
      this.membershipService
    );
    
    if (!canPromote) {
      throw new DomainError('昇格条件を満たしていません', 'PROMOTION_NOT_ALLOWED');
    }
    
    // ドメインオブジェクトでビジネスロジック実行
    user.levelUp();
    
    // 永続化
    await this.userRepository.save(user);
    
    // 副作用の処理
    await this.notificationUseCase.sendLevelUpNotification(user);
  }
}

// メリット：
// 1. ビジネスルールがドメイン層に集約
// 2. ドメインエキスパートが理解可能
// 3. 単体テストが容易
// 4. 変更の影響範囲が明確
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
      1,    // レベル
      new Date()
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
    membershipService: MembershipService
  ): Promise<boolean> {
    if (!user.canLevelUp()) {
      return false;
    }
    
    // 新しいビジネスルール追加
    if (user.getLevel() >= 5) {
      const membership = await membershipService.getMembership(user.getId());
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
- [アーキテクチャ概要](../architecture-overview.md) - 全体設計との連携
- [開発ガイド](../development-guide.md) - 実装手順
- [テスト戦略](../testing-strategy.md) - ドメインロジックのテスト手法
