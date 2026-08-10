# セッション管理の欠陥対策ガイド

## 概要

セッション管理の欠陥は、セッションIDの推測、セッション固定攻撃、セッションハイジャックなど、セッションメカニズムの不適切な実装によって発生する脆弱性です。攻撃者がこれらの脆弱性を悪用すると、正規ユーザーになりすまして不正なアクセスを行う可能性があります。

### 脆弱性の仕組み

#### 1. セッションID推測

- セッションIDの生成に十分なランダム性がない場合、攻撃者がセッションIDを推測できる
- 連番や予測可能なパターンを使用している場合に発生

#### 2. セッション固定攻撃

1. 攻撃者が既知のセッションIDをユーザーに設定させる
2. ユーザーがそのセッションIDでログインする
3. 攻撃者が同じセッションIDを使用してアクセス

#### 3. セッションハイジャック

- ネットワーク盗聴、XSS攻撃などでセッションIDが漏洩
- 攻撃者が盗んだセッションIDを使用してなりすまし

### 発生しうる脅威

- **不正アクセス**: 正規ユーザーのアカウントへの不正なアクセス
- **なりすまし**: 他人のアイデンティティを使用した操作
- **データ漏洩**: 個人情報や機密情報の不正な閲覧
- **権限昇格**: 一般ユーザーが管理者権限を取得
- **アカウント乗っ取り**: 永続的なアカウントへのアクセス権取得

### 特に注意が必要なケース

- **ログイン処理**: 認証成功時のセッション処理
- **認証状態変更**: パスワード変更、権限変更時のセッション処理
- **ログアウト処理**: セッションの適切な無効化
- **長時間セッション**: セッションタイムアウトの管理
- **複数デバイスログイン**: 同一ユーザーの複数セッション管理

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| **IPA** | 7. セッション管理の欠陥 | 「安全なウェブサイトの作り方」第5版 |
| **OWASP Top 10** | A07:2021-Identification and Authentication Failures | 識別と認証の失敗 |
| **CWE** | CWE-384 | Session Fixation |

### IPAガイドラインの対策分類

#### 根本的解決（必須実装）

1. **セッションIDの推測困難性**: 十分なランダム性を持つセッションIDの生成
2. **セッション再生成**: ログイン成功時にセッションIDを再生成
3. **セキュアなCookie属性**: HTTPOnly、Secure、SameSite属性の設定
4. **セッションタイムアウト**: 適切な有効期限の設定

#### 保険的対策（推奨実装）

1. **同時ログイン制限**: 複数セッションの管理と制限
2. **セッション破棄**: ログアウト時の確実なセッション無効化
3. **セッション監視**: 異常なセッションアクセスの検出とログ記録

## Next.js + NextAuth.js での対策

Next.js 16とNextAuth.js v5を使用することで、多くのセッション管理のベストプラクティスが自動的に適用されます。

### 根本的解決策（必須）

#### 1. NextAuth.jsの使用

NextAuth.jsは、セッション管理のベストプラクティスを自動的に実装します。

```typescript
// src/nextAuth.ts（Auth.js v5 / next-auth 5.0.0-beta.30）
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verify } from '@node-rs/argon2';
import { prisma } from '@/layers/infrastructure/database/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // セッション戦略: JWTまたはdatabase
  session: {
    strategy: 'jwt',
    // セッションの最大有効期間（30日）
    maxAge: 30 * 24 * 60 * 60,
    // セッションの更新間隔（1日）
    updateAge: 24 * 60 * 60,
  },

  // セキュアなCookie設定（デフォルトCookie名: authjs.session-token）
  cookies: {
    sessionToken: {
      name: '__Secure-authjs.session-token',
      options: {
        httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
        sameSite: 'lax', // CSRF対策
        path: '/',
        secure: process.env.NODE_ENV === 'production', // HTTPS必須（本番）
      },
    },
  },

  // 認証プロバイダー
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await verify(user.passwordHash, credentials.password as string);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // JWT作成時のコールバック（セッション再生成）
    async jwt({ token, user }) {
      if (user) {
        // 初回ログイン時にユーザー情報をトークンに追加
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // セッション作成時のコールバック
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  // カスタムページ
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/error',
  },

  trustHost: true,
});
```

