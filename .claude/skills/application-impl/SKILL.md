---
name: application-impl
description: |
  Application層（UseCase, DTO, Service）の実装パターンを提供するスキル。
  neverthrowのResult型、DI注入パターン、レイヤー間の依存方向を扱う。

  トリガー例:
  - UseCase実装、Application層、DTO、Service
  - src/layers/application/ 配下のファイル編集時
  - Result型、ok()/err()、neverthrow
globs:
  - "src/layers/application/**/*.ts"
---

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

#### ResultAsync パターン（非同期UseCase標準）

非同期I/Oを含むUseCaseの `execute()` は `ResultAsync<T, AppError>` を返す。
公開メソッドで `ResultAsync` を返し、内部実装は従来の `async/await + ok()/err()` を保持する。

```typescript
import { ResultAsync, ok, type Result, type AppError } from '@/layers/application/types/Result';
import { handleUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

// ✅ 非同期UseCase標準パターン: ResultAsync を返す
execute(request: Request): ResultAsync<Response, AppError> {
  return new ResultAsync(this._execute(request));
}

private async _execute(request: Request): Promise<Result<Response, AppError>> {
  try {
    // ビジネスロジック
    return ok(response);
  } catch (error) {
    // ❌ try/catch コピペ禁止: 毎回同じパターンを手書きしない
    // ✅ handleUseCaseError を使用
    return handleUseCaseError(error, this.logger, 'コンテキストメッセージ', 'ERROR_CODE');
  }
}
```

同期的に ok()/err() を返すだけのケース（SignOutUseCase等）は `Result<T, E>` のまま。

#### handleUseCaseError との組み合わせパターン

`handleUseCaseError` は `_execute()` 内部の `catch` ブロックで使用する。
これにより DomainError のコード保持、未知エラーのフォールバック処理、ログ出力を一元管理する。

```typescript
import { handleUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

// ✅ 正しい使い方（_execute内部）
} catch (error) {
  return handleUseCaseError(error, this.logger, 'ユーザー作成失敗', 'USER_CREATION_FAILED');
}

// ❌ 禁止: try/catch の中身を毎回コピペ
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  this.logger.error('...', { error: errorMessage, stack: ... });
  if (error instanceof DomainError) { return err(...) }
  return err({ message: errorMessage, code: '...' });
}
```

### 依存性注入（必須）

DIには2つのパターンがあります。

**パターン1: `@injectable()` クラス内（UseCase/Serviceでの標準パターン）**

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

**パターン2: Server Actions内（`resolve()` による型安全な解決）**

```typescript
// src/di/resolver.ts
// ServiceTypeMap のキーを型引数として受け取り、対応する型を返す
export function resolve<K extends keyof ServiceTypeMap>(serviceName: K): ServiceType<K>

// Server Action での使用例
import { resolve } from '@/di/resolver';

const useCase = resolve('CreateUserUseCase'); // ServiceTypeMap による型推論が効く
```

`ServiceTypeMap` は `src/di/tokens.ts` で定義されており、サービス名と型の対応を管理します。
`ServiceType<K>` は `ServiceTypeMap[K]` の型を返すヘルパー型です。

### チャイルドコンテナ構成

DIコンテナは4段階の階層構造:
`core` → `domain` → `infrastructure` → `application`

## UseCase実装パターン

### 基本構造

```typescript
import { ResultAsync, ok, type Result, type AppError } from '@/layers/application/types/Result';
import { handleUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';
import { UserMapper } from '@/layers/application/mappers/UserMapper';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService) private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  // ✅ 公開メソッド: ResultAsync を返す（非同期UseCase標準）
  execute(request: CreateUserRequest): ResultAsync<CreateUserResponse, AppError> {
    return new ResultAsync(this._execute(request));
  }

  private async _execute(request: CreateUserRequest): Promise<Result<CreateUserResponse, AppError>> {
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

      this.logger.info('ユーザー作成完了', { userId: user.id.value });

      // 6. 成功レスポンス: ❌ インラインマッピング禁止 → ✅ UserMapper 使用
      return ok(UserMapper.toResponseDTO(user));
    } catch (error) {
      // ❌ try/catch コピペ禁止 → ✅ handleUseCaseError 使用
      return handleUseCaseError(error, this.logger, 'ユーザー作成失敗', 'UNEXPECTED_ERROR');
    }
  }
}
```

### Value Objectアクセスパターン

**Application層では`.value`でプリミティブ値を取得（推奨）**

```typescript
// ✅ 推奨: UserMapper 経由でまとめて変換
return ok(UserMapper.toResponseDTO(user));

// ❌ 禁止: インラインマッピングの繰り返し
return ok({
  id: user.id.value,
  name: user.name,
  email: user.email.value,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
```

### DTOマッパーパターン（DRY原則）

User エンティティ → DTO 変換は `UserMapper.toResponseDTO()` を使用する。
`src/layers/application/mappers/UserMapper.ts` で定義。

```typescript
import { UserMapper } from '@/layers/application/mappers/UserMapper';

// ✅ 1件
return ok(UserMapper.toResponseDTO(user));

// ✅ 複数件
const userSummaries = users.map((user) => UserMapper.toResponseDTO(user));
```

新しい DTO フィールドが必要な場合は `UserMapper` を1箇所修正するだけで全 UseCase に反映される。

### UseCase内バリデーション: zodスキーマを safeParse() で再利用

