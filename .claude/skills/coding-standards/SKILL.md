---
name: coding-standards
description: |
  コーディング規約の自動適用。Import Rules、命名規約、CSS規約、コメント規約。
  structuredClone 推奨（単純な cloneDeep 代替）、重複関数検出ルール、
  Zod 組み込みバリデーター優先（カスタム正規表現禁止）、薄いラッパー禁止ルールも提供。

  トリガー例:
  - 「コーディング規約を確認」「スタイル規約」「命名規則」
  - 「import文の書き方」「cursor-pointerルール」
  - 「cloneDeep」「structuredClone」「Zodバリデーション」「重複コード」
  - コードファイルを作成・編集するとき（軽量なので常時適用OK）

  ※ アーキテクチャ原則は best-practices スキルが提供
  ※ UIパターンは frontend-patterns スキルが提供
---

# Coding Standards Skill

プロジェクト全体で統一されたコーディング規約を自動適用します。

---

## 📦 1. Import Rules

### 基本ルール

```typescript
// ✅ 正しい: @/ alias 必須
import { Button } from '@/components/ui/button';
import { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';

// ❌ 禁止: 相対パス
import { Button } from '../../ui/button';

// ❌ 禁止: index.ts経由
import { Button } from '@/components/ui';
```

Biome設定で相対パスは自動検出され、エラーとなります。

※ Biomeの `noRestrictedImports` は相対パス（`../*`, `./*`）のブロックのみ設定済み。index.tsバレル禁止はコーディング規約としての取り決めであり、ツールによる自動強制はない

### アイコン

```typescript
// ✅ 正しい: lucide-react から import
import { User, Home, Menu } from 'lucide-react';

// ❌ 禁止: react-icons は使用禁止
import { HiUser } from 'react-icons/hi2';
import { HiMail } from 'react-icons/hi';
```

- アイコンは必ず `lucide-react` から import する
- `react-icons` は使用禁止（shadcn/ui標準の lucide-react に統一）
- className でのサイズ指定（`w-5 h-5` 等）はそのまま維持する

> **注意（lucide-react v1.x）**: lucide-react v1.x でアイコン名のリネームが行われた。
> v0.x 時代のアイコン名が v1.x で変更または削除されている場合があるため、
> アップグレード後にアイコンが見つからないエラーが出た場合はリネームマップを確認すること。
> 詳細は `frontend-patterns` スキルの「lucide-react v1 注意事項」セクション参照。

### es-toolkit（ユーティリティ関数）

```typescript
// ✅ 正しい: es-toolkit から直接 import（tree-shaking最適化済み）
import { cloneDeep, groupBy } from 'es-toolkit';
cloneDeep(obj);
groupBy(items, (item) => item.key);

// lodash互換が必要な場合は es-toolkit/compat を使用
import { round } from 'es-toolkit/compat';
round(1.234, 2); // lodash互換の引数順

// ❌ 禁止: lodash / lodash-es は使用しない（削除済み）
import _ from 'lodash';
import { cloneDeep } from 'lodash-es';
```

- ユーティリティ関数は `es-toolkit` から直接 import する
- `lodash` / `lodash-es` は使用禁止（プロジェクトから削除済み）
- lodash 互換 API が必要な場合のみ `es-toolkit/compat` を使用する

---

## 🖱️ 2. cursor-pointer ルール

### 適用対象

クリッカブル要素には**必ず** `cursor-pointer` を付与してください。

```tsx
// ✅ 正しい
<div onClick={handleClick} className="cursor-pointer">クリックしてね</div>
<button className="cursor-pointer" onClick={handleSubmit}>送信</button>

// ❌ 禁止
<div onClick={handleClick}>クリックしてね</div>
```

### チェックリスト

- [ ] `onClick` ハンドラを持つ要素 → cursor-pointer
- [ ] カスタムボタン/リンクコンポーネント → cursor-pointer
- [ ] クリック可能なカード/リストアイテム → cursor-pointer
- [ ] タブ、アコーディオンヘッダー → cursor-pointer

---

## 🏷️ 3. 命名規約

| 対象 | ケース | 例 |
|------|--------|-----|
| コンポーネント/クラス | PascalCase | `UserProfile`, `SignInUseCase` |
| インターフェース | PascalCase + `I` | `IUserRepository`, `ILogger` |
| 関数/変数 | camelCase | `fetchUsers`, `isLoading` |
| 定数/トークン | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| ファイル名（一般） | kebab-case | `user-profile.tsx` |
| ファイル名（コンポーネント） | PascalCase | `UserProfile.tsx` |

