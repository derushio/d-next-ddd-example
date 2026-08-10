# HTTPヘッダインジェクション対策ガイド

## 概要

HTTPヘッダインジェクションは、HTTPレスポンスヘッダに改行文字（CR: `\r`、LF: `\n`）を挿入することで、任意のヘッダフィールドやレスポンスボディを追加・改変される脆弱性です。

### 脆弱性の説明

攻撃者がユーザー入力を通じてHTTPレスポンスヘッダに改行文字を挿入すると、以下のような攻撃が可能になります。

- **HTTPレスポンス分割**: レスポンスヘッダとボディの境界である空行（`\r\n\r\n`）を挿入し、任意のレスポンスボディを追加
- **ヘッダフィールドの追加**: `Set-Cookie`、`Location`などの任意のヘッダを追加
- **既存ヘッダの上書き**: セキュリティ関連ヘッダ（CSP、X-Frame-Optionsなど）を無効化

#### 攻撃例

```http
// 攻撃者の入力: "value\r\nSet-Cookie: sessionid=malicious"
HTTP/1.1 200 OK
Content-Type: text/html
X-Custom-Header: value
Set-Cookie: sessionid=malicious
```

### 発生しうる脅威

| 脅威 | 説明 | 影響度 |
|------|------|--------|
| **XSS（クロスサイトスクリプティング）** | レスポンスボディに悪意のあるスクリプトを挿入 | 高 |
| **セッション固定攻撃** | `Set-Cookie`ヘッダを追加してセッションIDを固定化 | 高 |
| **キャッシュポイズニング** | キャッシュサーバに不正なレスポンスを保存させ、他のユーザに配信 | 中 |
| **フィッシング攻撃** | `Location`ヘッダを操作してリダイレクト先を改ざん | 中 |
| **セキュリティヘッダの無効化** | CSP、X-Frame-Optionsなどのセキュリティヘッダを上書き | 中 |

### 特に注意が必要なケース

1. **リダイレクト処理**
   - ユーザー入力をリダイレクト先URLに使用する場合
   - クエリパラメータからリダイレクト先を取得する場合

2. **Cookie設定**
   - ユーザー入力をCookie値に設定する場合
   - Cookie属性（Domain、Path等）に外部入力を使用する場合

3. **カスタムヘッダ設定**
   - ユーザー入力を独自のHTTPヘッダに含める場合
   - APIレスポンスにユーザー情報をヘッダとして返す場合

4. **プロキシ・リバースプロキシ経由の処理**
   - `X-Forwarded-For`、`X-Real-IP`などのプロキシヘッダを使用する場合

## IPA/OWASP対応

| 基準 | カテゴリ |
|------|---------|
| **IPA** | 3. HTTPヘッダインジェクション |
| **OWASP Top 10 2021** | A03:2021 - Injection |
| **CWE** | CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers |
| **優先度** | 中（特定の実装で高リスク） |

### 関連する脆弱性

- CWE-79: XSS（HTTPレスポンス分割経由）
- CWE-352: CSRF（Cookie固定化経由）
- CWE-601: オープンリダイレクト（Locationヘッダ操作）

## Next.js での対策

### 根本的解決策（必須）

#### 1. Next.jsのリダイレクト機能を使用

Next.js 16の標準リダイレクト機能は、内部的に改行文字のサニタイゼーションを実施しています。

```typescript
// ✅ 良い例: Next.jsのredirect関数を使用
import { redirect, RedirectType } from 'next/navigation';

export async function handleRedirect(targetPath: string) {
  // Next.jsが内部的に改行文字を除去・検証
  redirect(targetPath, RedirectType.replace);
}
```

```typescript
// ❌ 悪い例: 直接Response.redirect()を使用
export async function handleRedirect(targetPath: string) {
  // 改行文字の検証が不十分
  return Response.redirect(targetPath);
}
```

#### 2. ユーザー入力をヘッダに含めない

最も安全な対策は、ユーザー入力を直接HTTPヘッダに使用しないことです。

```typescript
// ✅ 良い例: ユーザー入力をヘッダに含めない
export async function GET(request: Request) {
  const userId = getUserIdFromSession(); // セッションから取得

  return new Response(JSON.stringify({ userId }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID(), // サーバ生成値
    },
  });
}
```

