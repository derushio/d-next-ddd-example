# レイヤードアーキテクチャ ガイド 🏗️

このドキュメントでは、プロジェクトで採用しているレイヤードアーキテクチャの全体像とその設計思想について解説します。

---

## レイヤードアーキテクチャとは？ 🤔

レイヤードアーキテクチャ（層状アーキテクチャ）は、アプリケーションを論理的に独立した複数の層に分割する設計パターンです。各層は特定の責務を持ち、決められた方向にのみ依存関係を形成します。

### 基本的な構造 🎯

```mermaid
graph TD
    USER[👤 ユーザー] --> PRES[🎨 Presentation Layer<br/>プレゼンテーション層]
    PRES --> APP[📋 Application Layer<br/>アプリケーション層]
    APP --> DOMAIN[👑 Domain Layer<br/>ドメイン層]
    APP --> DOMAIN_INTERFACES[🔌 Domain Interfaces<br/>ドメインインターフェース]
    INFRA[🔧 Infrastructure Layer<br/>インフラストラクチャ層] --> DOMAIN_INTERFACES

    subgraph "DIP: 依存性逆転の原則"
        direction TB
        DOMAIN_LAYER[Domain Layer] --> INTERFACE[Interface]
        INFRA_LAYER[Infrastructure Layer] --> INTERFACE
        INTERFACE -.->|実装| INFRA_LAYER
    end

    subgraph "依存関係の方向"
        direction TB
        HIGH[上位層] --> LOW[下位層]
        CONCRETE[具象] -.->|DIPにより逆転| ABSTRACT[抽象]
    end

    style PRES fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style APP fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style DOMAIN fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style DOMAIN_INTERFACES fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style INFRA fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff

    classDef userStyle fill:#831843,stroke:#be185d,stroke-width:2px,color:#ffffff
    class USER userStyle
```

### 層間の依存関係ルール 📏

```mermaid
graph LR
    subgraph "許可される依存関係"
        P1[Presentation] --> A1[Application]
        A1 --> D1[Domain]
        A1 --> I1[Infrastructure]
    end

    subgraph "禁止される依存関係"
        D2[Domain] -.-> I2[Infrastructure]
        D2 -.-> A2[Application]
        I3[Infrastructure] -.-> D3[Domain]
        I3 -.-> A3[Application]
    end

    style P1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style A1 fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style D1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style I1 fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff

    style D2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
    style I2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
    style A2 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
    style I3 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
    style D3 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
    style A3 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff,stroke:#f44336
```

**重要なルール：**

1. **上位層から下位層への依存のみ許可** - 逆方向の依存は禁止
2. **Domain層は最も独立性が高い** - フレームワークやDBに依存しない
3. **Infrastructure層が最も外部依存が多い** - 技術的詳細を担当

### 🔄 依存性逆転の原則（Dependency Inversion Principle）

レイヤードアーキテクチャの最も重要な概念の一つが**依存性逆転の原則（DIP）**です。この原則により、ドメイン層の独立性とテスタビリティが実現されます。

#### DIPの基本概念 🎯

**従来の依存関係（悪い例）：**

```mermaid
graph TB
    subgraph "❌ 直接依存（DIP違反）"
        DL1[Domain Layer<br/>UserService] --> IL1[Infrastructure Layer<br/>MySQLUserRepository]
    end

    style DL1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style IL1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
```

**DIP適用後の依存関係（良い例）：**

```mermaid
graph TB
    subgraph "✅ インターフェース経由の依存（DIP準拠）"
        DL2[Domain Layer<br/>UserService] --> IR[Interface<br/>IUserRepository]
        IL2[Infrastructure Layer<br/>MySQLUserRepository] --> IR
    end

    subgraph "依存関係の流れ"
        direction LR
        DOMAIN[Domain] --> INTERFACE[Interface]
        INFRA[Infrastructure] --> INTERFACE
        INTERFACE -.->|実装| INFRA
    end

    style DL2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style IR fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style IL2 fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

#### なぜDIPが必要なのか？ 🤔

1. **技術的詳細からの独立性**

   - ドメインロジックがデータベースやフレームワークに依存しない
   - MySQLからPostgreSQLへの変更が容易

2. **テスタビリティの向上**

   - インターフェースによりモック作成が簡単
   - ドメインロジックの単体テストが可能

3. **保守性の向上**
   - 技術選択の変更が他層に影響しない
   - 新機能追加時の既存コードへの影響を最小化

#### DIPによる依存関係の逆転 🔄

**❌ 従来の直接依存（悪い例）：**

```mermaid
graph TB
    subgraph "❌ DIP違反：直接依存で問題が多い"
        DS1[Domain Service<br/>UserService] -->|直接import| PR1[PrismaClient]
        DS1 -->|new PrismaClient| PR1
    end

    subgraph "問題点"
        P1[🚫 テスト時にDB必要]
        P2[🚫 DB変更でドメイン修正必要]
        P3[🚫 技術的詳細がドメインに混入]
    end

    style DS1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style PR1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style P1 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style P2 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style P3 fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
