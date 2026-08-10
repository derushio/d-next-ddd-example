---
name: middleware-proxy-patterns
description: |
  Next.js 16 の proxy.ts（旧 middleware.ts）パターンを提供するスキル。
  認証チェック、リダイレクト、マッチャー設定、Edge Runtime制約を扱う。

  トリガー例:
  - 「middleware」「proxy.ts」「認証リダイレクト」「matcher」
  - NextRequest/NextResponse を使ったルートガードを実装するとき
  - 「Edge Runtimeで使えない」「proxy.tsでDBアクセスしたい」

globs:
  - "src/proxy.ts"
---

# Middleware / proxy.ts パターン スキル

Next.js 16 における proxy.ts（旧 middleware.ts）の実装パターンを提供します。

---

## 1. middleware.ts → proxy.ts リネーム

Next.js 16 では `middleware.ts` が **`proxy.ts`** にリネームされました。

```
src/
├── proxy.ts          ← ここに配置（旧 src/middleware.ts）
└── app/
    └── ...
```

- **ファイル名**: `src/proxy.ts`（`src/middleware.ts` は Next.js 16 では非推奨）
- エクスポート名・API仕様は変更なし（`export default function`、`export const config` の形式）
- `NextRequest`、`NextResponse` のインポート元も変更なし（`next/server`）

---

## 2. 基本構造

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  // リクエスト処理
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - api ルート
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化）
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 3. matcher 設定パターン

### 特定パスのみ保護する（推奨パターン）

```typescript
export const config = {
  matcher: [
    // ダッシュボード系は全て保護
    '/dashboard/:path*',
    '/admin/:path*',
    '/settings/:path*',
    // API も保護（認証不要エンドポイントは除外）
    '/api/((?!auth|health).*)',
  ],
};
```

### 静的アセットを除外する（汎用パターン）

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
```

### 正規表現によるパターンマッチング

```typescript
// ✅ 数値IDを持つ動的ルート
matcher: ['/items/:id(\\d+)']

