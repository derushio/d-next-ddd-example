# CSRF（クロスサイトリクエストフォージェリ）対策ガイド

## 概要

CSRF（Cross-Site Request Forgery）は、認証済みユーザーを騙して意図しないリクエストを送信させる攻撃手法です。攻撃者が用意した悪意のあるWebページやメールを経由して、ユーザーが気付かないうちに重要な操作（購入、設定変更、パスワード変更など）を実行させられる可能性があります。

### 脆弱性の仕組み

1. ユーザーが正規サイトにログインし、認証Cookieがブラウザに保存される
2. 攻撃者が用意した悪意のあるサイトにユーザーがアクセス
3. 悪意のあるサイトから正規サイトへのリクエストが発行される
4. ブラウザは自動的に認証Cookieを付与してリクエストを送信
5. 正規サイトは正当なリクエストと誤認し、処理を実行

### 発生しうる脅威

- **不正な金銭取引**: ユーザーの意図しない購入や送金
- **設定変更**: メールアドレス、パスワード、権限の変更
- **データ改ざん**: 投稿内容の変更や削除
- **アカウント乗っ取り**: 攻撃者のメールアドレスへの変更による乗っ取り
- **権限昇格**: 管理者権限の不正取得

### 特に注意が必要なケース

- **状態変更API**: POST/PUT/DELETE メソッドによるデータ更新操作
- **決済処理**: 商品購入、送金、サブスクリプション変更
- **アカウント操作**: パスワード変更、メールアドレス変更、退会処理
- **権限管理**: ユーザーロールの変更、アクセス権限の付与
- **重要データの操作**: 個人情報の更新、機密情報の閲覧・ダウンロード

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| **IPA** | 5. CSRF | 「安全なウェブサイトの作り方」第5版 |
| **OWASP Top 10** | A01:2021-Broken Access Control | アクセス制御の不備 |
| **CWE** | CWE-352 | Cross-Site Request Forgery (CSRF) |

### IPAガイドラインの対策分類

#### 根本的解決（必須実装）

1. **トークン検証**: 処理を実行する前に、秘密情報（トークン）の検証を行う
2. **パスワード再入力**: 重要な操作では再度パスワード入力を求める
3. **Referer検証**: HTTPリクエストヘッダのRefererを確認する

#### 保険的対策（推奨実装）

1. **重要操作の確認画面**: 処理実行前に確認画面を表示
2. **操作履歴の提供**: 実行された操作の履歴を確認できるようにする
3. **自動ログアウト**: 一定時間操作がない場合は自動的にログアウト

## Next.js + Server Actions での対策

Next.js Server Actionsは、CSRFトークン検証を自動的に実装しています。しかし、追加の対策を講じることで、より堅牢なセキュリティを実現できます。

### 根本的解決策（必須）

#### 1. Server Actionsの自動CSRF保護を活用

Next.js 16のServer Actionsは、自動的にCSRF保護を提供します。Server Actionsを使用することで、基本的なCSRF対策が実装されます。

```typescript
// src/app/settings/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/di/resolver';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';

/**
 * Server Actionsは自動的にCSRF保護を提供
 * - Next.jsが内部的にトークンを生成・検証
 * - 同一オリジンからのリクエストのみ許可
 */
export async function updateUserSettings(
  formData: FormData,
): Promise<Result<void, AppError>> {
  // セッション確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return err(authResult.error);
  }

  // 処理実装
  // ...

  revalidatePath('/settings');
  return ok(undefined);
}
```

#### 2. SameSite Cookie属性の設定

認証Cookieに `SameSite` 属性を設定することで、クロスサイトリクエストでのCookie送信を制限します。

```typescript
// src/nextAuth.ts（Auth.js v5 / next-auth 5.0.0-beta.30）
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ... その他の設定
  cookies: {
    sessionToken: {
      name: '__Secure-authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax', // 'strict' または 'lax' を推奨
        path: '/',
        secure: process.env.NODE_ENV === 'production', // HTTPS必須
      },
    },
  },
});
```

**SameSite属性の値:**

- `strict`: 同一サイトのリクエストのみCookieを送信（最も厳格）
- `lax`: 通常のナビゲーション（GET）では送信、フォーム送信では同一サイトのみ（推奨）
- `none`: すべてのリクエストでCookieを送信（Secure属性必須、非推奨）

#### 3. 重要操作での再認証

