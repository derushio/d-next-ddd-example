# Code Generation Detailed Guide

このガイドは、Hygenコード生成ツールの詳細な使用方法、テンプレートの構造、カスタマイズ方法を解説します。

---

## 目次

1. [Hygenの基本概念](#1-hygenの基本概念)
2. [各コマンドの詳細仕様](#2-各コマンドの詳細仕様)
3. [テンプレート構造](#3-テンプレート構造)
4. [DI登録の仕組み](#4-di登録の仕組み)
5. [カスタマイズガイド](#5-カスタマイズガイド)
6. [実践例](#6-実践例)
7. [トラブルシューティング詳細](#7-トラブルシューティング詳細)

---

## 1. Hygenの基本概念

### 1.1 Hygenとは

Hygenは、テンプレートベースのコード生成ツールです。EJS（Embedded JavaScript）形式のテンプレートを使用して、複数のファイルを一度に生成できます。

### 1.2 プロジェクト構成

```
プロジェクトルート/
├── _templates/           # Hygenテンプレートディレクトリ
│   ├── usecase/new/     # UseCase生成テンプレート
│   ├── entity/new/      # Entity生成テンプレート
│   ├── repository/new/  # Repository生成テンプレート
│   ├── server-action/new/ # Server Action生成テンプレート
│   └── value-object/new/  # Value Object生成テンプレート
├── .hygen.js            # ヘルパー関数定義
└── package.json         # コマンド定義
```

### 1.3 コマンドとテンプレートの対応

| package.json内のスクリプト | Hygenコマンド | テンプレートディレクトリ |
|---------------------------|--------------|------------------------|
| `pnpm gen:usecase` | `hygen usecase new` | `_templates/usecase/new/` |
| `pnpm gen:entity` | `hygen entity new` | `_templates/entity/new/` |
| `pnpm gen:repo` | `hygen repository new` | `_templates/repository/new/` |
| `pnpm gen:action` | `hygen server-action new` | `_templates/server-action/new/` |
| `pnpm gen:vo` | `hygen value-object new` | `_templates/value-object/new/` |

---

## 2. 各コマンドの詳細仕様

### 2.1 UseCase生成（gen:usecase）

#### 生成されるファイル

**1. UseCaseクラス**
- パス: `src/layers/application/usecases/{domain}/{Name}UseCase.ts`
- 内容:
  - `@injectable()` デコレータ
  - コンストラクター注入（Repositoryオプション）
  - `execute()` メソッド（Result型返却）
  - Request/Response型定義（TODO）

**2. ユニットテスト**
- パス: `tests/unit/usecases/{domain}/{Name}UseCase.test.ts`
- 内容:
  - `setupTestEnvironment()` 呼び出し
  - モックRepository設定（Repositoryオプション時）
  - 基本的なテストケース（成功/失敗）

**3. DI登録（自動inject）**
- `src/di/tokens.ts`:
  - `INJECTION_TOKENS` へのSymbol追加
  - `TypeMap` への型マッピング追加
  - import文追加
- `src/di/containers/application.container.ts`:
  - import文追加
  - `container.register()` 追加

#### 対話プロンプト詳細

```bash
$ pnpm gen:usecase

✔ UseCase名を入力してください（PascalCase、例: CreateOrder）:
  → 入力例: CreateOrder, UpdateUserProfile, DeleteProduct

✔ ドメイン名を入力してください（小文字、例: order）:
  → 入力例: order, user, product, auth

✔ Repositoryを注入しますか？ (yes/no):
  → yes: Repositoryをコンストラクター注入
  → no: Repositoryなし

✔ Repository名を入力してください（PascalCase、Entity名と一致させる）:
  → 入力例: Order, User, Product
  → 注意: Entity名と一致させないとDI解決時にエラー
```

#### 非対話式実行（CI/CD対応）

```bash
pnpm gen:usecase \
  --name CreateOrder \
  --domain order \
  --withRepository true \
  --repository Order
```

#### 生成コード例

**UseCaseクラス（Repository注入あり）**:
```typescript
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import { IOrderRepository } from '@/layers/domain/repositories/IOrderRepository';
import { Result, success, failure } from '@/layers/application/types/Result';

// TODO: Request型を定義してください
export interface CreateOrderRequest {
  // 例: userId: string; items: OrderItem[];
}

// TODO: Response型を定義してください
export interface CreateOrderResponse {
  // 例: orderId: string;
}

@injectable()
export class CreateOrderUseCase {
  constructor(
    @inject(INJECTION_TOKENS.OrderRepository)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(
    request: CreateOrderRequest,
  ): Promise<Result<CreateOrderResponse>> {
    try {
      // TODO: ビジネスロジックを実装してください
      return success({
        // TODO: レスポンスデータを返却
      });
    } catch (error) {
      return failure('エラーメッセージ', 'ERROR_CODE');
    }
  }
}
```

---

### 2.2 Entity生成（gen:entity）

#### 生成されるファイル

**1. Entityクラス**
- パス: `src/layers/domain/entities/{Name}.ts`
- 内容:
  - プロパティ定義（TODO）
  - コンストラクター
  - ドメインロジックメソッド（TODO）

**2. EntityIdクラス**
- パス: `src/layers/domain/value-objects/{Name}Id.ts`
- 内容:
  - UUID v4ベースのID管理
  - `create()` メソッド（新規生成）
  - `reconstruct()` メソッド（既存値から復元）

**3. ユニットテスト**
- パス: `tests/unit/domain/entities/{Name}.test.ts`
- 内容:
  - Entityインスタンス化テスト
  - プロパティアクセステスト
  - ドメインロジックテスト（TODO）

#### 対話プロンプト詳細

```bash
$ pnpm gen:entity

✔ Entity名を入力してください（PascalCase、例: Order）:
  → 入力例: Order, User, Product, Article
  → 注意: 単数形が推奨（Userではなく、Usersではない）
```

#### 非対話式実行

```bash
pnpm gen:entity --name Order
```

#### 生成コード例

**Entityクラス**:
```typescript
import { OrderId } from '@/layers/domain/value-objects/OrderId';

export class Order {
  // TODO: プロパティを定義してください
  // private readonly _userId: string;
  // private readonly _status: string;
  // private readonly _createdAt: Date;

  constructor(
    private readonly _id: OrderId,
    // TODO: コンストラクター引数を追加
  ) {}

  get id(): OrderId {
    return this._id;
  }

  // TODO: ゲッターを実装してください

  // TODO: ドメインロジックを実装してください
  // 例: changeStatus(newStatus: string): void { ... }
}
```

**EntityIdクラス**:
```typescript
import { v4 as uuidv4 } from 'uuid';

export class OrderId {
  private readonly _value: string;

  private constructor(value: string) {
    // TODO: バリデーションを追加（必要に応じて）
    this._value = value;
  }

  static create(): OrderId {
    return new OrderId(uuidv4());
  }

  static reconstruct(value: string): OrderId {
    return new OrderId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: OrderId): boolean {
    return this._value === other._value;
  }
}
```

---

### 2.3 Repository生成（gen:repo）

#### 生成されるファイル

**1. Repository Interface（Domain層）**
- パス: `src/layers/domain/repositories/I{Name}Repository.ts`
- 内容:
  - CRUD操作の抽象メソッド定義
  - Entity/EntityIdを引数・返り値として使用

**2. Prisma実装（Infrastructure層）**
- パス: `src/layers/infrastructure/repositories/implementations/Prisma{Name}Repository.ts`
- 内容:
  - `@injectable()` デコレータ
  - PrismaClient注入
  - Interface実装（CRUD操作）
  - Prisma型とDomain型の相互変換メソッド

**3. ユニットテスト**
- パス: `tests/unit/repositories/{Name}Repository.test.ts`
- 内容:
  - モックPrismaClient設定
  - CRUD操作のテスト
  - 型変換テスト

**4. DI登録（自動inject）**
- `src/di/tokens.ts`:
  - `INJECTION_TOKENS` へのSymbol追加
  - `TypeMap` への型マッピング追加
  - import文追加
- `src/di/containers/infrastructure.container.ts`:
  - import文追加
  - `container.register()` 追加（InterfaceとPrisma実装の紐付け）

#### 前提条件

1. **対応するEntityが存在すること**
   - `src/layers/domain/entities/{Name}.ts`
   - `src/layers/domain/value-objects/{Name}Id.ts`

2. **Prismaスキーマにモデルが定義されていること**
   ```prisma
   model Order {
     id        String   @id
     // ...fields
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

#### 対話プロンプト詳細

```bash
$ pnpm gen:repo

✔ Entity名を入力してください（PascalCase、例: Order）:
  → 入力例: Order, User, Product
  → 注意: 既存のEntity名と一致させる
```

#### 非対話式実行

```bash
pnpm gen:repo --name Order
```

#### 生成コード例

**Repository Interface**:
```typescript
import { Order } from '@/layers/domain/entities/Order';
import { OrderId } from '@/layers/domain/value-objects/OrderId';

export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}
```

**Prisma実装**:
```typescript
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import { PrismaClient, Order as PrismaOrder } from '@prisma/client';
import { IOrderRepository } from '@/layers/domain/repositories/IOrderRepository';
import { Order } from '@/layers/domain/entities/Order';
import { OrderId } from '@/layers/domain/value-objects/OrderId';

@injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: OrderId): Promise<Order | null> {
    const prismaOrder = await this.prisma.order.findUnique({
      where: { id: id.value },
    });
    return prismaOrder ? this.toDomain(prismaOrder) : null;
  }

  async findAll(): Promise<Order[]> {
    const prismaOrders = await this.prisma.order.findMany();
    return prismaOrders.map(this.toDomain);
  }

  async save(order: Order): Promise<void> {
    await this.prisma.order.create({
      data: this.toPrisma(order),
    });
  }

  async update(order: Order): Promise<void> {
    await this.prisma.order.update({
      where: { id: order.id.value },
      data: this.toPrisma(order),
    });
  }

  async delete(id: OrderId): Promise<void> {
    await this.prisma.order.delete({
      where: { id: id.value },
    });
  }

  // TODO: PrismaOrder → Order への変換実装
  private toDomain(prismaOrder: PrismaOrder): Order {
    return new Order(
      OrderId.reconstruct(prismaOrder.id),
      // TODO: 他のプロパティをマッピング
    );
  }

  // TODO: Order → PrismaOrderデータ への変換実装
  private toPrisma(order: Order): Omit<PrismaOrder, 'createdAt' | 'updatedAt'> {
    return {
      id: order.id.value,
      // TODO: 他のプロパティをマッピング
    };
  }
}
```

---

### 2.4 Server Action生成（gen:action）

#### 生成されるファイル

**1. Server Actionファイル**
- パス: `src/app/server-actions/{domain}/{name}.ts`
- 内容:
  - `'use server'` ディレクティブ
  - FormData → Request DTO 変換
  - UseCaseのresolve
  - Result型のハンドリング

**2. ユニットテスト**
- パス: `tests/unit/server-actions/{domain}/{name}.test.ts`
- 内容:
  - モックUseCase設定
  - FormDataのテスト
  - Result型レスポンスのテスト

#### 前提条件

- 対応するUseCaseが存在すること
- UseCaseがDIコンテナに登録されていること

#### 対話プロンプト詳細

```bash
$ pnpm gen:action

✔ Server Action名を入力してください（camelCase、例: createOrder）:
  → 入力例: createOrder, updateUserProfile, deleteProduct

✔ ドメイン名を入力してください（小文字、例: order）:
  → 入力例: order, user, product

✔ UseCase名を入力してください（PascalCase、例: CreateOrder）:
  → 入力例: CreateOrder, UpdateUserProfile, DeleteProduct
  → 注意: 既存のUseCase名と一致させる
```

#### 非対話式実行

```bash
pnpm gen:action \
  --name createOrder \
  --domain order \
  --usecase CreateOrder
```

#### 生成コード例

```typescript
'use server';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';
import {
  CreateOrderUseCase,
  type CreateOrderRequest,
} from '@/layers/application/usecases/order/CreateOrderUseCase';

export async function createOrder(formData: FormData) {
  // TODO: FormDataからRequestオブジェクトを構築
  const request: CreateOrderRequest = {
    // 例: userId: formData.get('userId') as string,
  };

  const useCase = resolve('CreateOrderUseCase');
  const result = await useCase.execute(request);

  if (isSuccess(result)) {
    return {
      success: true,
      data: result.value,
    };
  } else {
    return {
      success: false,
      error: result.error,
    };
  }
}
```

---

### 2.5 Value Object生成（gen:vo）

#### 生成されるファイル

**1. Value Objectクラス**
- パス: `src/layers/domain/value-objects/{Name}.ts`
- 内容:
  - プライベートコンストラクター
  - `create()` メソッド（バリデーション付き）
  - `reconstruct()` メソッド（永続化データから復元）
  - `equals()` メソッド（等価性判定）

**2. ユニットテスト**
- パス: `tests/unit/domain/value-objects/{Name}.test.ts`
- 内容:
  - 正常値テスト
  - 異常値テスト（バリデーション）
  - equals()テスト

#### 対話プロンプト詳細

```bash
$ pnpm gen:vo

✔ Value Object名を入力してください（PascalCase、例: Email）:
  → 入力例: Email, Money, PhoneNumber, OrderStatus

✔ 内部値の型を選択してください:
  → string: 文字列（Email, PhoneNumber等）
  → number: 数値（Money, Age等）
  → boolean: 真偽値（IsActive等）
  → Date: 日付（BirthDate等）
```

#### 非対話式実行

```bash
pnpm gen:vo --name Email --type string
```

#### 生成コード例

**Value Objectクラス（string型）**:
```typescript
export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): Email {
    // TODO: バリデーションを実装してください
    // 例: メールアドレスの形式チェック
    if (!value || !value.includes('@')) {
      throw new Error('無効なメールアドレスです');
    }
    return new Email(value);
  }

  static reconstruct(value: string): Email {
    // DBから復元（バリデーション済み前提）
    return new Email(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }
}
```

---

## 3. テンプレート構造

### 3.1 テンプレートディレクトリの構成

各コマンドのテンプレートは以下の構造です:

```
_templates/{generator}/new/
├── prompt.js            # 対話プロンプト定義
├── {template1}.ejs.t    # ファイル生成テンプレート1
├── {template2}.ejs.t    # ファイル生成テンプレート2
└── inject_{target}.ejs.t # 既存ファイルへの注入テンプレート
```

### 3.2 prompt.js の構造

```javascript
module.exports = {
  prompt: ({ inquirer }) => {
    return inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'UseCase名を入力してください（PascalCase）:',
        validate: (input) => input.length > 0 || '名前は必須です',
      },
      {
        type: 'list',
        name: 'withRepository',
        message: 'Repositoryを注入しますか？',
        choices: ['yes', 'no'],
      },
      // ... 他のプロンプト
    ]);
  },
};
```

### 3.3 EJSテンプレートファイル（.ejs.t）

```ejs
---
to: src/layers/application/usecases/<%= h.toKebabCase(domain) %>/<%= name %>UseCase.ts
skip_if: <%= name %>UseCase
---
import { injectable<%= withRepository === 'yes' ? ', inject' : '' %> } from 'tsyringe';
<% if (withRepository === 'yes') { -%>
import { INJECTION_TOKENS } from '@/di/tokens';
import { I<%= repository %>Repository } from '@/layers/domain/repositories/I<%= repository %>Repository';
<% } -%>

