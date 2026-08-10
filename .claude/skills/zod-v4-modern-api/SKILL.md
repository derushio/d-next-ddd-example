---
name: zod-v4-modern-api
description: |
  Zod 4 ネイティブAPIの使用を強制するスキル。
  top-level string format validators、z.pipe()によるコーション分離、
  deprecated z.string().email() 等の検出・置換パターンを提供する。

  トリガー例:
  - 「Zodスキーマ」「バリデーション」「z.object」「z.string」
  - z.string().email() / z.string().url() / z.string().uuid() を書こうとしたとき
  - src/layers/ 配下の UseCase/Server Action でスキーマ定義時
globs:
  - "src/layers/application/**/*.ts"
  - "src/app/server-actions/**/*.ts"
---

# Zod 4 Modern API スキル

Zod 4 ネイティブ API を使用し、deprecated なメソッド形式を排除するパターン集。

---

## 1. Top-level Format Validators（必須）

Zod 4 では文字列フォーマットのバリデーターが **トップレベル関数** に昇格した。
旧来の `z.string().email()` 形式は次のメジャーバージョンで削除予定のため、必ずトップレベル形式を使用すること。

### 変換早見表

| 旧（deprecated） | 新（Zod 4 ネイティブ） |
|-----------------|----------------------|
| `z.string().email()` | `z.email()` |
| `z.string().url()` | `z.url()` |
| `z.string().uuid()` | `z.uuid()` / `z.uuidv4()` / `z.uuidv7()` |
| `z.string().cuid2()` | `z.cuid2()` |
| `z.string().base64()` | `z.base64()` |
| `z.string().datetime()` | `z.iso.datetime()` |
| `z.string().date()` | `z.iso.date()` |
| `z.string().time()` | `z.iso.time()` |
| `z.string().ip()` | `z.ipv4()` / `z.ipv6()` |

### コード例

```typescript
import { z } from 'zod';

// ❌ Zod 3 スタイル（deprecated）
const oldSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  url: z.string().url('有効なURLを入力してください'),
  id: z.string().uuid('有効なUUIDを入力してください'),
  createdAt: z.string().datetime(),
});

// ✅ Zod 4 スタイル（ネイティブ）
const newSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  url: z.url('有効なURLを入力してください'),
  id: z.uuid('有効なUUIDを入力してください'),
  createdAt: z.iso.datetime(),
});
```

### ISO 日付・時刻バリデーター

```typescript
// ISO 8601 形式のバリデーター（z.iso 名前空間）
const dateSchema = z.iso.date();       // YYYY-MM-DD
const datetimeSchema = z.iso.datetime(); // ISO 8601 with timezone
const timeSchema = z.iso.time();       // HH:MM:SS

// 使用例
z.object({
  birthDate: z.iso.date(),
  scheduledAt: z.iso.datetime(),
  openTime: z.iso.time(),
});
```

---

## 2. z.pipe() によるコーション + バリデーション分離

Zod 4 では **変換（coercion）** と **バリデーション（validation）** を `z.pipe()` で分離することが推奨される。
責務が明確に分離され、エラーメッセージも段階的に制御できる。

```typescript
// ❌ Zod 3 スタイル（coercion + validation が混在）
const ageSchema = z.coerce.number().min(1).max(100);

// ✅ Zod 4 スタイル（z.pipe() で分離）
const ageSchema = z.pipe(
  z.coerce.number(),
  z.number().min(1).max(100),
);
```

### z.pipe() の実践例

```typescript
// 文字列 → 数値変換 + 範囲チェック
const pageSchema = z.pipe(
  z.coerce.number(),
  z.int().min(1),
);

// 文字列 → 日付変換 + 過去日チェック
const birthdateSchema = z.pipe(
  z.coerce.date(),
  z.date().max(new Date(), '過去の日付を入力してください'),
);

// URL パラメータからの変換（全て文字列として来る）
const searchParamsSchema = z.object({
  page: z.pipe(z.coerce.number(), z.int().min(1)).default(1),
  limit: z.pipe(z.coerce.number(), z.int().min(1).max(100)).default(20),
});
```

---

## 3. .refine() は引き続き有効（full Zod）

`.check()` は `zod/mini` 専用 API。このプロジェクトでは full Zod を使用するため、
カスタムバリデーションには `.refine()` / `.superRefine()` を使うこと。

## `.refine()` → `.check()` 移行

Zod v4 では `.refine()` の代わりに `.check()` が使用可能。
`.check()` はより宣言的で、エラーメッセージの指定が簡潔。

