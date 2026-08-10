---
name: password-hashing
description: |
  パスワードハッシュの安全な実装パターンを提供するスキル。
  Argon2id（OWASP 2026推奨）をIHashService経由で使用。
  bcrypt/bcryptjsは使用禁止。

  トリガー例:
  - hash, argon2, bcrypt, password, パスワード, ハッシュ
  - IHashService, HashService
  - src/layers/infrastructure/services/HashService.ts 編集時
---

# password-hashing スキル

パスワードハッシュ処理の実装ルールとベストプラクティスを定義します。

---

## ルール

### Argon2id を使用（OWASP 2026 準拠）

パスワードハッシュには `@node-rs/argon2` (Argon2id) を使用する。

**設定値（OWASP 最小要件）:**

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `memoryCost` | `19456` | KiB = 19 MiB |
| `timeCost` | `2` | イテレーション数 |
| `parallelism` | `1` | 並列度 |
| `algorithm` | `2` | Argon2id モード（isolatedModules制約でconst enum不可） |

**禁止:**

- `bcrypt` / `bcryptjs` の使用（SHA-1ベース、GPU耐性が低い）
- 自前のハッシュ実装
- `MD5`, `SHA-1`, `SHA-256` 単体でのパスワードハッシュ
- `Math.random()` でのソルト生成

### IHashService インターフェース経由で使用する

`HashService` を直接 import するのではなく、DI で `IHashService` を注入する。

```typescript
// NG: 直接 import
import { HashService } from '@/layers/infrastructure/services/HashService';

// OK: IHashService を DI 注入
import type { IHashService } from '@/layers/application/interfaces/IHashService';
```

---

## インターフェース

```typescript
// src/layers/domain/interfaces/IHashService.ts
export interface IHashService {
  /** テキストをArgon2idでハッシュ化する */
  generateHash(text: string): Promise<string>;
  /** ハッシュとプレーンテキストを比較する */
  compareHash(text: string, hash: string): Promise<boolean>;
  /**
   * タイミング攻撃対策用ダミーハッシュを取得
   *
   * ユーザーが存在しない場合でも compareHash を実行し、
   * レスポンス時間を均一化するために使用します。
   */
  getTimingSafeDummyHash(): string;
}
```

---

## 実装パターン

### HashService 実装（Infrastructure 層）

**CRITICAL**: `@node-rs/argon2` は必ず **dynamic import** で遅延ロードする。
top-level `import { hash } from '@node-rs/argon2'` は、 サーバーレス環境で
認証以外の route まで 500 に落とす致命的な副作用がある。
詳細は `password-hashing-import-strategy` スキルを参照。

```typescript
// src/layers/infrastructure/services/HashService.ts
import type { Options } from '@node-rs/argon2';

// 遅延ロード: hash / verify を呼ぶ瞬間まで .node native binding を触らない
type Argon2Module = typeof import('@node-rs/argon2');
let argon2ModulePromise: Promise<Argon2Module> | null = null;
function loadArgon2(): Promise<Argon2Module> {
  if (argon2ModulePromise === null) {
    argon2ModulePromise = import('@node-rs/argon2');
  }
  return argon2ModulePromise;
}

/**
 * Argon2 Algorithm 数値定数
 * isolatedModules 制約のため Algorithm const enum を直接使用できないので数値で指定。
 * 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
 */
const ARGON2_ALGORITHM_ID = 2; // Algorithm.Argon2id

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: ARGON2_ALGORITHM_ID,
} as const satisfies Options;

@injectable()
export class HashService implements IHashService {
  async generateHash(text: string): Promise<string> {
    const { hash } = await loadArgon2();
    return await hash(text, ARGON2_OPTIONS);
  }

  async compareHash(text: string, hashedText: string): Promise<boolean> {
    try {
      const { verify } = await loadArgon2();
      return await verify(hashedText, text, ARGON2_OPTIONS);
    } catch {
      // 不正なハッシュフォーマットの場合はfalseを返す（argon2 verifyが例外をスローした場合）
      return false;
    }
  }

  getTimingSafeDummyHash(): string {
    return TIMING_SAFE_DUMMY_HASH; // 事前生成済みの固定ダミーハッシュ
  }
}
```

