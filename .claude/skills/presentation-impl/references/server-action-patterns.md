# Server Action Implementation Patterns

Server Actionsの詳細な実装パターンとベストプラクティスを記載します。

---

## 基本構造のテンプレート

### シンプルなServer Action

```typescript
'use server';

import 'reflect-metadata'; // TSyringe DI使用時は必須

import { resolve } from '@/di/resolver';
import { isFailure } from '@/layers/application/types/Result';
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
    if (isFailure(result)) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    // e. 成功レスポンス
    return {
      success: true,
      message: '処理が完了しました',
      data: result.data,
    };
  } catch (error) {
    console.error('アクションエラー:', error);
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

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function authenticatedAction(
  formData: FormData,
): Promise<ActionResult> {
  // セッション取得
  const sessionToken = (await cookies()).get('session-token')?.value;

  // 未認証の場合はログインページへ
  if (!sessionToken) {
    redirect('/login');
  }

  // セッション検証
  const authService = resolve('AuthenticationService');
  const currentUser = await authService.getCurrentUser(sessionToken);

  if (!currentUser) {
    redirect('/login');
  }

  // 認証済みユーザーでの処理
  const useCase = resolve('MyUseCase');
  const result = await useCase.execute({
    userId: currentUser.id,
    ...otherData,
  });

  // ... 残りの処理
}
```

### 権限チェック付き

```typescript
'use server';

export async function adminAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    // 認証チェック
    const currentUser = await requireAuthentication();

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
    return handleActionError(error);
  }
}
```

### 再利用可能な認証ヘルパー

```typescript
// src/layers/presentation/helpers/authHelpers.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolve } from '@/di/resolver';

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const sessionToken = (await cookies()).get('session-token')?.value;

  if (!sessionToken) {
    return null;
  }

  const authService = resolve('AuthenticationService');
  return await authService.getCurrentUser(sessionToken);
}

export async function requireAuthentication(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireRole(role: string): Promise<AuthenticatedUser> {
  const user = await requireAuthentication();

  if (user.role !== role) {
    throw new Error('権限がありません');
  }

  return user;
}

export async function requirePermission(permission: string): Promise<AuthenticatedUser> {
  const user = await requireAuthentication();

  const authzService = resolve('AuthorizationService');
  const hasPermission = await authzService.hasPermission(user.id, permission);

  if (!hasPermission) {
    throw new Error('権限がありません');
  }

  return user;
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
  email: z.string().email(),
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

    if (isFailure(result)) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: true,
      message: 'ファイルをアップロードしました',
      fileUrl: result.data.fileUrl,
    };
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
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

    if (isFailure(result)) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: true,
      message: 'ファイルをアップロードしました',
      fileUrls: result.data.fileUrls,
    };
  } catch (error) {
    console.error('複数ファイルアップロードエラー:', error);
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

    // サインイン処理
    const loginUseCase = resolve('SignInUseCase');
    const result = await loginUseCase.execute({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (isFailure(result)) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    // セッションCookie設定
    (await cookies()).set('session-token', result.data.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });

    // 成功時のリダイレクト
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
// src/layers/presentation/helpers/errorHelpers.ts
import { DomainError } from '@/layers/domain/errors/DomainError';
import { ApplicationError } from '@/layers/application/errors/ApplicationError';
import { z } from 'zod';

export function handleActionError(error: unknown): ActionResult {
  console.error('Server Action エラー:', error);

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
    console.error('予期しないエラー:', error);
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
import { success, failure } from '@/layers/application/types/Result';
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
      success({
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