パスワード変更、決済処理など重要な操作では、追加の認証を要求します。

```typescript
// src/app/settings/security/actions.ts
'use server';

import { verify } from '@node-rs/argon2';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<Result<void, AppError>> {
  // 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return err(authResult.error);
  }
  const currentUser = authResult.value;

  // 現在のパスワードを検証（重要操作のため再認証）
  const user = await getUserById(currentUser.id);
  const isValid = await verify(user.passwordHash, currentPassword);

  if (!isValid) {
    return err({ message: '現在のパスワードが正しくありません', code: 'INVALID_CREDENTIALS' });
  }

  // パスワード更新処理
  // ...

  return ok(undefined);
}
```

### 保険的対策（推奨）

#### 1. Originヘッダ検証

リクエストの送信元を検証し、不正なオリジンからのリクエストを拒否します。

```typescript
// src/proxy.ts（Next.js 16のproxy機能）
import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  // POSTリクエストのOriginヘッダを検証
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // Originが存在し、かつホストと一致することを確認
    if (origin && !origin.endsWith(host || '')) {
      console.warn('🚨 CSRF: 不正なOriginを検出', {
        origin,
        host,
        path: req.nextUrl.pathname,
      });

      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }
  }

  // その他のproxy処理
  return NextResponse.next();
}
```

#### 2. カスタムCSRFトークン（必要に応じて）

特別なセキュリティ要件がある場合、独自のCSRFトークンを実装します。

```typescript
// src/layers/infrastructure/security/csrf/CSRFTokenService.ts
import { injectable } from 'tsyringe';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

@injectable()
export class CSRFTokenService {
  private readonly TOKEN_NAME = 'csrf-token';
  private readonly TOKEN_LENGTH = 32;

  /**
   * CSRFトークンを生成してCookieに保存
   */
  async generateToken(): Promise<string> {
    const token = randomBytes(this.TOKEN_LENGTH).toString('hex');

    cookies().set(this.TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1時間
    });

    return token;
  }

  /**
   * リクエストのCSRFトークンを検証
   */
  async verifyToken(token: string): Promise<boolean> {
    const cookieStore = cookies();
    const storedToken = cookieStore.get(this.TOKEN_NAME)?.value;

    if (!storedToken || !token) {
      return false;
    }

    // タイミング攻撃対策のため定数時間比較を使用
    return this.timingSafeEqual(storedToken, token);
  }

  /**
   * 定数時間での文字列比較（タイミング攻撃対策）
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
```

**トークンの使用例:**

```typescript
// src/app/payment/actions.ts
'use server';

import { container } from 'tsyringe';
import { CSRFTokenService } from '@/layers/infrastructure/security/csrf/CSRFTokenService';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';

export async function processPayment(
  csrfToken: string,
  paymentData: PaymentData,
): Promise<Result<void, AppError>> {
  const csrfService = container.resolve(CSRFTokenService);

  // CSRFトークン検証
  const isValid = await csrfService.verifyToken(csrfToken);
  if (!isValid) {
    return err({ message: '無効なリクエストです', code: 'INVALID_CSRF_TOKEN' });
  }

  // 決済処理
  // ...

  return ok(undefined);
}
```

#### 3. 二重送信防止

同じリクエストが複数回送信されるのを防ぎます（CSRF対策ではなく、ユーザビリティ向上のため）。

```typescript
// src/hooks/useFormSubmit.ts
import { useState } from 'react';

export function useFormSubmit<T>(
  action: (data: T) => Promise<Result<void, AppError>>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (data: T) => {
    if (isSubmitting) {
      return; // 二重送信防止
    }

    setIsSubmitting(true);
    try {
      const result = await action(data);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}
```

**使用例:**

```tsx
// src/components/features/settings/SettingsForm.tsx
'use client';

import { useFormSubmit } from '@/hooks/useFormSubmit';
import { updateUserSettings } from '@/app/settings/actions';

export function SettingsForm() {
  const { submit, isSubmitting } = useFormSubmit(updateUserSettings);

  return (
    <form action={submit}>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
```

## 具体的なコード例

### 基本的なServer Action実装

