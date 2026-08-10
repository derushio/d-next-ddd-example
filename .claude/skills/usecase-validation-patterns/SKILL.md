---
name: usecase-validation-patterns
description: |
  UseCase の入力検証パターンを統合提供するスキル。
  usecase-input-validation・usecase-zod-consistency・usecase-validation-order の統合版。
  Zodスキーマによる統一的な入力検証を強制し、処理順序（log→validate→VO→DB→business→persist→respond）を徹底する。
  validateInput() ヘルパー、fieldErrorCodeMap、z.input<> vs z.infer<>の使い分け、
  Zod 4 API 義務化、手動 if バリデーション禁止を扱う。

  トリガー例:
  - 「UseCase入力検証」「バリデーション」「空文字チェック」
  - _execute() メソッド内でのリクエスト検証
  - src/layers/application/usecases/ 配下のファイル編集時
  - !value || value.trim() パターンを書こうとしたとき
  - UseCase 新規作成時、リクエスト型の定義
  - interface XxxRequest の手書き定義
  - 「手書きバリデーション」「if チェック」を書こうとしたとき
  - 「z.email()」「z.url()」「Zod 4」「z.pipe()」
  - UseCase の _execute() メソッド実装時
  - findById, findByEmail 等のリポジトリ呼び出し前のバリデーション
  - 「バリデーション順序」「検証順序」

globs:
  - "src/layers/application/usecases/**/*.ts"
---

# UseCase バリデーション パターン Skill

UseCase の入力検証パターンと処理順序を統合提供します。
`usecase-input-validation`・`usecase-zod-consistency`・`usecase-validation-order` の統合版スキルです。
Zodスキーマによる統一的な入力検証、正しい処理順序（コスト順）、
z.input<> vs z.infer<> の使い分け、Zod 4 API 義務化を支援します。

---

## 1. 正しい処理順序: log → validate → VO → DB → business → persist → respond

UseCase `_execute()` 内の処理は必ず以下の順序で行うこと。
**DB lookupの前に入力バリデーションを完了させ、不正入力でのDB負荷を防止する。**

```typescript
private async _execute(request: MyRequest): Promise<MyResponse> {
  // 1. ログ出力
  this.logger.info('処理開始', { ... });

  // 2. 入力バリデーション（Zodスキーマ） ← 最も安い処理
  const { email, password } = validateInput(myUseCaseInputSchema, request);

  // 3. Value Object 生成 ← メモリ内処理
  const userId = new UserId(request.userId);

  // 4. DB lookup ← 高コスト処理
  const user = await this.userRepository.findById(userId);
  if (!user) { throw new AppUseCaseError('...', 'NOT_FOUND'); }

  // 5. ビジネスロジック
  // 6. 永続化
  // 7. レスポンス変換
}
```

---

## 2. アンチパターン: DB lookup の後にバリデーション

```typescript
// ❌ 禁止: DB lookupの後にバリデーション（DB負荷が無駄に発生する）
const user = await this.userRepository.findById(userId);  // DB負荷発生
if (!user) { ... }
const validation = schema.safeParse(request);  // ← 遅すぎる！
```

---

## 3. 原則: コスト順に処理を並べる

1. **同期的バリデーション**（Zod, Value Object生成） — O(1)
2. **認証・認可チェック**（セッション確認） — キャッシュ済みの場合O(1)
3. **DB読み取り**（findById, findByEmail） — ネットワークI/O
4. **ビジネスロジック**（ドメインサービス呼び出し）
5. **DB書き込み**（save, update, delete） — 最も高コスト

---

## 4. 基本パターン: Zodスキーマによる統一検証

UseCase ファイルの先頭でZodスキーマを定義し、`_execute()` の冒頭で `validateInput()` ヘルパーを使って検証する。

```typescript
import { z } from 'zod';
import { validateInput } from '@/layers/application/utils/validateInput';

// ✅ 正しい: Zodスキーマで入力検証を定義（ファイルスコープ）
const myUseCaseInputSchema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

// リクエスト型はスキーマから導出（手書き interface 禁止）
type MyRequest = z.infer<typeof myUseCaseInputSchema>;
// .default() がある場合は z.input<> を使用（後述）

// _execute() 内での使用
private async _execute(request: MyRequest): Promise<MyResponse> {
  // validateInput() が失敗時に AppUseCaseError を throw する
  const { email, password } = validateInput(myUseCaseInputSchema, request);
  // ... ビジネスロジック
}
```

---

## 5. validateInput() ヘルパー

