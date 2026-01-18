---
name: infrastructure-impl
description: |
  Infrastructure層の実装パターン。Repository実装, 外部サービス連携, Prisma。
  技術的詳細の実装、DIP遵守。

  トリガー例:
  - 「Repository実装」「Prisma」「外部API」
  - 「Infrastructure層」「データベース」
  - src/layers/infrastructure/ 配下のファイル編集時
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Infrastructure Implementation Skill

Infrastructure層の実装パターンと技術的実装の詳細を提供します。

---

## 🎯 Infrastructure層の責務

Infrastructure層は、Domain層で定義されたインターフェースの**具体的な実装**を提供します。

```
主な責務:
- Repository実装（Prisma等を使用）
- 外部サービス連携（API、メール、ストレージ等）
- データマッピング（DB ⇔ Domain Entity）
- DI設定とコンテナ登録
```

### DIPの遵守

```
✅ 正しい依存関係
Domain Layer (Interface) ← Infrastructure Layer (Implementation)

❌ 禁止: 逆方向の依存
Domain Layer → Infrastructure Layer
```

---

## 📦 Repository実装パターン

### 基本構造

```typescript
// src/layers/infrastructure/repositories/implementations/UserRepository.ts
import { INJECTION_TOKENS } from '@/di/tokens';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { inject, injectable } from 'tsyringe';

@injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: id.value },
      });

      if (!userData) {
        return null;
      }

      return this.toDomainObject(userData);
    } catch (error) {
      throw this.convertToDomainError(error, 'USER_FIND_ERROR');
    }
  }

  async save(user: User): Promise<void> {
    try {
      const userData = this.toPersistenceObject(user);
      await this.prisma.user.create({ data: userData });
    } catch (error) {
      throw this.convertToDomainError(error, 'USER_SAVE_ERROR');
    }
  }

  // DB → Domain変換
  private toDomainObject(userData: any): User {
    return User.reconstruct({
      id: new UserId(userData.id),
      email: new Email(userData.email),
      name: userData.name,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  }

  // Domain → DB変換
  private toPersistenceObject(user: User): any {
    return {
      id: user.id.value,           // public readonly アクセス
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private convertToDomainError(error: unknown, code: string): DomainError {
    if (error instanceof DomainError) return error;
    const message = error instanceof Error ? error.message : '不明なエラー';
    return new DomainError(message, code);
  }
}
```

### Entity の public readonly パターン

```typescript
// ✅ 正しい
user.id.value       // UserId の value プロパティ
user.email.value    // Email の value プロパティ
user.name           // string プロパティ

// ❌ 禁止: getter メソッドは使用しない
user.getId()
user.getEmail()
```

### トランザクション対応

```typescript
export interface ITransaction {
  prisma: PrismaClient;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

async save(user: User, transaction?: ITransaction): Promise<void> {
  const prisma = transaction?.prisma ?? this.prisma;
  const userData = this.toPersistenceObject(user);
  await prisma.user.create({ data: userData });
}
```

**詳細**: `references/repository-patterns.md` を参照

---

## 🌐 外部サービス連携

### メールサービス実装例

```typescript
import type { IEmailService } from '@/layers/domain/services/IEmailService';
import { injectable } from 'tsyringe';
import sgMail from '@sendgrid/mail';

@injectable()
export class SendGridEmailService implements IEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_FROM!,
        subject: 'ようこそ！',
        html: `<p>${name}さん、ご登録ありがとうございます。</p>`,
      });
    } catch (error) {
      throw new Error('ウェルカムメールの送信に失敗しました');
    }
  }
}
```

### ストレージサービス実装例

```typescript
import type { IStorageService } from '@/layers/domain/services/IStorageService';
import { injectable } from 'tsyringe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@injectable()
export class S3StorageService implements IStorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    } catch (error) {
      throw new Error('ファイルのアップロードに失敗しました');
    }
  }
}
```

**詳細**: `references/external-service-patterns.md` を参照

---

## 🔧 DI設定とコンテナ登録

### トークン定義

```typescript
// src/di/tokens.ts
export const INJECTION_TOKENS = {
  UserRepository: Symbol.for('UserRepository'),
  EmailService: Symbol.for('EmailService'),
  StorageService: Symbol.for('StorageService'),
  PrismaClient: Symbol.for('PrismaClient'),
} as const;

// 型定義（必須）
export type InjectionTokens = {
  UserRepository: IUserRepository;
  EmailService: IEmailService;
  StorageService: IStorageService;
  PrismaClient: PrismaClient;
};
```

