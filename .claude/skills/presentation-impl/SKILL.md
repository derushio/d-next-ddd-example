---
name: presentation-impl
description: |
  Presentation層の実装パターン。Server Actions, フォーム処理。
  UIとビジネスロジックの橋渡し。

  トリガー例:
  - 「Server Action」「フォーム処理」「Presentation層」
  - src/layers/presentation/ 配下のファイル編集時

  ※ UIコンポーネント自体は frontend-patterns スキルが担当
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
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
import { isFailure } from '@/layers/application/types/Result';
import { z } from 'zod';

// 入力スキーマ定義
const CreateUserSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
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

    // 4. Result型パターンでの成功/失敗判定
    if (isFailure(result)) {
      return { success: false, message: result.error.message };
    }

    // 5. 成功レスポンス
    return {
      success: true,
      message: 'ユーザーを作成しました',
      userId: result.data.id,
    };
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return { success: false, message: 'システムエラーが発生しました' };
  }
}
```


---

## 🔐 認証・認可処理

### 認証チェック付きServer Action

```typescript
'use server';

import 'reflect-metadata';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function updateUserProfileAction(
  formData: FormData,
): Promise<UpdateProfileActionResult> {
  try {
    // 1. 認証チェック
    const sessionToken = (await cookies()).get('session-token')?.value;
    if (!sessionToken) redirect('/login');

    // 2. セッション検証
    const authService = resolve('AuthenticationService');
    const currentUser = await authService.getCurrentUser(sessionToken);
    if (!currentUser) redirect('/login');

    // 3. 入力検証 + UseCase実行
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

    if (isFailure(result)) {
      return { success: false, message: result.error.message };
    }

    return { success: true, message: 'プロフィールを更新しました' };
  } catch (error) {
    return { success: false, message: 'プロフィールの更新に失敗しました' };
  }
}
```

### 認証ヘルパー関数

```typescript
// src/layers/presentation/helpers/authHelpers.ts
import { resolve } from '@/di/resolver';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireAuthentication(): Promise<AuthenticatedUser> {
  const sessionToken = (await cookies()).get('session-token')?.value;
  if (!sessionToken) redirect('/login');

  const authService = resolve('AuthenticationService');
  const user = await authService.getCurrentUser(sessionToken);
  if (!user) redirect('/login');

  return user;
}

export async function requirePermission(permission: string): Promise<AuthenticatedUser> {
  const user = await requireAuthentication();
  const authService = resolve('AuthorizationService');
  const hasPermission = await authService.hasPermission(user.id, permission);

  if (!hasPermission) {
    throw new ApplicationError('権限がありません', 'INSUFFICIENT_PERMISSION');
  }

  return user;
}
```

---

## 📁 ファイルアップロード処理

```typescript
'use server';

export async function uploadAvatarAction(
  formData: FormData,
): Promise<UploadAvatarActionResult> {
  try {
    const currentUser = await requireAuthentication();

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

    if (isFailure(result)) {
      return { success: false, message: result.error.message };
    }

    return {
      success: true,
      message: 'アバターをアップロードしました',
      avatarUrl: result.data.avatarUrl,
    };
  } catch (error) {
    console.error('アバターアップロードエラー:', error);
    return { success: false, message: 'アバターのアップロードに失敗しました' };
  }
}
```

---

## 🔄 リダイレクトとキャッシュ管理

### リダイレクト処理

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteUserAction(userId: string): Promise<void> {
  try {
    const currentUser = await requireAuthentication();

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

```typescript
// src/layers/presentation/helpers/errorHelpers.ts
export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export function handleActionError(error: unknown): ActionResult {
  console.error('Server Action エラー:', error);

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

```typescript
// src/layers/presentation/helpers/validationHelpers.ts
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

## ❌ 禁止事項

```
❌ ビジネスロジックの直接実装 → Domain Layerの責務
❌ データベース直接操作 → Infrastructure Layerの責務
❌ 外部サービス直接呼び出し → Infrastructure Layerの責務
❌ クライアントサイド専用API → localStorage, window等は使用不可
```

---

## ✅ 実装チェックリスト

- [ ] `'use server'` + `'reflect-metadata'` を使用
- [ ] resolve()関数でUseCaseをDI取得
- [ ] Zodスキーマでバリデーション
- [ ] Result型パターンで成功/失敗を判定
- [ ] 必要に応じて認証・認可チェック
- [ ] 正常系/エラー系のテストがある

---

**Server Actionは、UIとビジネスロジックを繋ぐ重要な橋渡し役です。詳細なパターンは `references/server-action-patterns.md` を参照してください。**