// TODO: Request型を定義してください
export interface <%= name %>Request {
  // 例: userId: string;
}

// TODO: Response型を定義してください
export interface <%= name %>Response {
  // 例: success: boolean;
}

@injectable()
export class <%= name %>UseCase {
  constructor(
<% if (withRepository === 'yes') { -%>
    @inject(INJECTION_TOKENS.<%= repository %>Repository)
    private readonly <%= h.toCamelCase(repository) %>Repository: I<%= repository %>Repository,
<% } -%>
  ) {}

  async execute(request: <%= name %>Request): Promise<<%= name %>Response> {
    // TODO: ビジネスロジックを実装してください
    return {
      // TODO: レスポンスを返却
    };
  }
}
```

### 3.4 injectテンプレート（既存ファイル編集）

```ejs
---
to: src/di/tokens.ts
inject: true
after: "// [HYGEN:USECASE_TOKENS]"
skip_if: <%= name %>UseCase
---
  <%= name %>UseCase: Symbol('<%= name %>UseCase'),
```

---

## 4. DI登録の仕組み

### 4.1 マーカーコメントの役割

Hygenの `inject: true` 機能を使用するために、以下のマーカーコメントが必要です。

**src/di/tokens.ts**:
```typescript
export const INJECTION_TOKENS = {
  // [HYGEN:USECASE_TOKENS]
  CreateOrderUseCase: Symbol('CreateOrderUseCase'),
  // [HYGEN:REPO_TOKENS]
  OrderRepository: Symbol('OrderRepository'),
} as const;