```typescript
// ❌ 悪い例: ユーザー入力を直接ヘッダに設定
export async function GET(request: Request) {
  const userName = request.headers.get('X-User-Name'); // ユーザー制御可能

  return new Response('OK', {
    headers: {
      'X-User-Name': userName, // 改行文字が挿入される可能性
    },
  });
}
```

#### 3. 改行コードの検証・除去

やむを得ずユーザー入力をヘッダに含める場合は、改行文字を厳格に除去します。

```typescript
/**
 * HTTPヘッダ値から改行文字を除去
 * @param value - ヘッダ値
 * @returns サニタイズされた値
 */
function sanitizeHeaderValue(value: string): string {
  // CR/LF/CRLF を全て除去
  return value.replace(/[\r\n]/g, '');
}

// 使用例
export async function GET(request: Request) {
  const userInput = request.headers.get('X-Custom-Header') ?? '';
  const sanitized = sanitizeHeaderValue(userInput);

  return new Response('OK', {
    headers: {
      'X-Echo': sanitized,
    },
  });
}
```

### 保険的対策（推奨）

#### 1. ホワイトリストによるリダイレクト先制限

リダイレクト処理では、許可されたURLのみを受け入れるホワイトリスト方式を採用します。

```typescript
/**
 * リダイレクト先URLをホワイトリストで検証
 */
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/profile',
  '/settings',
] as const;

type AllowedPath = typeof ALLOWED_REDIRECT_PATHS[number];

function isAllowedRedirectPath(path: string): path is AllowedPath {
  return ALLOWED_REDIRECT_PATHS.includes(path as AllowedPath);
}

// 使用例: Server Action
'use server';

import { redirect } from 'next/navigation';
import { ok, err, type Result, type AppError } from '@/layers/application/types/Result';

export async function handleSafeRedirect(
  targetPath: string
): Promise<Result<void, AppError>> {
  if (!isAllowedRedirectPath(targetPath)) {
    return err({ message: '不正なリダイレクト先です', code: 'INVALID_REDIRECT_PATH' });
  }

  redirect(targetPath); // ホワイトリスト検証済み
  return ok(undefined);
}
```

#### 2. URL検証

外部URLへのリダイレクトが必要な場合は、URLスキームとドメインを厳格に検証します。

```typescript
/**
 * 外部URLの検証
 */
const ALLOWED_DOMAINS = [
  'example.com',
  'api.example.com',
] as const;

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // HTTPSのみ許可
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // ホワイトリストドメインのみ許可
    return ALLOWED_DOMAINS.some(domain => parsed.hostname === domain);
  } catch {
    return false;
  }
}

// 使用例
'use server';

export async function redirectToExternal(
  targetUrl: string
): Promise<Result<void, AppError>> {
  if (!isValidExternalUrl(targetUrl)) {
    return err({ message: '不正なリダイレクト先です', code: 'INVALID_REDIRECT_URL' });
  }

  redirect(targetUrl);
  return ok(undefined);
}
```

### Next.js 16 proxy.ts での対策

`proxy.ts`（旧`middleware.ts`）でレスポンスヘッダを設定する場合の対策例です。

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // セキュリティヘッダを設定（静的な値のみ）
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ❌ 悪い例: ユーザー入力をヘッダに設定しない
  // const userAgent = request.headers.get('user-agent');
  // response.headers.set('X-User-Agent', userAgent);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## チェックリスト

### 実装前チェック

- [ ] リダイレクト処理でユーザー入力を使用するか確認
- [ ] カスタムヘッダにユーザー入力を含めるか確認
- [ ] Cookie設定で外部入力を使用するか確認
- [ ] プロキシヘッダを信頼して使用するか確認

### 実装時チェック

- [ ] Next.jsの`redirect()`関数を使用しているか
- [ ] `Response.redirect()`を直接使用していないか
- [ ] ユーザー入力をヘッダ値に含めていないか
- [ ] やむを得ず含める場合、改行文字を除去しているか
- [ ] リダイレクト先をホワイトリストで検証しているか
- [ ] 外部URLへのリダイレクトでスキーム・ドメインを検証しているか

### コードレビュー時チェック

