# 最初の機能実装チュートリアル 🚀

Clean Architecture + DDD で新機能を実装する実践的ガイド

---

## 📖 このドキュメントについて

### 🎯 目的

このチュートリアルでは、「タスク管理機能」の実装を通じて、プロジェクトのアーキテクチャと開発フローを体験します。

### 📚 前提条件

- [環境セットアップ](../setup.md) 完了
- TypeScript・React の基礎知識
- [アーキテクチャ概要](../../architecture/overview.md) の理解（推奨）

### 🔗 関連ドキュメント

- **[開発フロー](workflow.md)** - 一般的な開発手順
- **[コード生成ツール](../code-generator.md)** - Hygen活用法

---

## 🎯 実装する機能

**タスク作成機能**

- タスクのタイトルと説明を入力
- 期限日を設定（オプション）
- 作成したタスクをデータベースに保存

---

## 📋 実装ステップ

### Step 1: Entity と Value Object の作成

#### 1-1. Entity 生成

```bash
pnpm gen:entity --name Task
```

生成されるファイル:

- `src/layers/domain/entities/Task.ts`
- `src/layers/domain/value-objects/TaskId.ts`
- `tests/unit/domain/entities/Task.test.ts`

#### 1-2. Entity の実装

```typescript
// src/layers/domain/entities/Task.ts
import { DomainError } from '@/layers/domain/errors/DomainError';
import { TaskId } from '@/layers/domain/value-objects/TaskId';

export interface CreateTaskInput {
  title: string;
  description: string;
  dueDate?: Date;
}

export interface ReconstructTaskInput {
  id: TaskId;
  title: string;
  description: string;
  dueDate: Date | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Task {
  // public readonly パターン（getter メソッドは使用しない）
  public readonly id: TaskId;
  public readonly title: string;
  public readonly description: string;
  public readonly dueDate: Date | null;
  public readonly isCompleted: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: ReconstructTaskInput) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.dueDate = props.dueDate;
    this.isCompleted = props.isCompleted;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // ファクトリメソッド: 新規作成
  static create(input: CreateTaskInput): Task {
    const now = new Date();
    return new Task({
      id: TaskId.generate(),
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ?? null,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリメソッド: DB復元
  static reconstruct(props: ReconstructTaskInput): Task {
    return new Task(props);
  }

  // イミュータブル更新パターン（状態を変更せず新しいインスタンスを返す）
  complete(): Task {
    return new Task({
      ...this.toProps(),
      isCompleted: true,
      updatedAt: new Date(),
    });
  }

  updateTitle(title: string): Task {
    if (!title.trim()) {
      throw new DomainError('タイトルは必須です', 'TITLE_REQUIRED');
    }
    return new Task({
      ...this.toProps(),
      title,
      updatedAt: new Date(),
    });
  }

  private toProps(): ReconstructTaskInput {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      isCompleted: this.isCompleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
```

---

### Step 2: Repository の作成

#### 2-1. Repository 生成

```bash
pnpm gen:repo --name Task
```

生成されるファイル:

- `src/layers/domain/repositories/ITaskRepository.ts`
- `src/layers/infrastructure/repositories/implementations/PrismaTaskRepository.ts`
- `tests/unit/repositories/TaskRepository.test.ts`

DI自動登録:

- `src/di/tokens.ts` にトークン追加
- `src/di/containers/infrastructure.container.ts` に登録追加

#### 2-2. Repository Interface の定義

```typescript
// src/layers/domain/repositories/ITaskRepository.ts
import type { Task } from '@/layers/domain/entities/Task';
import type { TaskId } from '@/layers/domain/value-objects/TaskId';

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: TaskId): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  delete(id: TaskId): Promise<void>;
}
```

---

### Step 3: Prisma スキーマ更新

#### 3-1. スキーマ追加

