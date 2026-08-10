---
name: magic-number-constants
description: |
  UI/ビジネスロジックのマジックナンバーを定数化するルールを提供するスキル。
  ページサイズ、リトライ回数、タイムアウト等の数値リテラルを定数として定義する。

  トリガー例:
  - ページネーション実装時
  - リトライ・タイムアウト実装時
  - 「マジックナンバー」「定数化」「ハードコード」
  - 数値リテラルが 2箇所以上で使われている場合
  - 「Makefile」「ポート番号」「DB_PORT」「worktree ポート」
---

# マジックナンバー定数化ルール

## このスキルの目的

- ビジネスロジックやUIで使われるマジックナンバーを定数として定義する
- 同じ数値が複数箇所で使われる場合の不整合を防止する
- コードの可読性と保守性を向上させる

## 定数化すべき数値

### 必須定数化

| カテゴリ | 例 | 定数名例 |
|----------|-----|---------|
| **ページサイズ** | `10`, `20`, `50` | `PAGE_SIZE` |
| **入力文字数制限** | `100`, `255`, `1000` | `MAX_NAME_LENGTH` |
| **リトライ回数** | `3`, `5` | `MAX_RETRIES` |
| **タイムアウト** | `5000`, `30000` | `REQUEST_TIMEOUT_MS` |
| **有効期限** | `3600`, `86400` | `TOKEN_EXPIRY_SECONDS` |

### 定数化不要な数値

- **配列インデックス**: `[0]`, `issues[0]`
- **数学的定数**: `0`, `1`, `-1`（比較・初期値として）
- **CSS/Tailwind**: `p-4`, `gap-2`（Tailwindクラス内の数値）
- **Zod制約**: `.min(1)`, `.max(100)`（バリデーション定義内）

## 定数の配置ルール

### コンポーネントローカル定数

同一ファイル内でのみ使用する場合、ファイル先頭（import後、コンポーネント定義前）に定義:

```typescript
import { ... } from '...';

/** ユーザー一覧のページサイズ */
const PAGE_SIZE = 10;

export function UserListClient() { ... }
```

### 共有定数

複数ファイルで使用する場合は `src/constants/` に定義:

```typescript
// src/constants/pagination.ts
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
```

## アンチパターン

```typescript
// ❌ 禁止: 同じ数値が複数箇所に散在
const users = await getUsers({ limit: 10 });  // ここに 10
// ... 200行後 ...
{(currentPage - 1) * 10 + 1}  // ここにも 10

// ✅ 正しい: 定数で統一
const PAGE_SIZE = 10;
const users = await getUsers({ limit: PAGE_SIZE });
{(currentPage - 1) * PAGE_SIZE + 1}
```

## 命名規約

- **UPPER_SNAKE_CASE**: `PAGE_SIZE`, `MAX_RETRIES`
- **意味のある名前**: 数値の用途が分かる名前（`10` → `PAGE_SIZE`）
- **単位サフィックス**: 時間は `_MS`, `_SECONDS`, `_MINUTES` を付ける

### Pagination 定数（専用ファイル）

ページネーション定数は専用ファイルに集約する。

**場所**: `src/layers/application/constants/pagination.ts`

```typescript
/** デフォルトページ番号 */
export const DEFAULT_PAGE = 1;
/** デフォルトページサイズ */
export const DEFAULT_PAGE_SIZE = 10;
/** ページサイズの最大値 */
export const MAX_PAGE_SIZE = 100;
```

UseCase・Server Action・URL検索パラメータパースすべてでこのファイルからインポートすること。

```typescript
// ✅ UseCase でインポート
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/layers/application/constants/pagination';

const page = Math.max(DEFAULT_PAGE, params.page ?? DEFAULT_PAGE);
const pageSize = Math.min(params.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
```

詳細は `pagination-constants` スキルを参照。

---

## チェックリスト

- [ ] 同じ数値が2箇所以上で使われていない（定数化済み）
- [ ] 定数名が値の意味を表している
- [ ] 時間の定数には単位サフィックスがある
- [ ] CSS/Tailwind の数値は対象外
- [ ] ページネーション定数は `src/layers/application/constants/pagination.ts` からインポートしている

## Makefile のマジックナンバー

Makefile 内のポート番号、レンジサイズ等も定数化の対象とする。

```makefile
# ✅ 定数化
DB_PORT_MAIN := 5465
DB_PORT_RANGE_START := 5466
DB_PORT_RANGE_SIZE := 19

# ❌ ハードコード
$(shell ... awk '{print 5466 + ($$1 % 19)}')
```

### 対象
- ポート番号（DB_PORT、アプリポート）
- レンジサイズ（worktree ポート範囲）
- タイムアウト値
- リトライ回数

## 関連スキル

- `coding-standards` — コーディング規約全般
- `frontend-patterns` — フロントエンド実装パターン
