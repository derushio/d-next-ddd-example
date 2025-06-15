import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

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
 * 全体に関わるmiddleware
 */
export async function middleware(req: NextRequest) {
  // リクエストURLをServer Componentから取得するためのヘッダ
  const requestHeaders = new Headers(req.headers);
  const url = new URL(req.url);
  requestHeaders.set(HEADER_URL, req.url);
  requestHeaders.set(HEADER_PATH, url.pathname);
  requestHeaders.set(HEADER_SEARCH, url.search);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