```prisma
// prisma/schema.prisma
model Task {
  id          String    @id
  title       String
  description String
  dueDate     DateTime?
  isCompleted Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### 3-2. マイグレーション実行

```bash
pnpm db:migrate:dev --name add_task_model
```

---

### Step 4: Repository 実装

```typescript
// src/layers/infrastructure/repositories/implementations/PrismaTaskRepository.ts
import { inject, injectable } from 'tsyringe';

import { INJECTION_TOKENS } from '@/di/tokens';
import type { ITaskRepository } from '@/layers/domain/repositories/ITaskRepository';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import { Task } from '@/layers/domain/entities/Task';
import { TaskId } from '@/layers/domain/value-objects/TaskId';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

@injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
  ) {}

  async save(task: Task, transaction?: ITransaction): Promise<void> {
    try {
      const prisma = transaction?.prisma ?? this.prisma;

      await prisma.task.create({
        data: this.toPersistenceObject(task),
      });
    } catch (error) {
      throw this.convertToDomainError(error, 'TASK_SAVE_ERROR');
    }
  }

  async findById(id: TaskId): Promise<Task | null> {
    try {
      const data = await this.prisma.task.findUnique({
        where: { id: id.value },
      });

      if (!data) return null;

      return this.toDomainObject(data);
    } catch (error) {
      throw this.convertToDomainError(error, 'TASK_FIND_ERROR');
    }
  }

  async findAll(): Promise<Task[]> {
    try {
      const data = await this.prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return data.map((item) => this.toDomainObject(item));
    } catch (error) {
      throw this.convertToDomainError(error, 'TASK_FIND_ALL_ERROR');
    }
  }

  async delete(id: TaskId, transaction?: ITransaction): Promise<void> {
    try {
      const prisma = transaction?.prisma ?? this.prisma;

      await prisma.task.delete({
        where: { id: id.value },
      });
    } catch (error) {
      throw this.convertToDomainError(error, 'TASK_DELETE_ERROR');
    }
  }

  // DB → Domain 変換
  private toDomainObject(data: {
    id: string;
    title: string;
    description: string;
    dueDate: Date | null;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Task {
    return Task.reconstruct({
      id: new TaskId(data.id),
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      isCompleted: data.isCompleted,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Domain → DB 変換
  private toPersistenceObject(task: Task) {
    return {
      id: task.id.value,           // public readonly アクセス
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private convertToDomainError(error: unknown, code: string): DomainError {
    if (error instanceof DomainError) return error;
    const message = error instanceof Error ? error.message : '不明なエラー';
    return new DomainError(message, code);
  }
}
```

---

### Step 5: UseCase の作成

#### 5-1. UseCase 生成

```bash
pnpm gen:usecase --name CreateTask --domain task --withRepository true --repository Task
```

生成されるファイル:

- `src/layers/application/usecases/task/CreateTaskUseCase.ts`
- `tests/unit/usecases/task/CreateTaskUseCase.test.ts`

DI自動登録:

- `src/di/tokens.ts` にトークン追加
- `src/di/containers/application.container.ts` に登録追加

#### 5-2. UseCase 実装

```typescript
// src/layers/application/usecases/task/CreateTaskUseCase.ts
import { inject, injectable } from 'tsyringe';

import { INJECTION_TOKENS } from '@/di/tokens';
import { Task } from '@/layers/domain/entities/Task';
import type { ITaskRepository } from '@/layers/domain/repositories/ITaskRepository';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';

export interface CreateTaskRequest {
  title: string;
  description: string;
  dueDate?: string; // ISO形式の日付文字列
}

export interface CreateTaskResponse {
  taskId: string;
  title: string;
  description: string;
  dueDate: string | null;
  createdAt: string;
}

@injectable()
export class CreateTaskUseCase {
  constructor(
    @inject(INJECTION_TOKENS.TaskRepository)
    private readonly taskRepository: ITaskRepository
  ) {}

  async execute(
    request: CreateTaskRequest
  ): Promise<Result<CreateTaskResponse>> {
    try {
      // 1. バリデーション
      if (!request.title.trim()) {
        return failure('タイトルは必須です', 'TITLE_REQUIRED');
      }

      if (request.title.length > 100) {
        return failure(
          'タイトルは100文字以内で入力してください',
          'TITLE_TOO_LONG'
        );
      }

      // 2. Entity作成
      const task = Task.create({
        title: request.title.trim(),
        description: request.description.trim(),
        dueDate: request.dueDate ? new Date(request.dueDate) : undefined,
      });

      // 3. 永続化
      await this.taskRepository.save(task);

      // 4. レスポンス作成（public readonly アクセス）
      return success({
        taskId: task.id.value,                     // task.id.value（TaskIdのvalueプロパティ）
        title: task.title,                         // task.title（直接アクセス）
        description: task.description,             // task.description（直接アクセス）
        dueDate: task.dueDate?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      });
    } catch (error) {
      return failure('タスクの作成に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

---

### Step 6: Server Action の作成

#### 6-1. Server Action 生成

```bash
pnpm gen:action --name createTask --domain task --usecase CreateTask
```

生成されるファイル:

- `src/app/server-actions/task/createTask.ts`
- `tests/unit/server-actions/task/createTask.test.ts`

#### 6-2. Server Action 実装

```typescript
// src/app/server-actions/task/createTask.ts
'use server';

import { resolve } from '@/di/resolver';
import { isFailure } from '@/layers/application/types/Result';

export interface CreateTaskActionInput {
  title: string;
  description: string;
  dueDate?: string;
}

export interface CreateTaskActionResult {
  success: boolean;
  data?: {
    taskId: string;
    title: string;
    description: string;
    dueDate: string | null;
    createdAt: string;
  };
  error?: string;
}

export async function createTaskAction(
  input: CreateTaskActionInput
): Promise<CreateTaskActionResult> {
  const useCase = resolve('CreateTaskUseCase');
  const result = await useCase.execute(input);

  if (isFailure(result)) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

---

### Step 7: UI コンポーネント作成

```typescript
// src/components/features/task/CreateTaskForm.tsx
'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createTaskAction,
  type CreateTaskActionInput,
} from '@/app/server-actions/task/createTask';

export function CreateTaskForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const input: CreateTaskActionInput = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      dueDate: (formData.get('dueDate') as string) || undefined,
    };

    const result = await createTaskAction(input);

    if (!result.success) {
      setError(result.error ?? 'エラーが発生しました');
    }

    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          タイトル *
        </label>
        <Input
          id="title"
          name="title"
          required
          maxLength={100}
          placeholder="タスクのタイトルを入力"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <Textarea
          id="description"
          name="description"
          placeholder="タスクの詳細を入力"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium">
          期限日
        </label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? '作成中...' : 'タスクを作成'}
      </Button>
    </form>
  );
}
```

---

### Step 8: テスト実行

```bash
# 型チェック
pnpm type-check

# ユニットテスト
pnpm test:unit

# 全品質チェック
pnpm check
```

---

## ✅ 完了チェックリスト

- [ ] Entity と Value Object が作成された
- [ ] Repository Interface と実装が作成された
- [ ] Prisma スキーマとマイグレーションが適用された
- [ ] UseCase が Result型 で実装された
- [ ] Server Action が作成された
- [ ] UI コンポーネントが作成された
- [ ] 全テストがパスした
- [ ] `pnpm check` が成功した

---

## 🔄 次のステップ

- **タスク一覧表示機能** - `GetTasksUseCase` の実装
- **タスク完了機能** - `CompleteTaskUseCase` の実装
- **E2Eテスト** - ユーザーフロー全体のテスト

---

## 📚 参考ドキュメント

- [UseCase実装ガイド](../ddd/layers/components/use-cases.md)
- [Entity実装ガイド](../ddd/layers/components/entities.md)
- [テスト戦略](../../testing/strategy.md)

---

**🎉 おめでとうございます！Clean Architecture + DDD での機能実装が完了しました！**
