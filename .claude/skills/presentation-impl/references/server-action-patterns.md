# Server Action Implementation Patterns

Server Actionsの詳細な実装パターンとベストプラクティスを記載します。

---

## 基本構造のテンプレート

### シンプルなServer Action

```typescript
'use server';

import 'reflect-metadata'; // TSyringe DI使用時は必須

import { resolve } from '@/di/resolver';
import { z } from 'zod';

// 1. 入力スキーマ定義
const ActionSchema = z.object({
  field1: z.string().min(1, 'フィールド1は必須です'),
  field2: z.number().positive('正の数値を入力してください'),
});

// 2. レスポンス型定義
export interface ActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: any;
}

// 3. Server Action本体
export async function myAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    // a. フォームデータの抽出
    const rawData = {
      field1: formData.get('field1') as string,
      field2: Number(formData.get('field2')),
    };

    // b. 入力検証
    const validationResult = ActionSchema.safeParse(rawData);
    if (!validationResult.success) {
      return {
        success: false,
        message: '入力データが正しくありません',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // c. UseCase実行
    const useCase = resolve('MyUseCase');
    const result = await useCase.execute(validationResult.data);

    // d. Result型パターンでの判定
    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    // e. 成功レスポンス
    return {
      success: true,
      message: '処理が完了しました',
      data: result.value,
    };
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('アクションエラー', { error });
    return {
      success: false,
      message: 'システムエラーが発生しました',
    };
  }
}
```

---

## 認証パターン

### 基本的な認証チェック

```typescript
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';

export async function authenticatedAction(
  formData: FormData,
): Promise<ActionResult> {
  // GetCurrentUserUseCase.requireAuthentication() で認証チェック
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();

  if (authResult.isErr()) {
    return {
      success: false,
      message: authResult.error.message,
    };
  }

  const currentUser = authResult.value;

  // 認証済みユーザーでの処理
  const useCase = resolve('MyUseCase');
  const result = await useCase.execute({
    userId: currentUser.id,
    // ...その他のデータ
  });

  if (result.isErr()) {
    return {
      success: false,
      message: result.error.message,
    };
  }

  return {
    success: true,
    message: '処理が完了しました',
    data: result.value,
  };
}
```

### 権限チェック付き

```typescript
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';

export async function adminAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    // 認証チェック
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const authResult = await getCurrentUserUseCase.requireAuthentication();

    if (authResult.isErr()) {
      return {
        success: false,
        message: authResult.error.message,
      };
    }

    const currentUser = authResult.value;

    // 管理者権限チェック
    if (currentUser.role !== 'ADMIN') {
      return {
        success: false,
        message: '管理者権限が必要です',
      };
    }

    // または権限サービスを使用
    const authzService = resolve('AuthorizationService');
    const hasPermission = await authzService.hasPermission(
      currentUser.id,
      'MANAGE_USERS',
    );

    if (!hasPermission) {
      return {
        success: false,
        message: '権限がありません',
      };
    }

    // 処理実行
    // ...
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('アクションエラー', { error });
    return {
      success: false,
      message: 'システムエラーが発生しました',
    };
  }
}
```

### 認証チェックのインラインパターン

> **注意**: 認証ロジックは `GetCurrentUserUseCase.requireAuthentication()` を使用してください。
> `auth()` の直接呼び出しや `cookies()` 操作は旧パターンです。
> `requireAuthentication()` は内部で Auth.js v5 のセッション取得とユーザー存在確認を行います。

```typescript
// src/app/server-actions/user/protectedAction.ts
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';

export async function protectedAction(
  formData: FormData,
): Promise<ActionResult> {
  // GetCurrentUserUseCase.requireAuthentication() で認証チェック
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();

  if (authResult.isErr()) {
    return {
      success: false,
      message: authResult.error.message,
    };
  }

  const currentUser = authResult.value;

  const useCase = resolve('MyUseCase');
  const result = await useCase.execute({
    userId: currentUser.id,
    // ...その他のデータ
  });

  if (result.isErr()) {
    return {
      success: false,
      message: result.error.message,
    };
  }

  return {
    success: true,
    message: '処理が完了しました',
    data: result.value,
  };
}
```

---

## フォーム処理パターン

### 単純なフォーム

```typescript
'use server';

export async function simpleFormAction(
  formData: FormData,
): Promise<ActionResult> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // 検証
  if (!name || !email) {
    return {
      success: false,
      message: '必須項目を入力してください',
    };
  }

  // 処理
  // ...
}
```

### 複雑なフォーム（ネストしたデータ）

