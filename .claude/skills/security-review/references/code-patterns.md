# セキュリティ観点コードパターン集

セキュリティレビュー時に参照する、安全/危険なコードパターンの一覧。

---

## 概要

このドキュメントは、セキュリティレビュー時に検出すべき危険なパターンと、推奨される安全なパターンを提供します。Clean Architecture + DDD プロジェクトにおけるセキュリティベストプラクティスに準拠しています。

---

## 危険なパターン（検出対象）

### 1. インジェクション系

#### SQL Injection

```typescript
// NG: 生SQLクエリに直接ユーザー入力を埋め込み
const users = await prisma.$queryRaw`SELECT * FROM users WHERE name = '${userInput}'`;

// NG: 動的クエリ構築
const query = `SELECT * FROM users WHERE id = ${userId}`;
const result = await prisma.$queryRawUnsafe(query);
```

#### Command Injection

```typescript
// NG: シェルコマンドに直接ユーザー入力を埋め込み
import { exec } from 'child_process';
exec(`convert ${userInput}.png output.jpg`);

// NG: eval使用
eval(`const result = ${userInput}`);
```

#### NoSQL Injection

```typescript
// NG: オブジェクトを直接クエリに渡す
const user = await User.findOne({ username: req.body.username });

// NG: JSON.parse後の検証なし
const filter = JSON.parse(userInput);
await collection.find(filter);
```

### 2. XSS (Cross-Site Scripting)

```typescript
// NG: 未サニタイズHTMLの挿入
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// NG: innerHTML使用
element.innerHTML = userInput;

// NG: document.write使用
document.write(userInput);
```

### 3. 認証・認可系

#### 認証チェック漏れ

```typescript
// NG: Server Actionでセッション確認なし
'use server';
export async function updateUser(data: UpdateUserInput) {
  // auth()未使用
  return await prisma.user.update({ where: { id: data.id }, data });
}

// NG: API Routeで認証なし
export async function GET(req: Request) {
  const users = await prisma.user.findMany();
  return Response.json(users);
}
```

#### 認可チェック漏れ

```typescript
// NG: 所有者確認なし
export async function deletePost(postId: string) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  // 投稿者確認なし
  await prisma.post.delete({ where: { id: postId } });
}
```

### 4. 機密情報漏洩

```typescript
// NG: パスワードを含むユーザー情報を返す
export async function getUser(id: string) {
  return await prisma.user.findUnique({ where: { id } });
  // password, refreshTokenなどを含む
}

// NG: エラーメッセージに機密情報
throw new Error(`Database connection failed: ${dbPassword}`);

// NG: クライアントコンポーネントで環境変数使用
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // 公開される
```

### 5. CSRF (Cross-Site Request Forgery)

```typescript
// NG: Server ActionでCSRFトークンなし（Next.js 14以前）
export async function updateSettings(formData: FormData) {
  // CSRFトークン検証なし
  await saveSettings(formData);
}

// NG: API RouteでOriginチェックなし
export async function POST(req: Request) {
  // req.headers.get('origin')のチェックなし
  await processData(await req.json());
}
```

### 6. パストラバーサル

```typescript
// NG: ファイルパスに直接ユーザー入力を使用
import fs from 'fs';
const content = fs.readFileSync(`./uploads/${userFilename}`, 'utf-8');

// NG: パス正規化なし
const filePath = path.join(uploadsDir, req.query.file);
```

### 7. 安全でない乱数生成

```typescript
// NG: Math.randomでトークン生成
const token = Math.random().toString(36).substring(7);

// NG: 脆弱なUUID生成
const sessionId = Date.now().toString();
```

### 8. レート制限なし

```typescript
// NG: ログインAPIにレート制限なし
export async function POST(req: Request) {
  const { email, password } = await req.json();
  return await login(email, password);
}

// NG: API呼び出しにスロットリングなし
export async function sendEmail(to: string) {
  await emailService.send(to);
}
```

---

## 安全なパターン（推奨）

### 1. データベースアクセス

#### Prismaパラメータ化クエリ