// ✅ 複数の拡張子を除外
matcher: ['/((?!.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)']
```

---

## 4. Auth.js v5 統合パターン

このプロジェクトでは Auth.js v5 を使用。proxy.ts での認証チェックは `auth()` を呼び出す。

```typescript
// src/proxy.ts
import { auth } from '@/layers/infrastructure/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証不要なパス
const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/auth',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default auth((request) => {
  const { nextUrl } = request;
  const isLoggedIn = !!request.auth;

  // 公開パスはそのまま通す
  if (isPublicPath(nextUrl.pathname)) {
    // ログイン済みでサインインページにアクセスした場合はリダイレクト
    if (isLoggedIn && nextUrl.pathname === '/sign-in') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 未認証の場合はサインインページへリダイレクト
  if (!isLoggedIn) {
    const signInUrl = new URL('/sign-in', request.url);
    // コールバックURLをクエリパラメータに付加
    signInUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 5. 認証チェック / リダイレクトパターン

### コールバックURL付きリダイレクト

```typescript
// 未認証時: /sign-in?callbackUrl=/dashboard/items
const signInUrl = new URL('/sign-in', request.url);
signInUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
return NextResponse.redirect(signInUrl);
```

### ロールベースアクセス制御（proxy.ts）

```typescript
// ⚠️ 注意: proxy.ts は Edge Runtime で動作するため Prisma は使用不可
// セッションに role を含めて Auth.js の session コールバックで設定すること

export default auth((request) => {
  const { nextUrl } = request;
  const session = request.auth;

  // 管理者専用パスのチェック
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    // セッションからロールを確認（session コールバックで設定済み）
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
});
```

---

## 6. Edge Runtime 制約

proxy.ts は **Edge Runtime** で動作します。以下の制約に注意してください。

### 使用可能

```typescript
// ✅ Web標準API
fetch()
crypto.subtle
URL, URLSearchParams
Headers, Request, Response

// ✅ Next.js API
NextRequest, NextResponse
cookies()（request.cookies 経由）
headers()（request.headers 経由）

// ✅ 軽量ライブラリ（Edge Runtime対応のもの）
jose（JWT検証）
```

### 使用不可

```typescript
// ❌ Node.js固有API
import fs from 'node:fs';        // ファイルシステム不可
import path from 'node:path';    // path モジュール不可
import { createHash } from 'node:crypto'; // node:crypto 不可

// ❌ Prisma（Node.jsランタイムが必要）
import { prisma } from '@/layers/infrastructure/persistence/prisma/client';
// → DBアクセスが必要な場合は API Route または Server Action で実施

// ❌ TSyringe（reflect-metadata 依存）
import { container } from 'tsyringe';
// → DI コンテナはEdge Runtimeで動作しない
```

### DBアクセスが必要な場合の代替手法

```typescript
// ❌ proxy.ts で直接DBアクセス（Edge Runtime制約違反）
const user = await prisma.user.findUnique({ where: { id: userId } });

// ✅ セッションにデータを埋め込む（Auth.js session コールバック活用）
// src/layers/infrastructure/auth/auth.ts
export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    async session({ session, token }) {
      // DBから取得したデータをセッションに含める
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // ログイン時にDBからロールを取得
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
  },
});
```

---

## 7. ヘッダー操作パターン

### リクエストヘッダーの追加・変更

```typescript
export function middleware(request: NextRequest): NextResponse {
  // 既存のリクエストヘッダーをコピーして新しいヘッダーを追加
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

### レスポンスヘッダーの追加

```typescript
export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // セキュリティヘッダーの追加
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

### 相関ID付与パターン（correlation-id スキルと連携）

```typescript
// src/proxy.ts
export function middleware(request: NextRequest): NextResponse {
  const correlationId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', correlationId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // レスポンスにも付与（クライアントがトレース可能）
  response.headers.set('x-request-id', correlationId);

  return response;
}
```

---

## 8. Cookie 操作

```typescript
export function middleware(request: NextRequest): NextResponse {
  // Cookie の読み取り
  const theme = request.cookies.get('theme')?.value ?? 'light';

  const response = NextResponse.next();

  // Cookie の設定
  response.cookies.set('last-visited', request.nextUrl.pathname, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日
  });

  // Cookie の削除
  response.cookies.delete('old-cookie');

  return response;
}
```

---

## 9. 禁止パターン

```typescript
// ❌ ファイル名が古い（Next.js 16では非推奨）
// src/middleware.ts → src/proxy.ts に移行すること

// ❌ Edge Runtimeで動作しないライブラリの使用
import { prisma } from '@/...';
import { container } from 'tsyringe';

// ❌ 重い処理をすべてのリクエストで実行
export const config = {
  matcher: ['/:path*'], // 静的ファイルも含めてすべて実行 → パフォーマンス悪化
};
// → 静的アセットを適切に除外すること

// ❌ セッション確認のたびにDBアクセス
export default auth(async (request) => {
  // auth() コールバック内でのDB直接アクセスは Edge Runtime 制約で不可
  const userData = await prisma.user.findUnique(...); // ❌
});

// ❌ 非同期処理の不適切な扱い（Edge Runtimeは制限あり）
export function middleware(request: NextRequest) {
  // setTimeout, setInterval は Edge Runtimeで使用不可
  setTimeout(() => { ... }, 1000); // ❌
}
```

---

## 10. チェックリスト

実装前に確認してください：

```
proxy.ts 実装チェックリスト:
[ ] ファイル名が src/proxy.ts であること（src/middleware.ts ではない）
[ ] matcher で静的アセット（_next/static, _next/image, favicon.ico）を除外している
[ ] Edge Runtime 制約を遵守（Prisma/TSyringe/Node.jsAPI 不使用）
[ ] Auth.js v5 との統合は auth() ラッパーを使用
[ ] ロールベース制御はセッションからデータを取得（JWT コールバックで設定済み）
[ ] 相関IDが必要な場合は x-request-id ヘッダーを付与
[ ] リダイレクト先が無限ループしないことを確認
[ ] 公開パスのリスト（PUBLIC_PATHS）が適切に定義されている
```

---

## 関連スキル

- `nextauth-v5-patterns` — Auth.js v5 認証パターン全般
- `authorization` — CASL によるロールベースアクセス制御
- `correlation-id` — x-request-id ヘッダーによるリクエストトレーシング
- `security-review` — セキュリティヘッダーのレビュー観点