- [ ] `Response.redirect()`, `Response()コンストラクタ`の使用箇所を確認
- [ ] `headers.set()`, `headers.append()` でユーザー入力を使用していないか
- [ ] `Set-Cookie`ヘッダを手動で設定していないか（next-auth等のライブラリ使用を推奨）
- [ ] `Location`ヘッダの値にユーザー入力が含まれていないか
- [ ] `X-Forwarded-*`などのプロキシヘッダを検証なしに信頼していないか

## テストパターン

### ユニットテスト

```typescript
// __tests__/layers/presentation/actions/redirect.test.ts
import { describe, it, expect } from 'vitest';
import { handleSafeRedirect } from '@/layers/presentation/actions/redirect';

describe('handleSafeRedirect', () => {
  it('許可されたパスへのリダイレクトは成功する', async () => {
    const result = await handleSafeRedirect('/dashboard');

    // redirect()が呼ばれるため、実際にはリダイレクト例外がスローされる
    // テスト環境では例外をキャッチして検証
    expect(result.isOk()).toBe(true);
  });

  it('許可されていないパスへのリダイレクトは失敗する', async () => {
    const result = await handleSafeRedirect('/malicious\r\nSet-Cookie: hack=1');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('不正なリダイレクト先です');
    }
  });

  it('改行文字を含むパスは拒否される', async () => {
    const maliciousPaths = [
      '/path\r\nSet-Cookie: sessionid=malicious',
      '/path\nLocation: https://evil.com',
      '/path\r\n\r\n<script>alert(1)</script>',
    ];

    for (const path of maliciousPaths) {
      const result = await handleSafeRedirect(path);
      expect(result.isErr()).toBe(true);
    }
  });
});
```

### E2Eテスト（Playwright）

```typescript
// e2e/security/http-header-injection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('HTTPヘッダインジェクション対策', () => {
  test('改行文字を含むリダイレクトパラメータは拒否される', async ({ page }) => {
    // 改行文字を含むリダイレクト先を指定
    const maliciousUrl = '/api/redirect?target=/dashboard%0d%0aSet-Cookie:%20sessionid=malicious';

    const response = await page.goto(maliciousUrl);

    // リダイレクトが実行されないか、エラーページが表示される
    expect(response?.status()).not.toBe(302);
    expect(response?.headers()['set-cookie']).toBeUndefined();
  });

  test('ホワイトリスト外のリダイレクト先は拒否される', async ({ page }) => {
    const response = await page.goto('/api/redirect?target=https://evil.com');

    expect(response?.status()).not.toBe(302);
    await expect(page).toHaveURL(/\/(error|dashboard)/); // エラーページまたはデフォルトページ
  });

  test('レスポンスヘッダに改行文字が含まれていない', async ({ page }) => {
    const response = await page.goto('/api/test-header?value=test%0d%0aX-Injected:malicious');

    const headers = response?.headers();
    expect(headers?.['x-injected']).toBeUndefined();

    // すべてのヘッダ値に改行文字が含まれていないことを確認
    for (const [key, value] of Object.entries(headers ?? {})) {
      expect(value).not.toMatch(/[\r\n]/);
    }
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA 安全なウェブサイトの作り方 - HTTPヘッダインジェクション](https://www.ipa.go.jp/security/vuln/websecurity/http-header.html)
- [OWASP - HTTP Response Splitting](https://owasp.org/www-community/attacks/HTTP_Response_Splitting)
- [CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers](https://cwe.mitre.org/data/definitions/113.html)
- [Next.js Documentation - redirect()](https://nextjs.org/docs/app/api-reference/functions/redirect)
- [MDN - HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

### プロジェクト内関連ドキュメント

- [セキュリティガイドライン概要](../../README.md)
- [XSS対策ガイド](./xss.md)
- [CSRF対策ガイド](./csrf.md)
- [セッション管理ガイド](./session-management.md)
- 入力検証ガイド

### 外部リソース

- [RFC 7230 - Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing](https://tools.ietf.org/html/rfc7230)
- [OWASP Cheat Sheet - Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## 更新履歴

- 2026-01-18: 初版作成（Next.js 16 proxy.ts 対応、IPA/OWASP/CWE対応表、テストパターン追加）