```

**✅ DIP適用後の依存逆転（良い例）：**

```mermaid
graph TB
    subgraph "✅ DIP準拠：インターフェースによる依存逆転"
        DS2[Domain Service<br/>UserService] -->|インターフェースに依存| IUR[IUserRepository<br/>Interface]
        PR2[PrismaUserRepository<br/>具象実装] -->|implements| IUR
        DS2 -.->|DI経由で注入| PR2
    end

    subgraph "メリット"
        M1[✅ テスト時はモック使用]
        M2[✅ DB変更はInfra層のみ]
        M3[✅ ドメインが純粋なビジネスロジック]
    end

    subgraph "DI Container"
        DIC[DIコンテナ]
        DIC -->|bind| IUR
        DIC -->|to| PR2
    end

    style DS2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style IUR fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style PR2 fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style M1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style DIC fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#d97706
```

---

## 各層の責務と役割 🎭

### 🎨 Presentation Layer（プレゼンテーション層）

**責務：** ユーザーインターフェースとユーザー入力の処理

- UI コンポーネントの描画
- ユーザー操作の受付（クリック、フォーム入力等）
- UI状態の管理（モーダル開閉、タブ選択等）
- Server Actions経由でのApplication Layer呼び出し

**技術スタック：** Next.js App Router、React、TailwindCSS、Flowbite-React

### 📋 Application Layer（アプリケーション層）

**責務：** ビジネスフローの制御と調整

- Use Case（ユースケース）の実装
- トランザクション管理
- Domain LayerとInfrastructure Layerの組み合わせ
- データ変換（DTO）

**技術スタック：** TypeScript、TSyringe（DI）

### 👑 Domain Layer（ドメイン層）

**責務：** ビジネスルールとドメイン知識の実装

- Entity（エンティティ）
- Value Object（値オブジェクト）
- Domain Service（ドメインサービス）
- Repository Interface（リポジトリインターフェース）
- Domain Event（ドメインイベント）

**技術スタック：** Pure TypeScript（フレームワーク非依存）

### 🔧 Infrastructure Layer（インフラストラクチャ層）

**責務：** 技術的詳細と外部システム連携

- Repository実装
- 外部API連携
- データベースアクセス
- ファイルシステム操作
- 設定管理

**技術スタック：** Prisma、外部API SDK、Node.js標準ライブラリ

---

## レイヤードアーキテクチャのメリット 👍

### 1. **関心の分離** 🎯

- 各層が明確な責務を持つ
- 変更の影響範囲を限定できる
- 理解しやすい構造

### 2. **テスタビリティ** 🧪

- 各層を独立してテストできる
- モックによる依存関係の切断が容易
- 単体テストから統合テストまで段階的に実行可能

**DIPによるテストの改善：**

```mermaid
graph TB
    subgraph "❌ DIP違反時のテスト"
        TS1[Test Suite] -->|テスト実行| DS1[UserService]
        DS1 -->|直接依存| DB1[Real Database]
        DB1 -->|重い・遅い・不安定| TS1
    end

    subgraph "✅ DIP準拠時のテスト"
        TS2[Test Suite] -->|モック注入| DS2[UserService]
        DS2 -->|インターフェース経由| MR[Mock Repository]
        MR -->|高速・安定・制御可能| TS2
    end

    subgraph "テスト実行速度"
        SLOW[❌ 遅い<br/>数秒〜数分]
        FAST[✅ 高速<br/>数ミリ秒]
    end

    style DS1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style DB1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style DS2 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style MR fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style SLOW fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style FAST fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### 3. **保守性** 🔧

- 技術的詳細とビジネスロジックの分離
- フレームワーク変更時の影響範囲を限定
- 新機能追加時の既存コードへの影響を最小化

**DIPによる保守性の改善：**

```mermaid
graph TB
    subgraph "🔄 データベース変更時の影響範囲"
        US[UserService<br/>ドメインサービス] -->|変更不要| IUR[IUserRepository<br/>インターフェース]

        subgraph "Infrastructure実装の選択"
            PR[PrismaRepository<br/>PostgreSQL] -.->|切り替え可能| IUR
            MR[MongoRepository<br/>MongoDB] -.->|切り替え可能| IUR
            MSR[MySQLRepository<br/>MySQL] -.->|切り替え可能| IUR
        end

        subgraph "設定変更のみ"
            DIC[DIコンテナ設定]
            DIC -->|bind切り替え| IUR
        end
    end

    subgraph "変更の影響"
        CHANGE1[✅ ドメインロジック：変更なし]
        CHANGE2[✅ テストコード：変更なし]
        CHANGE3[✅ UIコンポーネント：変更なし]
        CHANGE4[🔧 Infrastructure層：新実装追加]
        CHANGE5[⚙️ DI設定：1行変更]
    end

    style US fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style IUR fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style PR fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style MR fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style MSR fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style DIC fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#d97706
    style CHANGE1 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style CHANGE2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style CHANGE3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style CHANGE4 fill:#fef3c7,stroke:#d97706,stroke-width:1px,color:#d97706
    style CHANGE5 fill:#fef3c7,stroke:#d97706,stroke-width:1px,color:#d97706
```