```typescript
// ❌ v3 スタイル
z.string()
  .refine((v) => !v.includes('..'), 'メッセージ')
  .refine((v) => !REGEX.test(v), 'メッセージ');

// ✅ v4 スタイル
z.string()
  .check((v) => !v.includes('..'), 'メッセージ')
  .check((v) => !REGEX.test(v), 'メッセージ');
```

### 適用ルール

- 単一フィールドの追加バリデーション: `.check()` を使用
- オブジェクト全体のクロスフィールドバリデーション: `.refine()` / `.superRefine()` を維持

```typescript
// ✅ full Zod — .refine() を使用
const passwordSchema = z.string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .refine(
    (val) => /[A-Z]/.test(val),
    '大文字を1文字以上含めてください',
  );

// ✅ 複数バリデーション — .superRefine() を使用
const confirmPasswordSchema = z.object({
  password: z.string().min(8),
  confirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'パスワードが一致しません',
      path: ['confirm'],
    });
  }
});

// ❌ zod/mini 専用（このプロジェクトでは使用禁止）
// z.string().check(...)
```

---

## 4. z.infer<> と z.input<> / z.output<>

```typescript
// ✅ 変換なしのスキーマ → z.infer<> で型を取得（引き続き推奨）
const userSchema = z.object({
  name: z.string(),
  email: z.email(),
});
type User = z.infer<typeof userSchema>;

// ✅ transform がある場合 → 入出力型を分離
const parseableSchema = z.object({
  age: z.pipe(z.coerce.number(), z.number().min(0)),
  createdAt: z.coerce.date(),
});
type ParseableInput = z.input<typeof parseableSchema>;   // { age: unknown; createdAt: unknown }
type ParseableOutput = z.output<typeof parseableSchema>; // { age: number; createdAt: Date }

// 使いどころ:
// - フォームの入力値（文字列）を受け取って型変換するスキーマ → z.input<>
// - UseCase の型定義（バリデーション済みの出力値）→ z.output<> or z.infer<>
```

---

## 5. @hookform/resolvers 互換性

`@hookform/resolvers` v5.2.2+ は Zod 4 ネイティブ対応済み。
`zodResolver()` は `z.email()` 等のトップレベルバリデーターに対応している。

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ Zod 4 ネイティブ API を使用したフォームスキーマ
const signInSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

type SignInInput = z.infer<typeof signInSchema>;

const form = useForm<SignInInput>({
  resolver: zodResolver(signInSchema),
  defaultValues: { email: '', password: '' },
});
```

---

## 6. UseCase スキーマでの適用例

```typescript
// src/layers/application/usecases/auth/SignInUseCase.ts
import { z } from 'zod';

// ✅ Zod 4 ネイティブ API
const SignInRequestSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type SignInRequest = z.infer<typeof SignInRequestSchema>;
```

```typescript
// src/layers/application/usecases/user/CreateUserUseCase.ts
import { z } from 'zod';

// ✅ URL + UUID も Zod 4 形式
const CreateUserRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  avatarUrl: z.url().optional(),
  externalId: z.uuid().optional(),
});
```

---

## 7. z.int() トップレベル整数バリデーター（Zod 4 推奨）

Zod 4 では `z.number().int()` の代わりにトップレベル `z.int()` が推奨される。
`z.int()` は safe integer range（`Number.MIN_SAFE_INTEGER` 〜 `Number.MAX_SAFE_INTEGER`）を自動検証する。

### 変換早見表（追加）

| 旧（deprecated） | 新（Zod 4 ネイティブ） |
|-----------------|----------------------|
| `z.number().int()` | `z.int()` |
| `z.number().safe()` | `z.int()`（`.safe()` は deprecated） |

### コード例

```typescript
// ❌ Zod 3 スタイル
const pageSchema = z.number().int().min(1);
const limitSchema = z.number().int().min(1).max(100);

// ✅ Zod 4 スタイル
const pageSchema = z.int().min(1);
const limitSchema = z.int().min(1).max(100);
```

### env変数での使用（z.pipe() と組み合わせ）

env変数は文字列として来るため、`z.coerce` + `z.int()` を `z.pipe()` で分離する:

```typescript
// ✅ 環境変数の整数バリデーション
const portSchema = z.pipe(
  z.coerce.number(),
  z.int().min(1).max(65535),
);
```

---

## 8. 数値ユーティリティメソッド（.refine() 置換）

`z.number()` の組み込みメソッドで `.refine()` を置き換えると、意図が明確になりエラーメッセージも自動生成される。

### 変換早見表

| 旧（.refine()） | 新（組み込みメソッド） |
|-----------------|---------------------|
| `.refine((v) => v > 0)` | `.positive()` |
| `.refine((v) => v >= 0)` | `.nonnegative()` |
| `.refine((v) => v < 0)` | `.negative()` |
| `.refine((v) => v <= 0)` | `.nonpositive()` |
| `.refine((v) => Number.isFinite(v))` | `.finite()` |

### コード例

```typescript
// ❌ .refine() で手書き
const positiveSchema = z.number().refine((v) => 0 < v);
const nonNegativeSchema = z.number().refine((v) => v >= 0);

