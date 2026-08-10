---
name: presentation-impl
description: |
  Presentation層の実装パターン。Server Actions, フォーム処理。
  UIとビジネスロジックの橋渡し。

  トリガー例:
  - 「Server Action」「フォーム処理」「Presentation層」
  - src/app/server-actions/ 配下のファイル編集時

  ※ UIコンポーネント自体は frontend-patterns スキルが担当
globs:
  - "src/app/server-actions/**/*.ts"
---

# Presentation Implementation Skill

Presentation層のServer Actions実装パターンを提供します。

---

## 🎯 Presentation層の責務

**UIとビジネスロジックの橋渡し**を担当します。

```
主な責務:
- Server Actions: フォーム処理とUseCase呼び出し
- 入力検証: Zodスキーマによるバリデーション
- 認証・認可: セッションチェックと権限確認
- エラーハンドリング: Result型からUIレスポンスへの変換
- キャッシュ管理: revalidatePathによるキャッシュ制御
```

---

## 📦 基本パターン

### Server Action基本構造

```typescript
'use server';

import 'reflect-metadata'; // ⚠️ TSyringe DI使用時は必須
import { resolve } from '@/di/resolver';
import { z } from 'zod';

// 入力スキーマ定義
const CreateUserSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内です'),
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上です'),
});

// レスポンス型定義
export interface CreateUserActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  userId?: string;
}

export async function createUserAction(
  formData: FormData,
): Promise<CreateUserActionResult> {
  try {
    // 1. フォームデータの抽出
    const rawData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    // 2. 入力データの検証
    const validationResult = CreateUserSchema.safeParse(rawData);
    if (!validationResult.success) {
      return {
        success: false,
        message: '入力データが正しくありません',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // 3. UseCase実行（resolve関数でDIコンテナから取得）
    const createUserUseCase = resolve('CreateUserUseCase');
    const result = await createUserUseCase.execute(validationResult.data);

    // 4. neverthrow パターンでの成功/失敗判定
    if (result.isErr()) {
      return { success: false, message: result.error.message };
    }

    // 5. 成功レスポンス
    return {
      success: true,
      message: 'ユーザーを作成しました',
      userId: result.value.id,
    };
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('ユーザー作成エラー', { error });
    return { success: false, message: 'システムエラーが発生しました' };
  }
}
```


---

## 🔐 認証・認可処理

### 認証チェック付きServer Action

> **注記**: Auth.js v5 を使用しているため、認証チェックは `GetCurrentUserUseCase.requireAuthentication()` 経由で行います。
> `cookies()` による直接セッション取得や `AuthenticationService` の直接利用は DDD 違反です。
> 詳細は `nextauth-v5-patterns` スキルを参照してください。

```typescript
'use server';

import 'reflect-metadata';
import { resolve } from '@/di/resolver';

export async function updateUserProfileAction(
  formData: FormData,
): Promise<UpdateProfileActionResult> {
  try {
    // 1. 認証チェック（DDD準拠: GetCurrentUserUseCase経由）
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const authResult = await getCurrentUserUseCase.requireAuthentication();
    if (!authResult.isOk()) {
      return { success: false, message: authResult.error.message };
    }
    const currentUser = authResult.value;

    // 2. 入力検証 + UseCase実行
    const validationResult = UpdateProfileSchema.safeParse({
      name: formData.get('name') as string,
      bio: formData.get('bio') as string,
    });

    if (!validationResult.success) {
      return {
        success: false,
        message: '入力データが正しくありません',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const updateProfileUseCase = resolve('UpdateUserProfileUseCase');
    const result = await updateProfileUseCase.execute({
      userId: currentUser.id,
      ...validationResult.data,
    });

    if (result.isErr()) {
      return { success: false, message: result.error.message };
    }

    return { success: true, message: 'プロフィールを更新しました' };
  } catch (error) {
    return { success: false, message: 'プロフィールの更新に失敗しました' };
  }
}
```

### 認証ヘルパー関数（guardAuth）

> **注記**: Server Component 向けに `src/utils/auth/guardAuth.ts` に共通ガード関数が存在します。
> 認証失敗時は自動的にサインインページへリダイレクトします。
> Auth.js v5 を使用している場合は `nextauth-v5-patterns` スキルを参照してください。