```typescript
'use server';

const UserWithAddressSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().regex(/^\d{3}-\d{4}$/),
  }),
});

export async function complexFormAction(
  formData: FormData,
): Promise<ActionResult> {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    address: {
      street: formData.get('address.street') as string,
      city: formData.get('address.city') as string,
      zipCode: formData.get('address.zipCode') as string,
    },
  };

  const validationResult = UserWithAddressSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      success: false,
      message: '入力データが正しくありません',
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  // 処理
  // ...
}
```

### 配列データの処理

```typescript
'use server';

export async function multipleItemsAction(
  formData: FormData,
): Promise<ActionResult> {
  // FormDataから配列データを取得
  const items: string[] = [];
  let index = 0;

  while (formData.has(`items[${index}]`)) {
    items.push(formData.get(`items[${index}]`) as string);
    index++;
  }

  // または getAll() を使用
  const tags = formData.getAll('tags') as string[];

  // 検証
  if (items.length === 0) {
    return {
      success: false,
      message: '少なくとも1つのアイテムが必要です',
    };
  }

  // 処理
  // ...
}
```

---

## ファイルアップロードパターン

### 単一ファイルアップロード

```typescript
'use server';

export async function uploadFileAction(
  formData: FormData,
): Promise<UploadActionResult> {
  try {
    // ファイル取得
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return {
        success: false,
        message: 'ファイルを選択してください',
      };
    }

    // ファイルサイズ制限（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        message: 'ファイルサイズは10MB以下にしてください',
      };
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: '許可されていないファイル形式です',
      };
    }

    // ファイルデータをバッファに変換
    const buffer = Buffer.from(await file.arrayBuffer());

    // UseCase実行
    const uploadUseCase = resolve('UploadFileUseCase');
    const result = await uploadUseCase.execute({
      fileName: file.name,
      fileType: file.type,
      fileBuffer: buffer,
    });

    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: true,
      message: 'ファイルをアップロードしました',
      fileUrl: result.value.fileUrl,
    };
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('ファイルアップロードエラー', { error });
    return {
      success: false,
      message: 'ファイルのアップロードに失敗しました',
    };
  }
}
```

### 複数ファイルアップロード

```typescript
'use server';

export async function uploadMultipleFilesAction(
  formData: FormData,
): Promise<UploadMultipleActionResult> {
  try {
    // 複数ファイル取得
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return {
        success: false,
        message: 'ファイルを選択してください',
      };
    }

    // ファイル数制限
    if (files.length > 10) {
      return {
        success: false,
        message: 'アップロードできるファイルは最大10個までです',
      };
    }

    // 各ファイルを検証
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return {
          success: false,
          message: `ファイル ${file.name} のサイズが大きすぎます`,
        };
      }
    }

    // ファイルをバッファに変換
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    // UseCase実行
    const uploadUseCase = resolve('UploadMultipleFilesUseCase');
    const result = await uploadUseCase.execute({
      files: fileBuffers,
    });

    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: true,
      message: 'ファイルをアップロードしました',
      fileUrls: result.value.fileUrls,
    };
  } catch (error) {
    const logger = resolve('Logger');
    logger.error('複数ファイルアップロードエラー', { error });
    return {
      success: false,
      message: 'ファイルのアップロードに失敗しました',
    };
  }
}
```

---

## リダイレクトとキャッシュパターン

### 条件付きリダイレクト

```typescript
'use server';

import { redirect } from 'next/navigation';

export async function loginAction(
  formData: FormData,
): Promise<LoginActionResult> {
  try {
    const loginData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: (formData.get('redirectTo') as string) || '/dashboard',
    };

    // バリデーション
    const validationResult = LoginSchema.safeParse(loginData);
    if (!validationResult.success) {
      return {
        success: false,
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // サインイン処理（Auth.js v5 セッション管理はSignInUseCaseが内部で処理）
    const loginUseCase = resolve('SignInUseCase');
    const result = await loginUseCase.execute({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    // 成功時のリダイレクト（セッション管理はAuth.js v5に委譲。cookies()直接操作は禁止）
    redirect(validationResult.data.redirectTo);
  } catch (error) {
    return {
      success: false,
      message: 'サインインに失敗しました',
    };
  }
}
```

### キャッシュ戦略

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

// パス単位のキャッシュ無効化
export async function updateItemAction(itemId: string, formData: FormData) {
  // 処理実行
  // ...

  // 関連パスのキャッシュを無効化
  revalidatePath(`/items/${itemId}`);
  revalidatePath('/items');
}

