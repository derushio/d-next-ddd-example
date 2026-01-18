# テンプレート仕様

## 1. UseCase テンプレート

### 1.1 UseCase本体

**ファイル**: `_templates/usecase/new/usecase.ejs.t`

```ejs
---
to: src/layers/application/usecases/<%= domain %>/<%= Name %>UseCase.ts
---
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
<% if (locals.repository) { -%>
import type { I<%= Repository %>Repository } from '@/layers/domain/repositories/I<%= Repository %>Repository';
<% } -%>
import { DomainError } from '@/layers/domain/errors/DomainError';

import { inject, injectable } from 'tsyringe';

export interface <%= Name %>Request {
  // TODO: リクエストプロパティを定義
}

export interface <%= Name %>Response {
  // TODO: レスポンスプロパティを定義
}

@injectable()
export class <%= Name %>UseCase {
  constructor(
<% if (locals.repository) { -%>
    @inject(INJECTION_TOKENS.<%= Repository %>Repository)
    private <%= h.toCamelCase(repository) %>Repository: I<%= Repository %>Repository,
<% } -%>
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(
    request: <%= Name %>Request,
  ): Promise<Result<<%= Name %>Response>> {
    this.logger.info('<%= Name %> 開始', { request });

    try {
      // TODO: ビジネスロジックを実装

      this.logger.info('<%= Name %> 完了');

      return success({
        // TODO: レスポンスを返す
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('<%= Name %> 失敗', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      if (error instanceof Error) {
        return failure(error.message, '<%= NAME %>_FAILED');
      }

      return failure('処理に失敗しました', '<%= NAME %>_FAILED');
    }
  }
}
```

---

### 1.2 UseCase テスト

**ファイル**: `_templates/usecase/new/test.ejs.t`

```ejs
---
to: tests/unit/usecases/<%= domain %>/<%= Name %>UseCase.test.ts
---
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import type { <%= Name %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= Name %>UseCase';
<% if (locals.repository) { -%>
import type { I<%= Repository %>Repository } from '@/layers/domain/repositories/I<%= Repository %>Repository';
<% } -%>
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { container } from '@/di/container';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
<% if (locals.repository) { -%>
  createAutoMock<%= Repository %>Repository,
<% } -%>
  createAutoMockLogger,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('<%= Name %>UseCase', () => {
  let useCase: <%= Name %>UseCase;
<% if (locals.repository) { -%>
  let mock<%= Repository %>Repository: MockProxy<I<%= Repository %>Repository>;
<% } -%>
  let mockLogger: MockProxy<ILogger>;

  setupTestEnvironment();

  beforeEach(() => {
<% if (locals.repository) { -%>
    mock<%= Repository %>Repository = createAutoMock<%= Repository %>Repository();
<% } -%>
    mockLogger = createAutoMockLogger();

<% if (locals.repository) { -%>
    container.registerInstance(
      INJECTION_TOKENS.<%= Repository %>Repository,
      mock<%= Repository %>Repository,
    );
<% } -%>
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    useCase = resolve('<%= Name %>UseCase');
  });

  describe('execute', () => {
    const validInput = {
      // TODO: テスト入力を定義
    };

    it('should succeed with valid input', async () => {
      // Arrange
      // TODO: モックの設定

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // TODO: 成功時のアサーション
      }
    });

    it('should return failure on error', async () => {
      // Arrange
      // TODO: エラーケースのモック設定

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('<%= NAME %>_FAILED');
      }
    });
  });
});
```

---

### 1.3 Token 注入

**ファイル**: `_templates/usecase/new/inject-token.ejs.t`

```ejs
---
to: src/di/tokens.ts
inject: true
after: "// Use Cases"
skip_if: <%= Name %>UseCase
---
  <%= Name %>UseCase: Symbol.for('<%= Name %>UseCase'),
```

---

### 1.4 TypeMap 注入

**ファイル**: `_templates/usecase/new/inject-typemap.ejs.t`

```ejs
---
to: src/di/tokens.ts
inject: true
after: "// Use Cases TypeMap"
skip_if: <%= Name %>UseCase:
---
  <%= Name %>UseCase: <%= Name %>UseCase;
```

---

### 1.5 Container 注入

**ファイル**: `_templates/usecase/new/inject-container.ejs.t`

```ejs
---
to: src/di/containers/application.container.ts
inject: true
after: "// UseCase registrations"
skip_if: <%= Name %>UseCase
---
safeRegister(INJECTION_TOKENS.<%= Name %>UseCase, <%= Name %>UseCase);
```

---

### 1.6 Import 注入

**ファイル**: `_templates/usecase/new/inject-import.ejs.t`

```ejs
---
to: src/di/containers/application.container.ts
inject: true
after: "import 'reflect-metadata';"
skip_if: <%= Name %>UseCase
---
import { <%= Name %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= Name %>UseCase';
```

---

## 2. Entity テンプレート

### 2.1 Entity 本体