`src/layers/application/utils/validateInput.ts` のヘルパーを使用し、
検証ボイラープレートを排除する:

```typescript
import { validateInput } from '@/layers/application/utils/validateInput';

// シンプルなケース（デフォルトコード: 'VALIDATION_ERROR'）
const validatedData = validateInput(myUseCaseInputSchema, request);

// カスタム静的コード
validateInput(schema, request, 'INVALID_USER_ID');

// フィールドごとのカスタムコード
validateInput(schema, request, (error) => {
  const field = error.issues[0]?.path[0];
  return field === 'password' ? 'EMPTY_PASSWORD' : 'EMPTY_EMAIL';
});
```

### 禁止: インラインバリデーションブロック

以下のボイラープレートは `validateInput()` で置換すること:

```typescript
// ❌ 禁止: インラインバリデーション
const result = schema.safeParse(request);
if (!result.success) {
  const firstIssue = result.error.issues[0];
  throw new AppUseCaseError(firstIssue?.message ?? '入力が無効です', 'VALIDATION_ERROR');
}

// ✅ 正しい: validateInput() ヘルパー
const validatedData = validateInput(schema, request);
```

---

## 6. fieldErrorCodeMap ヘルパー

**ファイル**: `src/layers/application/utils/validateInput.ts`

フィールド別エラーコードを宣言的に定義するヘルパー。
Zodスキーマ移行時、既存のエラーコードを維持するために使用する。

### シグネチャ

```ts
function fieldErrorCodeMap(
  mapping: Record<string, string>,
  fallback?: string, // デフォルト: 'VALIDATION_ERROR'
): (error: ZodError) => string
```

### 使用例

```ts
import { validateInput, fieldErrorCodeMap } from '@/layers/application/utils/validateInput';

// SignInUseCase
validateInput(
  signInInputSchema,
  { email, password },
  fieldErrorCodeMap({ password: 'EMPTY_PASSWORD', email: 'EMPTY_EMAIL' }),
);

// ChangePasswordUseCase
validateInput(
  changePasswordInputSchema,
  { currentPassword, newPassword },
  fieldErrorCodeMap({
    currentPassword: 'EMPTY_CURRENT_PASSWORD',
    newPassword: 'INVALID_PASSWORD',
  }),
);
```

### コールバック形式 vs オブジェクト形式

| 方式 | 使いどころ |
|------|-----------|
| `fieldErrorCodeMap({...})` | フィールド→コードの単純な1:1マッピング（推奨） |
| `(error) => { ... }` | 複合条件（複数フィールドの組み合わせ等）が必要な場合のみ |

---

## 7. z.input<> vs z.infer<> の使い分け

`.default()` を含むスキーマでは `z.input<>` を使用:

```typescript
const schema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});

// ❌ z.infer: page は number（default適用後の型）
//    呼び出し側で page?: number | undefined を渡せない
type Request = z.infer<typeof schema>;

// ✅ z.input: page は number | undefined（入力時の型）
type Request = z.input<typeof schema>;
```

`.default()` がないスキーマでは従来通り `z.infer<>` を使用。

### 型導出の一般ルール

```typescript
// BAD: 型の二重定義
const schema = z.object({ userId: z.string().trim().min(1) });
interface Request { userId: string } // スキーマと同じ！

// GOOD: スキーマから導出
const schema = z.object({ userId: z.string().trim().min(1) });
type Request = z.infer<typeof schema>;

// GOOD: スキーマにないフィールドがある場合は intersection
type Request = z.infer<typeof schema> & { ipAddress?: string };
```

---

## 8. デフォルト値の扱い

Zod の `.default()` を使い、手書きの `?? 1` を排除:

```typescript
// ❌ 禁止
const page = request.page ?? 1;
const limit = request.limit ?? 10;

// ✅ 正しい: Zodスキーマで default
const schema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});
// safeParse 後の data には default 値が適用済み
```

---

## 9. Zod 4 API 義務化

UseCase のスキーマ定義では Zod 4 ネイティブ API を使用すること。

### Top-level Format Validators

```typescript
// ❌ Deprecated（次のメジャーバージョンで削除予定）
z.string().email()
z.string().url()
z.string().uuid()

// ✅ Zod 4 Top-level
z.email()
z.url()
z.uuid()
z.cuid2()
```

### コーション分離

```typescript
// ❌ Zod 3 style
z.coerce.number().min(1).max(100)

// ✅ Zod 4 z.pipe()
z.pipe(z.coerce.number(), z.number().min(1).max(100))
```

詳細は `zod-v4-modern-api` スキルを参照。

