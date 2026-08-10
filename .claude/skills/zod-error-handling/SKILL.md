---
name: zod-error-handling
description: |
  Server ActionでのZodバリデーションエラーハンドリングを標準化するスキル。
  ZodError.flatten().fieldErrors の使用を強制し、error.issues の手動ループを禁止する。

  トリガー例:
  - 「ZodError」「error.issues」「fieldErrors」「validated.error」
  - Server Action のバリデーション失敗時のレスポンス実装
  - src/app/server-actions/ 配下のファイルを編集するとき
  - 「Zod 4」「ZodEffects」「z.ZodError」
globs:
  - "src/app/server-actions/**/*.ts"
---

# Zod エラーハンドリングパターン

## このスキルの目的

- Server Action でのZodバリデーションエラーを `flatten().fieldErrors` で統一的に取り出す
- `error.issues` を手動ループするパターンを排除する
- UseCase内バリデーション（単一エラーコード）とServer Actionバリデーション（フィールド別エラー）の使い分けを明確にする

---

## 基本パターン: Server Action での fieldErrors

Server Action では必ず `flatten().fieldErrors` を使用する。これにより各フィールドのエラーが `Record<string, string[]>` 形式で返却される。

```typescript
'use server';

import 'reflect-metadata';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { z } from 'zod';
import { emailSchema, passwordSchema } from '@/layers/infrastructure/types/zod/authSchema';

const updateProfileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: emailSchema,
});

export const updateProfile = withAuth('updateProfile', updateProfileSchema, async (input, userId) => {
  // withAuth が自動的に flatten().fieldErrors を返す
  const useCase = resolve('UpdateProfileUseCase');
  const result = await useCase.execute({ ...input, userId });
  if (result.isOk()) return { success: true, data: result.value };
  return { success: false, error: result.error.message, code: result.error.code };
});
```

`withAuth()` を使わずに手書きする場合（未認証系 Action のみ）:

```typescript
// ✅ 正しい: flatten().fieldErrors でフィールド別エラーを返す
const validated = signInSchema.safeParse(input);
if (!validated.success) {
  return {
    success: false,
    error: '入力データが正しくありません',
    code: 'VALIDATION_ERROR',
    fieldErrors: validated.error.flatten().fieldErrors,
  };
}
```

---

## 禁止パターン

```typescript
// ❌ 禁止: error.issues を手動ループ
if (!validated.success) {
  const errors: Record<string, string[]> = {};
  for (const issue of validated.error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) errors[field] = [];
    errors[field].push(issue.message);
  }
  return { success: false, fieldErrors: errors };
}

// ❌ 禁止: issues[0] だけ取ってフィールド別エラーを返す（単一エラーしか返せない）
if (!validated.success) {
  return {
    success: false,
    error: validated.error.issues[0]?.message ?? 'バリデーションエラー',
  };
}

// ❌ 禁止: error.format() を使う（型が複雑で扱いにくい）
const formatted = validated.error.format();
```

---

## UseCase内バリデーション vs Server Actionバリデーションの使い分け

### UseCase 内（`issues[0]` を使う）

UseCase は単一の AppError を返す。最初のエラーのみ使用する。

```typescript
// src/layers/application/usecases/changePassword/ChangePasswordUseCase.ts
const parseResult = changePasswordInputSchema.safeParse(request);
if (!parseResult.success) {
  const firstIssue = parseResult.error.issues[0];
  return err({
    message: firstIssue?.message ?? 'バリデーションエラー',
    code: 'VALIDATION_ERROR',
  });
}
```

### Server Action（`flatten().fieldErrors` を使う）

Server Action はフィールド別エラーをUIに返す。`flatten()` を使う。

```typescript
// src/app/server-actions/auth/signUp.ts
const validated = signUpSchema.safeParse(input);
if (!validated.success) {
  return {
    success: false,
    error: '入力データが正しくありません',
    code: 'VALIDATION_ERROR',
    fieldErrors: validated.error.flatten().fieldErrors,
    // => { name: ['名前を入力してください'], email: [...], password: [...] }
  };
}
```

### 判断フロー

```
バリデーションエラーをどこで返すか？
  → UseCase内（Result型）   → issues[0] でエラーコード生成
  → Server Action（UI向け） → flatten().fieldErrors でフィールド別エラー
```

---

## ActionResult<T> との統合

`fieldErrors` は `ActionResult<T>` の省略可能フィールドとして統合される:

```typescript
// src/layers/presentation/types/ActionResult.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> };
```

クライアント側での利用:

```typescript
const result = await signUpAction(input);
if (!result.success) {
  // fieldErrors があればフィールド別に表示
  if (result.fieldErrors) {
    setError('email', { message: result.fieldErrors.email?.[0] });
    setError('password', { message: result.fieldErrors.password?.[0] });
  } else {
    // グローバルエラーとして表示
    toast.error(result.error);
  }
}
```

---

## チェックリスト

- [ ] Server Action でのZodエラーは `flatten().fieldErrors` を使用している
- [ ] `error.issues` を `for...of` や `forEach` でループしていない
- [ ] UseCase 内は `issues[0]` でエラーコード生成（Server Action との混同なし）
- [ ] `ActionResult<T>` の `fieldErrors?: Record<string, string[]>` に準拠している
- [ ] `withAuth()` HOF 使用時はバリデーションを HOF に委譲（手書き禁止）

## Zod 4 エラーハンドリングの注意

Zod 4 では内部的にエラー構造が改善されたが、`.flatten().fieldErrors` パターンは引き続き有効。

### 変更なしで使えるパターン
```typescript
// ✅ 引き続き推奨
const result = schema.safeParse(input);
if (!result.success) {
  return { success: false, fieldErrors: result.error.flatten().fieldErrors };
}
```

### Zod 4 の内部変更
- Refinements がスキーマ内蔵になり、`ZodEffects` ラッパーが廃止
- `.flatten()` と `.format()` は引き続き動作
- エラーメッセージのカスタマイズ API が簡素化

### ZodError の型
Zod 4 では `ZodError` の generics が `ZodError<Output>` から `ZodError` に簡素化されている場合がある。
型エラーが出た場合は `z.ZodError` を直接使用すること。

### Zod v4 での `flatten().fieldErrors` 型

Zod v4 の `.flatten().fieldErrors` は `Record<string, string[] | undefined>` を返す。
`as Record<string, string[]>` の型アサーションは**不要**。

```typescript
// ❌ 不要な型アサーション
const fieldErrors = validated.error.flatten().fieldErrors as Record<string, string[]>;

// ✅ undefined をフィルタリング
const rawFieldErrors = validated.error.flatten().fieldErrors;
const fieldErrors: Record<string, string[]> = {};
for (const [key, value] of Object.entries(rawFieldErrors)) {
  if (value) {
    fieldErrors[key] = value;
  }
}
```

### 検出コマンド

```bash
grep -rn 'as Record<string, string' src/ --include='*.ts'
```

---

## 関連スキル

- `presentation-impl` — Server Action全体の実装パターン
- `usecase-input-validation` — UseCase内バリデーションパターン
- `zod-schema-reuse` — 共有スキーマの再利用ルール
- `zod-v4-modern-api` — Zod 4 API 詳細
