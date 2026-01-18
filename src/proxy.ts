import { getToken } from 'next-auth/jwt';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * リクエストURL
 */
export const HEADER_URL = 'x-url';

/**
 * リクエストPATH
 */
export const HEADER_PATH = 'x-url-path';

/**
 * リクエストSEARCH
 */
export const HEADER_SEARCH = 'x-url-search';

/**
 * 認証が必要なルートのパターン
 * これらのパスにアクセスする場合、認証済みでない場合はサインインページにリダイレクト
 */
const PROTECTED_ROUTES = ['/users', '/api/protected'];

/**
 * 認証チェックをスキップするルート
 */
const PUBLIC_ROUTES = ['/auth', '/api/auth', '/', '/_next', '/favicon.ico'];

/**
 * 全体に関わるproxy
 *
 * Clean Architecture準拠:
 * - proxyはInfrastructure層の一部として機能
 * - 認証チェックとヘッダー設定のみを担当
 *
 * 機能:
 * 1. リクエストURLをServer Componentから取得するためのヘッダを設定
 * 2. 認証が必要なルートの保護（NextAuth.js JWT検証）
 */
export async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 認証チェック: 保護されたルートへのアクセス時
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute && !isPublicRoute) {
    // NextAuth.js JWTトークンを取得
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // 未認証の場合はサインインページにリダイレクト
      console.log('🔐 Proxy: 未認証アクセスをリダイレクト', {
        path: pathname,
        redirectTo: '/auth/sign-in',
      });

      const signInUrl = new URL('/auth/sign-in', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    console.log('🔐 Proxy: 認証済みアクセス', {
      path: pathname,
      userId: token.id,
    });
  }

  // リクエストURLをServer Componentから取得するためのヘッダ
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(HEADER_URL, req.url);
  requestHeaders.set(HEADER_PATH, pathname);
  requestHeaders.set(HEADER_SEARCH, url.search);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
