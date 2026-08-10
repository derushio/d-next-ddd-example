# proxy.ts 認証制御パターン

## Next.js 16 での変更点

| 項目 | Next.js 15以前 | Next.js 16 |
|---|---|---|
| ファイル名 | `middleware.ts` | `proxy.ts` |
| エクスポート名 | `middleware` | `proxy` |
| ランタイム | Edge Runtime | Node.js Runtime |
| DB直接アクセス | ❌ 不可 | ✅ 可能（ただし非推奨） |

**Node.jsランタイムになったため、Edge互換性の問題は原則不要。**
ただしproxy.tsではDB直接アクセスを避ける設計をPJでは採用。

## PJのproxy.ts構成

```typescript
import { getToken } from 'next-auth/jwt';
import { type NextRequest, NextResponse } from 'next/server';

// カスタムヘッダー名
export const HEADER_URL = 'x-url';
export const HEADER_PATH = 'x-url-path';
export const HEADER_SEARCH = 'x-url-search';

// ルート定義
const PROTECTED_ROUTES = ['/users', '/api/protected'];
const PUBLIC_ROUTE_PREFIXES = ['/auth', '/api/auth', '/_next', '/favicon.ico'];
const PUBLIC_ROUTE_EXACT = ['/'];
```

## ルート保護の設計パターン

### ブラックリスト方式（PJ採用）

保護したいルートを明示的にリストアップ:

```typescript
const PROTECTED_ROUTES = ['/users', '/api/protected'];
// → リストにないルートはデフォルトで公開
```

**メリット**: 新ルート追加時に認証漏れの心配がない
**デメリット**: 保護ルートの追加を忘れる可能性

### ホワイトリスト方式（代替）

公開するルートをリストアップし、それ以外を保護:

```typescript
// 全ルートをデフォルトで保護
const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
if (!isPublicRoute) {
  // 認証チェック
}
```

**メリット**: デフォルトで安全
**デメリット**: 新しい公開ルートの追加が面倒

## getToken() vs auth() の使い分け

| メソッド | 処理 | 速度 | 用途 |
|---|---|---|---|
| `getToken()` | JWTデコードのみ | 高速 | proxy.ts での楽観的チェック |
| `auth()` | フルセッション取得 | 重い | Server Component/Action |

```typescript
// proxy.ts では getToken() を使う（軽量）
const token = await getToken({
  req,
  secret: env.AUTH_SECRET,
});

// Server Component では auth() を直接使わず、Infrastructure層の getAuth() ヘルパー経由で使う
// または DI経由の GetCurrentUserUseCase を使う（推奨）
// ❌ 直接使用は避ける: const session = await auth();
// ✅ Infrastructure ヘルパー経由: const session = await getAuth();
// ✅ UseCase経由（推奨）: const result = await getCurrentUserUseCase.execute();
```

## callbackUrl パターン

```typescript
if (!token) {
  const signInUrl = new URL('/auth/sign-in', req.url);
  signInUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(signInUrl);
}
```

サインイン後に元のページに戻るためのcallbackUrl。
サインインページ側で `callbackUrl` を取得してリダイレクトに使用。

## カスタムヘッダーパターン

Server ComponentではリクエストURLを直接取得できないため、
proxy.tsでヘッダーに埋め込む:

```typescript
const requestHeaders = new Headers(req.headers);
requestHeaders.set(HEADER_URL, req.url);
requestHeaders.set(HEADER_PATH, pathname);
requestHeaders.set(HEADER_SEARCH, url.search);

return NextResponse.next({
  request: { headers: requestHeaders },
});
```

Server Component側での取得:

```typescript
import { headers } from 'next/headers';
import { HEADER_PATH } from '@/proxy';

const headersList = await headers();
const currentPath = headersList.get(HEADER_PATH);
```

## matcher設定（オプション）

PJでは未使用だが、proxy.tsの実行対象を制限する場合:

```typescript
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|.*\\.png$).*)',
  ],
};
```

## セキュリティ上の注意

1. **proxy.tsは唯一の防衛線ではない**: 直接APIを呼ぶとバイパスされる
2. **getToken()は楽観的チェック**: トークンの存在のみ確認、権限チェックは別途必要
3. **AUTH_SECRETを明示指定**: process.env.AUTH_SECRETを渡すことを忘れない
4. **保護ルートの追加忘れ**: 新しいルートを作成したらPROTECTED_ROUTESの更新を確認
