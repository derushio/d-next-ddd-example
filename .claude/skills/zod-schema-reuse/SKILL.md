---
name: zod-schema-reuse
description: |
  Server ActionやUseCaseでのZodスキーマ再利用を強制するスキル。
  authSchema.ts の共有スキーマ（passwordSchema, emailSchema 等）の使用を義務付け、
  z.string().min(8) や z.email() の直書きを禁止する。

  トリガー例:
  - 「z.string().min(8」「z.string().email(」「z.object({」
  - Server Action で認証系スキーマを定義しようとするとき
  - src/app/server-actions/ 配下のファイルを編集するとき
  - 「Zod 4」「z.email()」「top-level validator」「z.pipe()」
globs:
  - "src/app/server-actions/**/*.ts"
  - "src/layers/application/usecases/**/*.ts"
---

# Zod スキーマ再利用パターン

## このスキルの目的

- 認証・パスワード・メール関連のZodスキーマを一箇所で管理する
- `z.string().min(8)` や `z.email()` の直書きを排除し、Email VOとの整合性を保つ
- スキーマが増えた際の配置ルールを明確にする

---

## 共有スキーマの場所と一覧

### Application 層（共通フィールド）

**場所**: `src/layers/application/schemas/commonFieldSchemas.ts`

| export | 内容 |
|--------|------|
| `userIdSchema` | ユーザーID バリデーション（trim + 必須） |
| `nameSchema` | 名前バリデーション（1-100文字） |

UseCase で userId / name を定義する場合は必ずこのファイルから import すること。

詳細は `shared-validation-schemas` スキル参照。

### Infrastructure 層（認証系）: `src/layers/infrastructure/types/zod/authSchema.ts`

| スキーマ名 | 用途 | 型 |
|---|---|---|
| `emailSchema` | メールアドレス検証（Email VO整合） | `z.ZodString` |
| `passwordSchema` | パスワード検証（newPasswordSchemaの再エクスポート） | `z.ZodString` |
| `signInSchema` | サインインフォーム全体 | `z.ZodObject` |
| `signUpSchema` | ユーザー登録フォーム全体 | `z.ZodObject` |
| `changePasswordSchema` | パスワード変更フォーム全体 | `z.ZodObject` |
| `EmailInput` | `z.infer<typeof emailSchema>` の型 | `type` |
| `SignInInput` | `z.infer<typeof signInSchema>` の型 | `type` |
| `SignUpInput` | `z.infer<typeof signUpSchema>` の型 | `type` |
| `ChangePasswordInput` | `z.infer<typeof changePasswordSchema>` の型 | `type` |

### Application 層（パスワードポリシー）: `src/layers/application/utils/passwordValidation.ts`

| エクスポート名 | 用途 |
|---|---|
| `newPasswordSchema` | 新しいパスワードの検証スキーマ（UseCase向け） |
| `APP_PASSWORD_MIN_LENGTH` | パスワード最小長（Domain の PASSWORD_POLICY を参照） |
| `APP_PASSWORD_MAX_LENGTH` | パスワード最大長 |

---

## 正しいパターン

```typescript
// ✅ 共有スキーマを import して再利用する
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
  changePasswordSchema,
} from '@/layers/infrastructure/types/zod/authSchema';

// ✅ 既存の複合スキーマをそのまま使う
const validated = signInSchema.safeParse(input);

// ✅ 部分スキーマを組み合わせて新スキーマを作る
const resetPasswordSchema = z.object({
  email: emailSchema,          // emailSchema を再利用
  token: z.string().min(1, 'トークンが必要です'),
});

// ✅ UseCase内では newPasswordSchema を使う（Application層）
import { newPasswordSchema } from '@/layers/application/utils/passwordValidation';

const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: newPasswordSchema,  // 共有スキーマ再利用
});
```

---

## 禁止パターン

```typescript
// ❌ 禁止: パスワード最小長の直書き
const schema = z.object({
  password: z.string().min(8, 'パスワードは8文字以上です'),  // 直書き禁止
});

// ❌ 禁止: z.string().email() の直書き（Email VOとの整合性が崩れる）
const schema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),  // 直書き禁止
});

// ❌ 禁止: 同一検証ルールの重複定義
const myEmailSchema = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'メールアドレスの形式が正しくありません')
  .max(254, '...');  // authSchema.ts にある emailSchema と同じ → 禁止

// ❌ 禁止: 最大長のハードコード
const schema = z.object({
  password: z.string().max(128, 'パスワードは128文字以内です'),  // APP_PASSWORD_MAX_LENGTH を使う
});
```

---

## z.email() 以外のメール検証を直書き禁止にする理由

`z.email()` は Zod 内蔵の簡易メール正規表現を使用するが、このプロジェクトの `emailSchema` は **Email Value Object** (`src/layers/domain/value-objects/Email.ts`) の `EMAIL_VALIDATION_RULES` を参照している。

- `FORMAT_REGEX`: Email VO と同一の正規表現
- `MAX_LENGTH`: 254 文字制限
- double-dot チェック
- 禁止文字チェック

`z.email()` を直書きするとEmail VOのバリデーションルールと乖離し、「Server Actionでは通るがドメイン層で弾かれる」不整合が発生する。

```
Email VO（Single Source of Truth）
    ↓ EMAIL_VALIDATION_RULES を参照
authSchema.ts の emailSchema
    ↓ を再利用
Server Action / UseCase
```

---

## 新スキーマ追加時の配置ガイド

新しいスキーマを作成する際は以下の基準で配置先を決める:

| スキーマの性質 | 配置先 | 理由 |
|---|---|---|
| 認証・アカウント全般（メール・パスワード・セッション） | `src/layers/infrastructure/types/zod/authSchema.ts` | NextAuth.js と Server Actions で共有 |
| UseCase入力の検証スキーマ（UseCase専用） | UseCase ファイルのモジュールスコープ（先頭） | UseCase内でのみ使用 |
| 特定ドメインの検証（ユーザー名・プロフィール等） | `src/layers/infrastructure/types/zod/<domain>Schema.ts` | ドメイン横断的な再利用が必要な場合 |
| 単一 Server Action 専用スキーマ | Server Action ファイル内（先頭） | 他で使わないなら局所化 |

**複数ファイルで同じルールを書くことに気づいたら**: 共有スキーマとして `authSchema.ts` または新しいスキーマファイルに抽出すること。

---

## チェックリスト

- [ ] `z.email()` を直書きしていない（`emailSchema` を使用）
- [ ] `z.string().min(8)` / `.max(128)` をパスワードに直書きしていない（`passwordSchema` / `newPasswordSchema` を使用）
- [ ] サインイン・サインアップは `signInSchema` / `signUpSchema` を直接 import して使用
- [ ] パスワード変更は `changePasswordSchema` を import して使用
- [ ] 新規スキーマ追加時に配置ガイドに従った

## Zod 4 スキーマ合成パターン

共有スキーマも Zod 4 API に準拠すること。

### authSchema.ts の email スキーマ
```typescript
// ✅ Zod 4: top-level validator + 追加 refine
const emailSchema = z.email()
  .max(EMAIL_VALIDATION_RULES.MAX_LENGTH)
  .refine(/* カスタムバリデーション */);
```

### 共有スキーマの新規作成時
- `z.email()`, `z.url()` 等の top-level validator を優先使用
- `z.pipe()` でコーション+バリデーション分離を明確化

詳細は `zod-v4-modern-api` スキルを参照。

## 関連スキル

- `zod-error-handling` — flatten().fieldErrors によるエラー取り出しパターン
- `usecase-input-validation` — UseCase 内バリデーションパターン
- `presentation-impl` — Server Action 全体の実装パターン
- `zod-v4-modern-api` — Zod 4 API 詳細

## スキーマ配置の判断ツリー

```
同一 Zod フィールドを2箇所以上で定義しようとしている？
├── Yes → 共有スキーマファイルに切り出す
│   ├── 認証関連（email, password）→ src/layers/infrastructure/types/zod/authSchema.ts
│   └── その他ドメイン → src/layers/infrastructure/types/zod/<domain>Schema.ts
└── No → UseCase / Server Action 内にインラインで定義
```

## Clean Architecture レイヤー別スキーマ配置ルール

| レイヤー | 配置場所 | import 可能な対象 | 例 |
|----------|---------|-------------------|-----|
| Application | UseCase 内 inline | Domain VO のみ | `z.string().min(1)` + `new Email(email)` |
| Infrastructure | `types/zod/*.ts` | Application + Domain | `emailSchema`, `passwordSchema` |
| Presentation | Server Action 内 inline | 全レイヤー | `authSchema.ts` から import + UI固有追加 |

**重要**: Application 層から Infrastructure 層の `authSchema.ts` を直接 import しないこと（依存方向違反）。

## 新ドメイン追加時のガイドライン

新しいドメイン（例: 投稿、商品、注文）を追加する際:

1. **2つ以上の Server Action / UseCase で同じフィールドルールを使う場合のみ**共有スキーマを作成
2. ファイル名: `src/layers/infrastructure/types/zod/<domain>Schema.ts`（例: `productSchema.ts`）
3. フィールド単位で export（`emailSchema` のように個別にインポート可能にする）
4. 1箇所でしか使わないスキーマはインラインのまま残す（過度な抽象化を避ける）