ハードコードされた閾値（`password.length < 8` 等）は禁止。
Application層のバリデーションには `src/layers/application/utils/passwordValidation.ts` の
zodスキーマを `safeParse()` で使用する。

```typescript
import { newPasswordSchema } from '@/layers/application/utils/passwordValidation';

// ✅ zodスキーマで一元管理
const validation = newPasswordSchema.safeParse(newPassword);
if (!validation.success) {
  return err({
    message: validation.error.issues[0]?.message ?? 'パスワードが無効です',
    code: 'INVALID_PASSWORD',
  });
}

// ❌ 禁止: ハードコード閾値
if (newPassword.length < 8) {
  return err({ message: 'パスワードは8文字以上で入力してください', code: 'INVALID_PASSWORD_LENGTH' });
}
```

**NOTE**: Infrastructure層の `authSchema.ts` は Application層からインポート不可（Clean Architecture制約）。
バリデーションルールの変更時は `passwordValidation.ts` と `authSchema.ts` の両方を同期すること。

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
const result = await useCase.execute(request);

if (result.isOk()) {
  logger.info('処理成功', { userId: result.value.id });
  return { success: true, user: result.value };
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
    return err({ message: error.message, code: error.code });
  }

  if (error instanceof InfrastructureError) {
    this.logger.error('インフラエラー', { code: error.code });
    return err({ message: 'システムエラーが発生しました', code: 'INFRASTRUCTURE_ERROR' });
  }

  this.logger.error('予期しないエラー', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  return err({ message: '処理に失敗しました', code: 'UNEXPECTED_ERROR' });
}
```

## トランザクション管理パターン

```typescript
@injectable()
export class TransferPointsUseCase {
  async execute(request: TransferPointsRequest): Promise<Result<void, AppError>> {
    const transaction = await this.databaseFactory.beginTransaction();

    try {
      // 1. 送信者・受信者の取得
      const sender = await this.userRepository.findById(request.senderId, transaction);
      const receiver = await this.userRepository.findById(request.receiverId, transaction);

      if (!sender || !receiver) {
        return err({ message: 'ユーザーが見つかりません', code: 'USER_NOT_FOUND' });
      }

      // 2. ビジネスロジック実行
      const updatedSender = sender.subtractPoints(request.points);
      const updatedReceiver = receiver.addPoints(request.points);

      // 3. 永続化
      await this.userRepository.save(updatedSender, transaction);
      await this.userRepository.save(updatedReceiver, transaction);

      await transaction.commit();
      return ok(undefined);
    } catch (error) {
      await transaction.rollback();
      if (error instanceof DomainError) {
        return err({ message: error.message, code: error.code });
      }
      return err({ message: 'ポイント移動に失敗しました', code: 'TRANSFER_FAILED' });
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
  ): Promise<Result<void, AppError>> {
    try {
      // 1. 実行者の認証
      const currentUser = await this.userRepository.findById(currentUserId);
      if (!currentUser) {
        return err({ message: '認証が必要です', code: 'AUTHENTICATION_REQUIRED' });
      }

      // 2. 権限チェック
      const hasPermission = await this.authService.hasPermission(
        currentUserId,
        'DELETE_USER',
      );

      if (!hasPermission) {
        return err({
          message: 'このユーザーを削除する権限がありません',
          code: 'INSUFFICIENT_PERMISSION',
        });
      }

      // 3. 削除実行
      await this.userRepository.delete(request.targetUserId);

      this.logger.info('ユーザー削除完了', {
        deletedUserId: request.targetUserId,
        deletedBy: currentUserId,
      });

      return ok(undefined);
    } catch (error) {
      if (error instanceof DomainError) {
        return err({ message: error.message, code: error.code });
      }
      return err({ message: 'ユーザー削除に失敗しました', code: 'UNEXPECTED_ERROR' });
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
async execute(request: Request): Promise<Result<Response, AppError>> {
  const level = Math.floor(request.experiencePoints / 1000) + 1; // 禁止
  // このようなビジネスロジックはEntityやDomain Serviceで実装すべき
}
```

### UI・プレゼンテーション固有の処理

```typescript
// ❌ 禁止: UI固有の処理
return ok({
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
- [ ] ok() と err() を使用
- [ ] catch ブロックは `handleUseCaseError()` を使用（コピペ禁止）
- [ ] User エンティティ → DTO 変換は `UserMapper.toResponseDTO()` を使用
- [ ] 構造化ログを出力

### DTO
- [ ] Request/Response型を定義
- [ ] readonly プロパティを使用
- [ ] 型安全な定義

### バリデーション
- [ ] パスワードバリデーションは `newPasswordSchema.safeParse()` を使用
- [ ] ハードコード閾値（`length < 8` 等）を使用していない
- [ ] Infrastructure層のスキーマを直接インポートしていない

### エラーハンドリング
- [ ] try-catch の catch ブロックは `handleUseCaseError()` のみ
- [ ] 直接 err() を返す箇所はビジネスルール違反（ユーザーが見つからない等）のみ
- [ ] 適切なエラーコードを返却

### 依存ルール
- [ ] Domain層のみに依存
- [ ] Infrastructure層への直接依存がない（authSchema 等も禁止）
- [ ] Presentation層への依存がない

### 共通
- [ ] Value Objectは .value でアクセス（または UserMapper 経由）
- [ ] テストを作成

## 詳細リファレンス

より詳細なパターンと実装例は以下を参照:

- `references/usecase-patterns.md` - UseCase詳細パターン
- `references/result-type-guide.md` - Result型詳細ガイド
