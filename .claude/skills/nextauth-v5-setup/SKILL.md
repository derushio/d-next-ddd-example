---
name: nextauth-v5-setup
description: |
  Auth.js v5（next-auth v5.0.0-beta）の設定構造・初期セットアップを提供するスキル。
  NextAuth設定ファイル（nextAuth.ts）の構成、Credentials Provider、JWT戦略、
  セッションコールバック、型拡張（next-auth.d.ts）、trustHost設定を扱う。
  「Auth.jsの認証パターン」ではなく「Auth.js v5をどう設定するか」という文脈で適用される。
  注意: Auth.js v5はbeta版。2025年9月以降はBetter Authに合流しmaintenance modeへ移行済み。

  トリガー例:
  - 「Auth.js v5」「next-auth v5」「NextAuth設定」「nextauth設定」
  - 「Credentials Provider」「authorize関数」
  - 「JWTコールバック」「sessionコールバック」「jwt callback」「session callback」
  - 「next-auth.d.ts」「Session型」「JWT型」「型拡張」「NextAuthUser」
  - 「trustHost」「AUTH_SECRET」「NEXTAUTH_SECRET」「AUTH_URL」
  - 「handlers」「signIn」「signOut」「authSignIn」
  - 「Better Auth」「Auth.js移行」「maintenance mode」
  - src/layers/infrastructure/persistence/nextAuth.ts 編集時
  - src/types/next-auth.d.ts 編集時
  - src/app/api/auth/ 配下編集時
globs:
  - "src/layers/infrastructure/persistence/nextAuth.ts"
  - "src/types/next-auth.d.ts"
---

# Auth.js v5 Setup Skill

Auth.js v5（next-auth）の設定構造・セットアップパターンを提供する。

---

## 重要な前提情報

### Auth.js v5 の現状

- **パッケージ名**: `next-auth`（importはこちら: `import NextAuth from 'next-auth'`）
- **プロジェクト名**: Auth.js（ドキュメント: authjs.dev）
- **ステータス**: v5は beta.30。**2025年9月にBetter Authチームに合流し maintenance mode**
- セキュリティパッチは継続サポート
- 新規プロジェクトではBetter Authが推奨
- **JWT + Credentials構成ではAuth.js v5継続使用に合理性あり**（Better AuthはJWTステートレスセッション未対応のため）

### このPJの設計判断

| 項目 | 選択 | 理由 |
|---|---|---|
| セッション戦略 | JWT | DBラウンドトリップ不要、スケーラブル |
| プロバイダー | Credentials のみ | 独自認証フロー |
| PrismaAdapter | 不使用 | JWT + CredentialsではDB保存不要 |
| トークン管理 | 独自UserSessionテーブル | NextAuth標準テーブルに依存しない |

---

## Auth.js v5 バージョン方針（2026年4月時点）

### 現状

- Auth.js v5 は `5.0.0-beta.30` が最新。stable 5.x リリースは存在しない
- Auth.js v4 の stable最新は `4.24.13`
- **このPJでは JWT + Credentials 構成のため Auth.js v5 beta 継続が合理的**

### stable 5.x がリリースされていない理由

Auth.js チームは Better Auth との統合・方針転換を進めており、v5 のfinal stable リリースの見通しは不透明。
beta 版は十分に安定しており、プロダクション利用も公式に推奨されている。

### 移行判断基準

| 条件 | 判断 |
|---|---|
| Auth.js v5 stable がリリースされた | 即座にアップグレード |
| Better Auth が JWT ステートレスセッションに対応 | 移行を検討 |
| Auth.js v5 にセキュリティ脆弱性 + パッチ未提供 | Better Auth 移行を検討 |
| OAuth プロバイダー追加が必要 | Better Auth 移行が有利 |
| 現状の JWT + Credentials で十分 | Auth.js v5 beta 継続 |

---

## 1. PJ固有のAuth.js v5ファイル構成

| ファイル | 役割 |
|---|---|
| `src/layers/infrastructure/persistence/nextAuth.ts` | メイン設定・エクスポート |
| `src/types/next-auth.d.ts` | 型拡張（module augmentation） |
| `src/app/api/auth/[...nextauth]/route.ts` | APIルートハンドラー（最薄パススルー） |
| `src/layers/infrastructure/services/AuthSessionService.ts` | IAuthSessionService実装 |
| `src/layers/application/usecases/auth/GetCurrentUserUseCase.ts` | 認証チェックUseCase |
| `src/layers/infrastructure/types/zod/authSchema.ts` | 共通バリデーションスキーマ |