export interface TypeMap {
  // [HYGEN:USECASE_TYPEMAP]
  CreateOrderUseCase: CreateOrderUseCase;
  // [HYGEN:REPO_TYPEMAP]
  OrderRepository: IOrderRepository;
}
```

**src/di/containers/application.container.ts**:
```typescript
// [HYGEN:USECASE_IMPORTS]
import { CreateOrderUseCase } from '@/layers/application/usecases/order/CreateOrderUseCase';

export function registerApplicationDependencies() {
  // [HYGEN:USECASE_REGISTER]
  container.register(
    INJECTION_TOKENS.CreateOrderUseCase,
    { useClass: CreateOrderUseCase }
  );
}
```

**src/di/containers/infrastructure.container.ts**:
```typescript
// [HYGEN:REPO_IMPORTS]
import { PrismaOrderRepository } from '@/layers/infrastructure/repositories/implementations/PrismaOrderRepository';

export function registerInfrastructureDependencies() {
  // [HYGEN:REPO_REGISTER]
  container.register(
    INJECTION_TOKENS.OrderRepository,
    { useClass: PrismaOrderRepository }
  );
}
```

### 4.2 自動注入の流れ

1. Hygenがテンプレートを実行
2. `inject: true` とマーカーコメントを検出
3. マーカーコメントの **直後** にコードを挿入
4. 既存のコードはそのまま維持

---

## 5. カスタマイズガイド

### 5.1 新しいジェネレーターの追加

```bash
# 1. テンプレートディレクトリを作成
mkdir -p _templates/my-generator/new

