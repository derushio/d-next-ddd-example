# XSS（クロスサイトスクリプティング）対策ガイド

## 概要

XSS（Cross-Site Scripting）は、Webアプリケーションに悪意のあるスクリプトを注入し、他のユーザーのブラウザ上で実行させる攻撃手法です。攻撃者は、ユーザーが入力したデータや外部から取得したデータを適切にエスケープせずに出力することで、任意のJavaScriptコードを実行できます。

### XSSの種類

#### 1. 反射型XSS（Reflected XSS）

攻撃スクリプトがリクエストパラメータに含まれ、そのままレスポンスに反映される攻撃。

```
例: https://example.com/search?q=<script>alert('XSS')</script>
```

#### 2. 格納型XSS（Stored XSS）

攻撃スクリプトがデータベースに保存され、他のユーザーがそのデータを閲覧した際に実行される攻撃。最も危険性が高い。

```
例: ユーザープロフィール、コメント欄、掲示板への投稿
```

#### 3. DOM-based XSS

サーバー側のレスポンスには含まれず、JavaScriptがDOM操作を行う際にクライアント側で発生する攻撃。

```javascript
// 危険な例
document.getElementById('output').innerHTML = location.hash.substring(1);
```

### 発生しうる脅威

| 脅威 | 影響度 | 説明 |
|------|--------|------|
| **セッションハイジャック** | 高 | Cookieに保存されたセッションIDを盗み出し、なりすましを行う |
| **フィッシング** | 高 | 偽のログインフォームを表示して認証情報を窃取 |
| **マルウェア配布** | 中 | 悪意のあるサイトへのリダイレクトやダウンロードを強制 |
| **個人情報漏洩** | 高 | ページ内の機密情報を外部サーバーに送信 |
| **画面改ざん** | 中 | Webページの表示内容を書き換えて誤情報を表示 |
| **キー入力の盗聴** | 高 | キーロガーを仕込んでパスワード等を窃取 |

### 特に注意が必要なケース

1. **ユーザー入力の表示**
   - 検索結果、コメント、ユーザー名、プロフィール情報
   - フォームのエラーメッセージにリクエストパラメータを含める場合

2. **リッチテキストエディタ**
   - ブログ記事、Wiki、メール本文など、HTMLタグの入力を許可する機能
   - Markdown や WYSIWYG エディタの出力

3. **URL生成**
   - `href`、`src` 属性への動的な値の設定
   - `javascript:` スキームや `data:` スキームの悪用

4. **JSON データの埋め込み**
   - サーバーサイドで生成したJSONをインラインスクリプトに埋め込む場合
   - `</script>` タグの混入によるスクリプト終了

5. **外部コンテンツの取り込み**
   - API レスポンス、RSS フィード、OGP タグなどの外部データ
   - サードパーティウィジェット、広告スクリプト

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| **IPA** | 4. クロスサイトスクリプティング（XSS） | 「安全なウェブサイトの作り方」第11版 |
| **OWASP Top 10** | A03:2021-Injection | Injection 攻撃の一種として分類 |
| **CWE** | CWE-79: Improper Neutralization of Input During Web Page Generation | 不適切な出力エスケープ |
| **CVSS重要度** | 中～高（6.1～8.8） | 攻撃の複雑さや影響範囲による |

### IPA対策の分類

| 対策種別 | 対策内容 | 本プロジェクトでの実装 |
|----------|----------|----------------------|
| **根本的解決** | HTMLエスケープ処理 | React 19の自動エスケープ、DOMPurify |
| **根本的解決** | HTMLタグ・JavaScript入力の禁止 | Zod バリデーション、Value Object検証 |
| **保険的対策** | HTTPOnly属性の設定 | NextAuth.js による自動設定 |
| **保険的対策** | Content Security Policy（CSP）設定 | proxy.ts でのヘッダー設定 |
| **保険的対策** | 入力値の許可リスト検証 | Zod スキーマによるホワイトリスト検証 |

## Next.js + React + TypeScript での対策

### 根本的解決策（必須）

#### 1. Reactの自動エスケープを活用（JSX内でのテキスト表示）

