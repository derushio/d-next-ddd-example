# Result型詳細ガイド（neverthrow）

neverthrow 8.2.0 ベースの Result 型パターンの詳細な使用方法と実装パターン。

## Result型の基本

### 型定義（neverthrow）

```typescript
// src/layers/application/types/Result.ts
import { ok, err, Result, ResultAsync } from 'neverthrow';
export { ok, err, Result, ResultAsync } from 'neverthrow';

export interface AppError {
  readonly message: string;
  readonly code: string;
  readonly details?: Record<string, unknown>;
}

export function combineResults<T>(
  results: Result<T, AppError>[],
): Result<T[], AppError> {
  return Result.combine(results);
}
```

### 型の基本ルール

```typescript
// 2つの型引数が必須
Promise<Result<MyResponse, AppError>>   // 正しい
Promise<Result<MyResponse>>             // 型エラー！ AppError が必要

// 値へのアクセス
result.isOk()          // 成功判定
result.isErr()         // 失敗判定
result.value           // 成功値（isOk() 後に安全）
result.error           // AppError（isErr() 後に安全）
result.error.message   // エラーメッセージ
result.error.code      // エラーコード
```

## UseCaseでの使用パターン

### 基本的な使用例

```typescript
import { ok, err, type Result } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';

async execute(request: Request): Promise<Result<Response, AppError>> {
  try {
    const result = await this.doSomething();
    return ok({ id: result.id, name: result.name });
  } catch (error) {
    if (error instanceof DomainError) {
      return err({ message: error.message, code: error.code });
    }
    return err({ message: '処理に失敗しました', code: 'UNEXPECTED_ERROR' });
  }
}
```

### 複雑な条件分岐

```typescript
import { ok, err, type Result } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';

async execute(request: Request): Promise<Result<Response, AppError>> {
  try {
    // 1. バリデーション
    if (!request.email) {
      return err({ message: 'メールアドレスは必須です', code: 'EMAIL_REQUIRED' });
    }

    // 2. Email Value Object作成（バリデーション込み）
    let emailVO: Email;
    try {
      emailVO = new Email(request.email);
    } catch (error) {
      if (error instanceof DomainError) {
        return err({ message: error.message, code: error.code });
      }
      return err({ message: 'メールアドレスの形式が正しくありません', code: 'EMAIL_INVALID' });
    }

    // 3. ユーザー検索
    const user = await this.userRepository.findByEmail(emailVO);
    if (!user) {
      return err({ message: 'ユーザーが見つかりません', code: 'USER_NOT_FOUND' });
    }

    // 4. 処理実行
    const updatedUser = user.updateProfile(emailVO, request.name);
    await this.userRepository.save(updatedUser);

    return ok({ id: updatedUser.id.value, email: updatedUser.email.value });
  } catch (error) {
    if (error instanceof DomainError) {
      return err({ message: error.message, code: error.code });
    }
    this.logger.error('予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return err({ message: '処理に失敗しました', code: 'UNEXPECTED_ERROR' });
  }
}
```

### 認証チェックパターン（型エラーに注意）

```typescript
// requireAuthentication() の戻り値型は Err<GetCurrentUserResponse, AppError>
// これを別の Result<T, AppError> に return すると型エラーになる

// NG — 型エラー
const authResult = await this.getCurrentUserUseCase.requireAuthentication();
if (authResult.isErr()) {
  return authResult;  // 型エラー！ T が一致しない
}

// OK — err() で再ラップ（コード・メッセージを引き継ぐ）
import { err } from '@/layers/application/types/Result';
if (authResult.isErr()) {
  return err({ message: authResult.error.message, code: authResult.error.code });
}
```

## Server Actionでの使用パターン

### 基本パターン

```typescript
'use server';

import { resolve } from '@/di/resolver';

export async function createUserAction(formData: FormData) {
  const logger = resolve('Logger');
  const createUserUseCase = resolve('CreateUserUseCase');

  const result = await createUserUseCase.execute({
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (result.isErr()) {
    logger.warn('ユーザー作成失敗', { error: result.error.message, code: result.error.code });
    return { success: false, error: result.error.message, code: result.error.code };
  }

  logger.info('ユーザー作成成功', { userId: result.value.id });
  return { success: true, data: result.value };
}
```

