# Auth.js v5 型拡張パターン

## Module Augmentation（モジュール拡張）

Auth.js v5のSession/User/JWT型を拡張するには、TypeScriptの
Module Augmentationを使う。

### ファイル配置

`src/types/next-auth.d.ts` に配置（tsconfig.jsonのinclude範囲内）

### PJの実装

```typescript
import type { User as PrismaUser } from '@/layers/infrastructure/persistence/prisma/generated';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  // PrismaUserベースのカスタム型
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

## 設計パターンの解説

### PrismaUser との連携

```typescript
// PrismaUserから機密情報を除外
Omit<PrismaUser, 'id' | 'passwordHash'>
// → name, email, createdAt, updatedAt が残る

// id は string 型で再定義（PrismaのString @id と同じだが明示）
// passwordHash は除外（セキュリティ）
```

### Partial の使用

```typescript
type NextAuthUser = Partial<...>;
// → 全フィールドがオプショナル
// 理由: JWTから復元時に全フィールドが揃っていない場合がある
```

### DefaultSession との合成

```typescript
interface Session {
  user: NextAuthUser & DefaultSession['user'];
}
// DefaultSession['user'] = { name?: string | null; email?: string | null; image?: string | null }
// → NextAuthUser と合成して完全な型を構成
```

## JWT型の対応関係

JWT型に追加するフィールドは、jwt callbackで設定する値と対応する:

```typescript
// next-auth.d.ts での宣言
interface JWT {
  id?: string;          // ← jwt callbackでtoken.id = user.idと設定
  sessionId?: string;
  accessToken?: string;
}

// nextAuth.ts の jwt callback
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;       // JWT型のidフィールド
    token.email = user.email;  // JWT標準フィールド
  }
  return token;
}
```

## よくある間違い

### 型拡張が反映されない

```typescript
// ❌ ファイルがtsconfig.jsonのinclude範囲外
// tsconfig.json の include に "src/types/**/*.d.ts" が含まれていることを確認

// ❌ importが無い（グローバル宣言になってしまう）
// 必ず何かをimportしてモジュールスコープにする
import type { DefaultSession } from 'next-auth';  // これが必要
```

### session.user.id が undefined

```typescript
// ❌ jwt callback で token.id を設定し忘れ
// ❌ session callback で session.user.id = token.id を設定し忘れ
// ❌ next-auth.d.ts で Session.user.id を宣言し忘れ

// 3箇所すべてを連携させる必要がある:
// 1. next-auth.d.ts: 型宣言
// 2. jwt callback: token.id = user.id
// 3. session callback: session.user.id = token.id
```

### DBセッション戦略での型の違い

```typescript
// JWT戦略: session({ session, token }) → tokenからデータ取得
// DB戦略:  session({ session, user })  → userオブジェクトからデータ取得
// PJはJWT戦略のため、tokenを使用
```