React 19は、JSX内でレンダリングされるテキストを自動的にエスケープします。これにより、ユーザー入力をそのまま表示しても、HTMLタグやスクリプトとして解釈されることはありません。

```typescript
// ✅ 安全: React が自動的にエスケープ
export function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}

// ✅ 安全: 属性値も自動エスケープ
<img alt={user.name} src={user.avatarUrl} />

// ⚠️ 注意: href属性でのjavascript:スキーム
// 以下は危険な例
<a href={userInput}>リンク</a>

// ✅ 安全: URLバリデーションを実施
import { z } from 'zod';

const urlSchema = z.url().refine((url) => {
  return url.startsWith('http://') || url.startsWith('https://');
}, 'HTTPまたはHTTPSのURLのみ許可されます');

function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  const validatedUrl = urlSchema.parse(href);
  return <a href={validatedUrl}>{children}</a>;
}
```

#### 2. dangerouslySetInnerHTML の禁止または DOMPurify 使用

`dangerouslySetInnerHTML` は、React の自動エスケープをバイパスするため、XSS の原因となります。基本的には使用を避け、どうしても必要な場合は DOMPurify でサニタイズします。

##### 2-1. dangerouslySetInnerHTML を使わない実装

```typescript
// ❌ 危険: ユーザー入力を直接 HTML として挿入
export function DangerousComponent({ htmlContent }: { htmlContent: string }) {
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

// ✅ 安全: Markdown ライブラリを使用
import ReactMarkdown from 'react-markdown';

export function SafeMarkdownComponent({ markdown }: { markdown: string }) {
  return <ReactMarkdown>{markdown}</ReactMarkdown>;
}
```

##### 2-2. DOMPurify を使用したサニタイズ

リッチテキストエディタなど、HTMLタグの入力を許可する必要がある場合は、DOMPurify を使用します。

**インストール:**

```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

**使用例:**

```typescript
'use client';

import DOMPurify from 'dompurify';
import { useMemo } from 'react';

/**
 * サニタイズされたHTMLコンテンツを表示するコンポーネント
 *
 * セキュリティ考慮事項:
 * - DOMPurify でサニタイズして XSS を防止
 * - useMemo で再レンダリング時の再サニタイズを回避
 * - 許可するタグを明示的に制限
 */
export function SanitizedHtmlContent({ html }: { html: string }) {
  const sanitizedHtml = useMemo(() => {
    // サーバーサイドではサニタイズをスキップ（DOMPurifyはブラウザ専用）
    if (typeof window === 'undefined') {
      return '';
    }

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      // javascript: や data: スキームを除外
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i,
    });
  }, [html]);

  return (
    <div
      // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurifyでサニタイズ済み
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
```

**サーバーサイドでのサニタイズ（推奨）:**

```typescript
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

/**
 * サーバーサイドでHTMLをサニタイズするユーティリティ
 *
 * UseCaseやRepositoryでコンテンツを保存する前に使用
 */
export function sanitizeHtmlOnServer(html: string): string {
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window as unknown as Window);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i,
  });
}

// 使用例: UseCase での実装
export class CreateArticleUseCase {
  async execute(req: CreateArticleRequest): Promise<Result<CreateArticleResponse, AppError>> {
    // HTMLコンテンツをサニタイズ
    const sanitizedContent = sanitizeHtmlOnServer(req.content);

    const article = new Article({
      title: req.title,
      content: sanitizedContent,
      authorId: req.authorId,
    });

    await this.articleRepository.save(article);

    return ok({ articleId: article.id });
  }
}
```

#### 3. Content Security Policy (CSP) 設定

CSP（Content Security Policy）は、ブラウザに対してどのリソースの読み込みを許可するかを指示するHTTPヘッダーです。XSS攻撃が成功した場合でも、外部スクリプトの実行や情報の送信を防ぐことができます。

##### 3-1. Next.js 16 の proxy.ts での実装

```typescript
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Content Security Policy設定
 *
 * セキュリティ考慮事項:
 * - インラインスクリプトは nonce または hash で許可
 * - unsafe-inline, unsafe-eval は原則禁止
 * - 本番環境では外部リソースを明示的に制限
 */