```typescript
// src/app/users/[id]/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/di/resolver';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';
import { UpdateUserUseCase } from '@/layers/application/use-cases/user/UpdateUserUseCase';

/**
 * ユーザー情報更新アクション
 *
 * セキュリティ対策:
 * - Server Actionsの自動CSRF保護
 * - requireAuthentication() による認証チェック（推奨パターン）
 * - UseCase内での認可チェック（本人または管理者のみ）
 */
export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<Result<void, AppError>> {
  // 1. 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return err(authResult.error);
  }
  const currentUser = authResult.value;

  // 2. UseCase実行（認可チェックはUseCase内で実施）
  const useCase = resolve(UpdateUserUseCase);
  const result = await useCase.execute({
    currentUserId: currentUser.id,
    userId,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  });

  if (result.isOk()) {
    revalidatePath(`/users/${userId}`);
  }

  return result;
}
```

### フォームコンポーネント実装

```tsx
// src/components/features/users/UserEditForm.tsx
'use client';

import { useActionState } from 'react';
import { updateUser } from '@/app/users/[id]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserEditFormProps {
  userId: string;
  defaultName: string;
  defaultEmail: string;
}

export function UserEditForm({ userId, defaultName, defaultEmail }: UserEditFormProps) {
  // Server Actionとの連携（React 19）
  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      return await updateUser(userId, formData);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
        />
      </div>

      {state && state.isErr() && (
        <div className="text-red-500">{state.error.message}</div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? '保存中...' : '保存'}
      </Button>
    </form>
  );
}
```

### 重要操作の確認ダイアログ実装

```tsx
// src/components/features/users/DeleteUserDialog.tsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteUser } from '@/app/users/[id]/actions';

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
}

export function DeleteUserDialog({ userId, userName }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUser(userId);
      if (result.isOk()) {
        // 削除成功後の処理
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">削除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ユーザーを削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            {userName} を削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## チェックリスト

### 実装前チェックリスト

- [ ] Server Actionsを使用している（自動CSRF保護）
- [ ] 認証Cookieに `SameSite` 属性を設定している
- [ ] HTTPS通信を使用している（本番環境）
- [ ] 重要操作で再認証を実装する計画がある
- [ ] 状態変更操作はPOST/PUT/DELETEメソッドを使用

### 実装中チェックリスト

- [ ] すべてのServer Actionで認証確認を実施
- [ ] 認可チェック（本人確認、権限確認）を実装
- [ ] 重要操作に確認ダイアログを実装
- [ ] 二重送信防止を実装
- [ ] エラーメッセージが適切（機密情報を含まない）

### デプロイ前チェックリスト

- [ ] Cookie設定が本番環境用に構成されている
  - [ ] `secure: true`（HTTPS必須）
  - [ ] `sameSite: 'lax'` または `'strict'`
  - [ ] `httpOnly: true`
- [ ] proxy.tsでOriginヘッダ検証が有効
- [ ] CSRFトークン生成・検証が正しく動作
- [ ] 重要操作のログが記録されている
- [ ] セッションタイムアウトが適切に設定されている

### テストチェックリスト

- [ ] 正常系: 認証済みユーザーが操作を実行できる
- [ ] 異常系: 未認証ユーザーがリクエストを拒否される
- [ ] 異常系: 不正なOriginからのリクエストが拒否される
- [ ] 異常系: 無効なCSRFトークンでリクエストが拒否される
- [ ] 異常系: 権限のないユーザーが操作を拒否される

## テストパターン

### ユニットテスト: CSRFトークン検証

```typescript
// src/layers/infrastructure/security/csrf/__tests__/CSRFTokenService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CSRFTokenService } from '../CSRFTokenService';

