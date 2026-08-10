---
name: action-error-granularity
description: |
  ActionResult のエラーコード分類を定義するスキル。
  UseCase の AppError code から ActionResult の code への変換マッピング、
  mapActionErrorCode() の使い方を提供する。

  トリガー例:
  - 「ActionResult」「エラーコード」「VALIDATION_ERROR」「UNAUTHORIZED」
  - 「RATE_LIMITED」「FORBIDDEN」「NOT_FOUND」「CONFLICT」「SYSTEM_ERROR」
  - Server Action でエラーレスポンスを構築するとき
  - src/layers/presentation/types/ActionResult.ts を参照するとき
globs:
  - "src/app/server-actions/**/*.ts"
---

# Action Error Granularity Skill

ActionResult のエラーコード分類と UseCase エラーコードとのマッピングを提供します。

---

## ActionResult 型

ファイル: `src/layers/presentation/types/ActionResult.ts`

```typescript
export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;         // エラーメッセージ（ユーザー向け）
      code: string;          // エラーコード（クライアントのハンドリング用）
      fieldErrors?: Record<string, string[]>; // フィールドバリデーションエラー
      details?: Record<string, unknown>;      // 追加メタデータ（retryAfterMs 等）
    };
```

---

## エラーコード分類テーブル

| ActionResult code | 意味 | UseCase code 例 |
|-------------------|------|-----------------|
| `VALIDATION_ERROR` | 入力バリデーション失敗 | `VALIDATION_ERROR`, `EMPTY_*`, `INVALID_*` |
| `UNAUTHORIZED` | 未認証・セッション期限切れ | `UNAUTHENTICATED`, `SESSION_EXPIRED` |
| `RATE_LIMITED` | レートリミット超過 | `RATE_LIMIT_EXCEEDED` |
| `FORBIDDEN` | アクセス権限なし・アカウントロック | `FORBIDDEN`, `ACCOUNT_LOCKED` |
| `NOT_FOUND` | リソースが見つからない | `USER_NOT_FOUND`, `RECORD_NOT_FOUND` |
| `CONFLICT` | リソースの競合（重複等） | `EMAIL_DUPLICATE`, `EMAIL_ALREADY_EXISTS`, `DUPLICATE_ENTRY` |
| `SYSTEM_ERROR` | 予期しないシステムエラー | その他全て（withAuth の catch が自動設定） |

---

## mapActionErrorCode() の場所と使い方

ファイル: `src/app/server-actions/utils/resultToActionResult.ts`

`mapActionErrorCode()` は `resultToActionResult()` の内部で自動的に呼び出されます。**Server Action 側で直接呼び出す必要はありません。**

```typescript
// ✅ 正しい: resultToActionResult を使うと自動的にコード変換される
export const createUser = withAuth(
  'createUser',
  createUserInputSchema,
  async (input, _userId): Promise<ActionResult<CreateUserData>> => {
    const result = await useCase.execute(input);

    return resultToActionResult(result, logger, 'createUser', {
      mapData: (v) => ({ id: v.id, name: v.name, email: v.email }),
    });
    // UseCase が RATE_LIMIT_EXCEEDED を返すと ActionResult.code は 'RATE_LIMITED' になる
  },
);
```

### mapActionErrorCode の変換ロジック（参考）

```typescript
function mapActionErrorCode(useCaseCode: string): string {
  if (useCaseCode === 'RATE_LIMIT_EXCEEDED') return 'RATE_LIMITED';
  if (['EMAIL_DUPLICATE', 'EMAIL_ALREADY_EXISTS', 'DUPLICATE_ENTRY'].includes(useCaseCode))
    return 'CONFLICT';
  if (['USER_NOT_FOUND', 'RECORD_NOT_FOUND'].includes(useCaseCode))
    return 'NOT_FOUND';
  if (['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(useCaseCode))
    return 'UNAUTHORIZED';
  if (['FORBIDDEN', 'ACCOUNT_LOCKED'].includes(useCaseCode))
    return 'FORBIDDEN';
  if (useCaseCode === 'VALIDATION_ERROR' || useCaseCode.startsWith('EMPTY_') || useCaseCode.startsWith('INVALID_'))
    return 'VALIDATION_ERROR';
  return useCaseCode; // デフォルト: コードをそのまま通過
}
```