function generateCSPHeader(nonce: string): string {
  const cspDirectives = [
    // デフォルトは同一オリジンのみ
    "default-src 'self'",

    // スクリプトは nonce 付きインラインと同一オリジンのみ
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,

    // スタイルは nonce 付きインラインと同一オリジン
    `style-src 'self' 'nonce-${nonce}'`,

    // 画像は同一オリジン、data:、https:を許可
    "img-src 'self' data: https:",

    // フォント
    "font-src 'self' data:",

    // フレーム埋め込み禁止（Clickjacking対策）
    "frame-ancestors 'none'",

    // ベースURIの制限
    "base-uri 'self'",

    // フォーム送信先を同一オリジンに制限
    "form-action 'self'",

    // オブジェクト、埋め込みを禁止
    "object-src 'none'",

    // アップグレード: HTTPをHTTPSに自動変換
    "upgrade-insecure-requests",
  ];

  return cspDirectives.join('; ');
}

/**
 * Cryptographically secure なnonceを生成
 */
function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

export async function proxy(req: NextRequest) {
  const nonce = generateNonce();
  const cspHeader = generateCSPHeader(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // セキュリティヘッダーの設定
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

##### 3-2. CSP nonce をコンポーネントで使用

```typescript
import { headers } from 'next/headers';

/**
 * CSP nonce を取得するユーティリティ
 */
export async function getNonce(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-nonce') ?? '';
}

/**
 * インラインスクリプトに nonce を設定
 */
export async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = await getNonce();

  return (
    <html lang='ja'>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // CSP nonce により許可されたインラインスクリプト
              console.log('App initialized');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 保険的対策（推奨）

#### 1. HTTPOnly Cookie の使用

セッションIDを含むCookieに `HttpOnly` 属性を設定することで、JavaScriptからのアクセスを防ぎます。

```typescript
// Auth.js v5 の設定例
// src/nextAuth.ts（Auth.js v5 / next-auth 5.0.0-beta.30）

import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ...
  cookies: {
    sessionToken: {
      name: '__Secure-authjs.session-token',
      options: {
        httpOnly: true,    // JavaScriptからアクセス不可
        secure: true,      // HTTPS通信のみ
        sameSite: 'lax',   // CSRF対策
        path: '/',
      },
    },
  },
});
```

#### 2. X-XSS-Protection ヘッダ

古いブラウザ向けのXSS対策機能を有効化します（最新ブラウザではCSPが推奨）。

```typescript
// proxy.ts で設定
response.headers.set('X-XSS-Protection', '1; mode=block');
```

#### 3. 入力値の許可リスト検証

Domain層の Value Object でバリデーションを実施します。

```typescript
import { z } from 'zod';
import { type Result, type AppError, ok, err } from '@/layers/application/types/Result';

/**
 * HTMLタグを含まないテキストのみ許可する Value Object
 */
export class SafeText {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<SafeText, AppError> {
    // HTMLタグのパターンを検出
    const htmlTagPattern = /<[^>]*>/g;

    if (htmlTagPattern.test(value)) {
      return err({ message: 'HTMLタグは使用できません', code: 'INVALID_HTML_TAG' });
    }

    // 長さ制限
    if (value.length > 1000) {
      return err({ message: '1000文字以内で入力してください', code: 'TEXT_TOO_LONG' });
    }

    return ok(new SafeText(value));
  }

  get value(): string {
    return this._value;
  }
}

/**
 * URLの許可リスト検証
 */
export class SafeUrl {
  private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

  private constructor(private readonly _value: string) {}

  static create(value: string): Result<SafeUrl, AppError> {
    try {
      const url = new URL(value);

      // プロトコルのホワイトリスト検証
      if (!this.ALLOWED_PROTOCOLS.includes(url.protocol)) {
        return err({ message: `許可されていないプロトコルです: ${url.protocol}`, code: 'DISALLOWED_PROTOCOL' });
      }

      // javascript: や data: スキームを拒否
      if (url.protocol === 'javascript:' || url.protocol === 'data:') {
        return err({ message: '無効なURLスキームです', code: 'INVALID_URL_SCHEME' });
      }

      return ok(new SafeUrl(value));
    } catch (error) {
      return err({ message: '無効なURL形式です', code: 'INVALID_URL_FORMAT' });
    }
  }