# 2. prompt.js を作成
cat > _templates/my-generator/new/prompt.js << 'EOF'
module.exports = {
  prompt: ({ inquirer }) => {
    return inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '名前を入力:',
      },
    ]);
  },
};
EOF

# 3. テンプレートファイルを作成
cat > _templates/my-generator/new/template.ejs.t << 'EOF'
---
to: src/custom/<%= name %>.ts
---
export class <%= name %> {
  // カスタムコード
}
EOF

# 4. package.jsonにスクリプト追加
{
  "scripts": {
    "gen:my": "hygen my-generator new"
  }
}
```

### 5.2 既存テンプレートの編集

例: UseCaseテンプレートにロガー注入を追加

```ejs
---
to: src/layers/application/usecases/<%= h.toKebabCase(domain) %>/<%= name %>UseCase.ts
---
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import { ILogger } from '@/layers/application/interfaces/ILogger';

@injectable()
export class <%= name %>UseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
  ) {}

  async execute(request: <%= name %>Request): Promise<<%= name %>Response> {
    this.logger.info(`<%= name %>UseCase executed`);
    // TODO: ビジネスロジック
  }
}
```

### 5.3 ヘルパー関数の追加

`.hygen.js` に新しいヘルパーを追加:

```javascript
module.exports = {
  helpers: {
    // 既存のヘルパー
    toPascalCase: (str) => { /* ... */ },
    toCamelCase: (str) => { /* ... */ },

    // 新規ヘルパー
    toPlural: (str) => {
      // 単数形 → 複数形に変換
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
      }
      return str + 's';
    },
  },
};
```

テンプレート内で使用:

```ejs
// <%= h.toPlural(name) %> テーブル
```

---

## 6. 実践例

### 6.1 E-CommerceシステムのOrder機能実装

#### Step 1: Entity生成

```bash
$ pnpm gen:entity --name Order
```

生成後、Entityクラスを編集:

```typescript
import { OrderId } from '@/layers/domain/value-objects/OrderId';
import { Money } from '@/layers/domain/value-objects/Money';
import { OrderStatus } from '@/layers/domain/value-objects/OrderStatus';