```typescript
// OK: Prismaの型安全なクエリ
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, name: true, email: true }, // パスワード除外
});

// OK: パラメータ化された生クエリ
const users = await prisma.$queryRaw`
  SELECT id, name, email FROM users WHERE name = ${userName}
`;
```

#### Repository パターンでカプセル化

```typescript
// OK: Infrastructure層でDB操作を抽象化
export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    return data ? this.toDomain(data) : null;
  }
}
```

### 2. XSS対策

#### サニタイゼーション

```typescript
// OK: DOMPurify使用
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

#### エスケープ

```typescript
// OK: React自動エスケープ
<div>{userInput}</div>

// OK: テキストコンテンツとして扱う
element.textContent = userInput;
```

### 3. 認証・認可

#### Server Actionでの認証

```typescript
// OK: Server Actionでの認証チェック（DDD/Clean Architecture 正規パターン）
// auth() 直接呼び出しは禁止。GetCurrentUserUseCase.requireAuthentication() 経由で行う。
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';

export async function updateUser(data: UpdateUserInput) {
  // 認証チェック（GetCurrentUserUseCase 経由 — Clean Architecture 準拠）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();

  if (authResult.isErr()) {
    return { error: authResult.error.message, code: authResult.error.code };
  }

  const user = authResult.value;

  // UseCase 経由でビジネスロジックを実行
  const updateUserUseCase = resolve('UpdateUserUseCase');
  const result = await updateUserUseCase.execute({ userId: user.id, ...data });

  if (result.isErr()) {
    return { error: result.error.message, code: result.error.code };
  }

  return { success: true };
}
```

> **注意**: `auth()` を Server Action 内で直接呼ぶことは禁止。
> NextAuth の実装詳細をアプリケーション層に漏らさないよう、
> 必ず `GetCurrentUserUseCase.requireAuthentication()` を使用すること。
> `auth()` を直接使用できるのは Infrastructure層（`AuthSessionService` 等）のみ。`proxy.ts` では軽量な `getToken()` を使用すること。

#### UseCase層での認可

```typescript
// OK: UseCaseで所有者確認
import { ok, err } from '@/layers/application/types/Result';

@injectable()
export class DeletePostUseCase {
  async execute(req: DeletePostRequest): Promise<Result<void, AppError>> {
    const post = await this.repository.findById(req.postId);
    if (!post) {
      return err({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    }

    if (post.authorId !== req.userId) {
      return err({ message: 'You are not the author', code: 'FORBIDDEN' });
    }

    await this.repository.delete(req.postId);
    return ok(undefined);
  }
}
```

### 4. 機密情報保護

#### DTOでフィールド制限

```typescript
// OK: DTOで公開フィールドを明示
export class UserDTO {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  // passwordは含まない

  static fromEntity(entity: User): UserDTO {
    return {
      id: entity.id.value,
      name: entity.name.value,
      email: entity.email.value,
    };
  }
}
```

#### 環境変数の安全な使用

```typescript
// OK: env オブジェクト経由で環境変数使用
// src/app/page.tsx
import { env } from '@/lib/env';

export default async function Home() {
  const apiKey = env.API_SECRET_KEY; // サーバーのみ（型安全）
  const data = await fetchData(apiKey);
  return <div>{data}</div>;
}

// OK: NEXT_PUBLIC_プレフィックスで公開を明示（envオブジェクト経由）
const publicKey = env.NEXT_PUBLIC_STRIPE_KEY;
```

### 5. 入力検証

#### Zodスキーマ

```typescript
// OK: Zodで厳密な検証
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.email().max(255),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

export async function updateUser(input: unknown) {
  const validated = updateUserSchema.parse(input); // 例外スロー
  // または
  const result = updateUserSchema.safeParse(input); // Result型
  if (!result.success) {
    return err({ message: result.error.message, code: 'VALIDATION_ERROR' });
  }
}
```

#### Value Object での検証

```typescript
// OK: Domain層で不変条件を保証
export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<Email, AppError> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return err({ message: 'Invalid email format', code: 'INVALID_EMAIL' });
    }
    return ok(new Email(value));
  }
}
```

### 6. ファイルアクセス

#### パストラバーサル対策

```typescript
// OK: パス正規化とディレクトリ制限
import path from 'path';