// ✅ 組み込みメソッド
const positiveSchema = z.number().positive();
const nonNegativeSchema = z.number().nonnegative();
```

### z.pipe() との併用（env変数）

```typescript
// ✅ 環境変数: 正の数値バリデーション
TOKEN_MAX_AGE_MINUTES: z.pipe(
  z.coerce.number(),
  z.number().positive(),  // refine((v) => 0 < v) の代替
),
```

---

## 9. authSchema.ts の例外パターン

`authSchema.ts` の `emailSchema` は Domain 層の Email VO（`Email.ts`）の `EMAIL_VALIDATION_RULES` を参照した
カスタム正規表現パターンを使用している。これは `z.email()` への単純置換の**例外**として許容される。

理由: Email VO が Single Source of Truth であり、Zod のデフォルト email バリデーションとは異なる
独自ルール（禁止文字、連続ドット、カスタム正規表現）を適用する必要がある。

```typescript
// ✅ 許容: Domain VO のルールをミラーするカスタムバリデーション
export const emailSchema = z
  .string()
  .regex(EMAIL_VALIDATION_RULES.FORMAT_REGEX, ...)
  .max(EMAIL_VALIDATION_RULES.MAX_LENGTH, ...)
  .refine((v) => !v.includes('..'), ...)
  .refine((v) => !EMAIL_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX.test(v), ...);

// ❌ NG: 独自ルールがないのに z.string().email() を使う
const simpleEmailSchema = z.string().email('...');

// ✅ OK: 独自ルールがない場合は z.email() を使う
const simpleEmailSchema = z.email('...');
```

---

## validateInput() と z.pipe() の組み合わせ

UseCase の `validateInput()` ヘルパー（`src/layers/application/utils/validateInput.ts`）は
Zod 4 の `z.pipe()` と完全互換。コーション（型変換）とバリデーションを分離したスキーマでも使用可能。

### 実践例: Search params のコーション

```typescript
const getUsersInputSchema = z.object({
  page: z.pipe(z.coerce.number(), z.int().min(1)).default(1),
  limit: z.pipe(z.coerce.number(), z.int().min(1).max(100)).default(10),
});

// validateInput はバリデーション後の output 型を返す
const { page, limit } = validateInput(getUsersInputSchema, request);
// page: number, limit: number (coerced + validated)
```

### z.input<> vs z.output<> の使い分け

| 型 | 使いどころ |
|---|---|
| `z.input<typeof schema>` | フォームの入力値型（コーション前） |
| `z.output<typeof schema>` / `z.infer<>` | validateInput の戻り値型（コーション後） |

---

## チェックリスト

### 作成・修正時

- [ ] `z.string().email()` を `z.email()` に変更しているか？
- [ ] `z.string().url()` を `z.url()` に変更しているか？
- [ ] `z.string().uuid()` を `z.uuid()` / `z.uuidv4()` に変更しているか？
- [ ] `z.string().datetime()` を `z.iso.datetime()` に変更しているか？
- [ ] `z.string().date()` を `z.iso.date()` に変更しているか？
- [ ] `z.coerce.number().min()` を `z.pipe(z.coerce.number(), z.number().min())` に変更しているか？
- [ ] `.check()` ではなく `.refine()` / `.superRefine()` を使用しているか？
- [ ] transform を含むスキーマで `z.infer<>` ではなく `z.input<>` / `z.output<>` を使い分けているか？
- [ ] `z.number().int()` を `z.int()` に変更しているか？
- [ ] `.refine()` で単純な数値比較をしている場合、組み込みメソッド（`.positive()` 等）で置換できないか？

### レビュー時

- [ ] `z.string()` にチェーンされたフォーマットバリデーターが残っていないか？
- [ ] `z.coerce` の後に直接 `.min()` / `.max()` がチェーンされていないか？

---

## 関連スキル

- `usecase-zod-consistency` — UseCase 全体での Zod スキーマ一貫性
- `zod-schema-reuse` — Server Action と UseCase でのスキーマ共有
- `zod-error-handling` — Server Action での Zod エラーハンドリング
