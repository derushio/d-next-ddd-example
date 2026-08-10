---
name: neverthrow-patterns
description: |
  neverthrow 8.2.0 を使用した Result 型パターンを提供するスキル。
  ok()/err()、.isOk()/.isErr()、.value/.error による型安全なエラーハンドリングを支援。
  ResultAsync.fromPromise vs new ResultAsync(IIFE) の比較、
  mapToAppError ヘルパーの使い方、err 再ラップ禁止ルールも提供。
  UseCase・Server Action・テストでの正しい使用パターンを提供します。

  トリガー例:
  - 「Result型」「neverthrow」「ok/err」「isOk/isErr」
  - 「エラーハンドリング」「Result型パターン」「ResultAsync」「mapToAppError」
  - src/layers/application/types/Result.ts の編集時
  - UseCase の戻り値型を実装するとき
---

# neverthrow パターンスキル

neverthrow 8.2.0 ベースの Result 型実装パターン。

---

## 概要

このプロジェクトでは **neverthrow** を使用して型安全なエラーハンドリングを実現しています。
全 UseCase は `Result<T, AppError>` を返し、例外を throw しません（UseCase 外部へは）。

```typescript
// UseCase での使用例（インポート）
import {
  type AppError,
  err,
  ok,
  type Result,
  ResultAsync,
} from '@/layers/application/types/Result';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';

// AppError の型定義（Result.ts で定義済み、再定義不要）
// interface AppError {
//   readonly message: string;
//   readonly code: string;
//   readonly details?: Record<string, unknown>;
// }
```

---

## ResultAsync パターン（非同期UseCase標準）

非同期I/Oを含むUseCaseの`execute()`は`ResultAsync<T, AppError>`を返す。

### 標準パターン（fromPromise + _execute）

```typescript
import { ResultAsync } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';

// execute() は fromPromise で _execute() をラップするだけ
execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(
    this._execute(request),
    mapToAppError(this.logger, 'コンテキスト説明', 'FALLBACK_ERROR_CODE'),
  );
}

// _execute() は通常の async メソッド — ビジネスロジックはここに書く
private async _execute(request: Request): Promise<Response> {
  const emailVO = Email.create(request.email);
  if (emailVO.isErr()) {
    // ✅ _execute 内では AppUseCaseError を throw する
    throw new AppUseCaseError(emailVO.error.message, emailVO.error.code);
  }

  const user = await this.userRepository.findByEmail(emailVO.value);
  if (!user) {
    throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
  }

  return { id: user.id.value, name: user.name };
}
```

> **旧パターン（非推奨）**: `new ResultAsync((async () => { try/catch })())` の IIFE パターン。
> `fromPromise` + `mapToAppError` + `_execute` の分離が現在の標準。

### ResultAsync.combine() — 複数の非同期Result合成

```typescript
const [users, count] = await ResultAsync.combine([
  ResultAsync.fromPromise(repo.findAll(), mapError),
  ResultAsync.fromPromise(repo.count(), mapError),
]);
```

### 同期処理は従来通り

同期的に ok()/err() を返すだけのケース（SignOutUseCase等）は `Result<T, E>` のまま。
ResultAsync は非同期I/Oがある場合にのみ使用する。

---

## mapToAppError ヘルパー

`src/layers/application/utils/useCaseErrorHandler.ts` に定義。
`ResultAsync.fromPromise` の第2引数（エラーマッパー）として使用する。

```typescript
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';

// シグネチャ
// mapToAppError(logger, context, fallbackCode) → (error: unknown) => AppError

execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(
    this._execute(request),
    mapToAppError(
      this.logger,
      '処理中に予期しないエラーが発生',  // logger.error に渡されるコンテキスト
      'OPERATION_FAILED',               // DomainError/AppUseCaseError 以外のフォールバックコード
    ),
  );
}
```

**mapToAppError の動作**:

| エラー型 | 動作 |
|---------|------|
| `AppUseCaseError` | `logger.error` を呼ばず、そのまま `{ message, code }` に変換（予期済みビジネスロジックエラー） |
| `DomainError` | `logger.error` + `{ message, code }` に変換（コード保持） |
| その他 | `logger.error` + `{ message: error.message, code: fallbackCode }` |

---

## AppUseCaseError — _execute 内でのエラースロー

`_execute()` 内でビジネスロジックエラーを表現するには `AppUseCaseError` を throw する。
`mapToAppError` がこれを検出して AppError に変換するため、`logger.error` は呼ばれない。

