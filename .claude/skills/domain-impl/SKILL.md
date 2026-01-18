# Domain Implementation Skill

Domain層の実装パターン（Entity, Value Object, Repository Interface）を提供します。
ビジネスルールのカプセル化、不変性、純粋TypeScriptでの実装を支援します。

## 適用条件

以下のいずれかに該当する場合、このスキルを自動適用:

1. **キーワードトリガー**
   - Entity作成、Value Object、ドメインモデル
   - Repository Interface、ドメイン層
   - 不変性、Immutable、ビジネスルール

2. **ファイルパスベース**
   - `src/layers/domain/` 配下のファイル編集時

3. **実装タスク**
   - Domain層コンポーネントの作成・修正
   - ビジネスロジックの実装

## 実装原則

### 基本ルール

```typescript
// ✅ 必須: public readonly パターン
export class User {
  public readonly id: UserId;
  public readonly email: Email;
  public readonly name: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.validateInvariants();
  }

  // getterメソッドは使用禁止
  // ❌ getName(): string { return this.name; }
  // ✅ 直接アクセス: user.name
}
```

### Immutable設計

**重要**: すべてのEntityとValue Objectは不変でなければなりません。

```typescript
// ✅ 状態変更は新インスタンスを返す
updateProfile(email: Email, name: string): User {
  return new User({
    ...this.toProps(),
    email,
    name,
    updatedAt: new Date(),
  });
}

// ❌ 禁止: 自身を変更
updateProfile(email: Email, name: string): void {
  this.email = email; // 禁止
  this.name = name;   // 禁止
}
```

## Entity実装パターン

### 基本構造

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { Email } from '@/layers/domain/value-objects/Email';
import { generateUserId, type UserId } from '@/layers/domain/value-objects/UserId';

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly name: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateInvariants();
  }

  // 新規作成
  static create(email: Email, name: string, passwordHash: string): User {
    const now = new Date();
    return new User(generateUserId(), email, name, passwordHash, now, now);
  }

  // 再構築（永続化から復元）
  static reconstruct(
    id: UserId,
    email: Email,
    name: string,
    passwordHash: string,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, email, name, passwordHash, createdAt, updatedAt);
  }

  // ビジネスロジック（新インスタンス返却）
  updateProfile(email: Email, name: string): User {
    return new User(
      this.id,
      email,
      name,
      this.passwordHash,
      this.createdAt,
      new Date(),
    );
  }

  // 不変条件検証
  private validateInvariants(): void {
    if (this.name.trim().length === 0) {
      throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
    }
    if (this.name.length > 100) {
      throw new DomainError('名前は100文字以内である必要があります', 'NAME_TOO_LONG');
    }
  }
}
```

### EntityId実装

```typescript
import { randomUUID } from 'node:crypto';

export type UserId = string & { readonly __brand: 'UserId' };

export function generateUserId(): UserId {
  return randomUUID() as UserId;
}

export function createUserId(value: string): UserId {
  if (!value || value.trim().length === 0) {
    throw new DomainError('ユーザーIDは必須です', 'USER_ID_REQUIRED');
  }
  return value as UserId;
}
```

## Value Object実装パターン

### 基本構造

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';

export class Email {
  public readonly value: string;

  constructor(value: string) {
    this.validateEmail(value);
    this.value = value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  private validateEmail(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
    if (!emailRegex.test(value)) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    if (value.length > 254) {
      throw new DomainError(
        'メールアドレスが長すぎます（254文字以内である必要があります）',
        'EMAIL_TOO_LONG',
      );
    }
  }
}
```

### フィールドアクセス戦略

**✅ 推薦: public readonly パターン**

- getterメソッドは不要なboilercode
- 直接的で意図明確: `obj.field` vs `obj.getField()`

```typescript
// ✅ シンプルで直接的
export class Email {
  public readonly value: string;
  // 直接 email.value でアクセス
}

// ❌ 不要な複雑性
export class Email {
  private readonly value: string;
  getValue(): string { return this.value; } // 冗長
}
```

