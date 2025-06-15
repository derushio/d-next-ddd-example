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
    
    style A fill:#e3f2fd
    style B fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#e8f5e8
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
    
    style UI fill:#ffebee
    style BL fill:#ffebee
    style DB fill:#ffebee
    style EXT fill:#ffebee
    
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
    
    style A1 fill:#ffebee
    style A2 fill:#e8f5e8
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
    
    style G fill:#e8f5e8
    style H fill:#e8f5e8
```

**具体例：**

```typescript
// 例：Prisma から別のORMに変更する場合

// ❌ 従来の方法だと：
// ビジネスロジック内のPrisma呼び出しを全て修正が必要

// ✅ クリーンアーキテクチャだと：
// Repository実装を変更するだけ

// 変更前
class PrismaUserRepository implements IUserRepository {
  async create(data: CreateUserData): Promise<User> {
    return await this.prisma.user.create({ data });
  }
}

// 変更後（Drizzleに変更）
class DrizzleUserRepository implements IUserRepository {
  async create(data: CreateUserData): Promise<User> {
    return await this.db.insert(users).values(data);
  }
}

// ビジネスロジック（UseCase）は一切変更不要！
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
    
    style A fill:#e8f5e8
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#e8f5e8
```

**具体例：**

```typescript
// 例：「ユーザー削除」機能を追加する場合

// 新しいUseCaseを追加するだけ
class DeleteUserUseCase {
  constructor(
    private userRepository: IUserRepository, // 既存のRepository再利用
    private userDomainService: UserDomainService // 既存のDomainService再利用
  ) {}
  
  async execute(userId: string): Promise<void> {
    // 既存のバリデーションロジックを再利用
    await this.userDomainService.validateUserExists(userId);
    
    // 既存のRepository機能を再利用
    await this.userRepository.delete(userId);
  }
}

// 既存のCreateUserUseCase、LoginUseCaseは一切変更不要
// 各レイヤーの責務が明確なため、安全に機能追加可能
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
    
    classDef external fill:#fff3e0
    classDef adapter fill:#e8f5e8
    classDef application fill:#e1f5fe
    classDef enterprise fill:#f3e5f5
```

### 各レイヤーの責務

| レイヤー | 責務 | 依存先 | なぜこの責務なのか |
|---------|------|--------|--------------------|
| **Enterprise Business Rules** | 核となるビジネスエンティティ | なし | 最も安定したビジネスルールを保護するため |
| **Application Business Rules** | アプリケーション固有のビジネスルール | Entities | アプリケーション特有のフローを管理するため |
| **Interface Adapters** | データ形式の変換・外部システム連携 | Use Cases | 外部システムの変更影響を局所化するため |
| **Frameworks & Drivers** | UI・DB・Web等の具体的技術 | Interface Adapters | 技術的変更の影響を最外層に限定するため |

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
    
    style F fill:#fff3e0
    style I fill:#e8f5e8
    style A fill:#e1f5fe
    style E fill:#f3e5f5
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

```typescript
// ✅ 正しい依存関係の向き
interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
}

class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository // インターフェースに依存
  ) {}
}

class PrismaUserRepository implements IUserRepository {
  // UseCaseが定義したインターフェースを実装
  async create(data: CreateUserData): Promise<User> {
    return await this.prisma.user.create({ data });
  }
}

// DIコンテナで具象クラスを注入
container.register<IUserRepository>('UserRepository', {
  useClass: PrismaUserRepository
});
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
    
    style A1 fill:#ffebee
    style A2 fill:#e8f5e8
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

- [アーキテクチャ比較](../architecture-comparison.md) - 他の設計選択肢との比較
- [テスト戦略](../testing-with-clean-architecture.md) - クリーンアーキテクチャでのテスト手法
- [プロジェクト設計判断](../project-architecture-decisions.md) - 本プロジェクトでの実装判断
- [Next.js統合パターン](../nextjs-integration-patterns.md) - Next.jsとの統合方法