  get value(): string {
    return this._value;
  }
}
```

## 具体的なコード例

### 例1: ユーザー検索結果の表示（反射型XSS対策）

```typescript
// src/app/search/page.tsx
import { Suspense } from 'react';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * 検索結果ページ
 *
 * セキュリティ考慮事項:
 * - searchParams.q はReactが自動エスケープ
 * - dangerouslySetInnerHTML は使用しない
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q ?? '';

  return (
    <div>
      <h1>検索結果</h1>
      {/* ✅ 安全: React の自動エスケープ */}
      <p>「{query}」の検索結果</p>

      <Suspense fallback={<div>読み込み中...</div>}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ query }: { query: string }) {
  // UseCase経由でデータ取得
  const results = await searchArticles(query);

  return (
    <ul>
      {results.map((article) => (
        <li key={article.id}>
          {/* ✅ 安全: すべてReactが自動エスケープ */}
          <h2>{article.title}</h2>
          <p>{article.summary}</p>
        </li>
      ))}
    </ul>
  );
}
```

### 例2: ブログ記事の表示（格納型XSS対策）

```typescript
// src/app/articles/[id]/page.tsx
import { SanitizedHtmlContent } from '@/components/common/SanitizedHtmlContent';
import { getArticleByIdUseCase } from '@/layers/application/usecases/article/GetArticleByIdUseCase';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

/**
 * 記事詳細ページ
 *
 * セキュリティ考慮事項:
 * - リッチテキストコンテンツは SanitizedHtmlContent でサニタイズ
 * - タイトル、作成者名は React の自動エスケープ
 */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const result = await getArticleByIdUseCase.execute({ id });

  if (result.isErr()) {
    return <div>記事が見つかりません</div>;
  }

  const article = result.value;

  return (
    <article>
      {/* ✅ 安全: React の自動エスケープ */}
      <h1>{article.title}</h1>
      <p>著者: {article.author.name}</p>
      <time>{article.publishedAt.toLocaleDateString()}</time>

      {/* ✅ 安全: DOMPurify でサニタイズ */}
      <SanitizedHtmlContent html={article.content} />
    </article>
  );
}
```

### 例3: フォーム入力の検証とエスケープ

```typescript
// src/app/server-actions/comment/createCommentAction.ts
'use server';

import { z } from 'zod';
import { resolve } from '@/di/resolver';
import { CreateCommentUseCase } from '@/layers/application/usecases/comment/CreateCommentUseCase';

/**
 * コメント作成のバリデーションスキーマ
 *
 * セキュリティ考慮事項:
 * - HTMLタグを禁止（プレーンテキストのみ）
 * - 最大長を制限
 */
const createCommentSchema = z.object({
  articleId: z.uuid(),
  content: z
    .string()
    .min(1, 'コメントを入力してください')
    .max(1000, '1000文字以内で入力してください')
    .refine(
      (content) => !/<[^>]*>/g.test(content),
      'HTMLタグは使用できません'
    ),
});

