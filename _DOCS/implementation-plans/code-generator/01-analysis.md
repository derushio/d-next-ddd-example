# プロジェクト分析結果

## 分析日

2026-01-08

## プロジェクト構造

```
src/
├── app/
│   └── server-actions/     # Server Actions（Presentation層）
├── layers/
│   ├── application/
│   │   ├── usecases/       # UseCase（ビジネスロジック調整）
│   │   ├── services/       # Application Service
│   │   ├── interfaces/     # アプリケーション層のインターフェース
│   │   └── types/          # Result型など
│   ├── domain/
│   │   ├── entities/       # Entity
│   │   ├── value-objects/  # Value Object
│   │   ├── repositories/   # Repository Interface
│   │   ├── services/       # Domain Service
│   │   └── errors/         # DomainError
│   └── infrastructure/
│       ├── repositories/implementations/  # Repository実装
│       └── services/       # Infrastructure Service
├── di/
│   ├── tokens.ts           # DI Token定義
│   ├── resolver.ts         # resolve関数
│   ├── container.ts        # メインコンテナ
│   └── containers/         # レイヤー別コンテナ
└── components/
    ├── features/           # 機能別コンポーネント
    └── ui/                 # shadcn/ui
```

## 生成対象パターン分析

### 1. UseCase パターン

**ファイル**: `src/layers/application/usecases/{domain}/{Name}UseCase.ts`

```typescript
// 構造パターン
import { INJECTION_TOKENS } from '@/di/tokens';
import { failure, type Result, success } from '@/layers/application/types/Result';
import { inject, injectable } from 'tsyringe';

export interface {Name}Request {
  // リクエストプロパティ
}

export interface {Name}Response {
  // レスポンスプロパティ
}

@injectable()
export class {Name}UseCase {
  constructor(
    @inject(INJECTION_TOKENS.{Repository}) private {repository}: I{Repository},
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(request: {Name}Request): Promise<Result<{Name}Response>> {
    try {
      // ビジネスロジック
      return success(response);
    } catch (error) {
      // エラーハンドリング
      return failure(message, code);
    }
  }
}
```

**特徴**:

- `@injectable()` デコレーター必須
- `INJECTION_TOKENS` からDI
- `Result<T>` 型でエラーハンドリング
- Request/Response インターフェース同ファイル定義

---

### 2. Entity パターン

**ファイル**: `src/layers/domain/entities/{Name}.ts`

```typescript
// 構造パターン
import { DomainError } from '@/layers/domain/errors/DomainError';
import { generate{Name}Id, type {Name}Id } from '@/layers/domain/value-objects/{Name}Id';

export class {Name} {
  private constructor(
    public readonly id: {Name}Id,
    // プロパティ
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  // ファクトリーメソッド：新規作成
  static create(...): {Name} {
    const now = new Date();
    return new {Name}(generate{Name}Id(), ..., now, now);
  }

  // ファクトリーメソッド：再構築（DB復元）
  static reconstruct(...): {Name} {
    return new {Name}(...);
  }

  // ビジネスメソッド（immutable）
  update{Property}(...): {Name} {
    return new {Name}(..., new Date());
  }

  private validateInvariants(): void {
    // 不変条件検証
  }
}
```

**特徴**:

- private constructor
- `create()` / `reconstruct()` ファクトリーメソッド
- immutable パターン
- `validateInvariants()` で不変条件検証

---

### 3. Value Object パターン

**ファイル**: `src/layers/domain/value-objects/{Name}.ts`

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';

export class {Name} {
  public readonly value: {Type};

  constructor(value: {Type}) {
    this.validate(value);
    this.value = value;
  }

  toString(): string {
    return String(this.value);
  }

  equals(other: {Name}): boolean {
    return this.value === other.value;
  }

  private validate(value: {Type}): void {
    // バリデーションロジック
  }
}
```

**特徴**:

- 単一の `value` プロパティ
- `toString()`, `equals()` メソッド
- コンストラクタでバリデーション

---

### 4. Repository Interface パターン

**ファイル**: `src/layers/domain/repositories/I{Name}Repository.ts`

```typescript
import type { {Name} } from '@/layers/domain/entities/{Name}';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type { {Name}Id } from '@/layers/domain/value-objects/{Name}Id';

