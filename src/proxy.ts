import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
 * リクエスト相関ID（ログトレーシング用）
 */
export const HEADER_REQUEST_ID = 'x-request-id';

/**
 * 認証が必要なルートのパターン
 * これらのパスにアクセスする場合、認証済みでない場合はサインインページにリダイレクト
 */
const PROTECTED_ROUTES = ['/users', '/api/protected'];

/**
 * 認証チェックをスキップするルート（前方一致）
 */
const PUBLIC_ROUTE_PREFIXES = ['/auth', '/api/auth', '/_next', '/favicon.ico'];

/**
 * 認証チェックをスキップするルート（完全一致）
 */
const PUBLIC_ROUTE_EXACT = ['/'];

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
  const isPublicRoute =
    PUBLIC_ROUTE_PREFIXES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_ROUTE_EXACT.includes(pathname);

  if (isProtectedRoute && !isPublicRoute) {
    // Auth.js v5 JWTトークンを取得
    // NOTE: process.env.AUTH_SECRET を直接参照している。
    // proxy.ts は Edge Runtime で動作するため @t3-oss/env-nextjs の env オブジェクト（Node.js側）は使用できない。
    // Edge Runtime での環境変数アクセスは process.env 直接参照が唯一の方法。
    //
    // secureCookie: HTTPS リクエストでは Auth.js v5 が `__Secure-authjs.session-token`
    // という __Secure- prefix 付きの cookie を発行するが、`getToken` の secureCookie
    // 引数は auto-detect されず未指定だと `authjs.session-token`(prefix なし) を探して
    // 常に null を返し、保護されたルートが恒久的にサインイン画面へリダイレクトされる。
    // req URL の scheme から明示的に判定する。
    const secureCookie = req.nextUrl.protocol === 'https:';
    const token = await getToken({
      req,
      secureCookie,
      ...(process.env.AUTH_SECRET != null && {
        secret: process.env.AUTH_SECRET,
      }),
    });

    if (!token) {
      // 未認証の場合はサインインページにリダイレクト
      // NOTE: proxy.ts は Next.js middleware として Edge Runtime で動作するため、
      // pino logger（Node.js API 依存）は使用できない。console.warn が正しい選択（非正常フロー）。
      console.warn('🔐 Proxy: 未認証アクセスをリダイレクト', {
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
  // リクエスト相関ID（ログトレーシング用）
  // NOTE: crypto.randomUUID() は Edge Runtime で使用可能
  requestHeaders.set(HEADER_REQUEST_ID, crypto.randomUUID());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