// タグ単位のキャッシュ無効化
export async function updateCategoryAction(categoryId: string, formData: FormData) {
  // 処理実行
  // ...

  // タグでキャッシュを無効化
  revalidateTag('categories');
  revalidateTag(`category-${categoryId}`);
}

// 複数パスの一括無効化
export async function publishAction(postId: string) {
  // 処理実行
  // ...

  // 関連する全てのパスを無効化
  const pathsToRevalidate = [
    `/posts/${postId}`,
    '/posts',
    '/posts/published',
    '/admin/posts',
    '/feed',
  ];

  pathsToRevalidate.forEach((path) => revalidatePath(path));

  redirect('/posts?published=true');
}
```

---

## エラーハンドリングパターン

### 共通エラーハンドリング関数

```typescript
// src/app/server-actions/_helpers/errorHelpers.ts
// ※ 共通エラーハンドラが必要な場合のみ作成。通常は各 Action にインラインで記述する
import { DomainError } from '@/layers/domain/errors/DomainError';
import { ApplicationError } from '@/layers/application/errors/ApplicationError';
import { z } from 'zod';

export function handleActionError(error: unknown): ActionResult {
  const logger = resolve('Logger');
  logger.error('Server Action エラー', { error });

  // Domainエラー
  if (error instanceof DomainError) {
    return {
      success: false,
      message: error.message,
    };
  }

  // Applicationエラー
  if (error instanceof ApplicationError) {
    return {
      success: false,
      message: error.message,
    };
  }

  // Zodバリデーションエラー
  if (error instanceof z.ZodError) {
    return {
      success: false,
      message: '入力データが正しくありません',
      errors: error.flatten().fieldErrors,
    };
  }

  // その他のエラー
  return {
    success: false,
    message: 'システムエラーが発生しました',
  };
}
```

### カスタムエラーレスポンス

```typescript
'use server';

export async function customErrorAction(
  formData: FormData,
): Promise<CustomActionResult> {
  try {
    // 処理実行
    // ...
  } catch (error) {
    if (error instanceof DomainError) {
      // ドメインエラーは詳細を返す
      return {
        success: false,
        errorType: 'DOMAIN_ERROR',
        message: error.message,
        code: error.code,
      };
    }

    if (error instanceof ApplicationError) {
      // アプリケーションエラーも詳細を返す
      return {
        success: false,
        errorType: 'APPLICATION_ERROR',
        message: error.message,
        code: error.code,
      };
    }

    // 予期しないエラーは最小限の情報のみ
    const logger = resolve('Logger');
    logger.error('予期しないエラー', { error });
    return {
      success: false,
      errorType: 'SYSTEM_ERROR',
      message: 'システムエラーが発生しました',
    };
  }
}
```

---

## テストパターン

### Server Actionのテスト

```typescript
import { container } from 'tsyringe';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { ok, err } from '@/layers/application/types/Result';
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { INJECTION_TOKENS } from '@/di/tokens';

describe('createUserAction', () => {
  setupTestEnvironment(); // DIコンテナリセット

  let mockCreateUserUseCase: MockProxy<CreateUserUseCase>;

  beforeEach(() => {
    mockCreateUserUseCase = mock<CreateUserUseCase>();

    container.registerInstance(
      INJECTION_TOKENS.CreateUserUseCase,
      mockCreateUserUseCase,
    );
  });

  it('正常なデータでユーザーを作成できる', async () => {
    // Arrange
    const formData = new FormData();
    formData.append('name', 'テストユーザー');
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    mockCreateUserUseCase.execute.mockResolvedValue(
      ok({
        id: 'user-123',
        name: 'テストユーザー',
        email: 'test@example.com',
      }),
    );

    // Act
    const result = await createUserAction(formData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('ユーザーを作成しました');
    expect(result.userId).toBe('user-123');

    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('不正なデータでバリデーションエラーが発生する', async () => {
    // Arrange
    const formData = new FormData();
    formData.append('name', '');
    formData.append('email', 'invalid-email');
    formData.append('password', '123');

    // Act
    const result = await createUserAction(formData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.name).toContain('名前は必須です');
    expect(result.errors!.email).toContain('有効なメールアドレスを入力してください');
    expect(result.errors!.password).toContain('パスワードは8文字以上です');
  });
});
```

---

**Server Actionsは、UIとビジネスロジックを繋ぐ重要な層です。適切なバリデーション、認証・認可、エラーハンドリングを実装し、安全で保守性の高いサーバーサイド処理を実現してください。**