```typescript
// src/utils/auth/guardAuth.ts（既存の共通ヘルパー）
import { resolve } from '@/di/resolver';
import { redirect } from 'next/navigation';

// Server Component で認証必須の場合（未認証時は自動リダイレクト）
export async function guardAuth(): Promise<{ id: string; email: string; name: string }> {
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const result = await getCurrentUserUseCase.requireAuthentication();

  if (!result.isOk()) {
    redirect('/auth/sign-in');
  }

  return result.value;
}

// Server Action で認証チェックのみ行う場合（リダイレクトなし）
export async function checkAuth(): Promise<{ id: string; email: string; name: string } | null> {
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const result = await getCurrentUserUseCase.execute();
  return result.isOk() ? result.value : null;
}
```

---

## 📁 ファイルアップロード処理

```typescript
'use server';

import 'reflect-metadata';
import { resolve } from '@/di/resolver';

export async function uploadAvatarAction(
  formData: FormData,
): Promise<UploadAvatarActionResult> {
  try {
    // 認証チェック（DDD準拠: GetCurrentUserUseCase経由）
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const authResult = await getCurrentUserUseCase.requireAuthentication();
    if (!authResult.isOk()) {
      return { success: false, message: authResult.error.message };
    }
    const currentUser = authResult.value;

    // ファイル取得と検証
    const file = formData.get('avatar') as File;
    if (!file || file.size === 0) {
      return { success: false, message: 'ファイルを選択してください' };
    }

    // サイズ・形式チェック
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: 'ファイルサイズは5MB以下にしてください' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, message: 'JPEG、PNG、WebP形式のみ対応' };
    }

    // UseCase実行
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadAvatarUseCase = resolve('UploadUserAvatarUseCase');
    const result = await uploadAvatarUseCase.execute({
      userId: currentUser.id,
      fileName: file.name,
      fileType: file.type,
      fileBuffer: buffer,
    });

    if (result.isErr()) {
      return { success: false, message: result.error.message };
    }

    return {
      success: true,
      message: 'アバターをアップロードしました',
      avatarUrl: result.value.avatarUrl,
    };
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('アバターアップロードエラー', { error });
    return { success: false, message: 'アバターのアップロードに失敗しました' };
  }
}
```

---

## 🔄 リダイレクトとキャッシュ管理

### リダイレクト処理

```typescript
'use server';

import 'reflect-metadata';
import { resolve } from '@/di/resolver';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteUserAction(userId: string): Promise<void> {
  try {
    // 認証チェック（DDD準拠: GetCurrentUserUseCase経由）
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const authResult = await getCurrentUserUseCase.requireAuthentication();
    if (!authResult.isOk()) {
      redirect(`/admin/users?error=${encodeURIComponent(authResult.error.message)}`);
    }
    const currentUser = authResult.value;

    const deleteUserUseCase = resolve('DeleteUserUseCase');
    await deleteUserUseCase.execute({
      targetUserId: userId,
      requesterId: currentUser.id,
    });

    revalidatePath('/admin/users');
    redirect('/admin/users?deleted=true');
  } catch (error) {
    if (error instanceof ApplicationError) {
      redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
    }
    redirect('/admin/users?error=delete_failed');
  }
}
```

### キャッシュ管理

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updatePostAction(
  postId: string,
  formData: FormData,
): Promise<UpdatePostActionResult> {
  try {
    const updatePostUseCase = resolve('UpdatePostUseCase');
    await updatePostUseCase.execute({
      postId,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });

    // 関連キャッシュを無効化
    revalidatePath(`/posts/${postId}`);
    revalidatePath('/posts');
    revalidateTag('posts');
    revalidateTag(`post-${postId}`);

    return { success: true, message: '投稿を更新しました' };
  } catch (error) {
    return { success: false, message: '投稿の更新に失敗しました' };
  }
}
```

---

## 🛡️ 共通パターンとヘルパー

### 共通エラーハンドリング

> **注記**: 以下はエラーハンドリングの推奨パターンです。実際のコードベースでは専用ヘルパーファイルは存在せず、
> zodバリデーションとエラーハンドリングは各 Server Action 内にインラインで実装されています。

```typescript
// エラーハンドリングの推奨パターン（インライン実装例）
export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export function handleActionError(error: unknown, logger?: ILogger): ActionResult {
  const log = logger ?? resolve('Logger');
  log.error('Server Action エラー', { error });

  if (error instanceof DomainError) {
    return { success: false, message: error.message };
  }

  if (error instanceof ApplicationError) {
    return { success: false, message: error.message };
  }

  if (error instanceof z.ZodError) {
    return {
      success: false,
      message: '入力データが正しくありません',
      errors: error.flatten().fieldErrors,
    };
  }

  return { success: false, message: 'システムエラーが発生しました' };
}
```

### バリデーションヘルパー

> **注意**: `src/layers/presentation/helpers/` は実在しません。バリデーションロジックは Server Action 内にインラインで記述するか、`src/app/server-actions/` 配下に配置してください。

```typescript
// バリデーションヘルパー（インラインパターン推奨）
export async function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string[]> }> {
  const rawData = Object.fromEntries(formData.entries());
  const result = schema.safeParse(rawData);

  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  return { success: true, data: result.data };
}
```

---

## 🏗️ 統一パターン（必須）

### ActionResult<T> — 正規レスポンス型

全 Server Action は `ActionResult<T>` を返すこと。SAごとに異なるレスポンス構造を定義することは禁止。

```typescript
// src/layers/presentation/types/ActionResult.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> };
```

**呼び出し元での参照:**
```typescript
const result = await createUser({ name, email, password });
if (result.success) {
  console.log(result.data.id); // 型安全にアクセス
} else {
  console.error(result.error, result.code);
  if (result.fieldErrors) { /* フィールド別エラー */ }
}
```

---

### withAuth() HOF — 認証・バリデーション共通化

全ての認証必須 Server Action は `withAuth()` HOF を使用すること。認証チェック・バリデーション・例外キャッチを手書き繰り返しすることは禁止。

```typescript
'use server';
import 'reflect-metadata';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