### boolean 変数

```typescript
// ✅ 正しい: is/has/should/can prefix
const isLoading = true;
const hasError = false;

// ❌ 禁止: 動詞なしの boolean
const loading = true;  // isLoading に変更
```

---

## 💬 4. 日本語コメント規約

### 基本原則: Why, not What

```typescript
// ❌ 悪い: コードの説明（What）
// ユーザーを取得する
const user = await repository.findById(id);

// ✅ 良い: 理由・背景の説明（Why）
// 認証済みユーザーのみアクセス可能なため、存在確認が必須
const user = await repository.findById(id);
if (!user) throw new UnauthorizedError();
```

### TypeScript 型アノテーションコメント不要

```typescript
// ❌ 冗長: TypeScriptで型は既に定義されている
/**
 * @param {CreateUserRequest} request - リクエスト
 * @returns {Promise<Result<CreateUserResponse, AppError>>} レスポンス
 */

// ✅ スマート: Why/背景/注意点のみ記述
/**
 * ユーザーを作成し、ウェルカムメールを送信する
 *
 * - メールアドレスの重複時は既存ユーザーを返す
 * - パスワードは自動的にハッシュ化される
 *
 * @deprecated v2.0で廃止予定、useCreateUserV2を使用
 */
async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse, AppError>>
```

### 引数へのインラインコメント（推奨）

```typescript
// ✅ 引数の意味・制約・デフォルト挙動を引数直前に記述
function randomNormal(
  /** 標準偏差の基準値（通常は6） */
  stdDevBase: number,
  /** 範囲の開始値 */
  start: number,
  /** 範囲の終了値（省略時はstartが終了値、0が開始値） */
  end?: number,
  /** trueで小数を返す（デフォルト: 整数） */
  float = false,
): number

// 使いどころ:
// - 引数名だけでは意味が不明確な場合
// - 省略時の挙動を説明したい場合
// - 単位や制約（0-1、ms等）を明示したい場合
```

### TODO/FIXME/NOTEの書き方

```typescript
// TODO: 機能説明 - 関連Issue
// TODO: キャッシュ機能を追加 #123

// FIXME: 問題の説明
// FIXME: N+1クエリ問題の解消が必要

// NOTE: 重要な注意事項・背景
// NOTE: 外部APIの制限により同期実行が必須
```

---

## 📏 5. Biome 設定概要

### Formatter

- **Indent**: 2 spaces
- **Quotes**: single quotes
- **Semicolons**: always
- **Trailing Commas**: all
- **Line Width**: 80

### Linter

- `noExplicitAny`: error（any型禁止）
- `noRestrictedImports`: error（相対パス禁止）
- Layer依存性ルール強制（Domain → Application/Infrastructure禁止等）

### コマンド

```bash
pnpm format    # フォーマット
pnpm lint      # リント
pnpm check     # 品質チェック（format + type-check + lint + test）
```

---

## ⚡ 5-2. Biome 2.4 注意ルール

Biome 2.4 では 24 個の `nursery` ルールが安定版に昇格した。
lint エラーが出た場合はまず `npx @biomejs/biome migrate` を実行し、その後下記ルール一覧を確認すること。

### マイグレーションコマンド（Biome バージョンアップ時のみ実行）

```bash
npx @biomejs/biome migrate
```

このコマンドは `$schema` URL の更新・非推奨設定の置換・nursery ルールの扱い更新を自動処理する。

### 主要な昇格ルール一覧

| ルール名 | カテゴリ | 説明 |
|----------|----------|------|
| `noImportCycles` | correctness | 循環 import の検出 |
| `noUselessUndefined` | correctness | 不要な `undefined` の明示 |
| `noUnresolvedImports` | correctness | 未解決 import の検出 |
| `noDeprecatedImports` | correctness | 非推奨 import の検出 |
| `useConsistentArrowReturn` | style | アロー関数の return の一貫性 |
| `noJsxLiterals` | style | JSX 内リテラル文字列の制限 |
| `noReactForwardRef` | style | `React.forwardRef` の使用禁止（React 19 非推奨） |
| `useAtIndex` | style | 配列の末尾アクセスに `.at()` を使用 |
| `useExplicitType` | style | 明示的な型アノテーション |
| `noExcessiveNestedTestSuites` | complexity | テストのネスト深さ制限 |
| `noConstantMathMinMaxClamp` | correctness | `Math.min`/`Math.max` の定数クランプ |