function getFilePath(userFilename: string): string {
  const normalized = path.normalize(userFilename).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(uploadsDir, normalized);

  if (!fullPath.startsWith(uploadsDir)) {
    throw new Error('Invalid file path');
  }

  return fullPath;
}
```

#### ファイルタイプ検証

```typescript
// OK: MIMEタイプとマジックバイト検証
import { fileTypeFromBuffer } from 'file-type';

async function validateUpload(file: File): Promise<Result<void, AppError>> {
  const buffer = await file.arrayBuffer();
  const type = await fileTypeFromBuffer(new Uint8Array(buffer));

  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!type || !allowedTypes.includes(type.mime)) {
    return err({ message: 'File type not allowed', code: 'INVALID_FILE_TYPE' });
  }

  return ok(undefined);
}
```

### 7. 安全な乱数生成

```typescript
// OK: crypto.randomBytes使用
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// OK: uuidライブラリ使用
import { v4 as uuidv4 } from 'uuid';

const sessionId = uuidv4();
```

### 9. パスワードハッシュ（Argon2id）

#### 安全なパターン（推奨）

```typescript
// OK: @node-rs/argon2 (Argon2id) を使用
import { hash, verify } from '@node-rs/argon2';

// isolatedModules 制約により Algorithm const enum を直接使用不可。数値で指定。
// 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
const ARGON2_OPTIONS = {
  memoryCost: 19456, // KiB = 19 MiB (OWASP 最小要件)
  timeCost: 2,       // iterations
  parallelism: 1,
  algorithm: 2,      // Algorithm.Argon2id
} as const;

// ハッシュ生成
const hashedPassword = await hash(plainPassword, ARGON2_OPTIONS);

// 照合
const isValid = await verify(hashedPassword, plainPassword, ARGON2_OPTIONS);
```

#### 危険なパターン（禁止）

```typescript
// NG: bcryptjs 使用（SHA-1ベース、GPU耐性が低い）
import * as bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 10);

// NG: bcrypt 使用（同上）
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 10);

// NG: MD5/SHA-256 単体でパスワードをハッシュ
import crypto from 'crypto';
const hash = crypto.createHash('sha256').update(password).digest('hex');
```

#### タイミング攻撃対策パターン

```typescript
// OK: ユーザー不在でもダミーハッシュで照合して時間を均一化
const user = await userRepository.findByEmail(email);
const hashToCompare = user?.passwordHash ?? hashService.getTimingSafeDummyHash();
const isPasswordValid = await hashService.compareHash(password, hashToCompare);

// 照合後に存在チェック（順序重要）
if (!user || !isPasswordValid) {
  return err({ message: '認証に失敗しました', code: 'INVALID_CREDENTIALS' });
}

// NG: ユーザー不在を先にチェックするとタイミング差が生まれる
if (!user) {
  return err({ message: 'ユーザーが見つかりません', code: 'USER_NOT_FOUND' }); // 時間差でユーザー列挙可能
}
const isPasswordValid = await hashService.compareHash(password, user.passwordHash);
```

### 8. レート制限

#### upstash/ratelimitの使用

```typescript
// OK: Server Actionでレート制限
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function login(email: string, password: string) {
  const identifier = email;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return err({ message: 'Too many attempts', code: 'RATE_LIMIT_EXCEEDED' });
  }

  // ログイン処理
}
```

---

## レビュー時の検索パターン

### Grepで危険パターン検出

```bash
# XSS系
grep -rn 'dangerouslySetInnerHTML' src/
grep -rn '\.innerHTML' src/
grep -rn 'document\.write' src/

# インジェクション系
grep -rn '\$queryRaw' src/
grep -rn '\$queryRawUnsafe' src/
grep -rn 'exec(' src/
grep -rn 'eval(' src/

# 認証系（'use server' を持つファイルで requireAuthentication() が呼ばれているか確認）
grep -rn "'use server'" src/ | xargs -I {} grep -L 'requireAuthentication' {}
# auth() を Server Action 内で直接呼んでいる箇所を検出（proxy.ts は除外）
grep -rn "await auth()" src/ | grep -v 'proxy.ts'