**環境変数設定:**

```bash
# .env
AUTH_URL=https://your-domain.com
AUTH_SECRET=your-random-secret-key-here # openssl rand -base64 32 で生成
```

#### 2. セッション検証の実装

すべての保護されたページとServer Actionsでセッションを検証します。

```typescript
// src/layers/application/services/auth/SessionService.ts
import { injectable } from 'tsyringe';
import { auth } from '@/layers/infrastructure/persistence/nextAuth';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';

export interface AuthenticatedSession {
  userId: string;
  email: string;
  role: string;
}

@injectable()
export class SessionService {
  /**
   * 現在のセッションを取得
   * 未認証の場合はnullを返す
   */
  async getCurrentSession(): Promise<AuthenticatedSession | null> {
    const session = await auth();

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
  }

  /**
   * 認証を要求
   * 未認証の場合はエラーを返す
   */
  async requireAuth(): Promise<Result<AuthenticatedSession, AppError>> {
    const session = await this.getCurrentSession();

    if (!session) {
      return err({ message: '認証が必要です', code: 'UNAUTHORIZED' });
    }

    return ok(session);
  }

  /**
   * 特定のロールを要求
   */
  async requireRole(requiredRole: string): Promise<Result<AuthenticatedSession, AppError>> {
    const sessionResult = await this.requireAuth();

    if (sessionResult.isErr()) {
      return sessionResult;
    }

    const session = sessionResult.value;

    if (session.role !== requiredRole && session.role !== 'admin') {
      return err({ message: '権限がありません', code: 'FORBIDDEN' });
    }

    return ok(session);
  }

  /**
   * 特定のユーザーであることを要求
   */
  async requireUser(userId: string): Promise<Result<AuthenticatedSession, AppError>> {
    const sessionResult = await this.requireAuth();

    if (sessionResult.isErr()) {
      return sessionResult;
    }

    const session = sessionResult.value;

    if (session.userId !== userId && session.role !== 'admin') {
      return err({ message: 'この操作を実行する権限がありません', code: 'FORBIDDEN' });
    }

    return ok(session);
  }
}
```

**Server Actionでの使用例:**

```typescript
// src/app/users/[id]/actions.ts
'use server';

import { container } from 'tsyringe';
import { SessionService } from '@/layers/application/services/auth/SessionService';
import { UpdateUserUseCase } from '@/layers/application/use-cases/user/UpdateUserUseCase';
import type { Result, AppError } from '@/layers/application/types/Result';

export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<Result<void, AppError>> {
  // セッション検証（本人または管理者のみ）
  const sessionService = container.resolve(SessionService);
  const sessionResult = await sessionService.requireUser(userId);

  if (sessionResult.isErr()) {
    return sessionResult;
  }

  // UseCase実行
  const useCase = container.resolve(UpdateUserUseCase);
  return await useCase.execute({
    userId,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  });
}
```

#### 3. ログイン時のセッション再生成

NextAuth.jsは自動的にログイン時にセッションを再生成しますが、追加の検証を実装できます。

```typescript
// src/app/auth/sign-in/actions.ts
'use server';

import { signIn } from 'next-auth/react';
import { headers } from 'next/headers';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';
import { resolve } from '@/di/resolver';

export async function signInAction(
  email: string,
  password: string,
): Promise<Result<void, AppError>> {
  const logger = resolve('Logger');
  try {
    // IPアドレスとUser-Agentをログに記録（セッション監視用）
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    logger.info('ログイン試行', {
      email,
      ip,
      userAgent,
    });

    // NextAuth.jsでログイン（自動的にセッション再生成）
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      logger.warn('ログイン失敗', { email, ip });
      return err({ message: 'メールアドレスまたはパスワードが正しくありません', code: 'INVALID_CREDENTIALS' });
    }

    logger.info('ログイン成功', { email, ip });
    return ok(undefined);
  } catch (error) {
    logger.error('ログインエラー', { error });
    return err({ message: 'ログイン処理に失敗しました', code: 'UNEXPECTED_ERROR' });
  }
}
```

#### 4. ログアウト時のセッション破棄

