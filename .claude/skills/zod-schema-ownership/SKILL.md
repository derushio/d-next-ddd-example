---
name: zod-schema-ownership
description: |
  Zodスキーマの所有権ルールを強制するスキル。
  UseCase層がZodスキーマの正規定義元（Single Source of Truth）であり、
  Server Actionはimportのみ許可。スキーマの重複定義を禁止する。

  トリガー例:
  - UseCase と Server Action の両方で Zod スキーマを定義しようとしたとき
  - 「スキーマ重複」「スキーマ所有権」「どこにスキーマを定義するか」
  - src/app/server-actions/ で z.object を定義しようとしたとき
  - src/layers/application/usecases/ でスキーマを定義するとき
globs:
  - "src/layers/application/usecases/**/*.ts"
  - "src/app/server-actions/**/*.ts"
---

# Zod Schema Ownership Skill

Zodスキーマの所有権ルールを自動適用します。

---

## 所有権ルール

| レイヤー | 役割 | スキーマ操作 |
|----------|------|-------------|
| **UseCase（Application層）** | 正規定義元（Single Source of Truth） | `z.object()` で定義し `export` する |
| **Server Action（Presentation層）** | 消費者 | UseCase から `import` するのみ |
| **authSchema.ts（Infrastructure層）** | 認証共有ベーススキーマ | `emailSchema`, `passwordSchema` の基本スキーマを提供 |

### 依存方向（Clean Architecture に準拠）

```
Presentation → Application ✅  （Server Action が UseCase のスキーマを import）
Application → Domain ✅
Infrastructure → Application ✅
Presentation → Infrastructure ✅  （authSchema.ts を参照する場合のみ）
```

---

## 正しいパターン

### UseCase: スキーマを定義して export

ファイル: `src/layers/application/usecases/user/CreateUserUseCase.ts`

```typescript
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';

// ✅ UseCase がスキーマの正規定義元
export const createUserInputSchema = z.object({
  name: z.string().min(1, '名前を入力してください').trim(),
  email: z.string().min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type CreateUserRequest = z.infer<typeof createUserInputSchema>;

@injectable()
export class CreateUserUseCase {
  // ...
  private async _execute(request: CreateUserRequest): Promise<...> {
    validateInput(createUserInputSchema, request, fieldErrorCodeMap({...}));
    // ...
  }
}
```

### Server Action: UseCase のスキーマを import して使用

ファイル: `src/app/server-actions/user/createUser.ts`

```typescript
'use server';

import { type z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
// ✅ UseCase から import
import { createUserInputSchema } from '@/layers/application/usecases/user/CreateUserUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

// ✅ UseCase のスキーマから型を派生
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createUser = withAuth(
  'createUser',
  createUserInputSchema,  // ✅ UseCase のスキーマをそのまま withAuth に渡す
  async (input, _userId): Promise<ActionResult<CreateUserData>> => {
    const createUserUseCase = resolve('CreateUserUseCase');
    const result = await createUserUseCase.execute(input);
    // ...
  },
);
```

### SA固有フィールドは .extend() で追加

Server Action が UseCase スキーマに含まれないフィールド（確認用パスワード等）を追加する場合は `.extend()` を使用する。

### フロントエンドフォームスキーマの `.extend()` パターン

フォームコンポーネントの Zod スキーマは、UseCase のスキーマを **import して `.extend()`** すること。

```typescript
// ✅ 正しい: UseCase スキーマを拡張
import { createUserInputSchema } from '@/layers/application/usecases/user/CreateUserUseCase';

const createUserFormSchema = createUserInputSchema
  .extend({
    confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });
```

```typescript
// ❌ 禁止: フォームで name/email バリデーションを再定義
const formSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100, '...'), // 重複！
  email: z.email('...'),
});
```

```typescript
// ✅ 正しい: .extend() で SA 固有フィールドを追加
import { changePasswordSchema } from '@/layers/infrastructure/types/zod/authSchema';

const changePasswordActionSchema = changePasswordSchema.extend({
  confirmNewPassword: z.string().min(1, '確認用パスワードを入力してください'),
}).refine(
  (data) => data.newPassword === data.confirmNewPassword,
  { message: 'パスワードが一致しません', path: ['confirmNewPassword'] },
);

export const changePassword = withAuth(
  'changePassword',
  changePasswordActionSchema,  // ✅ 拡張済みスキーマを渡す
  async (input, userId) => {
    // confirmNewPassword は UseCase には渡さない（SA の責務）
    const { confirmNewPassword: _, ...useCaseInput } = input;
    const result = await useCase.execute({ ...useCaseInput, userId });
    // ...
  },
);
```

### authSchema.ts: 認証共有ベーススキーマ

ファイル: `src/layers/infrastructure/types/zod/authSchema.ts`

認証関連の共通スキーマ（`emailSchema`, `passwordSchema`, `signInSchema`, `signUpSchema`, `changePasswordSchema`）を提供する。NextAuth.js と Server Actions の両方で共有される。

```typescript
// ✅ 認証共有スキーマを import して使用
import {
  signInSchema,
  changePasswordSchema,
} from '@/layers/infrastructure/types/zod/authSchema';
```

---

## 禁止パターン

```typescript
// ❌ 禁止: Server Action 内で z.object を新規定義
// src/app/server-actions/user/createUser.ts
'use server';
import { z } from 'zod';

// ❌ このスキーマは UseCase に置くべき
const createUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const createUser = withAuth('createUser', createUserSchema, ...);
```

```typescript
// ❌ 禁止: UseCase と Server Action で同じスキーマを重複定義
// UseCase にも Server Action にも同一の z.object があってはいけない
```

```typescript
// ❌ 禁止: Server Action が UseCase より先にスキーマを定義して UseCase が import する
// 依存方向が逆転する（Infrastructure/Presentation → Application は禁止）
```

---

## スキーマ配置ガイド

| スキーマの種類 | 配置先 |
|---------------|-------|
| UseCase の入力バリデーション | `src/layers/application/usecases/<domain>/<Name>UseCase.ts` に `export const <name>InputSchema` |
| 認証関連の共有スキーマ | `src/layers/infrastructure/types/zod/authSchema.ts` |
| SA 固有の追加バリデーション | SA ファイル内で `.extend()` を使用（`z.object` は使わない） |
| フォームスキーマ（クライアント側） | UseCase スキーマと同一のものを import して使用 |

---

## チェックリスト

- [ ] Server Action 内で `z.object(...)` を新規定義していない
- [ ] UseCase スキーマは `export const <name>InputSchema` として export されている
- [ ] Server Action は UseCase から `import { xyzInputSchema }` している
- [ ] SA 固有フィールドの追加には `.extend()` を使用している
- [ ] 認証共有スキーマは `authSchema.ts` から import している
- [ ] 同一のスキーマが複数箇所に重複定義されていない

---

## 関連スキル

- `zod-v4-modern-api` — Zod 4 ネイティブ API の使い方
- `usecase-input-validation` — UseCase の入力検証パターン
- `zod-schema-reuse` — スキーマ再利用の詳細パターン
