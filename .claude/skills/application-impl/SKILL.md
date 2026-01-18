# Application Implementation Skill

Application層の実装パターン（UseCase, Result型, DTO）を提供します。
ビジネスフロー制御、統一的エラーハンドリング、依存性注入を支援します。

## 適用条件

以下のいずれかに該当する場合、このスキルを自動適用:

1. **キーワードトリガー**
   - UseCase作成、Result型、ビジネスロジック
   - Application層、ユースケース、DI、依存性注入

2. **ファイルパスベース**
   - `src/layers/application/` 配下のファイル編集時

## 実装原則

### Result型パターン（必須）

**重要**: すべてのUseCaseはResult型を返却します。例外スローは禁止。

```typescript
import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';

async execute(request: Request): Promise<Result<Response>> {
  try {
    // ビジネスロジック
    return success(response);
  } catch (error) {
    if (error instanceof DomainError) {
      return failure(error.message, error.code);
    }
    return failure('処理に失敗しました', 'UNEXPECTED_ERROR');
  }
}
```

### 依存性注入（必須）

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import { inject, injectable } from 'tsyringe';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}
}
```

## UseCase実装パターン

### 基本構造

```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService) private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    this.logger.info('ユーザー作成開始', { email: request.email });

    try {
      // 1. Email Value Objectを作成（バリデーション込み）
      const emailVO = new Email(request.email);

      // 2. ドメインサービスでビジネスルール検証
      await this.userDomainService.validateUserData(request.name, request.email);

      // 3. パスワードハッシュ化
      const hashedPassword = await this.hashService.generateHash(request.password);

      // 4. ドメインオブジェクト作成
      const user = User.create(emailVO, request.name, hashedPassword);

      // 5. データ永続化
      await this.userRepository.save(user);

      this.logger.info('ユーザー作成完了', { userId: user.id });

      // 6. 成功レスポンス
      // Value Object: .value で型安全にプリミティブ値を取得
      return success({
        id: user.id,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt,
      });
    } catch (error) {
      this.logger.error('ユーザー作成失敗', {
        email: request.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('ユーザー作成に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

### Value Objectアクセスパターン

**Application層では`.value`でプリミティブ値を取得（推奨）**

```typescript
// ✅ 推奨: .value で型安全にプリミティブ値を取得
return success({
  id: user.id.value,        // UserId.value → string
  name: user.name,          // string → 直接アクセス
  email: user.email.value,  // Email.value → string
  createdAt: user.createdAt, // Date → 直接アクセス
});
```

## DTO設計パターン

```typescript
export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface CreateUserResponse {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}
```

## エラーハンドリングパターン

### Result型の型ガード

```typescript
import { isSuccess, isFailure } from '@/layers/application/types/Result';

const result = await useCase.execute(request);

if (isSuccess(result)) {
  logger.info('処理成功', { userId: result.data.id });
  return { success: true, user: result.data };
} else {
  logger.warn('処理失敗', {
    error: result.error.message,
    code: result.error.code,
  });
  return { error: result.error.message, code: result.error.code };
}
```

### エラーの分類と処理

```typescript
try {
  // ビジネスロジック
} catch (error) {
  if (error instanceof DomainError) {
    return failure(error.message, error.code);
  }

  if (error instanceof InfrastructureError) {
    this.logger.error('インフラエラー', { code: error.code });
    return failure('システムエラーが発生しました', 'INFRASTRUCTURE_ERROR');
  }

  this.logger.error('予期しないエラー', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  return failure('処理に失敗しました', 'UNEXPECTED_ERROR');
}
```

## トランザクション管理パターン

```typescript
@injectable()
export class TransferPointsUseCase {
  async execute(request: TransferPointsRequest): Promise<Result<void>> {
    const transaction = await this.databaseFactory.beginTransaction();

    try {
      // 1. 送信者・受信者の取得
      const sender = await this.userRepository.findById(request.senderId, transaction);
      const receiver = await this.userRepository.findById(request.receiverId, transaction);

      if (!sender || !receiver) {
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      // 2. ビジネスロジック実行
      const updatedSender = sender.subtractPoints(request.points);
      const updatedReceiver = receiver.addPoints(request.points);

      // 3. 永続化
      await this.userRepository.save(updatedSender, transaction);
      await this.userRepository.save(updatedReceiver, transaction);

      await transaction.commit();
      return success(undefined);
    } catch (error) {
      await transaction.rollback();
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }
      return failure('ポイント移動に失敗しました', 'TRANSFER_FAILED');
    }
  }
}
```

## 認可・権限チェックパターン

```typescript
@injectable()
export class DeleteUserUseCase {
  async execute(
    request: DeleteUserRequest,
    currentUserId: string,
  ): Promise<Result<void>> {
    try {
      // 1. 実行者の認証
      const currentUser = await this.userRepository.findById(currentUserId);
      if (!currentUser) {
        return failure('認証が必要です', 'AUTHENTICATION_REQUIRED');
      }

      // 2. 権限チェック
      const hasPermission = await this.authService.hasPermission(
        currentUserId,
        'DELETE_USER',
      );

      if (!hasPermission) {
        return failure(
          'このユーザーを削除する権限がありません',
          'INSUFFICIENT_PERMISSION',
        );
      }

      // 3. 削除実行
      await this.userRepository.delete(request.targetUserId);

      this.logger.info('ユーザー削除完了', {
        deletedUserId: request.targetUserId,
        deletedBy: currentUserId,
      });

      return success(undefined);
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }
      return failure('ユーザー削除に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

## ログ出力戦略

```typescript
this.logger.info('ユーザー作成開始', {
  email: request.email,
  name: request.name,
});

try {
  // 処理
  this.logger.info('ユーザー作成完了', {
    userId: user.id.value,
    email: request.email,
  });
} catch (error) {
  this.logger.error('ユーザー作成失敗', {
    email: request.email,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
}
```

## 禁止事項

### ビジネスルール・ドメインロジックの実装

```typescript
// ❌ 禁止: UseCase内でのビジネスルール実装
async execute(request: Request): Promise<Result<Response>> {
  const level = Math.floor(request.experiencePoints / 1000) + 1; // 禁止
  // このようなビジネスロジックはEntityやDomain Serviceで実装すべき
}
```

### UI・プレゼンテーション固有の処理

```typescript
// ❌ 禁止: UI固有の処理
return success({
  displayName: `${user.name}様`,  // Presentation Layerの責務
  formattedLevel: `レベル ${user.level}`,  // 禁止
});
```

### 直接的なデータベース操作

```typescript
// ❌ 禁止: UseCase内での直接DB操作
const prisma = new PrismaClient();  // 禁止
await prisma.user.create({ /* ... */ });
// Repository パターンを使用すべき
```

## チェックリスト

実装時に確認すること:

### UseCase
- [ ] @injectable() デコレータを使用
- [ ] コンストラクタインジェクションを使用
- [ ] Result型を返却
- [ ] success() と failure() を使用
- [ ] DomainErrorを適切に処理
- [ ] 構造化ログを出力

### DTO
- [ ] Request/Response型を定義
- [ ] readonly プロパティを使用
- [ ] 型安全な定義

### エラーハンドリング
- [ ] try-catch でエラーをキャッチ
- [ ] DomainErrorを識別
- [ ] 適切なエラーコードを返却
- [ ] ログを適切に出力

### 依存ルール
- [ ] Domain層のみに依存
- [ ] Infrastructure層への直接依存がない
- [ ] Presentation層への依存がない

### 共通
- [ ] Value Objectは .value でアクセス
- [ ] テストを作成

## 詳細リファレンス

より詳細なパターンと実装例は以下を参照:

- `references/usecase-patterns.md` - UseCase詳細パターン
- `references/result-type-guide.md` - Result型詳細ガイド