```typescript
// src/app/auth/sign-out/actions.ts
'use server';

import { signOut } from 'next-auth/react';
import { cookies } from 'next/headers';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok } from '@/layers/application/types/Result';
import { resolve } from '@/di/resolver';

export async function signOutAction(): Promise<Result<void, AppError>> {
  const logger = resolve('Logger');
  try {
    // NextAuth.jsのセッションを破棄
    await signOut({ redirect: false });

    // 追加のカスタムCookieがあれば削除
    const cookieStore = cookies();
    cookieStore.delete('custom-session');

    logger.info('ログアウト成功');

    return ok(undefined);
  } catch (error) {
    logger.error('ログアウトエラー', { error });
    return ok(undefined); // ログアウトは常に成功とする
  }
}
```

### 保険的対策（推奨）

#### 1. セッションタイムアウトの実装

```typescript
// src/components/providers/SessionProvider.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
const CHECK_INTERVAL = 60 * 1000; // 1分ごとにチェック

export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let lastActivity = Date.now();

    // アクティビティ検出
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, updateActivity);
    });

    // タイムアウトチェック
    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;

      if (inactiveTime > SESSION_TIMEOUT) {
        console.warn('セッションタイムアウト');
        router.push('/auth/sign-in?timeout=true');
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [status, router]);

  return <>{children}</>;
}
```

#### 2. 同時ログイン制限

複数デバイスでの同時ログインを制限する場合の実装例です。

```typescript
// src/layers/infrastructure/database/repositories/SessionRepository.ts
import { injectable } from 'tsyringe';
import { prisma } from '@/layers/infrastructure/database/prisma';

@injectable()
export class SessionRepository {
  /**
   * ユーザーの既存セッションを無効化
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * ユーザーのアクティブセッション数を取得
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    return await prisma.session.count({
      where: {
        userId,
        expires: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * 古いセッションを削除（最新のN個を残す）
   */
  async keepLatestSessions(userId: string, keepCount: number): Promise<void> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount,
    });

    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.session.deleteMany({
        where: {
          id: {
            in: sessionIds,
          },
        },
      });
    }
  }
}
```

**ログイン時に既存セッションを制限:**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
callbacks: {
  async signIn({ user }) {
    // 既存のセッションを無効化（1デバイスのみ許可する場合）
    const sessionRepo = container.resolve(SessionRepository);
    await sessionRepo.invalidateUserSessions(user.id);

    // または、最新の3セッションのみ保持
    // await sessionRepo.keepLatestSessions(user.id, 3);

    return true;
  },
}
```

#### 3. セッション監視とログ記録

```typescript
// src/layers/infrastructure/logging/SessionLogger.ts
import { injectable } from 'tsyringe';
import { prisma } from '@/layers/infrastructure/database/prisma';

export interface SessionLog {
  userId: string;
  event: 'login' | 'logout' | 'access' | 'timeout';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

@injectable()
export class SessionLogger {
  /**
   * セッションイベントをログに記録
   */
  async log(log: SessionLog): Promise<void> {
    await prisma.sessionLog.create({
      data: {
        userId: log.userId,
        event: log.event,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: new Date(),
      },
    });

    // 異常なアクセスパターンを検出
    if (log.event === 'login') {
      await this.detectAnomalies(log.userId, log.ipAddress);
    }
  }