**ファイル**: `_templates/entity/new/entity.ejs.t`

```ejs
---
to: src/layers/domain/entities/<%= Name %>.ts
---
import { DomainError } from '@/layers/domain/errors/DomainError';
import {
  generate<%= Name %>Id,
  type <%= Name %>Id,
} from '@/layers/domain/value-objects/<%= Name %>Id';

export class <%= Name %> {
  private constructor(
    public readonly id: <%= Name %>Id,
    // TODO: プロパティを追加
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  /** ファクトリーメソッド：新規作成 */
  static create(
    // TODO: 引数を定義
  ): <%= Name %> {
    const now = new Date();
    return new <%= Name %>(
      generate<%= Name %>Id(),
      // TODO: プロパティを設定
      now,
      now,
    );
  }

  /** ファクトリーメソッド：再構築（永続化から復元） */
  static reconstruct(
    id: <%= Name %>Id,
    // TODO: 引数を定義
    createdAt: Date,
    updatedAt: Date,
  ): <%= Name %> {
    return new <%= Name %>(
      id,
      // TODO: プロパティを設定
      createdAt,
      updatedAt,
    );
  }

  /** ビジネスロジック（immutableパターン） */
  // update(newValue: Type): <%= Name %> {
  //   return new <%= Name %>(
  //     this.id,
  //     newValue,
  //     this.createdAt,
  //     new Date(),
  //   );
  // }

  private validateInvariants(): void {
    // TODO: 不変条件を検証
    // if (condition) {
    //   throw new DomainError('エラーメッセージ', 'ERROR_CODE');
    // }
  }
}
```

---

### 2.2 EntityId Value Object

**ファイル**: `_templates/entity/new/entity-id.ejs.t`

```ejs
---
to: src/layers/domain/value-objects/<%= Name %>Id.ts
---
import { EntityId, generateEntityId } from '@/layers/domain/value-objects/EntityId';

export class <%= Name %>Id extends EntityId {
  constructor(value: string) {
    super(value, '<%= Name %>Id');
  }
}

export function generate<%= Name %>Id(): <%= Name %>Id {
  return new <%= Name %>Id(generateEntityId());
}

export type { <%= Name %>Id as <%= Name %>IdType };
```

---

## 3. Repository テンプレート

### 3.1 Repository Interface

**ファイル**: `_templates/repository/new/interface.ejs.t`

```ejs
---
to: src/layers/domain/repositories/I<%= Name %>Repository.ts
---
import type { <%= Name %> } from '@/layers/domain/entities/<%= Name %>';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type { <%= Name %>Id } from '@/layers/domain/value-objects/<%= Name %>Id';

export interface I<%= Name %>Repository {
  findById(id: <%= Name %>Id, transaction?: ITransaction): Promise<<%= Name %> | null>;
  save(entity: <%= Name %>, transaction?: ITransaction): Promise<void>;
  update(entity: <%= Name %>, transaction?: ITransaction): Promise<void>;
  delete(id: <%= Name %>Id): Promise<void>;
  // TODO: 必要に応じてメソッドを追加
}
```

---

### 3.2 Prisma Repository 実装

**ファイル**: `_templates/repository/new/implementation.ejs.t`