```typescript
import {
  AppUseCaseError,
} from '@/layers/application/utils/useCaseErrorHandler';

private async _execute(request: Request): Promise<Response> {
  // ✅ バリデーションエラーは AppUseCaseError で throw
  if (!request.name || request.name.trim() === '') {
    throw new AppUseCaseError('名前が空です', 'NAME_REQUIRED');
  }

  // ✅ Value Object 生成エラーの伝播
  const emailVO = Email.create(request.email);
  if (emailVO.isErr()) {
    throw new AppUseCaseError(emailVO.error.message, emailVO.error.code);
  }

  // ✅ ビジネスルール違反
  const existing = await this.userRepository.findByEmail(emailVO.value);
  if (existing) {
    throw new AppUseCaseError('メールアドレスは既に使用されています', 'EMAIL_ALREADY_EXISTS');
  }

  // 正常系は return で値を返す（never throws here）
  const user = await this.userRepository.create({ ... });
  return { id: user.id.value };
}
```

---

## 基本パターン

### UseCase での使用（同期・シンプルなケース）

```typescript
import {
  type AppError,
  err,
  ok,
  type Result,
} from '@/layers/application/types/Result';

// 同期UseCase（非同期I/Oなし）は ok()/err() を直接使用する
execute(request: Request): Result<Response, AppError> {
  const emailVO = Email.create(request.email);
  if (emailVO.isErr()) {
    return err(emailVO.error);
  }
  return ok({ success: true });
}
```

### 正しい使用パターン

常に `ok()` / `err()` を直接使用する:

```typescript
import { err, ok } from '@/layers/application/types/Result';
return ok(data);
return err({ message: 'msg', code: 'CODE' });
```

---

## 型定義

```typescript
// 2つの型引数が必須（1つだけだと型エラー）
Promise<Result<MyResponse, AppError>>   // 正しい
Promise<Result<MyResponse>>             // 型エラー！AppError が必要

// AppError の構造
interface AppError {
  readonly message: string;   // ユーザー向けメッセージ
  readonly code: string;      // エラーコード（例: 'USER_NOT_FOUND'）
  readonly details?: Record<string, unknown>;  // オプション追加情報
}
```

---

## 判定パターン

```typescript
const result = await useCase.execute(request);

// 成功/失敗の判定
if (result.isOk()) {
  // → result.value は T 型としてアクセス可能（ここでは UseCase の Response 型）
}
if (result.isErr()) {
  // → result.error は AppError 型としてアクセス可能
  // → result.error.message: string
  // → result.error.code: string
}

// isSuccess(result) → result.isOk()
// isFailure(result) → result.isErr()
// result.data → result.value
```

---

## Server Action パターン

Server Action では Result をそのまま返さず、plain object に変換する:

```typescript
export async function createUserAction(formData: FormData) {
  const useCase = resolve('CreateUserUseCase');
  const result = await useCase.execute({ name, email, password });

  if (result.isErr()) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}
```

**重要**: Client Component では `result.value` ではなく `result.data` でアクセス（plain object のため）:

```typescript
// Client Component
const result = await createUserAction(formData);
if (result.success) {
  console.log(result.data);  // plain object — neverthrow の .value ではない
}
```

---

## 認証チェックパターン（AuthResult の型問題）

`requireAuthentication()` の戻り値を別の `ResultAsync<T, AppError>` の `_execute` 内で使う場合、
型の不一致が発生するため `throw new AppUseCaseError()` で再スローする:

```typescript
// NG — _execute の戻り値型が違うと直接 return できない
private async _execute(...): Promise<OtherResponse> {
  const authResult = await this.getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return authResult;  // 型エラー！Promise<OtherResponse> に対して Result を返している
  }

  // OK — AppUseCaseError で再スロー（mapToAppError が変換）
  if (authResult.isErr()) {
    throw new AppUseCaseError(authResult.error.message, authResult.error.code);
  }

  const session = authResult.value;
  // ... ビジネスロジック
  return { ... };
}
```

---

## テストパターン

```typescript
import { describe, it, expect } from 'vitest';

describe('CreateUserUseCase', () => {
  it('有効な入力でユーザーを作成できる', async () => {
    const result = await useCase.execute(validInput);

    // 成功ケース
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Test User');
      expect(result.value.id).toBeDefined();
    }
  });

  it('無効なメールアドレスの場合は失敗する', async () => {
    const result = await useCase.execute({ ...validInput, email: 'invalid' });

    // 失敗ケース
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
      expect(result.error.message).toContain('メールアドレス');
    }
  });
});
```

