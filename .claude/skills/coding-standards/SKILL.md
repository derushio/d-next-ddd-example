---
name: coding-standards
description: |
  コーディング規約の自動適用。Import Rules、命名規約、CSS規約、コメント規約。

  トリガー例:
  - 「コーディング規約を確認」「スタイル規約」「命名規則」
  - 「import文の書き方」「cursor-pointerルール」
  - コードファイルを作成・編集するとき（軽量なので常時適用OK）

  ※ アーキテクチャ原則は best-practices スキルが提供
  ※ UIパターンは frontend-patterns スキルが提供
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
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
 * @returns {Promise<Result<CreateUserResponse>>} レスポンス
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
async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>>
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

## ✅ コーディング規約チェックリスト

### Import

- [ ] `@/` alias を使用している
- [ ] 相対パスを使用していない
- [ ] index.ts 経由のimportを使用していない

### CSS/スタイリング

- [ ] クリッカブル要素に `cursor-pointer` を付与している
- [ ] `cn()` 関数でクラス名を結合している（TailwindCSS）
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

このスキルを活用し、統一されたコーディングスタイルを維持してください。