### よくある lint エラーと対処

| エラー | 説明 | 対処 |
|--------|------|------|
| `noImportCycles` | 循環 import が存在する | レイヤー依存方向（Presentation→Application→Domain）を修正 |
| `noReactForwardRef` | `forwardRef` を使用している | React 19 スタイルに移行（下記参照）or `off` に設定 |
| `noUselessUndefined` | `= undefined` が不要 | 削除する |
| `noUnresolvedImports` | import パスが解決できない | `@/` alias や相対パスを確認 |
| `useConsistentArrowReturn` | アロー関数の return が不一致 | `() => value` か `() => { return value; }` に統一 |

### React 19 対応: `noReactForwardRef`

```typescript
// NG（Biome 2.4 が警告）
import { forwardRef } from 'react';
const MyComponent = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref} {...props} />;
});

// OK（React 19 スタイル）
const MyComponent = ({ ref, ...props }: Props & { ref?: React.Ref<HTMLDivElement> }) => {
  return <div ref={ref} {...props} />;
};
```

### `types` linterドメイン（型推論ベース）

```jsonc
// biome.json で有効化（任意）
{
  "linter": {
    "domains": {
      "types": "on"
    }
  }
}
```

### 特定ルールの無効化

```jsonc
{
  "linter": {
    "rules": {
      "style": {
        "noJsxLiterals": "off",
        "noReactForwardRef": "warn"
      },
      "correctness": {
        "noImportCycles": "error"
      }
    }
  }
}
```

---

## 🔁 6. structuredClone 推奨（cloneDeep の代替）

オブジェクトの深いコピーが必要な場合、**プリミティブ値・配列・プレーンオブジェクト**のみを含む単純な構造には `structuredClone` を使用する。
`cloneDeep`（es-toolkit / lodash）は循環参照・関数・Map/Set・class インスタンスが混在する場合にのみ使用する。

```typescript
// ✅ 推奨: シンプルなオブジェクトは structuredClone（外部依存なし）
const copy = structuredClone(plainObject);
const copy = structuredClone(arrayOfObjects);

// ✅ 正しい: 循環参照・関数・class インスタンスを含む場合は cloneDeep
import { cloneDeep } from 'es-toolkit';
const copy = cloneDeep(complexObjectWithClassInstances);

// ❌ 禁止: 単純なオブジェクトに cloneDeep を使う（過剰な依存）
import { cloneDeep } from 'es-toolkit';
const copy = cloneDeep({ name: 'Alice', age: 30 }); // structuredClone で十分
```

### structuredClone が使えないケース

| ケース | 理由 | 代替 |
|--------|------|------|
| 関数を含む | クローン不可（TypeError） | `cloneDeep` |
| class インスタンス | prototype が失われる | `cloneDeep` |
| 循環参照 | structuredClone は処理できる（v8以降） | そのまま使用可 |
| Map / Set | structuredClone は処理できる（v8以降） | そのまま使用可 |

> `structuredClone` は Node.js 17+ / V8 環境で標準対応。
> このプロジェクトでは Next.js 16 + Node.js 22 を使用しているため問題なし。

---

## 🔍 7. 重複関数検出ルール

**新しいユーティリティ・ヘルパー関数を作成する前に、必ず既存実装を検索すること。**
同一ロジックが別ファイルに存在する場合は作成禁止。既存関数を再利用・または共通化すること。

### 検索手順

```bash
# 1. 既存ユーティリティを検索（機能キーワードで検索）
grep -r "関数名候補" src/
grep -r "類似キーワード" src/layers/

# 2. 既存の utils ディレクトリを確認
ls src/layers/infrastructure/utils/
ls src/layers/application/utils/
ls src/lib/
```

### よくある重複パターン

```typescript
// ❌ 禁止: 既存の toErrorMeta を知らずに自作
const getErrorInfo = (error: unknown) => ({
  message: error instanceof Error ? error.message : 'Unknown',
  stack: error instanceof Error ? error.stack : undefined,
});

// ✅ 正しい: 既存ヘルパーを使用
import { toErrorMeta } from '@/layers/infrastructure/utils/toErrorMeta';
this.logger.error('失敗', { ...toErrorMeta(error) });

// ❌ 禁止: 既存の mapPrismaError を知らずにインライン実装
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
  throw new DomainError('重複エラー', 'DUPLICATE');
}

// ✅ 正しい: 既存ヘルパーを使用
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
mapPrismaError(error, { p2002Email: '重複エラー' });
```

