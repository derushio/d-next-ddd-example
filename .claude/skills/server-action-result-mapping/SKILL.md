---
description: |
  withAuth() コールバック内での UseCase result → ActionResult<T> 変換パターンを標準化するスキル。
  resultToActionResult() ヘルパーの使い方、revalidatePath() 挿入タイミング、
  standalone Server Action（未認証）での直接変換パターンを提供する。

  トリガー例:
  - 「result.isOk()」「ActionResult」「resultToActionResult」
  - withAuth() コールバック内で UseCase result を変換しようとしたとき
  - src/app/server-actions/ 配下のファイルを新規作成・編集するとき
  - 「revalidatePath」「キャッシュ無効化」をServer Action内で書くとき
globs:
  - "src/app/server-actions/**/*.ts"
---

# Server Action Result Mapping パターン

## 原則

Server Action で UseCase の Result 型を ActionResult に変換する際は、
**`resultToActionResult()` ヘルパー**を使用し、手書きの `if (result.isOk())` ボイラープレートを避けること。

## `resultToActionResult()` API

**ファイル**: `src/app/server-actions/utils/resultToActionResult.ts`

### シグネチャ

```ts
function resultToActionResult<T, TData = T>(
  result: Result<T, AppError>,
  logger: ILogger,
  actionName: string,
  options?: {
    mapData?: (value: T) => TData;
    successMeta?: (value: T) => Record<string, unknown>;
    failureMeta?: Record<string, unknown>;
  },
): ActionResult<TData>
```

- **result**: UseCase の `execute()` が返す `Result<T, AppError>`（neverthrow）
- **logger**: `resolve('Logger')` で取得した ILogger
- **actionName**: ログに出力するアクション名（例: `'createUser'`）
- **mapData**: `result.value` から `ActionResult.data` への変換関数。省略時は `result.value` をそのまま使用
- **successMeta**: 成功時のログメタデータ生成関数
- **failureMeta**: 失敗時の追加ログメタデータ

### 動作

- `result.isOk()` の場合:
  - `successMeta` があれば `logger.info(actionName + ' 成功', meta)` を出力
  - `{ success: true, data }` を返す
- `result.isErr()` の場合:
  - `logger.warn(actionName + ' 失敗', { error, code, ...failureMeta })` を出力
  - `{ success: false, error, code }` を返す

## パターンA: 基本（revalidatePath なし）

データ取得系の Server Action で使用。

```ts
export const getUserById = withAuth(
  'getUserById',
  getUserByIdSchema,
  async (input, _userId): Promise<ActionResult<GetUserByIdData>> => {
    const logger = resolve('Logger');
    const useCase = resolve('GetUserByIdUseCase');
    const result = await useCase.execute({ userId: input.userId });

    return resultToActionResult(result, logger, 'getUserById', {
      successMeta: (v) => ({ userId: v.id, email: v.email, name: v.name }),
      failureMeta: { userId: input.userId },
    });
  },
);
```

## パターンB: revalidatePath 付き（Create/Update/Delete）

データ変更後にキャッシュ無効化が必要な場合:

```ts
export const createUser = withAuth(
  'createUser',
  createUserSchema,
  async (input, _userId): Promise<ActionResult<CreateUserData>> => {
    const logger = resolve('Logger');
    const useCase = resolve('CreateUserUseCase');
    const result = await useCase.execute(input);

    const actionResult = resultToActionResult(result, logger, 'createUser', {
      mapData: (v) => ({ id: v.id, name: v.name, email: v.email }),
      successMeta: (v) => ({ userId: v.id, email: v.email }),
    });

    if (actionResult.success) {
      revalidatePath('/users');
    }

    return actionResult;
  },
);
```

**revalidatePath は `actionResult.success` の後に配置**。失敗時にキャッシュ無効化は不要。

## パターンC: 認証不要 Server Action（standalone）

`refreshToken`, `resetPassword` 等、`withAuth()` を使わない Server Action でも `resultToActionResult()` を使用する。

```typescript
// ❌ 手動 unwrap
const result = await useCase.execute(input);
if (result.isOk()) {
  return { success: true, data: result.value };
}
return { success: false, error: result.error.message, code: result.error.code };

// ✅ resultToActionResult で統一
const result = await useCase.execute(input);
return resultToActionResult(result, logger, 'refreshToken', {
  mapData: (v) => ({
    accessToken: v.accessToken,
    refreshToken: v.refreshToken,
    expiresIn: v.expiresIn,
  }),
});
```

**注意**: バリデーション部分（Zod safeParse + fieldErrors 返却）と try-catch の外側ラッパーはそのまま保持する。
`resultToActionResult` が置き換えるのは UseCase 実行後の Result unwrap 部分のみ。

## mapData の使いどころ

UseCase のレスポンスに不要なフィールドが含まれる場合、`mapData` で必要なフィールドだけ抽出:

```ts
mapData: (v) => ({ id: v.id, name: v.name, email: v.email, updatedAt: v.updatedAt })
```

UseCase レスポンスをそのまま返す場合は `mapData` 省略可。

## 禁止パターン

以下の手書きボイラープレートは **禁止**:

```ts
// ❌ BAD: 手書き変換
if (result.isOk()) {
  logger.info('成功', { ... });
  return { success: true, data: { ... } };
}
logger.warn('失敗', { ... });
return { success: false, error: result.error.message, code: result.error.code };
```

```ts
// ✅ GOOD: resultToActionResult 使用
return resultToActionResult(result, logger, 'actionName', { ... });
```

## 関連スキル

- `presentation-impl` — Server Action 全般の実装パターン
- `neverthrow-patterns` — Result 型の扱い方
- `zod-error-handling` — Zodバリデーションエラーの ActionResult 変換
