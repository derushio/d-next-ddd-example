---
name: test-factory-patterns
description: |
  テストデータ生成のベストプラクティス。fishery + @faker-js/faker を使った
  型安全なファクトリーパターンを提供する。ハードコードされた固定値を避け、
  ランダムかつ再現性のあるテストデータを生成する実装パターン。

  トリガー例:
  - 「テストファクトリー」「faker」「fishery」「テストデータ生成」
  - 「Factory.define」「buildList」「transient」
  - tests/utils/factories/ 配下のファイル作成・編集時
  - 「ファクトリーを作りたい」「テストデータを型安全に生成したい」
---

# Test Factory Patterns Skill

`fishery` + `@faker-js/faker` を使った型安全なテストデータ生成パターンを提供します。

---

## このスキルの目的

- **型安全なファクトリー定義**: `Factory.define<Type>()` による完全型対応
- **ランダム生成**: `@faker-js/faker` によるリアルなダミーデータ
- **再現性**: Vitest の `faker.seed()` によるシード固定
- **2種類のファクトリー**: ドメインエンティティ用 vs Prisma生データ用

---

## 基本パターン

### ファクトリー定義

```typescript
// tests/utils/factories/userFactory.ts
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { Email } from '@/layers/domain/value-objects/Email';
import { User } from '@/layers/domain/entities/User';

type UserTransientParams = {
  emailValue?: string;
  passwordHash?: string;
};

export const userFactory = Factory.define<User, UserTransientParams>(
  ({ transientParams }) => {
    const emailValue =
      transientParams.emailValue ?? faker.internet.email().toLowerCase();
    const passwordHash =
      transientParams.passwordHash ?? `hashed_${faker.string.alphanumeric(32)}`;
    return User.create(
      new Email(emailValue),
      faker.person.fullName(),
      passwordHash,
    );
  },
);
```

### Prisma生データ用ファクトリー

```typescript
// tests/utils/factories/userFactory.ts (userPrismaDataFactory も同一ファイルに定義)
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { UserId } from '@/layers/domain/value-objects/UserId';

type PrismaUserData = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export const userPrismaDataFactory = Factory.define<PrismaUserData>(() => {
  const createdAt = faker.date.past({ years: 1 });
  return {
    id: new UserId(faker.string.alphanumeric({ length: 24, casing: 'lower' }))
      .value,
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    passwordHash: `hashed_${faker.string.alphanumeric(32)}`,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
  };
});
```

### index.ts でエクスポート

```typescript
// tests/utils/factories/index.ts
// userPrismaDataFactory は userFactory と同一ファイル（userFactory.ts）に定義されている
export { userFactory, userPrismaDataFactory } from './userFactory';
export {
  userSessionFactory,
  userSessionPrismaDataFactory,
} from './userSessionFactory';
```

---

## 使い方

### 基本的なビルド

```typescript
import { userFactory, userPrismaDataFactory } from '@tests/utils/factories';

// ドメインエンティティ（Application/Domain層のテスト）
const user = userFactory.build();

// transient params でカスタマイズ
const user = userFactory.build({}, { transient: { emailValue: 'alice@example.com' } });

// Prismaが返す生データ形式（Infrastructure層のテスト）
const prismaUser = userPrismaDataFactory.build();
const prismaUser = userPrismaDataFactory.build({ email: 'alice@example.com' });
```

### 複数件生成

```typescript
// 3件のユーザーを生成
const users = userFactory.buildList(3);

// 特定メールアドレスのみ指定
const testUsers = [
  userFactory.build({}, { transient: { emailValue: 'john@example.com' } }),
  userFactory.build({}, { transient: { emailValue: 'jane@example.com' } }),
];
```

---

## 2種類のファクトリーの使い分け