export interface I{Name}Repository {
  findById(id: {Name}Id, transaction?: ITransaction): Promise<{Name} | null>;
  save(entity: {Name}, transaction?: ITransaction): Promise<void>;
  update(entity: {Name}, transaction?: ITransaction): Promise<void>;
  delete(id: {Name}Id): Promise<void>;
}
```

**特徴**:

- `I` プレフィックス
- `ITransaction` オプション対応
- 標準CRUD操作

---

### 5. Repository 実装パターン

**ファイル**: `src/layers/infrastructure/repositories/implementations/Prisma{Name}Repository.ts`

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import { {Name} } from '@/layers/domain/entities/{Name}';
import type { I{Name}Repository } from '@/layers/domain/repositories/I{Name}Repository';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { inject, injectable } from 'tsyringe';

@injectable()
export class Prisma{Name}Repository implements I{Name}Repository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  private getClient(transaction?: ITransaction): PrismaClient {
    return (transaction as unknown as PrismaClient) || this.prisma;
  }

  async findById(id: {Name}Id, transaction?: ITransaction): Promise<{Name} | null> {
    // 実装
  }

  // toDomainObject / toPersistenceObject 変換メソッド
}
```

**特徴**:

- `Prisma` プレフィックス
- `@injectable()` デコレーター
- `getClient()` トランザクション対応
- ドメイン⇔永続化オブジェクト変換

---

### 6. Server Action パターン

**ファイル**: `src/app/server-actions/{domain}/{actionName}.ts`

```typescript
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  // バリデーションスキーマ
});

export async function {actionName}(formData: FormData) {
  try {
    const logger = resolve('Logger');

    // バリデーション
    const validated = schema.safeParse({...});
    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    // UseCase実行
    const useCase = resolve('{Name}UseCase');
    const result = await useCase.execute(validated.data);

    if (isSuccess(result)) {
      revalidatePath('/path');
      return success(result.data);
    } else {
      return failure(result.error.message, result.error.code);
    }
  } catch (error) {
    return failure('システムエラー', 'SYSTEM_ERROR');
  }
}
```

**特徴**:

- `'use server'` ディレクティブ
- `reflect-metadata` import
- Zod バリデーション
- `resolve()` でDI
- `revalidatePath()` キャッシュ再検証

---

### 7. DI Token パターン

**ファイル**: `src/di/tokens.ts`

```typescript
// Token定義
export const INJECTION_TOKENS = {
  {Name}Repository: Symbol.for('{Name}Repository'),
  {Name}UseCase: Symbol.for('{Name}UseCase'),
} as const;

// 型マッピング
export interface ServiceTypeMap {
  {Name}Repository: I{Name}Repository;
  {Name}UseCase: {Name}UseCase;
}
```

**注入ポイント**:

- `INJECTION_TOKENS` オブジェクトに追加
- `ServiceTypeMap` に型マッピング追加

---

### 8. Container 登録パターン

**ファイル**: `src/di/containers/{layer}.container.ts`

```typescript
safeRegister(INJECTION_TOKENS.{Name}UseCase, {Name}UseCase);
```

**注入ポイント**:

- 該当レイヤーのコンテナファイルに追加
- import 文も追加

---

## テストパターン分析

### UseCase テストパターン

**ファイル**: `tests/unit/usecases/{domain}/{Name}UseCase.test.ts`

```typescript
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMock{Repository} } from '@tests/utils/mocks/autoMocks';

describe('{Name}UseCase', () => {
  let useCase: {Name}UseCase;
  let mockRepository: MockProxy<I{Repository}>;
  let mockLogger: MockProxy<ILogger>;

  setupTestEnvironment();

  beforeEach(() => {
    mockRepository = createAutoMock{Repository}();
    mockLogger = createAutoMockLogger();

    container.registerInstance(INJECTION_TOKENS.{Repository}, mockRepository);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    useCase = resolve('{Name}UseCase');
  });

  describe('execute', () => {
    it('should succeed', async () => {
      // Arrange
      mockRepository.method.mockResolvedValue(data);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(isSuccess(result)).toBe(true);
    });
  });
});
```

---

## 生成対象サマリー

| 生成ジェネレーター | 生成ファイル数 | DI登録 |
|------------------|---------------|--------|
| usecase | 2（実装+テスト） | ✅ |
| entity | 3（Entity+Id+テスト） | - |
| value-object | 2（VO+テスト） | - |
| repository | 3（Interface+実装+テスト） | ✅ |
| server-action | 2（実装+テスト） | - |
| feature | 4（Component+テスト+Storybook+index） | - |

---

## 次のステップ

→ [02-tool-selection.md](./02-tool-selection.md) でツール選定詳細を確認
