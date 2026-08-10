---
name: token-generation
description: |
  安全なトークン生成のルールと実装パターンを提供するスキル。
  Date.now() プレフィックス禁止、randomHex32()/crypto.randomUUID() の使い方、
  レスポンスボディへのトークン含有禁止、有効期限定数化ルールを扱う。

  トリガー例:
  - 「トークン生成」「セッションID」「リセットトークン」「認証トークン」
  - `Date.now()` や `Math.random()` を使ったID/トークン生成を発見したとき
  - パスワードリセット、メール認証、APIトークン実装時
  - src/layers/application/usecases/auth/ 配下のファイルを編集するとき
globs:
  - "src/layers/application/usecases/auth/**/*.ts"
---

# Token Generation Skill

安全なトークン生成パターンと禁止パターンを提供します。

---

## 使用可能なユーティリティ

### randomHex32() — 暗号学的に安全な 64 文字 Hex トークン

`src/utils/randomHex.ts` に定義。Edge Runtime 対応（Web Crypto API 使用）。

```typescript
import { randomHex32 } from '@/utils/randomHex';

// 出力例: "a3f8b92d..." (64文字の16進数文字列 = 32バイトのエントロピー)
const resetToken = randomHex32();
const sessionToken = randomHex32();
```

### crypto.randomUUID() — 標準 UUID v4

UUID 形式が必要な場合（DB の UUID主キー生成等）は `crypto.randomUUID()` を使用。

```typescript
// Edge Runtime / Node.js 両対応
const id = crypto.randomUUID(); // "110e8400-e29b-41d4-a716-446655440000"
```

---

## 禁止パターン

### Date.now() プレフィックス禁止

`Date.now()` や タイムスタンプをトークンのプレフィックスに含めることは**禁止**。
予測可能性が増し、総当たり攻撃のリスクが高まる。

```typescript
// ❌ 禁止: Date.now() + ランダムの組み合わせ
const token = `${Date.now()}_${Math.random().toString(36)}`;

// ❌ 禁止: タイムスタンププレフィックス
const sessionId = `session_${Date.now()}_${randomHex32()}`;

// ❌ 禁止: Math.random() 単独使用（暗号論的に安全ではない）
const token = Math.random().toString(36).slice(2);

// ✅ 正しい: 純粋な暗号乱数のみ
const resetToken = randomHex32();

// ✅ 正しい: 用途プレフィックスは固定文字列のみ（タイムスタンプ不要）
const accessToken = `access_${randomHex32()}`;
const refreshToken = `refresh_${randomHex32()}`;
```

**注意**: 固定の用途識別プレフィックス（`access_`, `reset_` 等）は許容されるが、
動的なタイムスタンプ値を含めてはならない。

### crypto モジュール / randomBytes 禁止（Node.js専用）

```typescript
// ❌ 禁止: Node.js 専用 API（Edge Runtime で動作しない）
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('hex');

// ✅ 正しい: Web Crypto API（Edge Runtime 対応）
import { randomHex32 } from '@/utils/randomHex';
const token = randomHex32();
```

---

## トークンをレスポンスボディに含めない

セキュリティ上の理由から、認証トークン・セッション ID 等の機密トークンは
**レスポンスボディで返してはならない**。

```typescript
// ❌ 禁止: トークンをレスポンスボディで返す
return {
  success: true,
  resetToken: token,  // ← クライアントに生トークンを渡してはならない
};

// ✅ 正しい: トークンは DB に保存し、URLパラメータ経由でのみ使用
// または、トークンを直接メールで送信（サーバー側でのみ処理）
await tokenRepository.save({
  token: hashedToken, // ハッシュ化して保存
  userId: user.id.value,
  expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
});
// メール送信（生トークンをメールURLに埋め込む）
await emailService.sendPasswordReset(user.email, rawToken);

// クライアントへのレスポンスはトークンを含まない
return {
  success: true,
  message: 'パスワードリセットメールを送信しました',
};
```

---

## 有効期限は定数で管理

マジックナンバーを避け、有効期限はすべて名前付き定数として定義する。

```typescript
// ❌ 禁止: マジックナンバー直書き
const expiresAt = new Date(Date.now() + 3600000);
const expiresIn = 86400;

// ✅ 正しい: 定数定義（use-case または constants ファイルに配置）
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1時間（ミリ秒）
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30日
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間
const ACCESS_TOKEN_EXPIRES_IN_SEC = 3600; // 1時間（秒）

const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
const expiresIn = ACCESS_TOKEN_EXPIRES_IN_SEC;
```

---

## UseCase での正しいトークン生成例

```typescript
import { randomHex32 } from '@/utils/randomHex';
import { AppUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

// 有効期限定数
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間

@injectable()
export class RequestPasswordResetUseCase {
  // ...

  private async _execute(request: RequestPasswordResetRequest): Promise<RequestPasswordResetResponse> {
    const emailVO = Email.create(request.email);
    if (emailVO.isErr()) {
      throw new AppUseCaseError(emailVO.error.message, emailVO.error.code);
    }

    const user = await this.userRepository.findByEmail(emailVO.value);

    if (user) {
      // ✅ 正しい: randomHex32() のみ（Date.now() プレフィックスなし）
      const rawToken = randomHex32();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      // トークンはハッシュ化して保存（生トークンはメールのみに使用）
      await this.tokenRepository.save({
        userId: user.id.value,
        token: rawToken, // 実装では bcrypt/argon2 等でハッシュ化推奨
        expiresAt,
      });

      await this.emailService.sendPasswordReset(user.email.value, rawToken);
    }

    // ✅ セキュリティ: ユーザー存在有無を漏洩しない
    return {
      success: true,
      message: 'パスワードリセットメールを送信しました',
    };
  }
}
```

---

## チェックリスト

### トークン生成

- [ ] `randomHex32()` または `crypto.randomUUID()` のみ使用している
- [ ] `Date.now()` をトークン値に含めていない
- [ ] `Math.random()` をセキュリティ用途に使用していない
- [ ] `randomBytes` (Node.js crypto) を使用していない（Edge Runtime非互換）

### トークンの取り扱い

- [ ] 生トークンをレスポンスボディで返していない
- [ ] トークンはDB保存前にハッシュ化している（または適切な比較方法を使用）
- [ ] 有効期限はマジックナンバーではなく定数で管理している
- [ ] 定数名は意味が明確（`TOKEN_EXPIRY_MS`, `RESET_TOKEN_EXPIRY_MS` 等）

### セキュリティ

- [ ] ユーザー存在有無をレスポンスで漏洩していない（パスワードリセット等）
- [ ] トークンの長さは十分（`randomHex32()` = 256bit エントロピー）

---

## 関連スキル

- **security-review**: トークン生成のセキュリティレビュー観点
- **password-hashing**: Argon2id によるパスワード/トークンハッシュ化
- **resultasync-patterns**: UseCase での ResultAsync パターン