  /**
   * 異常なアクセスパターンを検出
   */
  private async detectAnomalies(
    userId: string,
    currentIp: string,
  ): Promise<void> {
    // 過去1時間のログイン試行を確認
    const recentLogs = await prisma.sessionLog.findMany({
      where: {
        userId,
        event: 'login',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 異なるIPアドレスからの複数ログインを検出
    const uniqueIps = new Set(recentLogs.map((log) => log.ipAddress));

    if (uniqueIps.size > 3) {
      console.warn('異常なログインパターン検出', {
        userId,
        uniqueIps: Array.from(uniqueIps),
        currentIp,
      });

      // 必要に応じて管理者に通知
    }
  }

  /**
   * ユーザーのセッション履歴を取得
   */
  async getUserSessionHistory(
    userId: string,
    limit = 20,
  ): Promise<SessionLog[]> {
    const logs = await prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }
}
```

## 具体的なコード例

### 保護されたページの実装

```typescript
// src/app/dashboard/page.tsx
// guardAuth() パターン（推奨）: 未認証時は自動的にサインインページへリダイレクト
import { guardAuth } from '@/utils/auth/guardAuth';

export default async function DashboardPage() {
  // セッション確認（未認証の場合は自動リダイレクト）
  const currentUser = await guardAuth();

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{currentUser.name}さん</p>
    </div>
  );
}
```

### Middleware（proxy.ts）でのセッション検証

```typescript
// src/proxy.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  // 保護されたパスのリスト
  const protectedPaths = ['/dashboard', '/settings', '/admin'];

  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath) {
    // JWT トークンを検証
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      // 未認証の場合はログインページにリダイレクト
      const signInUrl = new URL('/auth/sign-in', req.url);
      signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // 管理者専用パス
    if (req.nextUrl.pathname.startsWith('/admin') && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/403', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*'],
};
```

### クライアントコンポーネントでのセッション使用

```tsx
// src/components/features/auth/UserMenu.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>読み込み中...</div>;
  }