### 4. **再利用性** ♻️

- Domain Layerは他のアプリケーションでも再利用可能
- Infrastructure Layerの実装を差し替え可能
- Use Caseの組み合わせで新しい機能を構築

### 5. **スケーラビリティ** 📈

- チーム開発での役割分担が明確
- 層ごとに異なる開発者が並行して作業可能
- 大規模プロジェクトでの管理が容易

---

## レイヤードアーキテクチャのデメリット ⚠️

### 1. **複雑性の増加** 🤯

- 小規模プロジェクトでは過剰設計になる可能性
- 学習コストが高い
- 初期構築に時間がかかる

### 2. **性能のオーバーヘッド** ⏱️

- 層間でのデータ変換コスト
- 抽象化による処理の遅延
- メモリ使用量の増加

### 3. **開発初期の負荷** 💼

- インターフェース設計に時間がかかる
- 依存性注入の設定が複雑
- デバッグ時のスタックトレースが深い

### 4. **過度な抽象化のリスク** 🌀

- 実装が過度に複雑になる可能性
- 理解困難なインターフェース設計
- 変更時の影響範囲の把握が困難

---

## 実装における注意点 ⚡

### 1. **依存関係の方向を厳守（DIP準拠）**

```typescript
// ❌ 禁止：Domain LayerがInfrastructure Layerに依存
import { PrismaClient } from '@prisma/client'; // Domain内では禁止

// ✅ 許可：Interface経由での依存関係の逆転（DIP）
export interface IUserRepository {
 findById(id: UserId): Promise<User | null>;
}

// ✅ DI設定でインターフェースと実装をバインド
container.register<IUserRepository>('IUserRepository', {
 useClass: PrismaUserRepository,
});
```

**よくあるDIP違反パターン：**

```typescript
// ❌ 直接インスタンス化（DIP違反）
export class OrderService {
 private emailService = new SMTPEmailService(); // 具象クラスに直接依存
}

// ✅ インターフェース経由（DIP準拠）
@injectable()
export class OrderService {
 constructor(@inject('IEmailService') private emailService: IEmailService) {}
}
```

### 2. **Domainレイヤーの独立性を保つ**

```typescript
// ❌ 禁止：フレームワーク・ライブラリに依存
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

// ✅ 許可：Pure TypeScript のみ
export class User {
 private constructor(
  private id: UserId,
  private name: string,
 ) {}
}
```

### 3. **レイヤー間の適切なデータ変換**

```typescript
// ✅ 各層で適切なデータ形式に変換
export class CreateUserUseCase {
 async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
  const user = User.create(request.name, new Email(request.email)); // Domain Object
  await this.userRepository.save(user); // Repository経由で保存
  return { id: user.getId().toString() }; // DTO形式でレスポンス
 }
}
```

---

## 各層の詳細ドキュメント 📚

各層の詳細な実装ルールと具体例については、以下のドキュメントを参照してください：

### 🎨 [Presentation Layer（プレゼンテーション層）](./presentation/presentation.md)

- UI コンポーネントの実装
- Server Actions の作成
- UI状態管理
- フォームバリデーション

### 📋 [Application Layer（アプリケーション層）](./application/application.md)

- Use Case の実装
- トランザクション管理
- DTO の設計
- 認可・権限チェック

### 👑 [Domain Layer（ドメイン層）](./domain/domain.md)

- Entity の設計
- Value Object の実装
- Domain Service の作成
- Repository Interface の定義

### 🔧 [Infrastructure Layer（インフラストラクチャ層）](./infrastructure/infrastructure.md)

- Repository 実装
- 外部サービス連携
- データベース操作
- 設定管理

---

## アーキテクチャ進化の指針 🚀

### Phase 1: 基本構造の確立

- [ ] 各層の基本的な責務分離
- [ ] 依存関係の方向性確立
- [ ] 基本的なEntity・Value Object実装

### Phase 2: ドメインモデルの充実

- [ ] 複雑なビジネスルールの実装
- [ ] Domain Service の活用
- [ ] Domain Event の導入

### Phase 3: 高度な機能の追加

- [ ] CQRS（Command Query Responsibility Segregation）の導入
- [ ] イベントソーシングの検討
- [ ] マイクロサービス分割の検討

---

**📖 各層の詳細については、上記のリンク先ドキュメントを必ず確認してください！**