### DIコンテナ登録

```typescript
// src/di/container.ts
import { container } from 'tsyringe';
import { INJECTION_TOKENS } from './tokens';
import { UserRepository } from '@/layers/infrastructure/repositories/implementations/UserRepository';
import { SendGridEmailService } from '@/layers/infrastructure/services/implementations/EmailService';
import { prisma } from '@/layers/infrastructure/persistence/prisma/client';

container.registerSingleton(INJECTION_TOKENS.UserRepository, UserRepository);
container.registerSingleton(INJECTION_TOKENS.EmailService, SendGridEmailService);
container.registerInstance(INJECTION_TOKENS.PrismaClient, prisma);
```

---

## ❌ 何をしてはならないか

### 1. ビジネスロジックの実装（禁止）

```typescript
// ❌ Repository内でのビジネスロジック
async save(user: User): Promise<void> {
  if (user.level > 10) {
    throw new Error('レベルが高すぎます'); // Domain Layerの責務
  }
  await this.persistUser(user);
}
```

### 2. Application Layer の機能実装（禁止）

```typescript
// ❌ ユースケースレベルの処理
async createUserWithWelcomeEmail(userData: CreateUserData): Promise<User> {
  const user = User.create(/*...*/);
  await this.save(user);

  // Application Layerの責務
  const emailService = new EmailService(); // 禁止
  await emailService.sendWelcomeEmail(user.email);

  return user;
}
```

### 3. Presentation Layer への依存（禁止）

```typescript
// ❌ UI固有の処理
async findUsersForDisplay(): Promise<UserDisplayData[]> {
  const users = await this.findAll();

  // Presentation Layerの責務
  return users.map((user) => ({
    displayName: `${user.name}様`, // 禁止
    formattedLevel: `レベル ${user.level}`, // 禁止
  }));
}
```

### 4. 具体的な技術の外部漏出（禁止）

```typescript
// ❌ 実装詳細の漏出
async findByIdRaw(id: string): Promise<PrismaUser> { // 禁止
  return await this.prisma.user.findUnique({ where: { id } });
}

getPrismaClient(): PrismaClient { // 禁止
  return this.prisma;
}
```

---

## 🧪 テスト戦略

vitest-mock-extendedを使用した単体テストを推奨します。

```typescript
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { mock, MockProxy } from 'vitest-mock-extended';

describe('UserRepository', () => {
  setupTestEnvironment();

  let repository: UserRepository;
  let mockPrisma: MockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mock<PrismaClient>();
    container.registerInstance(INJECTION_TOKENS.PrismaClient, mockPrisma);
    repository = container.resolve(UserRepository);
  });

  it('ユーザーが見つかった場合、ドメインオブジェクトを返す', async () => {
    const userId = new UserId('test-user-123');
    const prismaUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'テストユーザー',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

    const result = await repository.findById(userId);

    expect(result).not.toBeNull();
    expect(result!.id.value).toBe('test-user-123');
  });
});
```

---

## ✅ 実装チェックリスト

### Interface 実装
- [ ] Domain層のインターフェースを正確に実装
- [ ] 全メソッドで適切な戻り値型を使用
- [ ] ドメインオブジェクトの契約を遵守

### データマッピング
- [ ] DB ⇔ Domain Entity の変換が適切
- [ ] Value Object の変換が正しい
- [ ] マッピングエラーを適切にハンドリング

### エラーハンドリング
- [ ] DomainError として適切にエラーを投げる
- [ ] ログ出力が適切
- [ ] データベース固有のエラーを隠蔽

### パフォーマンス
- [ ] N+1問題を回避
- [ ] 適切なインデックスを使用
- [ ] バッチ処理が適切

### テスト
- [ ] 単体テストを実装
- [ ] トランザクション制御のテスト
- [ ] エラーケースのテスト

---

**Infrastructure層は、Domain層の要求を技術的に実現する重要なレイヤーです。DIPを遵守しながら、効率的なデータアクセスを実現してください。詳細なパターンは `references/` ディレクトリを参照してください。**
