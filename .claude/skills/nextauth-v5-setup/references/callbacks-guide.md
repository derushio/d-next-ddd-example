# Auth.js v5 コールバック詳細ガイド

## コールバック実行順序

1. `signIn` → サインイン試行時（最初に呼ばれる）
2. `jwt` → JWTトークン作成/更新時
3. `session` → セッション取得時（auth()呼び出し毎）
4. `redirect` → リダイレクト時

## jwt コールバック

### 引数

```typescript
async jwt({ token, user, account, profile, trigger, isNewUser, session }) {
  // token: 既存のJWTトークン（初回は空オブジェクト）
  // user: 初回サインイン時のみ存在（authorize()の戻り値）
  // account: プロバイダー情報（初回サインイン時のみ）
  // trigger: "signIn" | "signUp" | "update"
  return token;
}
```

### PJの実装

```typescript
async jwt({ token, user }) {
  // 初回サインイン時のみ user が存在
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;
  }
  return token;
}
```

### よくある間違い

```typescript
// ❌ userを毎回チェックせずにtoken設定（userは初回のみ）
async jwt({ token, user }) {
  token.id = user.id;  // 2回目以降はuser=undefinedでエラー
  return token;
}

// ✅ userの存在チェック
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
  }
  return token;
}
```

## session コールバック

### 引数（JWT戦略の場合）

```typescript
async session({ session, token }) {
  // session: Sessionオブジェクト（user含む）
  // token: JWTトークン（jwt callbackの戻り値）
  // ※ DBセッション戦略の場合は token の代わりに user が渡される
  return session;
}
```

### PJの実装

```typescript
async session({ session, token }) {
  if (token && session.user) {
    session.user.id = token.id as string;
    session.user.email = token.email as string;
    session.user.name = token.name as string;
  }
  return session;
}
```

### よくある間違い

```typescript
// ❌ jwt callbackでtoken.idを設定し忘れて、session callbackでundefinedになる
async jwt({ token, user }) {
  // token.id を設定し忘れ
  return token;
}
async session({ session, token }) {
  session.user.id = token.id;  // undefined!
  return session;
}

// ❌ session callbackでの型アサーション忘れ
session.user.id = token.id;  // TypeScriptエラー（idはJWT型に未定義の場合）
// → next-auth.d.ts で型拡張が必要
```

## signIn コールバック

### 引数

```typescript
async signIn({ user, account, profile, email, credentials }) {
  // return true: サインイン許可
  // return false: サインイン拒否
  // return string: リダイレクトURL
}
```

### PJの実装

```typescript
async signIn({ user, account }) {
  const logger = getAuthLogger();
  logger.info('NextAuth サインイン成功', prepareAuthLogData({
    userId: user.id,
    email: user.email,
    provider: account?.provider,
  }));
  return true;  // 常に許可（拒否はSignInUseCase側で行う）
}
```

### ポイント

- PJでは認証ロジックをSignInUseCaseに委譲しているため、
  signInコールバックでは**ログ記録のみ**を行い、常にtrueを返す
- 認証拒否はCredentials Providerのauthorize()でnullを返すことで実現

## events（コールバックとは別）

```typescript
events: {
  async signIn({ user, account, isNewUser }) {
    // コールバックとは別に、サインイン成功後に非同期で呼ばれる
    // 戻り値は無視される（void）
    logger.debug('NextAuth サインインイベント', { userId: user.id });
  },
  async signOut(message) {
    // v5ではmessageオブジェクト
    logger.debug('NextAuth サインアウトイベント');
  },
},
```

### signInコールバック vs signInイベント

| 項目 | signIn callback | signIn event |
|---|---|---|
| 実行タイミング | サインイン処理中 | サインイン成功後 |
| 戻り値 | boolean/string（制御可能） | void（制御不可） |
| 用途 | 認証許可/拒否の判定 | 監査ログ、分析 |