### nextAuth.ts のエクスポート

```typescript
export const { handlers, auth, signIn: authSignIn, signOut: authSignOut } = NextAuth({...});
export async function getAuth() { return auth(); }  // ヘルパー
export type AuthType = Awaited<ReturnType<typeof getAuth>>;
```

| エクスポート | 用途 |
|---|---|
| `handlers` | APIルート（GET, POST） |
| `auth` | セッション取得 |
| `authSignIn` | プログラマティックサインイン |
| `authSignOut` | プログラマティックサインアウト |
| `getAuth()` | auth()のヘルパーラッパー |

### route.ts（最薄パススルー）

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/layers/infrastructure/persistence/nextAuth';
export const { GET, POST } = handlers;
```

---

## 2. NextAuth設定パターン

### session設定

```typescript
import { env } from '@/lib/env';

session: {
  strategy: 'jwt',                    // JWT戦略（Credentials使用時は必須）
  maxAge: env.SESSION_MAX_AGE_SECONDS, // 環境変数で設定可能
},
```

**重要**: Credentials Providerを使う場合、`strategy: 'jwt'` は**必須**。Database sessionとCredentialsは組み合わせ不可。

### Credentials Provider

```typescript
Credentials({
  id: 'credentials',
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    // 1. Zodバリデーション（signInSchemaを共有）
    const validatedFields = signInSchema.safeParse(credentials);
    if (!validatedFields.success) return null;

    // 2. DI経由でSignInUseCaseに委譲（Clean Architecture準拠）
    const signInUseCase = resolve('SignInUseCase');
    const result = await signInUseCase.execute({ email, password });

    // 3. 認証失敗時はnull返却（例外はスローしない）
    if (result.isErr()) return null;

    // 4. NextAuth用ユーザー情報を返却
    return { id: result.value.user.id, email: result.value.user.email, name: result.value.user.name };
  },
}),
```

### callbacks設定

**詳細**: `references/callbacks-guide.md` を参照

```typescript
// prepareAuthLogData は nextAuth.ts 内のローカル関数（@/utils/logMasking からimportする関数ではない）
// 詳細は「6. PIIマスキング」セクション参照
callbacks: {
  // 初回サインイン時にユーザー情報をJWTトークンに追加
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
    }
    return token;
  },

  // JWTからセッション情報を構築
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = token.name as string;
    }
    return session;
  },

  // サインイン成功時のログ記録（PIIマスキング適用）
  async signIn({ user, account }) {
    logger.info('NextAuth サインイン成功', prepareAuthLogData({
      userId: user.id,
      email: user.email,
      provider: account?.provider,
    }));
    return true;
  },
},
```

### trustHost設定

```typescript
// プロキシ環境（portless/Traefik）では必須
trustHost: true,
```

または環境変数: `AUTH_TRUST_HOST=true`

### debug設定

```typescript
debug: process.env.NODE_ENV === 'development',
```

---

## 3. 型拡張パターン（next-auth.d.ts）

**詳細**: `references/type-extensions.md` を参照

```typescript
// src/types/next-auth.d.ts
import type { User as PrismaUser } from '@/layers/infrastructure/persistence/prisma/generated';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  // PrismaUserからid・passwordHashを除外し、Auth用フィールドを追加
  type NextAuthUser = Partial<
    Omit<PrismaUser, 'id' | 'passwordHash'> & {
      sub: string;
      id: string;
      sessionId?: string;
      accessToken?: string;
      accessTokenExpireAt?: Date;
      resetToken?: string;
      resetTokenExpireAt?: Date;
    }
  >;

  interface Session {
    user: NextAuthUser & DefaultSession['user'];
  }
  interface User extends NextAuthUser {
    sub?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    sessionId?: string;
    accessToken?: string;
    accessTokenExpireAt?: Date;
    resetToken?: string;
    resetTokenExpireAt?: Date;
  }
}
```

**ポイント:**
- `PrismaUser` から `passwordHash` を除外（セキュリティ）
- `Partial` で全フィールドをオプショナルに
- JWT型にも同じフィールドを追加（jwt callbackで設定する値と対応）

---

## 4. DIコンテナとの統合

### レイヤー構成

```
Application層: IAuthSessionService（インターフェース）
       ↑