### 重複を防ぐ習慣

- 実装前に `Grep` で既存コードを検索する
- `src/layers/*/utils/` と `src/lib/` を定期的に把握しておく
- 3か所以上で同じロジックが使われていれば共通化を検討する

---

## 📋 8. Zod 組み込みバリデーター優先

**カスタム正規表現でバリデーションを実装する前に、Zod の組み込みバリデーターを確認すること。**
`z.string().regex(...)` より組み込み関数の方が可読性・保守性が高い。

```typescript
// ✅ 推奨: Zod 組み込みバリデーター
import { z } from 'zod';

const schema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  url: z.url('有効なURLを入力してください'),
  uuid: z.uuid('有効なUUIDを入力してください'),
  ip: z.string().ip('有効なIPアドレスを入力してください'),
  datetime: z.string().datetime('有効な日時を入力してください'),
  cuid: z.string().cuid(),
  ulid: z.string().ulid(),
  nanoid: z.string().nanoid(),
});

// ❌ 禁止: 組み込みが存在するのにカスタム正規表現を使う
const emailSchema = z.string().regex(
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  '有効なメールアドレスを入力してください',
); // .email() で十分

const urlSchema = z.string().regex(
  /^https?:\/\/.+/,
  '有効なURLを入力してください',
); // .url() で十分
```

### Zod 組み込みバリデーター一覧（よく使うもの）

| メソッド | 検証内容 |
|---------|---------|
| `.email()` | メールアドレス形式 |
| `.url()` | URL形式（http/https等） |
| `.uuid()` | UUID v4形式 |
| `.cuid()` / `.cuid2()` | CUID形式 |
| `.ulid()` | ULID形式 |
| `.nanoid()` | nanoid形式 |
| `.ip()` | IPアドレス（IPv4/IPv6） |
| `.datetime()` | ISO 8601形式 |
| `.date()` | 日付文字列（YYYY-MM-DD） |
| `.time()` | 時刻文字列（HH:MM:SS） |
| `.emoji()` | 絵文字文字列 |
| `.base64()` | Base64形式 |
| `.trim()` | 前後の空白除去 |
| `.toLowerCase()` / `.toUpperCase()` | 大文字小文字変換 |
| `.min(n)` / `.max(n)` | 文字列長・数値範囲 |

### カスタム正規表現が許可されるケース

- Zod 組み込みに相当する機能がない場合のみ（例: 特定の業務コード形式）
- コメントで「組み込みバリデーターでは対応不可のため」と理由を明記すること

---

## 🚫 9. 薄いラッパー禁止

**一つの関数を呼ぶだけで独自ロジックを追加しない「薄いラッパー」は作成禁止。**
ラッパーを作るなら、それが意味のある抽象化（エラーハンドリング・変換・バリデーション等）を追加していること。

```typescript
// ❌ 禁止: 1関数を呼ぶだけ（薄いラッパー）
function getUser(id: string) {
  return userRepository.findById(id);
}

// ❌ 禁止: 引数を渡すだけ
function formatDate(date: Date) {
  return format(date, 'yyyy/MM/dd');
}

// ❌ 禁止: 型キャストのみ
function toUserId(id: string): UserId {
  return id as UserId;
}
```

```typescript
// ✅ 許可: エラーハンドリングを追加している
async function getUser(id: string): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
  return user;
}

// ✅ 許可: バリデーションを追加している
function formatUserDate(user: User): string {
  if (!user.birthDate) return '未設定';
  return format(user.birthDate, 'yyyy/MM/dd');
}

// ✅ 許可: 複数の操作を組み合わせている
async function createUserWithProfile(data: CreateUserData): Promise<User> {
  const user = await userRepository.save(data);
  await profileRepository.initializeFor(user.id);
  return user;
}
```

### 判定基準

| ラッパーの中身 | 判定 |
|---------------|------|
| 1関数を呼ぶだけ | 禁止 |
| 引数を変えずに渡すだけ | 禁止 |
| エラーハンドリング追加 | 許可 |
| バリデーション追加 | 許可 |
| 複数操作の組み合わせ | 許可 |
| 型変換（Value Object生成等） | 許可 |

