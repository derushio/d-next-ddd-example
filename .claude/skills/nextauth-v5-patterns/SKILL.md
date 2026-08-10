---
name: nextauth-v5-patterns
description: |
  Auth.js v5を使った認証チェック・保護パターンを提供するスキル。
  proxy.tsでのJWT検証（getToken）、Server Componentでの認証チェック、
  Server Actionsでの認証チェック、IAuthSessionService経由のセッション取得パターンを扱う。
  security-reviewとの棲み分け: security-reviewはセキュリティ観点の脆弱性チェック、
  このスキルはAuth.js v5固有のAPIと実装パターン。

  トリガー例:
  - 「認証チェック」「認証ガード」「保護ルート」「ルート保護」
  - 「proxy.tsで認証」「getToken」「JWT検証」
  - 「PROTECTED_ROUTES」「PUBLIC_ROUTE_PREFIXES」
  - 「requireAuthentication」「GetCurrentUserUseCase」
  - 「IAuthSessionService」「AuthSessionService」「getSession」
  - 「Server Actionで認証」「認証必須UseCase」
  - 「LoginAttempt」「ブルートフォース対策」「ログイン試行」
  - 「Dynamic server usage エラー」「静的生成時の認証」
  - src/proxy.ts 編集時（認証ロジック部分）
---

# Auth.js v5 Patterns Skill

Auth.js v5を使った認証チェック・保護パターンの実装ガイド。

## security-review との棲み分け

| スキル | 役割 |
|---|---|
| `security-review` | 「何が脆弱か」IPAチェックリスト・OWASP観点 |
| このスキル | 「Auth.js v5のAPIをどう使うか」実装パターン |

---

## 1. PJの認証アーキテクチャ全体像

```
ブラウザ
  ↓
proxy.ts [getToken() → JWT検証]
  ↓ 楽観的リダイレクト（未認証→/auth/sign-in）
Server Component / Server Action
  ↓
GetCurrentUserUseCase.requireAuthentication()
  ↓
IAuthSessionService.getSession()  [Application層インターフェース]
  ↓
AuthSessionService → getAuth() → auth()  [Infrastructure層実装]
```

**重要**: proxy.tsは「楽観的リダイレクト」のみ。**唯一の防衛線ではない。**
Server Component / Action側でも必ず認証チェックが必要。

**詳細**: `references/auth-flow.md` を参照

---

## 2. proxy.ts での認証パターン

**詳細**: `references/proxy-patterns.md` を参照

### ルート定義

```typescript
// src/proxy.ts
const PROTECTED_ROUTES = ['/users', '/api/protected'];     // 認証必須（前方一致）
const PUBLIC_ROUTE_PREFIXES = ['/auth', '/api/auth', '/_next', '/favicon.ico']; // 公開（前方一致）
const PUBLIC_ROUTE_EXACT = ['/'];                           // 公開（完全一致）
```

### ルート判定ロジック

```typescript
const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
  pathname.startsWith(route),    // 前方一致
);
const isPublicRoute =
  PUBLIC_ROUTE_PREFIXES.some((route) => pathname.startsWith(route)) ||
  PUBLIC_ROUTE_EXACT.includes(pathname);  // 完全一致

// 保護ルート かつ 公開ルートでない場合に認証チェック
if (isProtectedRoute && !isPublicRoute) { ... }
```

### getToken() によるJWT検証

```typescript
import { getToken } from 'next-auth/jwt';

// proxy.tsでは auth() ではなく getToken() を直接使用（軽量）
const token = await getToken({
  req,
  secret: process.env.AUTH_SECRET,  // AUTH_SECRET を明示指定
});

if (!token) {
  // 未認証 → サインインページにリダイレクト
  const signInUrl = new URL('/auth/sign-in', req.url);
  signInUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(signInUrl);
}
```

**なぜ getToken() を使うか**: proxy.tsでは軽量なJWT検証のみ必要。`auth()` はフルセッション取得になりオーバーヘッドが大きい。

### カスタムヘッダー付与

```typescript
// Server ComponentでリクエストURLを取得するためのヘッダー
export const HEADER_URL = 'x-url';
export const HEADER_PATH = 'x-url-path';
export const HEADER_SEARCH = 'x-url-search';

const requestHeaders = new Headers(req.headers);
requestHeaders.set(HEADER_URL, req.url);
requestHeaders.set(HEADER_PATH, pathname);
requestHeaders.set(HEADER_SEARCH, url.search);
```

---

## 3. Server Component / Server Action での認証チェック

### GetCurrentUserUseCase.execute()

```typescript
import type { AppError } from '@/layers/application/types/Result';
import { err, ok, type Result } from '@/layers/application/types/Result';

// Application層: Result型で認証チェック結果を返却
@injectable()
export class GetCurrentUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.AuthSessionService)
    private readonly authSessionService: IAuthSessionService,
  ) {}

  async execute(): Promise<Result<GetCurrentUserResponse, AppError>> {
    const session = await this.authSessionService.getSession();
    if (!session) {
      return err({ message: '認証が必要です', code: 'UNAUTHENTICATED' });
    }
    return ok({ id, email, name });
  }
}
```