**next.config.ts の 2 点セット設定も必須**（`password-hashing-import-strategy` スキル参照）:

- `serverExternalPackages: ['@node-rs/argon2']`
- `outputFileTracingIncludes` で platform 別 `.node` を明示同梱

### UseCase での利用パターン

```typescript
// src/layers/application/usecases/auth/SignInUseCase.ts
import { ok, err, type Result } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';

@injectable()
export class SignInUseCase {
  constructor(
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
  ) {}

  async execute(req: SignInRequest): Promise<Result<SignInResponse, AppError>> {
    const user = await this.userRepository.findByEmail(new Email(req.email));

    // タイミング攻撃対策: ユーザーが存在しない場合もダミーハッシュで照合
    const hashToCompare = user?.passwordHash ?? this.hashService.getTimingSafeDummyHash();
    const isValid = await this.hashService.compareHash(req.password, hashToCompare);

    if (!user || !isValid) {
      return err({ message: '認証に失敗しました', code: 'INVALID_CREDENTIALS' });
    }

    return ok({ userId: user.id.value });
  }
}
```

---

## タイミング攻撃対策

ユーザーの存在有無をレスポンス時間から推測される「ユーザー列挙攻撃」を防ぐために、
ユーザーが存在しない場合でも必ずハッシュ照合を実行する。

```typescript
// タイミング攻撃対策のパターン
const user = await userRepository.findByEmail(email);

// ユーザーが存在しない場合はダミーハッシュを使う（時間を均一化）
const hashToCompare = user?.passwordHash ?? hashService.getTimingSafeDummyHash();
const isPasswordValid = await hashService.compareHash(password, hashToCompare);

// 照合後に存在チェック（時間差が出ないよう必ず照合を先に実行）
if (!user || !isPasswordValid) {
  return err({ message: '認証に失敗しました', code: 'INVALID_CREDENTIALS' });
}
```

---

## テストパターン

### HashService のモック

テストコードでは `IHashService` をモックするため、`HashService` の実装変更（bcrypt→argon2）の影響を受けない。

```typescript
// tests/... でのモック例（vitest-mock-extended）
import { mock } from 'vitest-mock-extended';
import type { IHashService } from '@/layers/application/interfaces/IHashService';

const mockHashService = mock<IHashService>();
mockHashService.generateHash.mockResolvedValue('$argon2id$...');
mockHashService.compareHash.mockResolvedValue(true);
```

---

## パスワードリセットのメール送信について

現在のプロジェクトではメール送信を省略しています。
将来 Resend + React Email 等で実装する場合の例:

```typescript
// === メール送信の実装例（将来 Resend + React Email 等で実装） ===
// import { sendEmail } from '@/lib/email';
// if (user) {
//   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
//   await sendEmail({
//     to: user.email.value,
//     subject: 'パスワードリセット',
//     template: 'password-reset',
//     data: {
//       resetToken,
//       resetUrl: `${baseUrl}/auth/reset-password?token=${resetToken}`,
//     },
//   });
// }
// ================================================================
```

---

## 関連スキル

- **`password-hashing-import-strategy`**: `@node-rs/argon2` の import 戦略と
  next.config.ts の必須設定（`serverExternalPackages` + `outputFileTracingIncludes`）。
  サーバーレス環境で「認証以外の route まで 500 に落ちる」問題の対策。
- **`security-review`**: セキュリティレビュー全体

## 関連ファイル

- **インターフェース**: `src/layers/domain/interfaces/IHashService.ts`
- **実装**: `src/layers/infrastructure/services/HashService.ts`
- **利用例**: `src/layers/application/usecases/auth/SignInUseCase.ts`
- **Next.js 設定**: `next.config.ts`（`serverExternalPackages` + `outputFileTracingIncludes`）