Infrastructure層: AuthSessionService（実装）→ getAuth() → auth()
```

### IAuthSessionService

```typescript
// Application層（インターフェース定義のみ）
export interface AuthSession {
  user: { id: string; email: string; name: string };
}

export interface IAuthSessionService {
  getSession(): Promise<AuthSession | null>;
}
```

### AuthSessionService

```typescript
// Infrastructure層（NextAuth依存の実装）
@injectable()
export class AuthSessionService implements IAuthSessionService {
  async getSession(): Promise<AuthSession | null> {
    const session = await getAuth();
    if (!session?.user?.id || !session?.user?.email || !session?.user?.name) {
      return null;
    }
    return { user: { id, email, name } };
  }
}
```

---

## 5. 環境変数

| 変数 | 用途 | 必須 | デフォルト |
|---|---|---|---|
| `AUTH_SECRET` | JWT署名・検証シークレット | ✅ | なし |
| `SESSION_MAX_AGE_SECONDS` | セッション有効期間（秒） | ✅ | なし |
| `LOG_MASK_PII` | PIIマスキング有効化 | ❌ | false |

### v4からの変更

| v4 | v5 | 備考 |
|---|---|---|
| `NEXTAUTH_SECRET` | `AUTH_SECRET` | 両方動作するが `AUTH_` 推奨 |
| `NEXTAUTH_URL` | `AUTH_URL` | 多くの場合不要（自動検出） |

### AUTH_SECRET の生成

```bash
npx auth secret  # ランダムシークレットを生成
```

### シークレットローテーション（無停止）

```typescript
// 配列で渡すと先頭が新シークレット
secret: ["new-secret", "old-secret"]
```

---

## 6. PIIマスキング

`@/utils/logMasking` が提供するexport:
- `maskEmail(email?)` - メールアドレスをマスキング
- `maskSensitiveData(data, sensitiveKeys?)` - オブジェクトの機密フィールドを再帰的にマスキング
- `prepareLogData(data, shouldMask)` - `shouldMask` フラグに応じて `maskSensitiveData` を適用

`nextAuth.ts` では、`prepareLogData` をラップした**ローカル関数** `prepareAuthLogData` を定義して使用する:

```typescript
import { maskEmail, prepareLogData } from '@/utils/logMasking';

// ローカルヘルパー（nextAuth.ts内に定義）
function prepareAuthLogData<T extends Record<string, unknown>>(data: T): T {
  return prepareLogData(data, env.LOG_MASK_PII);
}

// メールアドレスマスキング
maskEmail('user@example.com')  // → "use***@example.com"

// ログデータ全体のマスキング（LOG_MASK_PII=true の場合に適用）
prepareAuthLogData({ email: user.email, userId: user.id })
// → LOG_MASK_PII=true: { email: "use***@example.com", userId: "xxx" }
// → LOG_MASK_PII=false: { email: "user@example.com", userId: "123" }
```

---

## 7. v4 → v5 移行ポイント（参考）

| v4 | v5 |
|---|---|
| `getServerSession(authOptions)` | `auth()` |
| `getToken()` from `next-auth/jwt` | `auth()` （ただしproxy.tsでは `getToken()` 直接使用） |
| `@next-auth/prisma-adapter` | `@auth/prisma-adapter` |
| `pages/api/auth/[...nextauth].ts` | `app/api/auth/[...nextauth]/route.ts` |
| `NEXTAUTH_SECRET` | `AUTH_SECRET` |
| `withAuth` middleware | `auth` as proxy |

---

## 実装チェックリスト

- [ ] `AUTH_SECRET` が設定されている
- [ ] `trustHost: true` が設定されている（プロキシ環境）
- [ ] `session: { strategy: 'jwt' }` が明示設定されている
- [ ] jwt callbackでユーザーIDをトークンに追加している
- [ ] session callbackでセッションにユーザーID追加している
- [ ] `next-auth.d.ts` で Session・User・JWT を正しく拡張している
- [ ] PIIマスキングをログ出力に適用している
- [ ] Credentials ProviderでSignInUseCaseに委譲している（DDD準拠）
- [ ] route.tsが最薄パススルー構成になっている