# 機密情報
grep -rn 'password' src/ | grep -i 'select\|return'
grep -rn 'process\.env\.' src/components/ # Client Componentでの環境変数使用

# 安全でない乱数
grep -rn 'Math\.random()' src/

# ファイル操作
grep -rn 'fs\.readFileSync' src/
grep -rn 'fs\.writeFileSync' src/
```

### ファイル別チェック

```bash
# Server Actions（認証必須）
find src/layers/presentation -name "*.ts" -exec grep -l "'use server'" {} \;

# API Routes（認証・CORS必須）
find src/app -name "route.ts"

# middleware/proxy.ts（セキュリティヘッダー確認）
cat src/proxy.ts
```

---

## セキュリティチェックリスト

実装レビュー時に確認すべき項目:

### 認証・認可

- [ ] Server Actionで `GetCurrentUserUseCase.requireAuthentication()` を使用しているか（`auth()` 直接呼び出しは禁止）
- [ ] API Routeで認証チェックを実施しているか
- [ ] リソース所有者の確認を行っているか
- [ ] 認可ロジックがUseCase層に存在するか

### 入力検証

- [ ] すべての外部入力をZodで検証しているか
- [ ] Value Objectで不変条件を保証しているか
- [ ] ファイルアップロードでMIMEタイプを検証しているか
- [ ] ファイルサイズ制限を設けているか

### 出力エンコーディング

- [ ] ユーザー入力をHTMLに挿入する際にサニタイズしているか
- [ ] `dangerouslySetInnerHTML` の使用が必須か検討したか
- [ ] SQL, コマンド実行でパラメータ化を使用しているか

### 機密情報

- [ ] パスワードをレスポンスに含めていないか
- [ ] DTOでフィールドを明示的に選択しているか
- [ ] エラーメッセージに機密情報を含めていないか
- [ ] 環境変数を適切に管理しているか (NEXT_PUBLIC_の使い分け)

### セキュリティヘッダー

- [ ] `src/proxy.ts` でセキュリティヘッダーを設定しているか
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security

### レート制限

- [ ] 認証エンドポイントにレート制限を実装しているか
- [ ] 外部API呼び出しにスロットリングを実装しているか

### 依存関係

- [ ] 既知の脆弱性を含むパッケージを使用していないか (`pnpm audit`)
- [ ] パッケージを最小権限で使用しているか

---

## セキュリティテストパターン

### 認証テスト

```typescript
// test/layers/presentation/actions/updateUser.test.ts
// GetCurrentUserUseCase をモックして認証チェックをテストする
describe('updateUser', () => {
  it('未認証の場合はエラーを返す', async () => {
    // GetCurrentUserUseCase.requireAuthentication() が err を返すようにモック
    const mockGetCurrentUserUseCase = {
      requireAuthentication: vi.fn().mockResolvedValue(
        err({ message: '認証が必要です', code: 'UNAUTHENTICATED' })
      ),
    };
    vi.mocked(resolve).mockReturnValue(mockGetCurrentUserUseCase);

    const result = await updateUser({ name: 'New Name' });

    expect(result).toEqual({ error: '認証が必要です', code: 'UNAUTHENTICATED' });
  });

  it('認証済みの場合は更新を実行', async () => {
    // GetCurrentUserUseCase.requireAuthentication() が ok を返すようにモック
    const mockGetCurrentUserUseCase = {
      requireAuthentication: vi.fn().mockResolvedValue(
        ok({ id: 'user-1', email: 'test@example.com', name: 'Test User' })
      ),
    };
    vi.mocked(resolve).mockReturnValue(mockGetCurrentUserUseCase);

    await updateUser({ name: 'New Name' });

    // UseCase 経由でビジネスロジックが実行されることを確認
    expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    );
  });
});
```

### 入力検証テスト

```typescript
describe('Email Value Object', () => {
  it('不正な形式の場合は失敗', () => {
    const result = Email.create('invalid-email');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('INVALID_EMAIL');
    }
  });

  it('正常な形式の場合は成功', () => {
    const result = Email.create('test@example.com');

    expect(result.isOk()).toBe(true);
  });
});
```

---

## 参考リソース

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
