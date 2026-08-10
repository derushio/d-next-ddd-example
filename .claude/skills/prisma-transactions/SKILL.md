---
name: prisma-transactions
description: |
  Prisma トランザクションパターンを提供するスキル。
  $transaction() によるアトミック操作、Clean Architecture での
  UseCase → Repository トランザクション引き渡しパターンを扱う。

  トリガー例:
  - 「トランザクション」「$transaction」「アトミック」「整合性」
  - 複数の Repository メソッドを一つの処理にまとめるとき
  - UseCase で save と delete を組み合わせるとき

globs:
  - "src/layers/application/usecases/**/*.ts"
  - "src/layers/infrastructure/repositories/**/*.ts"
---

# Prisma トランザクションパターン スキル

Clean Architecture における Prisma トランザクションの設計と実装パターン集。

---

## 1. Interactive vs Sequential Transactions の使い分け

Prisma には2種類のトランザクション方式がある。

### Interactive Transaction（インタラクティブトランザクション）— 推奨

トランザクション内でロジックを実行できる。失敗時は自動ロールバック。
**Clean Architecture での標準パターン。**

```typescript
// UseCase でトランザクションを開始し、tx を Repository に渡す
await prisma.$transaction(async (tx) => {
  await orderRepository.save(order, tx);
  await inventoryRepository.reduce(productId, quantity, tx);
});
```

### Sequential Transaction（バッチトランザクション）

複数の Prisma 操作をアトミックに実行するだけでよい場合（ロジックが不要な場合）。
Repository 実装の内部で使用するケース。

```typescript
// ロジックなしで複数の write をアトミックにまとめる
await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.inventory.update({ where: { id }, data: { quantity: newQty } }),
]);
```

### 使い分けフロー

```
トランザクション内でロジックが必要か？
（条件分岐・エラーハンドリング・データの読み取り結果に基づく操作）
  YES → Interactive Transaction（$transaction(async (tx) => {...})）
  NO  → Sequential Transaction（$transaction([...])）でもよいが
        一般的に Interactive の方が将来的な拡張に強い
```

---

## 2. UseCase → Repository トランザクション引き渡しパターン

**原則: トランザクションの責務は UseCase にある。Repository はトランザクションを知らない。**

```
UseCase が $transaction() を開始
  └── tx（TransactionClient）を Repository メソッドの引数として渡す
        └── Repository はトランザクション内で操作を実行
```

### Repository インターフェース定義

```typescript
// src/layers/domain/repositories/IOrderRepository.ts
import type { Prisma } from '@prisma/client';

// TransactionClient 型のエイリアスを定義
type TransactionClient = Prisma.TransactionClient;

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;
}
```

### Repository 実装

```typescript
// src/layers/infrastructure/repositories/PrismaOrderRepository.ts
import { injectable } from 'tsyringe';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { IOrderRepository } from '@/layers/domain/repositories/IOrderRepository';
import { TOKENS } from '@/di/tokens';
import { inject } from 'tsyringe';

type TransactionClient = Prisma.TransactionClient;

@injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(
    @inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { id } });
    return record ? OrderMapper.toDomain(record) : null;
  }

  // ✅ tx を受け取り、あれば tx を、なければ this.prisma を使う
  async save(order: Order, tx?: TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.order.upsert({
      where: { id: order.id.value },
      create: OrderMapper.toPrismaCreate(order),
      update: OrderMapper.toPrismaUpdate(order),
    });
  }

  async delete(id: string, tx?: TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.order.delete({ where: { id } });
  }
}
```

### UseCase 実装（トランザクション開始側）