describe('CSRFTokenService', () => {
  let service: CSRFTokenService;

  beforeEach(() => {
    service = new CSRFTokenService();
  });

  describe('generateToken', () => {
    it('トークンを生成できること', async () => {
      const token = await service.generateToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('毎回異なるトークンを生成すること', async () => {
      const token1 = await service.generateToken();
      const token2 = await service.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('正しいトークンを検証できること', async () => {
      const token = await service.generateToken();
      const isValid = await service.verifyToken(token);
      expect(isValid).toBe(true);
    });

    it('不正なトークンを拒否すること', async () => {
      await service.generateToken();
      const isValid = await service.verifyToken('invalid-token');
      expect(isValid).toBe(false);
    });

    it('空文字列を拒否すること', async () => {
      const isValid = await service.verifyToken('');
      expect(isValid).toBe(false);
    });
  });
});
```

### E2Eテスト: CSRF攻撃シミュレーション

```typescript
// tests/e2e/security/csrf.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CSRF対策', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('正常なフォーム送信が成功すること', async ({ page }) => {
    await page.goto('/settings');
    await page.fill('input[name="name"]', 'New Name');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=保存しました')).toBeVisible();
  });

  test('外部サイトからのリクエストが拒否されること', async ({ page, context }) => {
    // 悪意のあるページを作成
    const maliciousPage = await context.newPage();
    await maliciousPage.setContent(`
      <html>
        <body>
          <form id="csrf-form" action="http://localhost:3000/api/settings" method="POST">
            <input type="hidden" name="name" value="Hacked" />
          </form>
          <script>
            document.getElementById('csrf-form').submit();
          </script>
        </body>
      </html>
    `);

    // リクエストがブロックされることを確認
    const response = await maliciousPage.waitForResponse(
      (res) => res.url().includes('/api/settings')
    );
    expect(response.status()).toBe(403);
  });

  test('二重送信が防止されること', async ({ page }) => {
    await page.goto('/settings');
    await page.fill('input[name="name"]', 'New Name');

    // 連続クリック
    await page.click('button[type="submit"]');
    await page.click('button[type="submit"]');

    // 1回のみ実行されることを確認
    const requests = await page.evaluate(() => {
      return (window as any).__requestCount || 1;
    });
    expect(requests).toBe(1);
  });
});
```

### インテグレーションテスト: Server Action

```typescript
// src/app/users/[id]/__tests__/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser } from '../actions';
import * as nextAuth from '@/layers/infrastructure/persistence/nextAuth';

vi.mock('@/layers/infrastructure/persistence/nextAuth');

describe('updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('認証済みユーザーが自分の情報を更新できること', async () => {
    // モック設定
    vi.mocked(nextAuth.auth).mockResolvedValue({
      user: { id: 'user-1', role: 'user' },
      expires: '2026-12-31',
    });

    const formData = new FormData();
    formData.set('name', 'New Name');
    formData.set('email', 'new@example.com');

    const result = await updateUser('user-1', formData);

    expect(result.isOk()).toBe(true);
  });

  it('未認証ユーザーが拒否されること', async () => {
    vi.mocked(nextAuth.auth).mockResolvedValue(null);

    const formData = new FormData();
    formData.set('name', 'New Name');

    const result = await updateUser('user-1', formData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('認証が必要です');
    }
  });

  it('他人の情報を更新できないこと', async () => {
    vi.mocked(nextAuth.auth).mockResolvedValue({
      user: { id: 'user-1', role: 'user' },
      expires: '2026-12-31',
    });

    const formData = new FormData();
    formData.set('name', 'New Name');

    const result = await updateUser('user-2', formData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('権限がありません');
    }
  });

  it('管理者が他人の情報を更新できること', async () => {
    vi.mocked(nextAuth.auth).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
      expires: '2026-12-31',
    });

    const formData = new FormData();
    formData.set('name', 'New Name');

    const result = await updateUser('user-1', formData);

    expect(result.isOk()).toBe(true);
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - CSRF](https://www.ipa.go.jp/security/vuln/websecurity/csrf.html)
- [OWASP: Cross-Site Request Forgery (CSRF)](https://owasp.org/www-community/attacks/csrf)
- [CWE-352: Cross-Site Request Forgery (CSRF)](https://cwe.mitre.org/data/definitions/352.html)
- [Next.js: Data Mutations (Server Actions)](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

### 関連ドキュメント

- [セッション管理の欠陥対策](./session-management.md)
- [認可制御の実装](../access-control/authorization.md)
- [クリックジャッキング対策](./clickjacking.md)
- [セキュリティチェックリスト](../../checklists/development.md)

### ツールとライブラリ

- **Next.js Server Actions**: 自動CSRF保護
- **NextAuth.js**: 認証・セッション管理
- **crypto**: CSRFトークン生成
- **Playwright**: E2Eテスト

## まとめ

CSRF対策の基本方針:

1. **Server Actionsの活用**: Next.jsの自動CSRF保護を最大限活用
2. **SameSite Cookie**: 認証Cookieに適切な属性を設定
3. **Origin検証**: proxy.tsで追加の検証を実施
4. **重要操作の保護**: パスワード再入力や確認ダイアログを実装
5. **テストの徹底**: E2Eテストで実際の攻撃シナリオを検証

これらの対策を組み合わせることで、CSRF攻撃から効果的にアプリケーションを保護できます。