export const createUser = withAuth('createUser', createUserSchema, async (input, _userId) => {
  const useCase = resolve('CreateUserUseCase');
  const result = await useCase.execute(input);
  if (result.isOk()) {
    revalidatePath('/users');
    return { success: true, data: result.value };
  }
  return { success: false, error: result.error.message, code: result.error.code };
});
```

**withAuth の自動処理:**
1. Logger 取得 + `${actionName} started` ログ出力
2. `GetCurrentUserUseCase.requireAuthentication()` による認証チェック
3. Zod スキーマによるバリデーション（`schema: null` でスキップ可能）
4. 例外キャッチ + `{ success: false, error, code: 'SYSTEM_ERROR' }` 統一レスポンス

---

### typed object パターン — FormData 経由の変換禁止

Client Component から Server Action を呼ぶ際は typed object を直接渡すこと。`FormData` を構築して渡すことは禁止。

```typescript
// ✅ 正しいパターン
const result = await createUser({
  name: values.name,
  email: values.email,
  password: values.password,
});

// ❌ 禁止パターン
const formData = new FormData();
formData.append('name', values.name);
const result = await createUser(formData);  // FormData経由は禁止
```

---

## ❌ 禁止事項

```
❌ ビジネスロジックの直接実装 → Domain Layerの責務
❌ データベース直接操作 → Infrastructure Layerの責務
❌ 外部サービス直接呼び出し → Infrastructure Layerの責務
❌ クライアントサイド専用API → localStorage, window等は使用不可
❌ 各SAで認証チェック・バリデーション・例外キャッチを手書き繰り返し → withAuth() HOF を使用
❌ SAごとに異なるレスポンス構造（user/deletedUser/data等） → ActionResult<T> に統一
❌ FormData を構築してSAに渡す → typed object を直接渡す
```

---

## ✅ 実装チェックリスト

- [ ] `'use server'` + `'reflect-metadata'` を使用
- [ ] `withAuth()` HOF で認証・バリデーション・例外処理を委譲
- [ ] レスポンスは `ActionResult<T>` 型（`{ success: true, data }` または `{ success: false, error, code }`）
- [ ] Client Component から呼ぶ際は typed object を直接渡す（FormData 構築禁止）
- [ ] 正常系/エラー系のテストがある

---

---

## 認証系 Server Action での withAuth() 適用

`changePassword`, `signOut` のように認証済みユーザーが呼ぶ Server Action は全て `withAuth()` HOF を使用する。

### withAuth() が不適切なケース（例外）

| Server Action | 理由 | 対応 |
|---|---|---|
| `refreshToken` | トークンリフレッシュは認証セッション不在で呼ばれる | standalone 関数として実装 |
| `resetPassword` | パスワードリセットは未認証ユーザーが呼ぶ | standalone 関数として実装 |

これらも戻り値型は `ActionResult<T>` に統一すること。

### 判断基準

```
認証済みユーザーが呼ぶ？
  → Yes → withAuth() を使用
  → No  → standalone 関数 + ActionResult<T> 戻り値型
```

---

**Server Actionは、UIとビジネスロジックを繋ぐ重要な橋渡し役です。詳細なパターンは `references/server-action-patterns.md` を参照してください。**
