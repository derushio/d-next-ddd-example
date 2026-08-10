---
name: shared-validation-schemas
description: |
  Application層の共通フィールドZodスキーマの共有を強制するスキル。
  userId, name 等の共通バリデーションの重複定義を禁止し、
  commonFieldSchemas.ts からの import を義務付ける。

  トリガー例:
  - 「共有スキーマ」「common schema」「スキーマ重複」
  - z.string().min(1 の重複パターン、UseCase内Zodスキーマ定義時
  - src/layers/application/usecases/ 配下のファイル編集時
  - src/layers/application/schemas/ 配下のファイル編集時
globs:
  - "src/layers/application/**/*.ts"
---

# Shared Validation Schemas

## 目的

UseCase 間で共通のフィールドバリデーション（userId, name 等）を
共有スキーマとして一元管理し、重複定義を排除する。

## 共有スキーマの場所

`src/layers/application/schemas/commonFieldSchemas.ts`

| export | 内容 | 使用箇所 |
|--------|------|---------|
| `userIdSchema` | `z.string().trim().min(1, 'ユーザーIDが指定されていません')` | GetUserById, DeleteUser, UpdateUser |
| `nameSchema` | `z.string().min(1, '名前を入力してください').max(100, ...)` | CreateUser, UpdateUser, フォーム |

## 正しいパターン

```typescript
// UseCase での使用
import { userIdSchema, nameSchema } from '@/layers/application/schemas/commonFieldSchemas';

export const updateUserInputSchema = z.object({
  userId: userIdSchema,
  name: nameSchema.optional(),
  email: z.email('有効なメールアドレスを入力してください').optional(),
});
```

```typescript
// フォームコンポーネントでの使用
import { nameSchema } from '@/layers/application/schemas/commonFieldSchemas';

const editUserFormSchema = z.object({
  name: nameSchema,
  email: z.email('有効なメールアドレスを入力してください'),
});
```

## 禁止パターン

```typescript
// ❌ UseCase 内でインライン定義（重複）
export const getUserByIdInputSchema = z.object({
  userId: z.string().trim().min(1, 'ユーザーIDが指定されていません'),
});

// ❌ フォームで name バリデーションを再定義
const formSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100, '...'),
});
```

## スキーマ配置の判断ツリー

```
新しい Zod スキーマフィールドを定義する
  ↓
認証系フィールド（email VO バリデーション、password ポリシー）か？
  → Yes → authSchema.ts（Infrastructure 層）
  → No  ↓
複数の UseCase で同一バリデーションが使われるか？
  → Yes → commonFieldSchemas.ts（Application 層）
  → No  → UseCase 内にインライン定義（OK）
```

## 新しい共有スキーマの追加手順

1. `src/layers/application/schemas/commonFieldSchemas.ts` に export を追加
2. 既存の UseCase でインライン定義されている同一スキーマを import に置換
3. `grep -rn "定義テキスト" src/` で残存する重複を検出
4. フォームコンポーネントも共有スキーマを使うよう更新

## チェックリスト

- [ ] userId フィールドは `userIdSchema` を使用しているか
- [ ] name フィールドは `nameSchema` を使用しているか
- [ ] 新しい共通フィールドを追加する場合、`commonFieldSchemas.ts` に定義したか
- [ ] `grep` で重複定義が残っていないか確認したか

## 関連スキル

- `zod-schema-reuse` — 認証系スキーマの共有（authSchema.ts）
- `zod-schema-ownership` — スキーマの所有権ルール（UseCase が SSoT）
- `usecase-input-validation` — UseCase 入力検証パターン