---

## ✅ コーディング規約チェックリスト

### Import

- [ ] `@/` alias を使用している
- [ ] 相対パスを使用していない
- [ ] index.ts 経由のimportを使用していない
- [ ] ユーティリティ関数は `es-toolkit` から直接 import している（`lodash`/`lodash-es` 使用禁止）

### CSS/スタイリング

- [ ] クリッカブル要素に `cursor-pointer` を付与している
- [ ] `cn()` 関数でクラス名を結合している（TailwindCSS）— 必ず `@/lib/utils` からimportすること（`@/lib/utils-shadcn` からのimportは禁止）
- [ ] CSS変数は `bg-[var(--primary)]` 形式

### 命名規約

- [ ] コンポーネント/クラス: PascalCase
- [ ] 関数/変数: camelCase
- [ ] 定数/トークン: UPPER_SNAKE_CASE
- [ ] ファイル名: kebab-case（コンポーネント除く）
- [ ] boolean 変数: is/has/should/can prefix

### コメント

- [ ] Why を説明している（What ではない）
- [ ] 型アノテーションコメントを避けている
- [ ] 引数の意味が不明確な場合、インラインコメントを付与している
- [ ] TODO/FIXME/NOTEを適切に使い分けている

### オブジェクト操作

- [ ] シンプルなオブジェクトの深いコピーには `structuredClone` を使用している（`cloneDeep` は不要な場合に使わない）
- [ ] 新規ユーティリティ作成前に既存実装を検索している（重複関数を作らない）

### バリデーション

- [ ] Zod 組み込みバリデーター（`.email()`, `.url()`, `.uuid()` 等）を優先使用している
- [ ] カスタム正規表現は組み込みが存在しない場合のみ使用し、理由をコメントで明記している

### 抽象化

- [ ] 薄いラッパー（1関数を呼ぶだけ）を作成していない
- [ ] ラッパーを作る場合、エラーハンドリング・バリデーション・複数操作の組み合わせ等の意味のある追加ロジックがある

### Biome

- [ ] `pnpm format` でフォーマット済み
- [ ] `pnpm lint` でエラーなし
- [ ] `noExplicitAny` エラーを解消している

---

## 🚀 適用方法

### 新規コード作成時

1. Import Rules を確認（`@/` alias 必須）
2. 命名規約を確認（PascalCase/camelCase/UPPER_SNAKE_CASE）
3. cursor-pointer を付与（クリッカブル要素）
4. Why を説明するコメントを追加
5. `pnpm check` で検証

### 既存コード修正時

1. 相対パスを `@/` alias に変更
2. クリッカブル要素に cursor-pointer 追加
3. 命名規約違反を修正
4. 不要なコメント（What）を削除、Why コメントを追加
5. `pnpm format` → `pnpm lint` → `pnpm check`

---

---

## 🔗 6. ルーティング規約

### 基本ルール

全てのページ遷移は `src/lib/routes.ts` の `routes` 定数経由で行うこと。

```typescript
// ✅ 正しい: routes定数経由
import { routes } from '@/lib/routes';
router.push(routes.users.list());
router.push(routes.users.detail(userId));
<Link href={routes.users.edit(userId)}>

// ❌ 禁止: 文字列リテラル直接指定
router.push('/users');
<Link href={`/users/${id}`}>
```

- 新ページ追加時は `src/lib/routes.ts` にルート定数を必ず追加する
- search params がある場合は型定義（`interface`）と URLSearchParams ビルド関数も追加する
- 詳細は `typesafe-routing` スキル参照

**例外（文字列リテラルのまま残してよいもの）:**

- `/api/auth/signin?callbackUrl=/` / `/api/auth/signout?callbackUrl=/` — NextAuth API ルート
- 未実装ページ（`/privacy`, `/terms`, `/contact`, `/help` 等）

---

## 📅 7. 日付フォーマット

### 基本ルール

日付の表示・操作は **`@/utils/dfUtils.ts`** 経由で統一すること。

```typescript
// ✅ 正しい: dfUtils.ts 経由
import { formatJaDate, formatJaDateTime } from '@/utils/dfUtils';
formatJaDate(user.createdAt)
formatJaDateTime(user.updatedAt)

// ❌ 禁止: ネイティブDate API直接使用
new Date(x).toLocaleDateString('ja-JP')
new Date(x).toLocaleTimeString()
new Date(x).toLocaleString('ja-JP')
```