```ejs
---
to: src/layers/infrastructure/repositories/implementations/Prisma<%= Name %>Repository.ts
---
import { INJECTION_TOKENS } from '@/di/tokens';
import { <%= Name %> } from '@/layers/domain/entities/<%= Name %>';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type { I<%= Name %>Repository } from '@/layers/domain/repositories/I<%= Name %>Repository';
import { <%= Name %>Id } from '@/layers/domain/value-objects/<%= Name %>Id';
import type {
  PrismaClient,
  <%= Name %> as Prisma<%= Name %>,
} from '@/layers/infrastructure/persistence/prisma/generated';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { inject, injectable } from 'tsyringe';

@injectable()
export class Prisma<%= Name %>Repository implements I<%= Name %>Repository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  private getClient(transaction?: ITransaction): PrismaClient {
    return (transaction as unknown as PrismaClient) || this.prisma;
  }

  async findById(
    id: <%= Name %>Id,
    transaction?: ITransaction,
  ): Promise<<%= Name %> | null> {
    this.logger.info('<%= Name %>ID検索開始', { id: id.value });

    try {
      const client = this.getClient(transaction);
      const data = await client.<%= h.toCamelCase(name) %>.findUnique({
        where: { id: id.value },
      });

      if (data) {
        this.logger.info('<%= Name %>ID検索成功', { id: id.value });
        return this.toDomainObject(data);
      } else {
        this.logger.info('<%= Name %>が見つかりません', { id: id.value });
        return null;
      }
    } catch (error) {
      this.logger.error('<%= Name %>ID検索失敗', {
        id: id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async save(entity: <%= Name %>, transaction?: ITransaction): Promise<void> {
    this.logger.info('<%= Name %>保存開始', { id: entity.id.value });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(entity);

      await client.<%= h.toCamelCase(name) %>.upsert({
        where: { id: data.id },
        update: {
          // TODO: 更新フィールドを指定
          updatedAt: data.updatedAt,
        },
        create: data,
      });

      this.logger.info('<%= Name %>保存成功', { id: entity.id.value });
    } catch (error) {
      this.logger.error('<%= Name %>保存失敗', {
        id: entity.id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DomainError('<%= Name %>の保存に失敗しました', '<%= NAME %>_SAVE_FAILED');
    }
  }

  async update(entity: <%= Name %>, transaction?: ITransaction): Promise<void> {
    this.logger.info('<%= Name %>更新開始', { id: entity.id.value });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(entity);

      await client.<%= h.toCamelCase(name) %>.update({
        where: { id: data.id },
        data: {
          // TODO: 更新フィールドを指定
          updatedAt: data.updatedAt,
        },
      });

      this.logger.info('<%= Name %>更新成功', { id: entity.id.value });
    } catch (error) {
      this.logger.error('<%= Name %>更新失敗', {
        id: entity.id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DomainError('<%= Name %>の更新に失敗しました', '<%= NAME %>_UPDATE_FAILED');
    }
  }

  async delete(id: <%= Name %>Id): Promise<void> {
    await this.prisma.<%= h.toCamelCase(name) %>.delete({
      where: { id: id.value },
    });
  }

  private toDomainObject(data: Prisma<%= Name %>): <%= Name %> {
    return <%= Name %>.reconstruct(
      new <%= Name %>Id(data.id),
      // TODO: フィールドをマッピング
      data.createdAt,
      data.updatedAt,
    );
  }

  private toPersistenceObject(entity: <%= Name %>) {
    return {
      id: entity.id.value,
      // TODO: フィールドをマッピング
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
```

---

## 4. Server Action テンプレート

**ファイル**: `_templates/server-action/new/action.ejs.t`

```ejs
---
to: src/app/server-actions/<%= domain %>/<%= name %>.ts
---
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const <%= name %>Schema = z.object({
  // TODO: バリデーションスキーマを定義
});

/**
 * <%= Name %> Server Action
 */
export async function <%= name %>(formData: FormData) {
  try {
    const logger = resolve('Logger');

    logger.info('<%= name %> 処理開始', {
      action: '<%= name %>',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = <%= name %>Schema.safeParse({
      // TODO: フォームデータを取得
    });

    if (!validatedFields.success) {
      logger.warn('<%= name %>: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    // UseCase実行
    const useCase = resolve('<%= UseCase %>UseCase');
    const result = await useCase.execute(validatedFields.data);

    if (isSuccess(result)) {
      logger.info('<%= name %> 成功');

      // キャッシュの再検証
      revalidatePath('/<%= domain %>');

      return {
        success: true,
        data: result.data,
      };
    } else {
      logger.warn('<%= name %> 失敗', {
        error: result.error.message,
        code: result.error.code,
      });

      return {
        error: result.error.message,
        code: result.error.code,
      };
    }
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('<%= name %> 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
```

---

## 5. Value Object テンプレート

**ファイル**: `_templates/value-object/new/value-object.ejs.t`

```ejs
---
to: src/layers/domain/value-objects/<%= Name %>.ts
---
import { DomainError } from '@/layers/domain/errors/DomainError';

export class <%= Name %> {
  public readonly value: <%= type %>;

  constructor(value: <%= type %>) {
    this.validate(value);
    this.value = value;
  }

  toString(): string {
    return String(this.value);
  }

  equals(other: <%= Name %>): boolean {
    return this.value === other.value;
  }

  private validate(value: <%= type %>): void {
    // TODO: バリデーションロジックを実装
    // if (condition) {
    //   throw new DomainError('エラーメッセージ', '<%= NAME %>_INVALID');
    // }
  }
}
```

---

## 6. プロンプト設計

### UseCase プロンプト

**ファイル**: `_templates/usecase/new/prompt.js`

```javascript
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'UseCase名（例: CreateOrder）:',
    validate: (input) => {
      if (!input) return 'UseCase名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input)) return 'PascalCaseで入力してください';
      return true;
    },
  },
  {
    type: 'input',
    name: 'domain',
    message: 'ドメイン名（例: order）:',
    validate: (input) => {
      if (!input) return 'ドメイン名は必須です';
      if (!/^[a-z]+$/.test(input)) return '小文字で入力してください';
      return true;
    },
  },
  {
    type: 'confirm',
    name: 'withRepository',
    message: 'Repositoryを注入しますか？',
    default: true,
  },
  {
    type: 'input',
    name: 'repository',
    message: 'Repository名（例: Order）:',
    when: (answers) => answers.withRepository,
    validate: (input) => {
      if (!input) return 'Repository名は必須です';
      return true;
    },
  },
];
```

---

## 次のステップ

→ [05-implementation-steps.md](./05-implementation-steps.md) で実装手順を確認