export async function createCommentAction(formData: FormData) {
  // バリデーション
  const parsed = createCommentSchema.safeParse({
    articleId: formData.get('articleId'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  // UseCase実行
  const useCase = resolve(CreateCommentUseCase);
  const result = await useCase.execute({
    articleId: parsed.data.articleId,
    content: parsed.data.content,
  });

  if (result.isErr()) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}
```

### 例4: URLの安全な生成

```typescript
// src/components/common/SafeLink.tsx
import Link from 'next/link';
import { SafeUrl } from '@/layers/domain/valueObjects/SafeUrl';

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 安全なリンクコンポーネント
 *
 * セキュリティ考慮事項:
 * - URLバリデーションを実施
 * - javascript:, data: スキームを拒否
 * - 外部リンクには rel="noopener noreferrer" を設定
 */
export function SafeLink({ href, children, className }: SafeLinkProps) {
  const urlResult = SafeUrl.create(href);

  if (urlResult.isErr()) {
    // 無効なURLの場合はリンクを表示しない
    return <span className={className}>{children}</span>;
  }

  const url = new URL(urlResult.value.value);
  const isExternal = url.origin !== process.env.NEXT_PUBLIC_APP_URL;

  if (isExternal) {
    return (
      <a
        href={urlResult.value.value}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={urlResult.value.value} className={className}>
      {children}
    </Link>
  );
}
```

### 例5: JSON データの安全な埋め込み

```typescript
// src/app/config/page.tsx

interface ConfigPageProps {
  config: Record<string, unknown>;
}

/**
 * サーバーサイドで生成したJSONをクライアントに渡す
 *
 * セキュリティ考慮事項:
 * - JSON.stringify で自動エスケープ
 * - </script> タグの混入を防ぐため、< を \u003c に置換
 */
export default function ConfigPage({ config }: ConfigPageProps) {
  // ✅ 安全: < を Unicode エスケープして </script> の混入を防ぐ
  const jsonString = JSON.stringify(config).replace(/</g, '\\u003c');

  return (
    <div>
      <h1>設定</h1>
      <script
        type="application/json"
        id="app-config"
        dangerouslySetInnerHTML={{ __html: jsonString }}
      />
    </div>
  );
}
```

## チェックリスト

### 実装前チェック

- [ ] ユーザー入力や外部データを表示する箇所を洗い出したか
- [ ] リッチテキストエディタが必要か、プレーンテキストで十分か検討したか
- [ ] 動的にURLを生成する箇所を把握したか
- [ ] インラインスクリプトの必要性を精査したか

### 実装中チェック

- [ ] `dangerouslySetInnerHTML` を使用していないか（使用する場合はDOMPurifyでサニタイズ）
- [ ] React の自動エスケープを活用しているか
- [ ] URLのバリデーション（`javascript:`, `data:` スキームの拒否）を実施しているか
- [ ] Value Object で入力値のホワイトリスト検証を実施しているか
- [ ] CSP nonce を使用してインラインスクリプトを許可しているか

### デプロイ前チェック

- [ ] Content Security Policy (CSP) ヘッダーが設定されているか
- [ ] `HttpOnly` 属性付きCookieを使用しているか
- [ ] `X-Content-Type-Options: nosniff` ヘッダーが設定されているか
- [ ] `X-Frame-Options` ヘッダーが設定されているか
- [ ] 外部リソースのドメインをCSPで制限しているか
- [ ] 本番環境で `unsafe-inline`, `unsafe-eval` を使用していないか

### コードレビュー時チェック

- [ ] HTML出力箇所にエスケープ漏れがないか
- [ ] リッチテキストのサニタイズ処理が適切か
- [ ] Biome の `lint/security/noDangerouslySetInnerHtml` 警告を無視していないか
- [ ] URLバリデーションが実装されているか
- [ ] JSON データの埋め込みで `</script>` タグの混入対策をしているか

## テストパターン

### 単体テスト: Value Object のバリデーション

```typescript
// src/layers/domain/valueObjects/SafeText.test.ts
import { describe, it, expect } from 'vitest';
import { SafeText } from './SafeText';

describe('SafeText', () => {
  describe('create', () => {
    it('通常のテキストは成功する', () => {
      const result = SafeText.create('こんにちは、世界！');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe('こんにちは、世界！');
      }
    });

    it('HTMLタグを含む場合は失敗する', () => {
      const result = SafeText.create('<script>alert("XSS")</script>');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('HTMLタグは使用できません');
      }
    });

    it('閉じていないHTMLタグも検出する', () => {
      const result = SafeText.create('<img src=x onerror=alert(1)>');

      expect(result.isErr()).toBe(true);
    });

    it('1000文字を超える場合は失敗する', () => {
      const longText = 'a'.repeat(1001);
      const result = SafeText.create(longText);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('1000文字以内');
      }
    });
  });
});
```

### E2Eテスト: XSS攻撃のシミュレーション

```typescript
// tests/e2e/security/xss.spec.ts
import { test, expect } from '@playwright/test';

test.describe('XSS対策', () => {
  test('検索結果にスクリプトタグが表示されない', async ({ page }) => {
    // XSS攻撃を試みる
    await page.goto('/search?q=<script>alert("XSS")</script>');

    // スクリプトが実行されず、テキストとして表示されることを確認
    const searchQuery = page.locator('text=<script>alert("XSS")</script>');
    await expect(searchQuery).toBeVisible();

    // アラートが表示されないことを確認
    page.on('dialog', () => {
      throw new Error('予期しないアラートが表示されました');
    });
  });

  test('コメント投稿でHTMLタグが無効化される', async ({ page }) => {
    await page.goto('/articles/1');

    // コメント欄にHTMLタグを含むテキストを入力
    await page.fill('textarea[name="content"]', '<img src=x onerror=alert(1)>');
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=HTMLタグは使用できません')).toBeVisible();
  });

  test('リンクのjavascript:スキームがブロックされる', async ({ page }) => {
    // 悪意のあるURLを設定
    await page.goto('/articles/1');
    await page.fill('input[name="url"]', 'javascript:alert("XSS")');
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=無効なURLスキーム')).toBeVisible();
  });

  test('CSP ヘッダーが設定されている', async ({ page }) => {
    const response = await page.goto('/');
    const cspHeader = response?.headers()['content-security-policy'];

    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("script-src 'self'");
    expect(cspHeader).toContain("object-src 'none'");
  });
});
```

### 統合テスト: サニタイズ処理

```typescript
// src/layers/infrastructure/utils/sanitizeHtml.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeHtmlOnServer } from './sanitizeHtml';

describe('sanitizeHtmlOnServer', () => {
  it('許可されたタグは保持される', () => {
    const input = '<p>こんにちは</p><strong>太字</strong>';
    const output = sanitizeHtmlOnServer(input);

    expect(output).toBe('<p>こんにちは</p><strong>太字</strong>');
  });

  it('scriptタグは削除される', () => {
    const input = '<p>テキスト</p><script>alert("XSS")</script>';
    const output = sanitizeHtmlOnServer(input);

    expect(output).toBe('<p>テキスト</p>');
    expect(output).not.toContain('script');
  });

  it('iframeタグは削除される', () => {
    const input = '<p>テキスト</p><iframe src="https://evil.com"></iframe>';
    const output = sanitizeHtmlOnServer(input);

    expect(output).toBe('<p>テキスト</p>');
  });

  it('javascript:スキームのリンクは無効化される', () => {
    const input = '<a href="javascript:alert(1)">リンク</a>';
    const output = sanitizeHtmlOnServer(input);

    // hrefが削除されるか、無効化される
    expect(output).not.toContain('javascript:');
  });

  it('data:スキームの画像は削除される', () => {
    const input = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
    const output = sanitizeHtmlOnServer(input);

    expect(output).not.toContain('data:');
  });

  it('onerror等のイベントハンドラは削除される', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const output = sanitizeHtmlOnServer(input);

    expect(output).not.toContain('onerror');
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - クロスサイトスクリプティング](https://www.ipa.go.jp/security/vuln/websecurity/cross-site-scripting.html)
- [OWASP: Cross Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)
- [React 公式: dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)

### ライブラリ

- [DOMPurify](https://github.com/cure53/DOMPurify) - HTMLサニタイゼーションライブラリ
- [Zod](https://zod.dev/) - TypeScript スキーマバリデーション
- [React Markdown](https://github.com/remarkjs/react-markdown) - 安全なMarkdownレンダリング

### プロジェクト内参照

- [IPAセキュリティガイドライン対応](../../README.md)
- [IPA-OWASP-CWE 対応表](../../references/ipa-owasp-mapping.md)
- 入力検証パターン
- [CSRF対策ガイド](./csrf.md)
- [セッション管理の欠陥対策](./session-management.md)

### ツール

- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - CSP設定の検証ツール
- [XSS Filter Evasion Cheat Sheet](https://owasp.org/www-community/xss-filter-evasion-cheatsheet) - XSSフィルター回避手法の一覧

## 更新履歴

- 2026-01-18: 初版作成（Next.js 16 + React 19 + TypeScript対応）
