# 認証フロー全体図

## レイヤー間の呼び出し関係

```
┌─────────────────────────────────────────────────────────┐
│  ブラウザ                                                  │
│  ├── SignInFormClient (next-auth/react の signIn())       │
│  └── SessionProvider (useSession())                       │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  proxy.ts (Node.js Runtime)                               │
│  ├── getToken({ req, secret: AUTH_SECRET })               │
│  ├── PROTECTED_ROUTES チェック                              │
│  └── カスタムヘッダー付与 (x-url, x-url-path, x-url-search) │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Presentation層 (Server Actions / Pages)                   │
│  ├── Server Action: resolve('GetCurrentUserUseCase')      │
│  └── Page: useCase.requireAuthentication()                │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Application層 (UseCases)                                  │
│  ├── GetCurrentUserUseCase.execute()                      │
│  │   └── IAuthSessionService.getSession()                │
│  └── GetCurrentUserUseCase.requireAuthentication()        │
│      └── execute() + 警告ログ                              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Infrastructure層 (Services)                               │
│  ├── AuthSessionService.getSession()                      │
│  │   └── getAuth() → auth()                              │
│  └── Dynamic server usage エラー吸収                       │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Infrastructure層 (NextAuth設定)                            │
│  ├── nextAuth.ts: NextAuth({...})                         │
│  ├── Credentials Provider → SignInUseCase                 │
│  └── JWT/Session callbacks                                │
└─────────────────────────────────────────────────────────┘
```

## サインインフロー

```
1. ブラウザ: SignInFormClient でフォーム送信
   ↓
2. next-auth/react の signIn('credentials', { email, password })
   ↓
3. POST /api/auth/callback/credentials
   ↓
4. NextAuth の Credentials Provider の authorize()
   ↓
5. Zod バリデーション (signInSchema)
   ↓
6. DI経由で SignInUseCase.execute({ email, password })
   ↓
7. SignInUseCase:
   a. LoginAttempt でロック状態チェック
   b. UserRepository でユーザー取得
   c. HashService でパスワード検証
   d. LoginAttempt に結果を記録
   ↓
8. 成功: authorize() が { id, email, name } を返却
   ↓
9. jwt callback: token.id = user.id を設定
   ↓
10. HttpOnly Cookie に暗号化JWE として保存
```

## セッション取得フロー

```
1. Server Component / Action でセッションが必要
   ↓
2. resolve('GetCurrentUserUseCase') でDI取得
   ↓
3. useCase.requireAuthentication() 呼び出し
   ↓
4. IAuthSessionService.getSession() （Application層インターフェース）
   ↓
5. AuthSessionService.getSession() （Infrastructure層実装）
   ↓
6. getAuth() → auth() → Cookie からJWT取得・検証
   ↓
7. session callback で Session オブジェクト構築
   ↓
8. id, email, name の3フィールド必須チェック
   ↓
9. 成功: ok({ id, email, name })
   失敗: err({ message: '認証が必要です', code: 'UNAUTHENTICATED' })
```

## サインアウトフロー

```
1. Server Action: authSignOut() 呼び出し
   ↓
2. NextAuth の signOut 処理
   ↓
3. events.signOut() でログ記録
   ↓
4. HttpOnly Cookie 削除
   ↓
5. サインインページにリダイレクト
```

## 認証失敗時のフロー

### proxy.tsレベル（楽観的リダイレクト）

```
保護ルートへのアクセス → getToken() が null
→ /auth/sign-in?callbackUrl=<pathname> にリダイレクト
```

### UseCaseレベル（本質的な防御）

```
requireAuthentication() 呼び出し
→ IAuthSessionService.getSession() が null
→ err({ message: '認証が必要です', code: 'UNAUTHENTICATED' })
→ Server Action/Component側でリダイレクト or エラー表示
```

### 静的生成時

```
auth() 呼び出し → "Dynamic server usage" エラー
→ AuthSessionService が catch して null 返却
→ 未認証として扱う（想定内の動作）
```

## 依存方向（DDD準拠）

```
Presentation → Application → Domain
                    ↑
              Infrastructure

- Presentation層: Server Actions が GetCurrentUserUseCase を使用
- Application層: IAuthSessionService インターフェースのみ参照
- Infrastructure層: AuthSessionService が getAuth()/auth() を呼び出し
- auth() は Infrastructure層内部の実装詳細（Application層に漏れない）
```