  if (!session) {
    return (
      <Button variant="outline" href="/auth/sign-in">
        ログイン
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">{session.user.name}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => signOut()}>
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## チェックリスト

### 実装前チェックリスト

- [ ] NextAuth.jsをセットアップしている
- [ ] NEXTAUTH_SECREtが安全に生成されている
- [ ] Cookie設定でHTTPOnly、Secure、SameSite属性を設定
- [ ] セッションの有効期限を適切に設定（maxAge、updateAge）
- [ ] 保護されたページとAPIのリストを作成

### 実装中チェックリスト

- [ ] すべての保護されたページでセッション検証を実施
- [ ] Server Actionsで認証・認可チェックを実装
- [ ] ログイン成功時にセッションが再生成される
- [ ] ログアウト時にセッションが確実に破棄される
- [ ] セッションタイムアウトを実装
- [ ] セッション関連のログを記録

### デプロイ前チェックリスト

- [ ] 本番環境でHTTPS通信を使用
- [ ] Cookie設定が本番環境用に構成されている
  - [ ] `secure: true`
  - [ ] `sameSite: 'lax'` または `'strict'`
  - [ ] `httpOnly: true`
- [ ] AUTH_URLが本番ドメインに設定されている
- [ ] セッションログが適切に記録されている
- [ ] 同時ログイン制限が必要に応じて実装されている

### テストチェックリスト

- [ ] 正常系: ログインしてセッションが作成される
- [ ] 正常系: ログアウトしてセッションが破棄される
- [ ] 正常系: 認証済みユーザーが保護されたページにアクセスできる
- [ ] 異常系: 未認証ユーザーが保護されたページにリダイレクトされる
- [ ] 異常系: セッションタイムアウト後に再認証が要求される
- [ ] 異常系: 無効なセッションIDでアクセスが拒否される

## テストパターン

### ユニットテスト: SessionService

```typescript
// src/layers/application/services/auth/__tests__/SessionService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../SessionService';
import * as nextAuth from '@/layers/infrastructure/persistence/nextAuth';

vi.mock('@/layers/infrastructure/persistence/nextAuth');

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
    vi.clearAllMocks();
  });

  describe('getCurrentSession', () => {
    it('認証済みセッションを取得できること', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'user',
        },
        expires: '2026-12-31',
      });

      const session = await service.getCurrentSession();

      expect(session).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('未認証の場合はnullを返すこと', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue(null);

      const session = await service.getCurrentSession();

      expect(session).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('認証済みの場合はセッションを返すこと', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'user',
        },
        expires: '2026-12-31',
      });

      const result = await service.requireAuth();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          userId: 'user-1',
          email: 'test@example.com',
          role: 'user',
        });
      }
    });

    it('未認証の場合はエラーを返すこと', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue(null);

      const result = await service.requireAuth();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('認証が必要です');
      }
    });
  });

  describe('requireRole', () => {
    it('適切なロールを持つ場合は成功すること', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'admin',
        },
        expires: '2026-12-31',
      });

      const result = await service.requireRole('admin');

      expect(result.isOk()).toBe(true);
    });

    it('不適切なロールの場合は失敗すること', async () => {
      vi.mocked(nextAuth.auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'user',
        },
        expires: '2026-12-31',
      });

      const result = await service.requireRole('admin');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('権限がありません');
      }
    });
  });
});
```

### E2Eテスト: セッション管理

```typescript
// tests/e2e/auth/session.spec.ts
import { test, expect } from '@playwright/test';

test.describe('セッション管理', () => {
  test('ログイン後にセッションが作成されること', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/dashboard');

    // セッションCookieが設定されている
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes('authjs.session-token'),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.secure).toBe(true);
  });

  test('ログアウト後にセッションが破棄されること', async ({ page }) => {
    // ログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // ログアウト
    await page.click('button:has-text("ログアウト")');

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/auth/sign-in');

    // セッションCookieが削除されている
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes('authjs.session-token'),
    );
    expect(sessionCookie).toBeUndefined();
  });

  test('未認証ユーザーが保護されたページにアクセスできないこと', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // ログインページにリダイレクト
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('セッションが有効な間は保護されたページにアクセスできること', async ({
    page,
  }) => {
    // ログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 複数のページを移動してもセッションが維持される
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');

    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
  });

  test('セッション固定攻撃が防止されること', async ({ page, context }) => {
    // 攻撃者がセッションIDを設定
    await context.addCookies([
      {
        name: '__Secure-authjs.session-token',
        value: 'attacker-session-id',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ]);

    // ログイン試行
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 新しいセッションIDが生成されている
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes('authjs.session-token'),
    );
    expect(sessionCookie?.value).not.toBe('attacker-session-id');
  });
});
```

### インテグレーションテスト: セッションタイムアウト

```typescript
// src/layers/infrastructure/session/__tests__/SessionTimeout.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionTimeoutProvider } from '@/components/providers/SessionProvider';
import * as nextAuth from 'next-auth/react';
import { useRouter } from 'next/navigation';

vi.mock('next-auth/react');
vi.mock('next/navigation');

describe('SessionTimeoutProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('アクティビティがある場合はタイムアウトしないこと', async () => {
    const mockRouter = { push: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
      status: 'authenticated',
    } as any);

    render(
      <SessionTimeoutProvider>
        <div>Test Content</div>
      </SessionTimeoutProvider>,
    );

    // 29分経過
    vi.advanceTimersByTime(29 * 60 * 1000);

    // ユーザーアクティビティ（マウスクリック）
    document.dispatchEvent(new Event('mousedown'));

    // さらに29分経過
    vi.advanceTimersByTime(29 * 60 * 1000);

    // タイムアウトしていない
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('非アクティブ30分後にタイムアウトすること', async () => {
    const mockRouter = { push: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(nextAuth.useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
      status: 'authenticated',
    } as any);

    render(
      <SessionTimeoutProvider>
        <div>Test Content</div>
      </SessionTimeoutProvider>,
    );

    // 31分経過（30分のタイムアウト + チェック間隔）
    vi.advanceTimersByTime(31 * 60 * 1000);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/auth/sign-in?timeout=true',
      );
    });
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - セッション管理の欠陥](https://www.ipa.go.jp/security/vuln/websecurity/session.html)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js: Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

### 関連ドキュメント

- [CSRF対策ガイド](../web-attacks/csrf.md)
- [認可制御の実装](./authorization.md)
- [XSS対策ガイド](../injection/xss.md)
- [セキュリティチェックリスト](../../checklists/development.md)

### ツールとライブラリ

- **NextAuth.js v5**: 認証・セッション管理
- **Prisma**: データベースアダプター
- **@node-rs/argon2**: パスワードハッシュ化（Argon2id）
- **Playwright**: E2Eテスト

## まとめ

セッション管理対策の基本方針:

1. **NextAuth.jsの活用**: 業界標準のセッション管理を自動実装
2. **セキュアなCookie設定**: HTTPOnly、Secure、SameSite属性を適切に設定
3. **セッション再生成**: ログイン時に必ずセッションを再生成
4. **適切なタイムアウト**: 非アクティブなセッションを自動的に無効化
5. **ログと監視**: セッションイベントを記録し、異常を検出

これらの対策を組み合わせることで、セッション管理の脆弱性から効果的にアプリケーションを保護できます。