---

## fromThrowable: 例外をスローする関数を Result にラップ

外部ライブラリや既存の throw ベースの関数を Result 型に変換する際は `fromThrowable` を使用する。

```typescript
// ❌ 禁止: 独自の trying() ユーティリティ（削除済み）
// ❌ 禁止: try/catch で手動ラップ
try {
  const result = riskyFunction();
  return ok(result);
} catch (e) {
  return err(new AppError(e));
}

// ✅ 推奨: fromThrowable で宣言的にラップ
import { fromThrowable } from 'neverthrow';

const safeRiskyFunction = fromThrowable(
  riskyFunction,
  (error) => ({ message: error instanceof Error ? error.message : 'Unknown error', code: 'OPERATION_FAILED' })
);

const result = safeRiskyFunction(); // Result<T, AppError>
```

### 実践例: JSON.parse のラップ

```typescript
import { fromThrowable } from 'neverthrow';
import type { AppError } from '@/layers/application/types/Result';

const safeJsonParse = fromThrowable(
  JSON.parse,
  (error): AppError => ({
    message: error instanceof Error ? error.message : 'JSON parse error',
    code: 'JSON_PARSE_ERROR',
  })
);

const result = safeJsonParse('{"key": "value"}');
// result: Result<unknown, AppError>
```

---

## 複数 Result の結合

```typescript
import { combineResults, type Result } from '@/layers/application/types/Result';

const results = [result1, result2, result3];
const combined = combineResults(results);
// combined: Ok<T[]> | Err<AppError>
```

---

## .mapErr() チェーンパターン

`execute()` の戻り値に対して `.mapErr()` をチェーンすることで、エラー変換・ログ出力をシンプルに記述できる。

### 基本パターン

```typescript
// execute() の結果に mapErr() をチェーン
const result = await useCase.execute(request).mapErr((error) => {
  // エラー変換 or ログ出力
  logger.warn('処理失敗', { code: error.code });
  return error; // AppError をそのまま通す
});
```

### requireAuthentication() の改善例

`requireAuthentication()` でエラーが起きた際に `throw new AppUseCaseError()` で再スローする代わりに、
`mapErr` チェーンで変換することで二重ラップを避けられる。

```typescript
// NG — execute 内で throw → fromPromise → mapToAppError の二重ラップ
private async _execute(...): Promise<Response> {
  const authResult = await this.getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    throw new AppUseCaseError(authResult.error.message, authResult.error.code);
  }
  // ...
}

// OK — requireAuthentication() 自体の ResultAsync に mapErr をチェーン
execute(request: Request): ResultAsync<Response, AppError> {
  return this.getCurrentUserUseCase
    .requireAuthentication()
    .andThen((session) =>
      ResultAsync.fromPromise(
        this._execute(request, session),
        mapToAppError(this.logger, '処理中にエラーが発生', 'OPERATION_FAILED'),
      ),
    );
}
```

### mapErr 内でのログ出力パターン

```typescript
// mapErr 内でログを追加してからエラーをそのまま返す
const result = await useCase
  .execute(request)
  .mapErr((error) => {
    this.logger.warn('UseCase実行失敗', { code: error.code, message: error.message });
    return error; // AppError をそのまま通す（変換しない場合）
  });
```

> **二重ラップ禁止**: `execute()` → `await` → `throw` → `fromPromise` のパターンは
> `mapErr` チェーンに置換可能。エラーを再 throw して再度 fromPromise でラップすることは禁止。

---

## ResultAsync.combine() — 並列 Result 操作

複数の `ResultAsync` を並列実行し、全て成功した場合にタプルで返す。
`Promise.all` の型安全な代替。1つでも失敗すれば最初のエラーを返す。

### 基本パターン

```typescript
import { ResultAsync } from 'neverthrow';

// ✅ ResultAsync.combine() で並列実行
const result = await ResultAsync.combine([
  userRepository.findById(userId),   // ResultAsync<User, AppError>
  orderRepository.findByUserId(userId), // ResultAsync<Order[], AppError>
]);

result.match(
  ([user, orders]) => {
    // 両方成功: user: User, orders: Order[]
    console.log(user.name, orders.length);
  },
  (error) => {
    // いずれか失敗: error: AppError
    console.error(error.message);
  },
);
```

