---
name: resultasync-patterns
description: |
  ResultAsync を使った非同期 UseCase の実装パターンを提供するスキル。
  ResultAsync.fromPromise + mapToAppError パターンの強制、
  new ResultAsync(IIFE) パターンの禁止、エラー伝播の正しい扱い方を提供する。

  トリガー例:
  - 「ResultAsync」「new ResultAsync」「neverthrow」
  - UseCase実装時、「execute(」「_execute(」
  - src/layers/application/use-cases/ 配下のファイルを編集するとき
  - ResultAsync.fromPromise を使うとき
---

# ResultAsync Patterns Skill

非同期 UseCase での `ResultAsync` 実装パターンを提供します。

---

## 推奨パターン: ResultAsync.fromPromise + _execute

`execute()` は `ResultAsync.fromPromise` で薄くラップするだけ。
ビジネスロジックは `private async _execute()` に分離する。

```typescript
import { ResultAsync } from 'neverthrow';
import { injectable, inject } from 'tsyringe';
import { AppUseCaseError, mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import type { AppError } from '@/layers/application/types/Result';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  // ✅ execute() は fromPromise で薄くラップするだけ
  execute(request: CreateUserRequest): ResultAsync<CreateUserResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(this.logger, 'ユーザー作成', 'USER_CREATION_FAILED'),
    );
  }

  // ✅ ビジネスロジックは _execute() に集約
  private async _execute(request: CreateUserRequest): Promise<CreateUserResponse> {
    const authResult = await this.getCurrentUserUseCase.requireAuthentication();
    if (authResult.isErr()) {
      // 直接エラー伝播: throw new AppUseCaseError でエラーコードを保持
      throw new AppUseCaseError(authResult.error.message, authResult.error.code);
    }

    // バリデーション失敗時も AppUseCaseError でスロー
    const emailVo = Email.create(request.email);
    if (emailVo.isErr()) {
      throw new AppUseCaseError(emailVo.error.message, emailVo.error.code);
    }

    const user = await this.userRepository.findByEmail(emailVo.value);
    if (user) {
      throw new AppUseCaseError('メールアドレスが既に使用されています', 'EMAIL_DUPLICATE');
    }

    // 正常系は通常の値を return するだけ
    const newUser = User.create({ ... });
    await this.userRepository.save(newUser);
    return { id: newUser.id.value };
  }
}
```

---

## mapToAppError ヘルパーの使い方

`mapToAppError` は `src/layers/application/utils/useCaseErrorHandler.ts` に定義されている。

```typescript
import { mapToAppError, AppUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

// ResultAsync.fromPromise の第2引数として使う
execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(
    this._execute(request),
    mapToAppError(this.logger, 'コンテキスト名（ログ用）', 'FALLBACK_ERROR_CODE'),
  );
}
```

`mapToAppError` が自動で行うこと:
- `AppUseCaseError` → message/code/details をそのまま AppError に変換（ログなし）
- `DomainError` → message/code を AppError に変換
- その他の Error → ログ出力 + fallbackCode で AppError に変換

---

## 禁止パターン: new ResultAsync(IIFE)

```typescript
// ❌ 禁止: new ResultAsync(IIFE) パターンは冗長で可読性が低い
execute(request: Request): ResultAsync<Response, AppError> {
  return new ResultAsync(
    (async (): Promise<Result<Response, AppError>> => {
      try {
        // ...
        return ok(response);
      } catch (error) {
        return handleUseCaseError(error, this.logger, 'context', 'CODE');
      }
    })(),
  );
}
```

**理由**: `fromPromise` + `_execute` パターンの方がシンプルで一貫性が高い。
IIFE パターンは try/catch の二重管理が発生し、コードが膨らむ。

---

## 禁止パターン: err 再ラップ

認証結果などの中間 Result を err() で再ラップしないこと。

```typescript
// ❌ 禁止: err({message: x, code: y}) による再ラップ
private async _execute(request: Request): Promise<Response> {
  const authResult = await this.getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    // ❌ これは _execute() 内では使えない（Result 型を返せない）
    return err({ message: authResult.error.message, code: authResult.error.code });
  }
}

// ✅ 正しい: AppUseCaseError を throw して mapToAppError に処理させる
private async _execute(request: Request): Promise<Response> {
  const authResult = await this.getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    throw new AppUseCaseError(authResult.error.message, authResult.error.code);
  }
  // 以降は authResult.value を型安全に使える
}
```

---

## 禁止パターン: async execute() と ResultAsync の組み合わせ

`execute()` に `async` をつけると `ResultAsync.fromPromise()` の戻り値がさらに `Promise` でラップされる。

```typescript
// ❌ 禁止: async + ResultAsync → Promise<Result<T,E>> になる
async execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(this._execute(request), mapToAppError(...));
}

// ✅ 正しい: async なし → ResultAsync<Response, AppError>
execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(this._execute(request), mapToAppError(...));
}
```

`execute()` は `async` にしない。非同期処理は `_execute()` に閉じ込める。

**同期的に Result を返す場合:**
```typescript
// ✅ 正しい: 同期 UseCase
execute(request: Request): Result<Response, AppError> {
  return ok({ message: '成功' });
}
```

---

## execute() が同期の場合

非同期 I/O がない UseCase（例: SignOutUseCase）は `Result<T, E>` のまま。

```typescript
// ✅ 同期処理は ResultAsync 不要
execute(request: SignOutRequest): Result<SignOutResponse, AppError> {
  return ok({ redirectTo: routes.signIn });
}
```

---

## 既存の IIFE パターンを移行する手順

1. `new ResultAsync((async () => { ... })())` → `ResultAsync.fromPromise(this._execute(...), mapToAppError(...))`
2. try/catch 内の `ok()` / `err()` returns → `return value` / `throw new AppUseCaseError()`
3. `handleUseCaseError(error, ...)` → `mapToAppError` が自動処理するため削除

---

## チェックリスト

- [ ] `execute()` は `ResultAsync.fromPromise(this._execute(...), mapToAppError(...))` で実装している
- [ ] `new ResultAsync(IIFE)` パターンを使っていない
- [ ] ビジネスロジックは `private async _execute()` に分離している
- [ ] 中間 Result のエラーは `throw new AppUseCaseError(...)` で伝播している
- [ ] `err({message: x.error.message, code: x.error.code})` による再ラップをしていない
- [ ] `mapToAppError` は `@/layers/application/utils/useCaseErrorHandler` からインポートしている

---

## 関連スキル

- **neverthrow-patterns**: ok()/err()、Result 型の基本パターン
- **error-handling-utils**: toErrorMeta、mapPrismaError による Repository エラーハンドリング
- **application-impl**: UseCase 実装のアーキテクチャパターン