## Repository Interface実装パターン

### 基本構造

```typescript
import type { Email } from '@/layers/domain/value-objects/Email';
import type { UserId } from '@/layers/domain/value-objects/UserId';
import type { User } from '@/layers/domain/entities/User';

export interface IUserRepository {
  // 基本CRUD操作
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;

  // ドメイン特有の検索
  findAll(): Promise<User[]>;
  exists(id: UserId): Promise<boolean>;
}
```

### 設計原則

1. **ドメインオブジェクトのみ使用**
   - Value ObjectとEntityのみを扱う
   - プリミティブ型の直接使用は避ける

2. **実装詳細を隠蔽**
   - データベース固有の型を使用しない
   - ORM固有の概念を露出しない

3. **ビジネス用語で命名**
   - `findActiveUsers()` ✅
   - `findUsersBySQL()` ❌

## Domain Service実装パターン

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { Email } from '@/layers/domain/value-objects/Email';
import { inject, injectable } from 'tsyringe';

@injectable()
export class UserDomainService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
  ) {}

  async isEmailDuplicate(email: Email): Promise<boolean> {
    const existingUser = await this.userRepository.findByEmail(email);
    return existingUser !== null;
  }

  async validateUserData(name: string, email: string): Promise<void> {
    const emailVO = new Email(email);
    const isDuplicate = await this.isEmailDuplicate(emailVO);

    if (isDuplicate) {
      throw new DomainError(
        'このメールアドレスは既に使用されています',
        'EMAIL_DUPLICATE',
      );
    }

    if (name.trim().length === 0) {
      throw new DomainError('名前は必須です', 'NAME_REQUIRED');
    }
  }
}
```

## 依存ルール

**重要**: Domain層は他のレイヤーに依存してはいけません。

```typescript
// ✅ 許可
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';

// ❌ 禁止
import { PrismaClient } from '@prisma/client';  // Infrastructure層
import { createUserAction } from '@/app/actions'; // Presentation層
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase'; // Application層
```

## 禁止事項

### データベース操作の直接実装

```typescript
// ❌ 禁止
export class User {
  async save(): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.user.update({ /* ... */ });
  }
}
```

### UI・表示用フォーマットの実装

```typescript
// ❌ 禁止
export class User {
  getDisplayName(): string {
    return `${this.name}様`;  // Presentation Layerの責務
  }
}
```

### 外部サービスの直接呼び出し

```typescript
// ❌ 禁止
export class User {
  async sendWelcomeEmail(): Promise<void> {
    const emailService = new SendGridService();  // Infrastructure Layerの責務
    await emailService.send({ /* ... */ });
  }
}
```

## チェックリスト

実装時に確認すること:

### Entity
- [ ] public readonly でプロパティを公開
- [ ] getterメソッドを使用していない
- [ ] private constructor を使用
- [ ] create/reconstruct ファクトリーメソッドを提供
- [ ] 状態変更メソッドは新インスタンスを返す
- [ ] validateInvariants() で不変条件を検証

### Value Object
- [ ] public readonly value プロパティ
- [ ] コンストラクタでバリデーション
- [ ] equals() メソッドを実装
- [ ] 状態変更メソッドは新インスタンスを返す
- [ ] IDによる同一性を実装していない

### Repository Interface
- [ ] ドメインオブジェクトのみを扱う
- [ ] Value Objectを活用
- [ ] ビジネス用語でメソッド名を定義
- [ ] 実装技術に依存していない

### 共通
- [ ] Application/Infrastructure/Presentation層への依存がない
- [ ] DomainErrorを使用
- [ ] テストを作成

## 詳細リファレンス

より詳細なパターンと実装例は以下を参照:

- `references/entity-patterns.md` - Entity詳細パターン
- `references/value-object-patterns.md` - Value Object詳細パターン
