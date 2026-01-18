# Result型詳細ガイド

Result型パターンの詳細な使用方法と実装パターンを解説します。

## Result型の基本

### 型定義

```typescript
// src/layers/application/types/Result.ts

/**
 * 成功時の結果
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * 失敗時の結果
 */
export interface Failure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: string;
    readonly details?: Record<string, unknown>;
  };
}

/**
 * Result型の汎用定義
 */
export type Result<T> = Success<T> | Failure;
```

### ヘルパー関数

```typescript
/**
 * 成功結果を作成
 */
export function success<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 失敗結果を作成
 */
export function failure(
  message: string,
  code: string,
  details?: Record<string, unknown>,
): Failure {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}
```

### 型ガード

```typescript
/**
 * 成功判定
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.success === true;
}

/**
 * 失敗判定
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return result.success === false;
}
```

## UseCaseでの使用パターン

### 基本的な使用例

```typescript
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';

async execute(request: Request): Promise<Result<Response>> {
  try {
    // ビジネスロジック実行
    const result = await this.doSomething();

    // 成功時
    return success({
      id: result.id,
      name: result.name,
    });
  } catch (error) {
    // DomainErrorの場合
    if (error instanceof DomainError) {
      return failure(error.message, error.code);
    }

    // その他のエラー
    return failure('処理に失敗しました', 'UNEXPECTED_ERROR');
  }
}
```

### 複雑な条件分岐

```typescript
async execute(request: Request): Promise<Result<Response>> {
  try {
    // 1. バリデーション
    if (!request.email) {
      return failure('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    // 2. Email Value Object作成（バリデーション込み）
    let emailVO: Email;
    try {
      emailVO = new Email(request.email);
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }
      return failure('メールアドレスの形式が正しくありません', 'EMAIL_INVALID');
    }

    // 3. ユーザー検索
    const user = await this.userRepository.findByEmail(emailVO);
    if (!user) {
      return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }

    // 4. ビジネスルールチェック
    if (!user.isActive()) {
      return failure(
        'このアカウントは停止されています',
        'ACCOUNT_SUSPENDED',
      );
    }

    // 5. 処理実行
    const updatedUser = user.updateProfile(emailVO, request.name);
    await this.userRepository.save(updatedUser);

    // 6. 成功
    return success({
      id: updatedUser.id.value,
      email: updatedUser.email.value,
      name: updatedUser.name,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return failure(error.message, error.code);
    }

    this.logger.error('予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return failure('処理に失敗しました', 'UNEXPECTED_ERROR');
  }
}
```

## Server Actionでの使用パターン

### 基本的なパターンマッチング

```typescript
'use server';

import { resolve } from '@/di/resolver';
import { isSuccess, isFailure } from '@/layers/application/types/Result';

export async function createUserAction(formData: FormData) {
  try {
    const logger = resolve('Logger');
    const createUserUseCase = resolve('CreateUserUseCase');

    const request = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const result = await createUserUseCase.execute(request);

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー作成成功', {
        userId: result.data.id,
      });

      return {
        success: true,
        user: result.data,
      };
    } else {
      logger.warn('ユーザー作成失敗', {
        error: result.error.message,
        code: result.error.code,
      });

      return {
        success: false,
        error: result.error.message,
        code: result.error.code,
      };
    }
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
```

### エラーコード別処理

```typescript
'use server';

import { resolve } from '@/di/resolver';
import { isSuccess, isFailure } from '@/layers/application/types/Result';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateUserAction(formData: FormData) {
  const logger = resolve('Logger');
  const updateUserUseCase = resolve('UpdateUserUseCase');

  const result = await updateUserUseCase.execute({
    userId: formData.get('userId') as string,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  });

  if (isSuccess(result)) {
    logger.info('ユーザー更新成功', { userId: result.data.id });
    revalidatePath(`/users/${result.data.id}`);
    redirect(`/users/${result.data.id}`);
  } else {
    // エラーコード別処理
    switch (result.error.code) {
      case 'USER_NOT_FOUND':
        return {
          success: false,
          error: 'ユーザーが見つかりませんでした',
          code: result.error.code,
        };

      case 'EMAIL_DUPLICATE':
        return {
          success: false,
          error: 'このメールアドレスは既に使用されています',
          code: result.error.code,
          field: 'email',
        };

      case 'INSUFFICIENT_PERMISSION':
        return {
          success: false,
          error: 'この操作を実行する権限がありません',
          code: result.error.code,
        };

      default:
        return {
          success: false,
          error: result.error.message,
          code: result.error.code,
        };
    }
  }
}
```

## Client Componentでの使用パターン

### useActionState との統合

