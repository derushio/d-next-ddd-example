---
name: infrastructure-impl
description: |
  Infrastructure層の実装パターン。Repository実装, 外部サービス連携, Prisma。
  技術的詳細の実装、DIP遵守。

  トリガー例:
  - 「Repository実装」「Prisma」「外部API」
  - 「Infrastructure層」「データベース」
  - src/layers/infrastructure/ 配下のファイル編集時
  ※ Prisma v7固有の設定・Driver Adapters・TypedSQL → prisma-v7-patterns スキルを参照
  ※ Prismaエラー・v7移行 → prisma-v7-troubleshooting スキルを参照
  ※ ロギング・pinoロガー → pino-logging スキルを参照
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
// src/layers/infrastructure/repositories/implementations/PrismaUserRepository.ts
import { INJECTION_TOKENS } from '@/di/tokens';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  private getClient(transaction?: unknown): PrismaClient {
    return (transaction as unknown as PrismaClient) || this.prisma;
  }

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
    return User.reconstruct(
      new UserId(userData.id),
      new Email(userData.email),
      userData.name,
      userData.passwordHash,
      userData.createdAt,
      userData.updatedAt,
    );
  }

  // Domain → DB変換
  private toPersistenceObject(user: User): any {
    return {
      id: user.id.value,           // public readonly アクセス
      email: user.email.value,
      name: user.name,
      passwordHash: user.passwordHash,
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
// getClient() パターン: transaction が渡された場合はそれを PrismaClient として使用
private getClient(transaction?: unknown): PrismaClient {
  return (transaction as unknown as PrismaClient) || this.prisma;
}

async save(user: User, transaction?: unknown): Promise<void> {
  const prisma = this.getClient(transaction);
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
import { env } from '@/lib/env';
import { injectable } from 'tsyringe';
import sgMail from '@sendgrid/mail';

@injectable()
export class SendGridEmailService implements IEmailService {
  constructor() {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: env.EMAIL_FROM,
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
import { env } from '@/lib/env';
import { injectable } from 'tsyringe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@injectable()
export class S3StorageService implements IStorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return `https://${env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
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

// 型マップ（ServiceType<K> で型安全な resolve() に使用）
export type ServiceTypeMap = {
  UserRepository: IUserRepository;
  EmailService: IEmailService;
  StorageService: IStorageService;
  PrismaClient: PrismaClient;
};

export type ServiceType<K extends keyof ServiceTypeMap> = ServiceTypeMap[K];
```

### DIコンテナ登録（ファイル分割チャイルドコンテナ + safeRegister）

DIコンテナは複数のファイルに分割されており、`createChildContainer()` でチェーンしています:

- `src/di/containers/core.container.ts` — PrismaClient, ConfigService など基盤サービス
- `src/di/containers/infrastructure.container.ts` — core の子、Repository・インフラサービス
- `src/di/containers/application.container.ts` — infrastructure の子、UseCase

各コンテナファイルで `safeRegister` は **3引数形式** (container, token, creator) を使用し、
内部で `registerSingleton(creator)` + `register(token, { useToken: creator })` の2段階登録を行います。
`safeRegister` は `@/di/containers/safeRegister` から共通インポートします。

```typescript
// src/di/containers/infrastructure.container.ts
import { coreContainer } from '@/di/containers/core.container';
import { safeRegister } from '@/di/containers/safeRegister';
import { INJECTION_TOKENS } from '@/di/tokens';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';

export const infrastructureContainer = coreContainer.createChildContainer();

// Repository registrations
safeRegister(infrastructureContainer, INJECTION_TOKENS.UserRepository, PrismaUserRepository);
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

PrismaClientは型が深いため `mockDeep` が適切。浅い型には `mock<T>()` を引き続き使用。

```typescript
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { mockDeep, MockProxy } from 'vitest-mock-extended';

describe('PrismaUserRepository', () => {
  setupTestEnvironment();

  let repository: PrismaUserRepository;
  let mockPrisma: MockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    container.registerInstance(INJECTION_TOKENS.PrismaClient, mockPrisma);
    repository = container.resolve(PrismaUserRepository);
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

---

## 環境変数へのアクセスについて

Infrastructure層で環境変数にアクセスする場合は `env` オブジェクト経由で行うこと。

```typescript
import { env } from '@/lib/env';

// 正しい
const dbUrl = env.DATABASE_URL;

// 禁止
const dbUrl = process.env.DATABASE_URL;
```

詳細は **env-management** スキルを参照してください。

---

## Prisma v7 固有設定について

このスキルはRepositoryの**設計・構造・DIPの遵守**を扱います。
Prisma v7固有の機能については以下のスキルを参照してください:

- **prisma-v7-patterns**: Driver Adapters、TypedSQL、globalThisシングルトン、クエリ最適化
- **prisma-v7-troubleshooting**: エラー解決、v6→v7移行、Turbopack互換性

---

## パスワードハッシュ（HashService）について

`HashService` は Infrastructure 層の Service として実装されています。
パスワードハッシュの実装ルール・Argon2id設定・タイミング攻撃対策については以下のスキルを参照してください:

- **password-hashing**: Argon2id（OWASP 2026推奨）実装パターン、IHashServiceパターン、bcrypt禁止ルール

### 必須ルール

- `HashService` を直接 import するのではなく、`IHashService` を DI 注入する
- `bcrypt` / `bcryptjs` の使用は禁止（`@node-rs/argon2` に統一）
- Argon2id設定の memoryCost・timeCost は OWASP 最小要件を遵守する

---

## Prisma エラーハンドリング

### ❌ 禁止: 文字列マッチ

```typescript
// error.message.includes() は Prisma バージョンアップで壊れる
if (error.message.includes('Unique constraint')) { ... }
```

### ✅ 推奨: PrismaClientKnownRequestError + エラーコード

```typescript
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') { // Unique constraint violation
    const target = (error.meta?.target as string[]) ?? [];
    if (target.includes('email')) {
      throw new DomainError('メールアドレスが既に使用されています', 'EMAIL_DUPLICATE');
    }
  }
  if (error.code === 'P2025') { // Record not found
    throw new DomainError('対象レコードが見つかりません', 'RECORD_NOT_FOUND');
  }
}
```

---

## Prisma 生成型の活用

### ❌ 禁止: 手書きインライン型

```typescript
private toDomainModel(data: { id: string; userId: string; ... }): Domain {
```

### ✅ 推奨: Prisma.XxxGetPayload で自動導出

```typescript
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

type SessionWithUser = Prisma.UserSessionGetPayload<{ include: { User: true } }>;

private toDomainModel(data: SessionWithUser): Domain {
```

---

## PIIマスキング統一ルール

- Repository のログ出力では `logMasking.ts` の `maskSensitiveData()` を使用すること
- ❌ Logger.ts 内に独自マスキング実装を追加することは禁止
- 詳細は **pino-logging** スキルを参照

---

## Repository try-catch HOFラッパーパターン

Repository メソッドの try-catch + ログ + DomainError 変換ボイラープレートは `repositoryOperation` HOF で共通化すること。

```tsx
// repositoryOperation の使い方
return repositoryOperation(
  async () => { /* Prisma操作 */ },
  this.logger,
  { operation: 'findById', entity: 'User', params: { userId: id.value } }
);
```

## Entity Mapper 共通化

同一 Entity のマッピング（Prisma → Domain）が複数の Repository に散在する場合は、共通 Mapper 関数として `repositories/utils/entityMappers.ts` に抽出すること。