### Promise.all との使い分け

| パターン | 使い場面 |
|---------|---------|
| `Promise.all` inside `_execute()` | 既存パターン。外側の `ResultAsync.fromPromise()` がエラーをキャッチ。シンプル。 |
| `ResultAsync.combine()` | 各操作が独立して `ResultAsync` を返す場合。エラーが型で保証される。 |

```typescript
// ✅ 既存パターン（引き続き有効）: Promise.all inside _execute()
private async _execute(request: Request): Promise<Response> {
  const [users, count] = await Promise.all([
    this.userRepository.findByCriteria(criteria),
    this.userRepository.count(query),
  ]);
  return { users, count };
}

// ✅ 新パターン: ResultAsync.combine()（各操作がResultAsyncを返す場合）
execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.combine([
    this.userRepository.findByCriteriaSafe(criteria),
    this.userRepository.countSafe(query),
  ]).map(([users, count]) => ({ users, count }));
}
```

---

## result.match() — 網羅的パターンマッチング

`isOk()` / `isErr()` の代わりに `match()` を使うと、成功/失敗の両ケースを強制的にハンドリングできる。

```typescript
// ❌ isOk/isErr パターン（ハンドリング漏れの可能性）
if (result.isOk()) {
  return { success: true, data: result.value };
}
return { success: false, error: result.error.message };

// ✅ match() パターン（網羅的）
return result.match(
  (value) => ({ success: true as const, data: value }),
  (error) => ({ success: false as const, error: error.message }),
);
```

**注意**: 既存の `isOk()` / `isErr()` パターンも引き続き有効。`match()` は特に Server Action の ActionResult 変換で有効。

---

## よくある間違い

| 間違い | 正しい |
|--------|--------|
| `Result<T>` (1引数) | `Result<T, AppError>` (2引数) |
| `result.data` | `result.value` |
| `isSuccess(result)` | `result.isOk()` |
| `isFailure(result)` | `result.isErr()` |
| `new ResultAsync((async () => { try/catch })())` | `ResultAsync.fromPromise(this._execute(...), mapToAppError(...))` |
| `_execute` 内で `return err(...)` | `_execute` 内で `throw new AppUseCaseError(...)` |
| `throw new Error()` | UseCase 外から見れば `err({ message, code })` として返る（mapToAppError 経由） |
| 認証エラー: `return authResult` | `throw new AppUseCaseError(authResult.error.message, authResult.error.code)` |

---

## andThen チェーンによるエラーチェーン最適化

複数の ResultAsync 操作をチェーンする場合、`andThen` で直接合成できる。

### 認証 → ビジネスロジック チェーンパターン

```typescript
execute(request: Request): ResultAsync<Response, AppError> {
  return this.getCurrentUserUseCase
    .requireAuthentication()
    .andThen((session) =>
      ResultAsync.fromPromise(
        this._execute(request, session),
        mapToAppError(this.logger, '処理中にエラー', 'OPERATION_FAILED'),
      ),
    );
}
```

### 並列 + チェーン

```typescript
execute(request: Request): ResultAsync<Response, AppError> {
  return this.getCurrentUserUseCase
    .requireAuthentication()
    .andThen((session) =>
      ResultAsync.combine([
        ResultAsync.fromPromise(this.repo.findById(id), mapErr),
        ResultAsync.fromPromise(this.repo.count(), mapErr),
      ]).map(([user, count]) => ({ user, count, session })),
    );
}
```

**注意**: 現行の `_execute()` throw → `fromPromise` catch パターンも有効。andThen チェーンは、
認証結果を直接使いたい場合に特に有用。新規UseCaseで検討すること。

---

## 移行チェックリスト

既存コードを neverthrow に移行する場合:

- [ ] `isSuccess(result)` → `result.isOk()`
- [ ] `isFailure(result)` → `result.isErr()`
- [ ] `result.data` → `result.value` (UseCase/Service内)
- [ ] `Result<T>` → `Result<T, AppError>` (型引数)
- [ ] `new ResultAsync(IIFE)` → `ResultAsync.fromPromise(this._execute(...), mapToAppError(...))`
- [ ] `_execute` 内の `return err(...)` → `throw new AppUseCaseError(...)`
- [ ] 認証結果の `return authResult` → `throw new AppUseCaseError(authResult.error.message, authResult.error.code)`
- [ ] Server Action の `result.data` は変更不要（plain object）