---

## 10. 禁止パターン

```typescript
// ❌ 禁止: 手動の空文字/空白チェック
if (!request.password || request.password.trim().length === 0) {
  throw new AppUseCaseError('パスワードを入力してください', 'EMPTY_PASSWORD');
}

// ❌ 禁止: 複数フィールドの個別手動チェック
if (!request.email || request.email.trim() === '') { ... }
if (!request.password || request.password.trim() === '') { ... }

// ✅ 正しい: 1つのZodスキーマで一括検証
const schema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});
const result = schema.safeParse(request);
```

```typescript
// ❌ 禁止: 手書き if バリデーション
if (page < 1) {
  throw new AppUseCaseError('ページ番号は1以上', 'INVALID_PAGE');
}
if (limit < 1 || limit > 100) {
  throw new AppUseCaseError('取得件数は1〜100', 'INVALID_LIMIT');
}

// ✅ 正しい: Zodスキーマで一括
const schema = z.object({
  page: z.int().min(1, 'ページ番号は1以上').optional().default(1),
  limit: z.int().min(1).max(100, '取得件数は100以下').optional().default(10),
});
```

```typescript
// ❌ 禁止: スキーマと同じフィールドの手書き interface
const schema = z.object({ userId: z.string(), name: z.string() });
interface Request { userId: string; name: string; }  // 二重定義！

// ✅ 正しい: z.infer で導出
type Request = z.infer<typeof schema>;
```

---

## 11. 既存の検証スキーマとの連携

`newPasswordSchema` 等の既存スキーマはZodスキーマ内で再利用する:

```typescript
import { newPasswordSchema } from '@/layers/application/utils/passwordValidation';
import { passwordSchema } from '@/layers/application/utils/passwordValidation';

const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: newPasswordSchema,
});

const createUserInputSchema = z.object({
  password: passwordSchema,  // 共有スキーマを再利用
});
```

---

## 12. userId 検証パターン

```typescript
// ✅ userId は .trim() を含めて空白のみIDを拒否
const userIdSchema = z.object({
  userId: z.string().trim().min(1, 'ユーザーIDが指定されていません'),
});
```

---

## 13. スキーマ配置の判断ツリー

```
UseCase 内で Zod スキーマを定義しようとしている
├── Application 層（UseCase 内 inline）
│   - z.string().min(1) 等の最小チェック（空でないか）
│   - 強いバリデーションはドメイン VO（new Email(email) 等）に委譲
│   - Infrastructure 層の authSchema.ts を直接 import してはならない（依存方向違反）
├── Infrastructure 層（authSchema.ts 等）
│   - emailSchema, passwordSchema 等の強いバリデーション
│   - Application 層の newPasswordSchema を参照可能（Infrastructure → Application は許可）
└── Presentation 層（Server Action 内 inline）
    - authSchema.ts から emailSchema, passwordSchema を import 可能
    - confirmPassword 等の UI 固有フィールドを追加
    - Clean Architecture: Presentation → 全レイヤーへの依存が許可
```

---

## チェックリスト

### 処理順序
- [ ] Zodバリデーションが `_execute()` の冒頭にある（ログ出力の直後）
- [ ] DB lookupの前にバリデーションが完了している
- [ ] Value Object生成がDB lookupの前にある

### Zodスキーマ
- [ ] `_execute()` 内の入力検証は全てZodスキーマで実施
- [ ] 手動の `!value ||` / `value.trim()` チェックが残っていない
- [ ] 手書き if バリデーションが残っていない
- [ ] Zodスキーマはファイル先頭のモジュールスコープで定義
- [ ] UseCase にZodスキーマが定義されている

### 型定義
- [ ] リクエスト型は `z.infer<>` で導出している（またはスキーマにないフィールドの intersection）
- [ ] `.default()` を含むスキーマでは `z.input<>` を使用している
- [ ] デフォルト値は Zod `.default()` で処理している（手書き `?? 1` 禁止）

### API
- [ ] `validateInput()` ヘルパーを使用している（インライン safeParse 禁止）
- [ ] Zod 4 ネイティブ API を使用している（`z.email()`, `z.url()`, `z.uuid()` 等）
- [ ] エラーコードが既存テストと互換

---

## 関連スキル

- `neverthrow-patterns` — Result型パターン
- `application-impl` — UseCase実装全般
- `resultasync-patterns` — ResultAsync パターン
- `zod-v4-modern-api` — Zod 4 API 詳細
- `zod-schema-reuse` — スキーマ再利用パターン