```typescript
// src/layers/application/usecases/order/PlaceOrderUseCase.ts
import { injectable } from 'tsyringe';
import { inject } from 'tsyringe';
import type { PrismaClient } from '@prisma/client';
import { ResultAsync, okAsync, errAsync } from 'neverthrow';
import type { AppError } from '@/layers/application/types/Result';
import { TOKENS } from '@/di/tokens';

@injectable()
export class PlaceOrderUseCase {
  constructor(
    @inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient,
    @inject(TOKENS.OrderRepository) private readonly orderRepo: IOrderRepository,
    @inject(TOKENS.InventoryRepository) private readonly inventoryRepo: IInventoryRepository,
  ) {}

  async execute(req: PlaceOrderRequest): Promise<ResultAsync<PlaceOrderResponse, AppError>> {
    // バリデーション
    const parseResult = placeOrderSchema.safeParse(req);
    if (!parseResult.success) {
      return errAsync({ code: 'VALIDATION_ERROR', message: parseResult.error.message });
    }

    try {
      // ✅ UseCase がトランザクションを開始し、tx を Repository に渡す
      const result = await this.prisma.$transaction(async (tx) => {
        // 在庫確認
        const inventory = await this.inventoryRepo.findByProductId(req.productId, tx);
        if (!inventory || inventory.quantity < req.quantity) {
          throw new Error('INSUFFICIENT_INVENTORY'); // $transaction 内の throw は自動ロールバック
        }

        // 注文作成
        const order = Order.create({
          userId: req.userId,
          productId: req.productId,
          quantity: req.quantity,
        });

        // 在庫減少
        inventory.reduce(req.quantity);

        // 同一トランザクション内で両方を保存
        await this.orderRepo.save(order, tx);
        await this.inventoryRepo.save(inventory, tx);

        return order;
      });

      return okAsync({ orderId: result.id.value });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_INVENTORY') {
        return errAsync({ code: 'INSUFFICIENT_INVENTORY', message: '在庫が不足しています。' });
      }
      return errAsync({ code: 'INTERNAL_ERROR', message: '注文処理に失敗しました。' });
    }
  }
}
```

---

## 3. TransactionClient 型の取り扱い

```typescript
// ✅ 推奨: Prisma.TransactionClient をそのまま使う
import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

// Repository の引数型
async save(entity: SomeEntity, tx?: TransactionClient): Promise<void> {
  const client = tx ?? this.prisma;
  // ...
}
```

```typescript
// ✅ 共通型として src/layers/infrastructure/types/prisma.ts に定義する場合
// src/layers/infrastructure/types/prisma.ts
import type { Prisma } from '@prisma/client';

export type TransactionClient = Prisma.TransactionClient;
export type PrismaTransactionFn<T> = (tx: TransactionClient) => Promise<T>;
```

---

## 4. 複数 Repository を同一トランザクションで操作する例

より複雑な業務ロジック（複数のドメイン更新）の例。

```typescript
// src/layers/application/usecases/user/DeleteUserUseCase.ts
@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient,
    @inject(TOKENS.UserRepository) private readonly userRepo: IUserRepository,
    @inject(TOKENS.OrderRepository) private readonly orderRepo: IOrderRepository,
    @inject(TOKENS.ProfileRepository) private readonly profileRepo: IProfileRepository,
  ) {}

  async execute(req: DeleteUserRequest): Promise<ResultAsync<void, AppError>> {
    const parseResult = deleteUserSchema.safeParse(req);
    if (!parseResult.success) {
      return errAsync({ code: 'VALIDATION_ERROR', message: parseResult.error.message });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // ユーザー存在確認（トランザクション内で読み取り）
        const user = await this.userRepo.findById(req.userId, tx);
        if (!user) throw new Error('USER_NOT_FOUND');

        // 関連データを同一トランザクションで削除
        await this.orderRepo.deleteByUserId(req.userId, tx);
        await this.profileRepo.deleteByUserId(req.userId, tx);
        await this.userRepo.delete(req.userId, tx);
        // いずれかが失敗 → 全て自動ロールバック
      });

      return okAsync(undefined);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'USER_NOT_FOUND') {
          return errAsync({ code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません。' });
        }
      }
      return errAsync({ code: 'INTERNAL_ERROR', message: '削除処理に失敗しました。' });
    }
  }
}
```

---

## 5. エラーハンドリング: $transaction 内の throw は自動ロールバック

```typescript
// ✅ $transaction 内で throw すると全操作が自動ロールバックされる
await prisma.$transaction(async (tx) => {
  await orderRepo.save(order, tx);

  // ここで例外が発生 → orderRepo.save も含めて全てロールバック
  throw new Error('何かのエラー');

  await inventoryRepo.save(inventory, tx); // 実行されない
});
```

