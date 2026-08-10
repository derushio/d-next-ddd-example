---
name: pagination-constants
description: |
  ページネーションデフォルト値の定数管理を強制するスキル。
  DEFAULT_PAGE_SIZE, DEFAULT_PAGE, MAX_PAGE_SIZE を一元管理し、
  ハードコードされた数値リテラルを禁止する。

  トリガー例:
  - 「ページネーション」「pagination」「page size」「limit」
  - `limit`, `pageSize`, `PAGE_SIZE`, `?? 10`, `.default(10)` を書こうとしたとき
  - src/layers/application/constants/pagination.ts 編集時
  - 一覧画面、検索結果のページング実装時
globs:
  - "src/layers/application/**/*.ts"
---

# Pagination Constants

## 目的

ページネーションのデフォルト値を一元管理し、
ハードコードされた数値リテラル（`10`, `1`, `100`）を排除する。

## 定数ファイル

`src/layers/application/constants/pagination.ts`

| 定数 | 値 | 用途 |
|------|-----|------|
| `DEFAULT_PAGE` | `1` | デフォルトページ番号 |
| `DEFAULT_PAGE_SIZE` | `10` | デフォルト表示件数 |
| `MAX_PAGE_SIZE` | `100` | 最大表示件数 |

## 正しいパターン

```typescript
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/layers/application/constants/pagination';

// Zod スキーマ
const schema = z.object({
  page: z.int().min(1).optional().default(DEFAULT_PAGE),
  limit: z.int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
});

// Repository
skip: (page - 1) * (limit ?? DEFAULT_PAGE_SIZE),
take: limit ?? DEFAULT_PAGE_SIZE,

// UI コンポーネント
const PAGE_SIZE = DEFAULT_PAGE_SIZE;
```

## 禁止パターン

```typescript
// ❌ ハードコードされた数値
.default(10)
.max(100)
limit ?? 10
page ?? 1
const PAGE_SIZE = 10;
```

## 検出コマンド

```bash
# ハードコードされたページネーション値を検出
grep -rn '?? 10\|limit: 10\|\.default(10)\|PAGE_SIZE = 10' src/ --include='*.ts' --include='*.tsx' | grep -v pagination.ts
```

## チェックリスト

- [ ] ページネーション値がハードコードされていないか
- [ ] `DEFAULT_PAGE_SIZE` / `DEFAULT_PAGE` / `MAX_PAGE_SIZE` を import しているか
- [ ] Zod スキーマの `.default()` / `.max()` に定数を使用しているか

## 関連スキル

- `magic-number-constants` — マジックナンバー定数化の一般ルール
- `url-search-pagination` — 検索・ページネーション一覧画面パターン