export class Order {
  constructor(
    private readonly _id: OrderId,
    private readonly _userId: string,
    private readonly _totalAmount: Money,
    private _status: OrderStatus,
    private readonly _createdAt: Date,
  ) {}

  get id(): OrderId { return this._id; }
  get userId(): string { return this._userId; }
  get totalAmount(): Money { return this._totalAmount; }
  get status(): OrderStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }

  // ドメインロジック: ステータス変更
  changeStatus(newStatus: OrderStatus): void {
    if (this._status.equals(OrderStatus.CANCELLED)) {
      throw new Error('キャンセル済みの注文は変更できません');
    }
    this._status = newStatus;
  }
}
```

#### Step 2: Value Object生成

```bash
$ pnpm gen:vo --name OrderStatus --type string
```

生成後、OrderStatusクラスを編集:

```typescript
export class OrderStatus {
  static readonly PENDING = new OrderStatus('pending');
  static readonly CONFIRMED = new OrderStatus('confirmed');
  static readonly SHIPPED = new OrderStatus('shipped');
  static readonly DELIVERED = new OrderStatus('delivered');
  static readonly CANCELLED = new OrderStatus('cancelled');

  private constructor(private readonly _value: string) {}

  static create(value: string): OrderStatus {
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(value)) {
      throw new Error(`無効なステータス: ${value}`);
    }
    return new OrderStatus(value);
  }

  static reconstruct(value: string): OrderStatus {
    return new OrderStatus(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: OrderStatus): boolean {
    return this._value === other._value;
  }
}
```

#### Step 3: Prismaスキーマ更新

```prisma
model Order {
  id          String   @id
  userId      String
  totalAmount Decimal  @db.Decimal(10, 2)
  currency    String   @default("JPY")
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

```bash
$ pnpm db:migrate:dev --name add_order_table
```

#### Step 4: Repository生成

```bash
$ pnpm gen:repo --name Order
```

生成後、PrismaOrderRepositoryを編集:

```typescript
private toDomain(prismaOrder: PrismaOrder): Order {
  return new Order(
    OrderId.reconstruct(prismaOrder.id),
    prismaOrder.userId,
    Money.create(Number(prismaOrder.totalAmount), prismaOrder.currency),
    OrderStatus.reconstruct(prismaOrder.status),
    prismaOrder.createdAt,
  );
}

private toPrisma(order: Order): Omit<PrismaOrder, 'createdAt' | 'updatedAt'> {
  return {
    id: order.id.value,
    userId: order.userId,
    totalAmount: order.totalAmount.amount,
    currency: order.totalAmount.currency,
    status: order.status.value,
  };
}
```

#### Step 5: UseCase生成

```bash
$ pnpm gen:usecase \
  --name CreateOrder \
  --domain order \
  --withRepository true \
  --repository Order
```

生成後、CreateOrderUseCaseを編集:

```typescript
export interface CreateOrderRequest {
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

export interface CreateOrderResponse {
  orderId: string;
  totalAmount: number;
  status: string;
}

@injectable()
export class CreateOrderUseCase {
  constructor(
    @inject(INJECTION_TOKENS.OrderRepository)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(request: CreateOrderRequest): Promise<Result<CreateOrderResponse>> {
    try {
      // 合計金額を計算
      const totalAmount = request.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Orderエンティティを作成
      const order = new Order(
        OrderId.create(),
        request.userId,
        Money.create(totalAmount, 'JPY'),
        OrderStatus.PENDING,
        new Date(),
      );

      // 永続化
      await this.orderRepository.save(order);

      return success({
        orderId: order.id.value,
        totalAmount: order.totalAmount.amount,
        status: order.status.value,
      });
    } catch (error) {
      return failure('注文の作成に失敗しました', 'CREATE_ORDER_FAILED');
    }
  }
}
```

#### Step 6: Server Action生成

```bash
$ pnpm gen:action \
  --name createOrder \
  --domain order \
  --usecase CreateOrder
```

生成後、createOrder Server Actionを編集:

```typescript
'use server';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';
import {
  CreateOrderUseCase,
  type CreateOrderRequest,
} from '@/layers/application/usecases/order/CreateOrderUseCase';

export async function createOrder(formData: FormData) {
  const items = JSON.parse(formData.get('items') as string);

  const request: CreateOrderRequest = {
    userId: formData.get('userId') as string,
    items,
  };

  const useCase = resolve('CreateOrderUseCase');
  const result = await useCase.execute(request);

  if (isSuccess(result)) {
    return {
      success: true,
      data: result.value,
    };
  } else {
    return {
      success: false,
      error: result.error,
    };
  }
}
```

#### Step 7: 検証

```bash
$ pnpm type-check
$ pnpm test:unit
$ pnpm check
```

---

## 7. トラブルシューティング詳細

### 7.1 DI登録が失敗する

**症状**:
```
Error: Token not found: CreateOrderUseCase
```

**原因と解決策**:

1. **マーカーコメントが削除された**
   - 解決: `src/di/tokens.ts` と `src/di/containers/*.container.ts` にマーカーコメントを追加

2. **inject が実行されなかった**
   - 解決: 手動で `INJECTION_TOKENS` と `container.register()` を追加

3. **TypeMapにマッピングがない**
   ```typescript
   // src/di/tokens.ts に追加
   export interface TypeMap {
     CreateOrderUseCase: CreateOrderUseCase;
   }
   ```

### 7.2 型エラーが解決しない

**症状**:
```
Type 'undefined' is not assignable to type 'CreateOrderRequest'
```

**原因と解決策**:

1. **TODOコメント箇所が未実装**
   - 解決: Request/Response型を定義

2. **循環参照が発生している**
   - 解決: import文を見直し、依存方向を修正

3. **Prismaクライアントが古い**
   ```bash
   pnpm db:generate
   ```

### 7.3 テストが失敗する

**症状**:
```
Cannot find module '@/layers/domain/entities/Order'
```

**原因と解決策**:

1. **ファイルが生成されていない**
   - 解決: Entity/Repository が存在するか確認

2. **setupTestEnvironment()が呼ばれていない**
   ```typescript
   import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

   describe('UseCase', () => {
     setupTestEnvironment(); // 必須
   });
   ```

3. **モックが正しく設定されていない**
   ```typescript
   mockRepo.findById.mockResolvedValue(null); // 成功
   mockRepo.findById.mockRejectedValue(new Error()); // 失敗
   ```

### 7.4 Prismaマイグレーションエラー

**症状**:
```
Error: P2002: Unique constraint failed on the fields: (`id`)
```

**原因と解決策**:

1. **既存データと競合**
   ```bash
   pnpm db:migrate:reset
   ```

2. **スキーマが不正**
   - 解決: `prisma/schema.prisma` を確認

3. **マイグレーションファイルが壊れている**
   ```bash
   rm -rf prisma/migrations
   pnpm db:migrate:dev --name init
   ```

---

## 参考リンク

- [Hygen公式ドキュメント](https://www.hygen.io/)
- [プロジェクトアーキテクチャ](/_DOCS/architecture/overview.md)
- [UseCase実装ガイド](/_DOCS/guides/ddd/layers/components/use-cases.md)
- [Repository実装ガイド](/_DOCS/guides/ddd/layers/components/repository-implementations.md)
- [Clean Architecture + DDD](/_DOCS/guides/ddd/concepts/)

---

**このガイドを参考に、効率的なコード生成ワークフローを構築してください。**