```typescript
// ✅ Prisma のエラー（P2002 等）も自動ロールバック対象
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData }); // ← ここで PrismaClientKnownRequestError が発生
  // user.create も含めてロールバック
});
```

### $transaction 内でのエラー分類

```typescript
try {
  await this.prisma.$transaction(async (tx) => {
    const user = await this.userRepo.findById(userId, tx);

    // ビジネスロジックエラー → 独自エラーメッセージで throw
    if (!user) throw new Error('USER_NOT_FOUND');
    if (!user.canBeDeleted()) throw new Error('USER_HAS_ACTIVE_ORDERS');

    await this.userRepo.delete(userId, tx);
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma エラー（外部キー制約等）
    return errAsync({ code: 'DB_CONSTRAINT_ERROR', message: 'DB制約エラー' });
  }
  if (error instanceof Error) {
    // ビジネスロジックエラー
    switch (error.message) {
      case 'USER_NOT_FOUND':
        return errAsync({ code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません。' });
      case 'USER_HAS_ACTIVE_ORDERS':
        return errAsync({ code: 'USER_HAS_ACTIVE_ORDERS', message: 'アクティブな注文があるため削除できません。' });
    }
  }
  return errAsync({ code: 'INTERNAL_ERROR', message: 'トランザクション処理に失敗しました。' });
}
```

---

## 6. 禁止パターン

```typescript
// ❌ 禁止: Repository 内で $transaction を開始する（責務違反）
@injectable()
export class BadPrismaOrderRepository {
  async saveWithInventory(order: Order, inventory: Inventory): Promise<void> {
    // ❌ Repository がトランザクションを管理している
    await this.prisma.$transaction(async (tx) => {
      await tx.order.upsert({ ... });
      await tx.inventory.update({ ... }); // ❌ 別 Repository の操作を自分でやっている
    });
  }
}
// → UseCase がトランザクションを開始し、tx を各 Repository に渡すこと

// ❌ 禁止: UseCase 内で tx なしで複数の Repository を呼ぶ（非アトミック）
async execute(req: Request) {
  await this.orderRepo.save(order);      // ← 成功
  await this.inventoryRepo.reduce(...);  // ← 失敗してもorderは残ってしまう
  // → $transaction でアトミックにすること
}

// ❌ 禁止: ネストトランザクション（Prisma は基本非対応）
await this.prisma.$transaction(async (tx) => {
  await this.prisma.$transaction(async (innerTx) => { // ❌ ネストは不可
    // ...
  });
});

// ❌ 禁止: tx を使わずに this.prisma を直接呼ぶ（トランザクション外になる）
async save(order: Order, tx?: TransactionClient): Promise<void> {
  // tx が渡されていても this.prisma を使うとトランザクション外になる
  await this.prisma.order.upsert({ ... }); // ❌ tx を無視している
}
// → const client = tx ?? this.prisma; を必ず使うこと
```

---

## チェックリスト

- [ ] 複数の Repository 操作をまとめる必要がある場合は `$transaction` を使っているか？
- [ ] `$transaction` は UseCase で開始し、`tx` を Repository の引数として渡しているか？
- [ ] Repository メソッドの引数に `tx?: TransactionClient` を追加しているか？
- [ ] Repository 内で `const client = tx ?? this.prisma;` を使っているか？
- [ ] Repository 内で独自に `$transaction` を呼んでいないか（責務違反）？
- [ ] `$transaction` 内のエラーを UseCase の catch で適切にハンドリングしているか？
- [ ] ネストトランザクションを避けているか？

---

## 関連スキル

- `prisma-error-handling` — Prisma ランタイムエラーのハンドリングパターン
- `infrastructure-impl` — Repository 実装パターン
- `application-impl` — UseCase 実装パターン
- `prisma-v7-patterns` — Prisma 7 固有の機能・設定パターン
- `resultasync-patterns` — UseCase での ResultAsync 使用パターン