- `toISOString()` はタイムスタンプログ・セッションexpires等の**機械可読値**には使用可（UI表示には禁止）
- 詳細は `date-formatting` スキル参照

---

## ⚠️ 8. Deprecated API リスト

以下の API は非推奨または廃止済みです。コードレビュー・新規実装時は必ず代替 API を使用してください。

### React イベントハンドラ

| 非推奨 API | 代替 API | 理由 |
|-----------|---------|------|
| `onKeyPress` | `onKeyDown` | HTML仕様で非推奨。一部ブラウザで動作しない場合がある |
| `onKeyUp` | - | 基本は `onKeyDown` を使用（keyUp は特殊ケースのみ） |

```tsx
// ❌ 非推奨
<Input onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />

// ✅ 正しい
<Input onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
```

### lint 抑制コメント

| 非推奨 | 代替 | 理由 |
|--------|------|------|
| `// eslint-disable-next-line` | `// biome-ignore lint/...` | このプロジェクトは Biome を使用（ESLint は未導入） |
| `// eslint-disable` | `// biome-ignore lint/...` | 同上 |

```typescript
// ❌ 非推奨（ESLint未導入なので無意味）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const value: any = unknown;

// ✅ 正しい（Biome の suppression コメント）
// biome-ignore lint/suspicious/noExplicitAny: 外部ライブラリとの互換性のため
const value: any = unknown;
```

### Tailwind CSS

| 非推奨 | 代替 | バージョン |
|--------|------|----------|
| `bg-opacity-50` | `bg-black/50` | v3 → v4 |
| `text-opacity-80` | `text-gray-500/80` | v3 → v4 |
| `tailwindcss/defaultTheme` からの JS 読み取り | CSS変数 or 定数定義 | v3 → v4（@theme inline 移行） |

このスキルを活用し、統一されたコーディングスタイルを維持してください。

---

## 重複関数の禁止

同一ファイル内に同様のロジックを持つ関数が2つ以上存在する場合、内部共通関数に抽出すること。

## 条件分岐の配列化

3つ以上の同パターン if 文は配列 + ループに変換すること:

```tsx
// BAD: 同パターンの if が3つ以上
if (services.userRepo) container.register(TOKEN.UserRepo, services.userRepo);
if (services.sessionRepo) container.register(TOKEN.SessionRepo, services.sessionRepo);
if (services.hashService) container.register(TOKEN.HashService, services.hashService);

// GOOD: 配列化
const tokenMap = { userRepo: TOKEN.UserRepo, sessionRepo: TOKEN.SessionRepo, ... };
for (const [key, token] of Object.entries(tokenMap)) {
  const instance = services[key];
  if (instance) container.register(token, instance);
}
```

## 共有型（interface/type）の再利用ルール

同一の `interface` または `type` を複数のファイルで重複定義することは禁止。
既存の `export interface` / `export type` を `import` して再利用すること。

### 禁止パターン

```typescript
// ❌ 禁止: UserProfile を 2 つのファイルで定義
// --- components/UserCard.tsx ---
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// --- components/UserList.tsx ---
interface UserProfile {  // 同じ定義が別ファイルにも存在
  id: string;
  name: string;
  email: string;
}
```

### 正しいパターン

```typescript
// ✅ 共通型ファイルに定義して import で再利用
// --- types/user.ts ---
export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// --- components/UserCard.tsx ---
import type { UserProfile } from '@/types/user';

// --- components/UserList.tsx ---
import type { UserProfile } from '@/types/user';
```

### 共有型の配置ガイド

| 型の種類 | 配置先 |
|---------|-------|
| Domain エンティティ型 | `src/layers/domain/entities/` の Entity クラスが型を公開 |
| UseCase の Request/Response 型 | `src/layers/application/usecases/<name>/<Name>UseCase.ts` |
| Server Action の戻り値型 | `src/layers/presentation/actions/<name>/` |
| UI コンポーネント共通型 | `src/types/` または同一ディレクトリの `types.ts` |
| フォームスキーマ型 | フォームコンポーネントと同一ファイルで export |

---

## biome-ignore noStaticOnlyClass

静的メンバーのみのクラスはモジュールスコープの変数 + export 関数に変換すること。`biome-ignore` で抑制しないこと。