---

## ActionResult.details の使い方

`details` フィールドはクライアントに伝えたい追加メタデータを格納します。

### retryAfterMs の例（レートリミット）

```typescript
// UseCase 側（AppUseCaseError に details を含める）
throw new AppUseCaseError(
  'リクエスト数が上限に達しました。60秒後に再試行してください。',
  'RATE_LIMIT_EXCEEDED',
  { retryAfterMs: rateLimitResult.retryAfterMs },  // ← details
);
```

```typescript
// resultToActionResult が自動的に details をパススルー
// ActionResult の details に { retryAfterMs: 60000 } が含まれる
```

```typescript
// クライアント側で details を参照
if (!result.success && result.code === 'RATE_LIMITED') {
  const retryAfterMs = result.details?.retryAfterMs as number | undefined;
  // カウントダウン表示等に利用
}
```

---

## クライアント側でのコード別ハンドリングパターン

```typescript
// ✅ code で分岐して適切な UI を表示
function handleActionResult<T>(
  result: ActionResult<T>,
  form: UseFormReturn<...>,
) {
  if (result.success) return;

  switch (result.code) {
    case 'VALIDATION_ERROR':
      // フィールドエラーをフォームに反映
      if (result.fieldErrors) {
        for (const [field, errors] of Object.entries(result.fieldErrors)) {
          form.setError(field as FieldPath<...>, {
            type: 'server',
            message: errors[0],
          });
        }
      }
      break;

    case 'UNAUTHORIZED':
      // ログインページへリダイレクト
      router.push('/auth/signin');
      break;

    case 'RATE_LIMITED':
      // カウントダウン表示（rate-limit-ux スキル参照）
      const retryAfterMs = result.details?.retryAfterMs as number | undefined;
      startRateLimitCountdown(retryAfterMs ?? 60000);
      form.setError('root', { type: 'server', message: result.error });
      break;

    case 'CONFLICT':
      // 重複エラーをフォームに表示
      form.setError('email', { type: 'server', message: result.error });
      break;

    case 'NOT_FOUND':
    case 'FORBIDDEN':
    case 'SYSTEM_ERROR':
    default:
      // toast でエラー表示
      toast.error(result.error);
      form.setError('root', { type: 'server', message: result.error });
  }
}
```

### useServerAction フックでの統合

```typescript
// useServerAction はエラーを自動ハンドリングするが、
// RATE_LIMITED 等の特殊コードは手動で追加ハンドリングが必要
const { execute, isPending } = useServerAction({ form, defaultErrorMessage: '...' });

const onSubmit = (values: FormValues) => {
  execute(async () => {
    const result = await someAction(values);
    if (!result.success && result.code === 'RATE_LIMITED') {
      // 特殊ハンドリング
    }
    return result;
  });
};
```

---

## チェックリスト

- [ ] UseCase のエラーコードが `RATE_LIMIT_EXCEEDED`, `EMAIL_DUPLICATE` 等の標準コードに従っている
- [ ] `resultToActionResult()` を使って ActionResult に変換している（手動変換は最小限に）
- [ ] `details` にはクライアントが必要とするメタデータのみを含めている（機密情報は含めない）
- [ ] クライアント側で `code` による分岐ハンドリングを実装している
- [ ] `RATE_LIMITED` の場合、`details.retryAfterMs` を活用して UX を改善している

---

## 関連スキル

- `server-action-result-mapping` — `withAuth` + `resultToActionResult` の詳細パターン
- `error-handling-utils` — AppUseCaseError の使い方
- `rate-limit-ux` — レートリミット UX の実装詳細