### エラーコード別処理

```typescript
export async function updateUserAction(formData: FormData) {
  const result = await resolve('UpdateUserUseCase').execute({
    userId: formData.get('userId') as string,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  });

  if (result.isOk()) {
    revalidatePath(`/users/${result.value.id}`);
    redirect(`/users/${result.value.id}`);
  }

  switch (result.error.code) {
    case 'USER_NOT_FOUND':
      return { success: false, error: 'ユーザーが見つかりませんでした', code: result.error.code };
    case 'EMAIL_DUPLICATE':
      return { success: false, error: 'このメールアドレスは既に使用されています', code: result.error.code, field: 'email' };
    default:
      return { success: false, error: result.error.message, code: result.error.code };
  }
}
```

**重要**: Server Action が返す `{ success: true, data: result.value }` の `data` は plain object。
Client Component では `result.data` でアクセス（neverthrow の `.value` ではない）。

## エラーコード体系

```typescript
// バリデーションエラー
'EMAIL_REQUIRED' | 'EMAIL_INVALID_FORMAT' | 'EMAIL_TOO_LONG'
'PASSWORD_TOO_SHORT' | 'NAME_REQUIRED'

// ビジネスルールエラー
'EMAIL_DUPLICATE' | 'ACCOUNT_SUSPENDED'

// 認証・認可エラー
'AUTHENTICATION_REQUIRED' | 'INVALID_CREDENTIALS' | 'FORBIDDEN' | 'ACCOUNT_LOCKED'

// リソースエラー
'USER_NOT_FOUND' | 'RESOURCE_NOT_FOUND'

// Rate Limiting
'RATE_LIMIT_EXCEEDED'

// システムエラー
'DATABASE_ERROR' | 'EXTERNAL_API_ERROR' | 'UNEXPECTED_ERROR'
```

## 複数Resultの組み合わせ

```typescript
import { Result, combineResults } from '@/layers/application/types/Result';

async execute(request: Request): Promise<Result<Response, AppError>> {
  const [result1, result2] = await Promise.all([
    this.service1.process(request.data1),
    this.service2.process(request.data2),
  ]);

  const combined = combineResults([result1, result2]);
  if (combined.isErr()) {
    return combined;  // 最初の失敗を返す
  }

  const [data1, data2] = combined.value;
  return ok({ result: { data1, data2 } });
}
```

## テストでのアサーション

```typescript
describe('CreateUserUseCase', () => {
  it('正常にユーザーを作成できる', async () => {
    const result = await useCase.execute(request);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('テストユーザー');
      expect(result.value.email).toBe('test@example.com');
    }
  });

  it('メールアドレス重複でエラーが返される', async () => {
    const result = await useCase.execute(request);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('EMAIL_DUPLICATE');
      expect(result.error.message).toContain('メールアドレス');
    }
  });
});
```

## ベストプラクティス

### 1. 型ガードの活用

```typescript
// 推奨: isOk()/isErr() で型を絞り込む
if (result.isOk()) {
  console.log(result.value.name);   // 型安全
}
if (result.isErr()) {
  console.log(result.error.code);   // 型安全
}
```

### 2. ログ出力の統一

```typescript
if (result.isOk()) {
  this.logger.info('処理成功', { userId: result.value.id });
} else {
  this.logger.warn('処理失敗', {
    error: result.error.message,
    code: result.error.code,
    details: result.error.details,
  });
}
```

### 3. 詳細情報の活用

```typescript
return err({
  message: 'ポイントが不足しています',
  code: 'INSUFFICIENT_BALANCE',
  details: { required: 1000, current: balance, userId: user.id.value },
});
```

詳細な実装例は `_DOCS/guides/ddd/cross-cutting/error-handling.md` を参照してください。