### requireAuthentication()

```typescript
// 認証必須コンテキスト向け（警告ログ付き）
async requireAuthentication(): Promise<Result<GetCurrentUserResponse, AppError>> {
  const result = await this.execute();
  if (result.isErr()) {
    this.logger.warn('認証が必要な処理で未認証ユーザーがアクセス', {
      action: 'requireAuthentication',
      error: result.error.message,
    });
  }
  return result;
}
```

### Server Actionでの使い方

```typescript
// ✅ DDD準拠: UseCaseに認証チェックを委譲
'use server';
const useCase = resolve('GetCurrentUserUseCase');
const authResult = await useCase.requireAuthentication();
if (authResult.isErr()) {
  return err({ message: authResult.error.message, code: authResult.error.code });
}
// authResult.value.id でユーザーIDを取得
```

```typescript
// ❌ Server Actionで直接auth()を呼ぶ（DDD違反）
const session = await auth();
```

### セッション取得のレイヤールール

| レイヤー | 方法 | OK? |
|---|---|---|
| Application層 | `IAuthSessionService.getSession()` | ✅ |
| Infrastructure層 | `getAuth()` / `auth()` 直接 | ✅ |
| Presentation層 (Server Action) | `GetCurrentUserUseCase` 経由 | ✅ |
| Presentation層 (Server Action) | `auth()` 直接 | ❌ DDD違反 |

---

## 4. 静的生成時の "Dynamic server usage" エラー対処

```typescript
// src/layers/infrastructure/services/AuthSessionService.ts
@injectable()
export class AuthSessionService implements IAuthSessionService {
  async getSession(): Promise<AuthSession | null> {
    try {
      const session = await getAuth();
      // ...
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Dynamic server usage')) {
        // Next.js静的生成時はheaders()が使えないため発生
        // 想定内の動作: 未認証として扱う
        return null;
      }
      throw error; // 予期しないエラーは再スロー
    }
  }
}
```

**設計判断**: 静的生成時は認証不要なページとして扱う。動的ページで認証が必要な場合は `export const dynamic = 'force-dynamic'` を設定。

---

## 5. ブルートフォース対策

### LoginAttemptテーブル

```prisma
model LoginAttempt {
  id            String   @id @default(cuid())
  email         String              // ユーザー存在有無に関わらず記録
  ipAddress     String?             // プライバシー配慮で任意
  success       Boolean
  failureReason String?             // INVALID_CREDENTIALS, ACCOUNT_LOCKED等
  createdAt     DateTime @default(now())

  @@index([email, createdAt])       // メール別の試行履歴検索
  @@index([ipAddress, createdAt])   // IP別の試行履歴検索
  @@index([createdAt])              // 全体の時系列検索
}
```

### ロック判定パターン

SignInUseCaseで直近N分以内の失敗回数をカウントし、閾値超過でアカウントロック。

---

## 6. セキュリティベストプラクティス

### CSRF対策

- **Server Actions**: Next.js組み込みのCSRF保護が自動適用
- **カスタムAPIエンドポイント**: 別途CSRF対策が必要（`@edge-csrf/nextjs`等）
- `/api/auth/*` への直接POST: Auth.jsが自動でCSRFトークンを管理

### AUTH_SECRET管理

```bash
# シークレット生成
npx auth secret

# ローテーション（無停止）
# auth.tsで配列指定: 先頭が新シークレット
```

### Layout認証チェックの危険性

```typescript
// ❌ Layoutでのみ認証チェック（キャッシュされる危険）
export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');
  return <>{children}</>;
}

// ✅ 各ページまたはデータ取得レベルでチェック
export default async function DashboardPage() {
  const result = await useCase.requireAuthentication();
  if (result.isErr()) redirect('/auth/sign-in');
  // ...
}
```

### proxy.tsは唯一の防衛線ではない

proxy.tsをバイパスする方法は存在する（直接API呼び出し等）。
**Server Component / Action側の認証チェックが本質的な防御。**

---

## 実装チェックリスト

- [ ] proxy.tsで `PROTECTED_ROUTES` を正しく定義している
- [ ] Server Component / Action でも認証チェックを実施している
- [ ] UseCaseで `requireAuthentication()` を呼び出している
- [ ] セッション情報は `IAuthSessionService` 経由で取得している（DDD準拠）
- [ ] 静的生成時の `Dynamic server usage` エラーを適切にハンドリングしている
- [ ] `LoginAttempt` テーブルでブルートフォース対策を実施している
- [ ] Layoutのみの認証チェックに依存していない
- [ ] カスタムAPIエンドポイントにCSRF対策を適用している