| ファクトリー | 生成される型 | 使用シーン |
|------------|------------|----------|
| `userFactory` | `User`（ドメインエンティティ） | UseCase・Domain層のテスト |
| `userPrismaDataFactory` | `PrismaUserData`（plain object） | Repository実装のテスト（Prismaモックの戻り値） |
| `userSessionFactory` | `UserSession`（ドメインエンティティ） | UseCase・Domain層のテスト |
| `userSessionPrismaDataFactory` | `PrismaUserSessionData`（plain object） | Repository実装のテスト |

---

## Infrastructure層での使用例

```typescript
import { userPrismaDataFactory } from '@tests/utils/factories';

it('ユーザーを取得できる', async () => {
  const prismaUser = userPrismaDataFactory.build({ email: 'test@example.com' });
  mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

  const user = await repository.findByEmail(new Email('test@example.com'));

  expect(user?.email.value).toBe('test@example.com');
});
```

---

## Vitestでのシード設定（再現性）

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});

// tests/setup.ts
import 'reflect-metadata';
import '@testing-library/jest-dom';
import { container } from 'tsyringe';
import { faker } from '@faker-js/faker';
import { beforeEach } from 'vitest';

// テスト前にコンテナをクリア・fakerシードをリセット（再現性確保）
beforeEach(() => {
  container.clearInstances();
  faker.seed(12345);
});
```

---

## 新規エンティティ用ファクトリーの作成規則

新規エンティティ（例: `Product`）を追加した場合:

1. `tests/utils/factories/productFactory.ts` を作成
2. `tests/utils/factories/index.ts` にエクスポートを追加

```typescript
// tests/utils/factories/productFactory.ts
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { Product } from '@/layers/domain/entities/Product';

type ProductTransientParams = {
  nameValue?: string;
};

export const productFactory = Factory.define<Product, ProductTransientParams>(
  ({ transientParams }) => {
    const name = transientParams.nameValue ?? faker.commerce.productName();
    return Product.create(name, faker.number.int({ min: 1, max: 10000 }));
  },
);
```

---

## 禁止パターン: テストファイルでの Entity 直接構築

```typescript
// ❌ 禁止: テストで User.reconstruct() を直接呼ぶ
const user = User.reconstruct(
  new UserId('existinguseridcuid12'),
  new Email('test@example.com'),
  'Test Name', 'hashed', new Date(), new Date(),
);

// ❌ 禁止: createMockUser() ヘルパーで User.reconstruct() を包む
function createMockUser() { return User.reconstruct(...); }

// ✅ 正しい: userFactory.build()
const user = userFactory.build();

// ✅ 正しい: transient params で特定値を指定
const user = userFactory.build({}, { transient: { emailValue: 'old@example.com' } });
const user = userFactory.build({}, { transient: { passwordHash: 'hashed_xxx' } });
```

**例外**: テストが特定の ID 値を exact アサートする場合のみ `User.reconstruct()` を許容。
ただし最小限にとどめること。

**デッドコード禁止**: `userFactory.build()` の戻り値は必ず使用すること。

---

## 禁止事項

```typescript
// ❌ 禁止: ハードコードされた固定値
const user = User.create(new Email('test@example.com'), 'Test User', 'pass');

// ❌ 禁止: createTestUser / createTestSession（deprecated）
// 新しいテストではファクトリーを使用すること

// ✅ 正しい: ファクトリーでランダム生成
const user = userFactory.build();

// ✅ 正しい: 特定値が必要な場合のみ transient params で指定
const user = userFactory.build({}, { transient: { emailValue: 'alice@example.com' } });
```

---

## チェックリスト

- [ ] `Factory.define<Type, TransientParams>()` で型安全に定義している
- [ ] `faker.*` を使ってランダム値を生成している（固定値は避ける）
- [ ] transient params でカスタマイズ可能にしている
- [ ] ドメインエンティティ用とPrisma生データ用を分けている
- [ ] `tests/utils/factories/index.ts` にエクスポートを追加している
- [ ] `@tests/utils/factories` からimportしている
- [ ] Vitestのシード設定で再現性を確保している