```typescript
'use client';

import { useActionState } from 'react';
import { createUserAction } from '@/app/actions/user';

interface ActionState {
  success?: boolean;
  error?: string;
  code?: string;
  field?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createUserAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {/* エラー表示 */}
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {state.error}
        </div>
      )}

      {/* 成功表示 */}
      {state.success && state.user && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ユーザー「{state.user.name}」を作成しました
        </div>
      )}

      {/* フォームフィールド */}
      <div>
        <label htmlFor="name">名前</label>
        <input
          id="name"
          name="name"
          type="text"
          className={`border rounded px-3 py-2 ${
            state.field === 'name' ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {state.field === 'name' && (
          <p className="text-red-500 text-sm mt-1">{state.error}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          className={`border rounded px-3 py-2 ${
            state.field === 'email' ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {state.field === 'email' && (
          <p className="text-red-500 text-sm mt-1">{state.error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isPending ? '作成中...' : '作成'}
      </button>
    </form>
  );
}
```

## エラーコード体系

### 推奨エラーコード命名規則

```typescript
// バリデーションエラー
'EMAIL_REQUIRED'
'EMAIL_INVALID_FORMAT'
'EMAIL_TOO_LONG'
'PASSWORD_TOO_SHORT'
'NAME_REQUIRED'

// ビジネスルールエラー
'EMAIL_DUPLICATE'
'INSUFFICIENT_BALANCE'
'ACCOUNT_SUSPENDED'
'PROMOTION_NOT_ALLOWED'

// 認証・認可エラー
'AUTHENTICATION_REQUIRED'
'INVALID_CREDENTIALS'
'INSUFFICIENT_PERMISSION'
'ACCOUNT_LOCKED'

// リソースエラー
'USER_NOT_FOUND'
'RESOURCE_NOT_FOUND'

// Rate Limiting
'RATE_LIMIT_EXCEEDED'

// システムエラー
'DATABASE_ERROR'
'EXTERNAL_API_ERROR'
'UNEXPECTED_ERROR'
```

### エラーコード使用例

```typescript
// Domain Error
throw new DomainError(
  'メールアドレスは必須です',
  'EMAIL_REQUIRED',
);

// UseCase Result
return failure(
  'このメールアドレスは既に使用されています',
  'EMAIL_DUPLICATE',
);

// 詳細情報付き
return failure(
  'ポイントが不足しています',
  'INSUFFICIENT_BALANCE',
  {
    required: 1000,
    current: 500,
  },
);
```

## 複数Resultの組み合わせ

### combineResults ユーティリティ

```typescript
import { combineResults } from '@/layers/application/types/Result';

async execute(request: Request): Promise<Result<Response>> {
  // 複数の非同期処理を並列実行
  const [result1, result2, result3] = await Promise.all([
    this.service1.process(request.data1),
    this.service2.process(request.data2),
    this.service3.process(request.data3),
  ]);

  // 全て成功の場合のみ成功
  const combined = combineResults([result1, result2, result3]);

  if (isFailure(combined)) {
    return combined; // 最初の失敗を返す
  }

  // 全て成功した場合の処理
  const [data1, data2, data3] = combined.data;
  return success({
    result: {
      data1,
      data2,
      data3,
    },
  });
}
```

## テストでの使用パターン

### Result型のアサーション

```typescript
import { isSuccess, isFailure } from '@/layers/application/types/Result';

describe('CreateUserUseCase', () => {
  it('正常にユーザーを作成できる', async () => {
    const result = await useCase.execute(request);

    // 成功判定
    expect(isSuccess(result)).toBe(true);

    // 型ガード後のデータアクセス
    if (isSuccess(result)) {
      expect(result.data.name).toBe('テストユーザー');
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('メールアドレス重複でエラーが返される', async () => {
    const result = await useCase.execute(request);

    // 失敗判定
    expect(isFailure(result)).toBe(true);

    // 型ガード後のエラー情報アクセス
    if (isFailure(result)) {
      expect(result.error.code).toBe('EMAIL_DUPLICATE');
      expect(result.error.message).toBe(
        'このメールアドレスは既に使用されています',
      );
    }
  });
});
```

### エラーケースのテスト

```typescript
describe('SignInUseCase - エラーケース', () => {
  it('ユーザーが見つからない場合', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'nonexistent@example.com',
      password: 'password',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('パスワードが不正な場合', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockHashService.compareHash.mockResolvedValue(false);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('Rate Limit超過の場合', async () => {
    mockRateLimitService.checkLimit.mockResolvedValue({
      allowed: false,
      current: 10,
      limit: 10,
      retryAfterMs: 60000,
    });

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password',
      ipAddress: '192.168.1.1',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
```

## ベストプラクティス

### 1. 一貫したエラーコード命名

- SCREAMING_SNAKE_CASE を使用
- 具体的で説明的な名前を付ける
- カテゴリ別にプレフィックスを統一

### 2. 詳細情報の活用

```typescript
return failure(
  'ポイントが不足しています',
  'INSUFFICIENT_BALANCE',
  {
    required: 1000,
    current: balance,
    userId: user.id.value,
  },
);
```

### 3. 型ガードの活用

```typescript
// ✅ 推奨: 型ガードで型を絞り込む
if (isSuccess(result)) {
  console.log(result.data.name); // 型安全
}

// ❌ 避ける: 型ガードなしでのアクセス
if (result.success) {
  console.log(result.data.name); // 型エラーの可能性
}
```

### 4. ログ出力の統一

```typescript
if (isSuccess(result)) {
  this.logger.info('処理成功', {
    userId: result.data.id,
  });
} else {
  this.logger.warn('処理失敗', {
    error: result.error.message,
    code: result.error.code,
    details: result.error.details,
  });
}
```

詳細な実装例は`_DOCS/guides/ddd/cross-cutting/error-handling.md`を参照してください。
