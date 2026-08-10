---
name: es-toolkit-basics
description: |
  es-toolkit の基本ルール・import規約・lodash移行ガイドを提供するスキル。
  lodash-es/lodash の使用を禁止し、es-toolkit の個別 named import を徹底する。
  min()/max() による Math.min(...spread) 代替（大きな配列でのスタックオーバーフロー防止）、
  compact() による手書き filterNull 代替も提供。

  トリガー例:
  - 「es-toolkit」「lodash」「ユーティリティライブラリ」
  - lo. を含むコード発見時
  - src/utils/ 配下のユーティリティ編集時
  - 「Math.min(...arr)」「Math.max(...arr)」「スプレッド演算子」「スタックオーバーフロー」
  - 「compact」「filterNull」「null除去」「undefined除去」
---

# es-toolkit-basics スキル

このプロジェクトでは `es-toolkit` をユーティリティライブラリとして採用しています。
lodash / lodash-es は**完全禁止**です。個別の named import を徹底してください。

---

## ルール

### 必須: es-toolkit の個別 named import を使用

**禁止パターン:**

```typescript
// ❌ 禁止: lodash インポート（一切使用禁止）
import _ from 'lodash';
import _ from 'lodash-es';
import * as _ from 'lodash-es';

// ❌ 禁止: namespace import（バンドルサイズ増大）
import * as esToolkit from 'es-toolkit';

// ❌ 禁止: ラッパーオブジェクト経由の呼び出し
const lo = { debounce, groupBy };
lo.debounce(fn, 300);
```

**推奨パターン:**

```typescript
// ✅ 正しい: 個別 named import
import { debounce, groupBy, pick } from 'es-toolkit';

// ✅ 正しい: compat サブパス（完全互換が必要な場合のみ）
import { padStart } from 'es-toolkit/compat';
```

### es-toolkit/compat の使い分け

`es-toolkit/compat` は lodash との API 完全互換レイヤーです。
**既存の lodash コードを段階的に移行する場合のみ**使用し、
新規コードでは必ず `es-toolkit` 本体から import してください。

```typescript
// ❌ 新規コードでの compat 使用（理由なき場合）
import { chunk } from 'es-toolkit/compat';

// ✅ 新規コードは本体から
import { chunk } from 'es-toolkit';
```

---

## バンドルサイズ・パフォーマンス

| 比較項目 | lodash | es-toolkit |
|----------|--------|------------|
| バンドルサイズ削減 | 基準 | 最大 **97%** 小 |
| 実行速度 | 基準 | **2〜3倍** 高速 |
| TypeScript サポート | 追加型定義が必要 | **ネイティブ** |
| Tree-shaking | 非対応（全体import時） | **完全対応** |

---

## lodash → es-toolkit 主要関数マッピング

### 関数ユーティリティ

| lodash | es-toolkit | 備考 |
|--------|------------|------|
| `_.debounce(fn, ms)` | `debounce(fn, ms)` | |
| `_.throttle(fn, ms)` | `throttle(fn, ms)` | |
| `_.once(fn)` | `once(fn)` | |
| `_.memoize(fn)` | `memoize(fn)` | |
| `_.delay(fn, ms)` | `delay(ms)` | APIが異なる（下記参照） |

### 配列操作

| lodash | es-toolkit | 備考 |
|--------|------------|------|
| `_.chunk(arr, size)` | `chunk(arr, size)` | |
| `_.uniq(arr)` | `uniq(arr)` | |
| `_.uniqBy(arr, fn)` | `uniqBy(arr, fn)` | |
| `_.groupBy(arr, fn)` | `groupBy(arr, fn)` | |
| `_.keyBy(arr, fn)` | `keyBy(arr, fn)` | |
| `_.sortBy(arr, fn)` | `sortBy(arr, fn)` | |
| `_.flatten(arr)` | `flatten(arr)` | |
| `_.flattenDeep(arr)` | `flattenDeep(arr)` | |
| `_.difference(a, b)` | `difference(a, b)` | |
| `_.intersection(a, b)` | `intersection(a, b)` | |
| `_.sample(arr)` | `sample(arr)` | |

### オブジェクト操作

| lodash | es-toolkit | 備考 |
|--------|------------|------|
| `_.pick(obj, keys)` | `pick(obj, keys)` | |
| `_.omit(obj, keys)` | `omit(obj, keys)` | |
| `_.merge(obj, src)` | `merge(obj, src)` | |
| `_.clone(obj)` | `clone(obj)` | シャローコピー |
| `_.cloneDeep(obj)` | `cloneDeep(obj)` | ディープコピー |
| `_.isEmpty(val)` | `isEmpty(val)` | |
| `_.isNil(val)` | `isNil(val)` | |
| `_.isEqual(a, b)` | `isEqual(a, b)` | deep equality |

### 数値ユーティリティ

| lodash | es-toolkit | 備考 |
|--------|------------|------|
| `_.random(min, max)` | `random(min, max)` | セキュリティ用途は crypto を使え |
| `_.round(val, prec)` | `round(val, prec)` | |

---

## 既存コードの移行手順

```bash
# lodash 使用箇所の検索
grep -rn "from 'lodash'\|from 'lodash-es'\|require('lodash')" src/ --include="*.ts" --include="*.tsx"

# ラッパーオブジェクト使用の検索
grep -rn "\blo\.\|import \* as" src/ --include="*.ts" --include="*.tsx"
```

移行の流れ:

1. 上記で使用箇所を特定する
2. `es-toolkit` の対応関数をマッピング表で確認する
3. API 差異がある場合は `es-toolkit/compat` で対応（最終的には本体へ移行）
4. `package.json` から `lodash` / `lodash-es` 依存を削除する

---

## min() / max() — Math.min/max のスプレッド禁止

**大きな配列に `Math.min(...arr)` や `Math.max(...arr)` を使用してはならない。**
スプレッド演算子で配列を引数展開すると、要素数がコールスタックの上限（通常 ~10万）を超えた場合に
`Maximum call stack size exceeded` エラーが発生する。

```typescript
// ❌ 禁止: スプレッドによる Math.min/max（大きな配列でスタックオーバーフロー）
const min = Math.min(...numbers);
const max = Math.max(...numbers);

// ✅ 推奨: es-toolkit の min() / max()（配列長に依存しない安全な実装）
import { min, max } from 'es-toolkit';

const minimum = min(numbers);   // 最小値（空配列は undefined を返す）
const maximum = max(numbers);   // 最大値（空配列は undefined を返す）
```

### 空配列の扱い

`min()` / `max()` は空配列に対して `undefined` を返す（`Math.min()` / `Math.max()` は `Infinity` / `-Infinity`）。
空配列の可能性がある場合は `?? defaultValue` でフォールバックすること。

```typescript
import { min, max } from 'es-toolkit';

const values: number[] = [];
const minimum = min(values) ?? 0;   // undefined → 0 にフォールバック
const maximum = max(values) ?? 100; // undefined → 100 にフォールバック
```

### スモールサイズの配列でも統一する

要素数が少ない場合でも `min()` / `max()` に統一することで、将来的な配列サイズ増大への耐性を確保する。

```typescript
// 小さな配列でも es-toolkit を使う（将来サイズが増大しても安全）
const scores = [85, 92, 78, 95, 88];
const highestScore = max(scores);  // ✅
const lowestScore = min(scores);   // ✅
```

---

## compact() — null/undefined の除去

**手書きの `filter(x => x !== null && x !== undefined)` の代わりに `compact()` を使用すること。**

```typescript
// ❌ 禁止: 手書きの null/undefined フィルタリング
const filtered = items.filter(item => item !== null && item !== undefined);
const filtered = items.filter(item => !!item);                              // falsy も除去（意図が不明確）
const filtered = items.filter(Boolean);                                     // 同上

// ✅ 推奨: compact()（null, undefined, false, 0, '' を除去）
import { compact } from 'es-toolkit';

const filtered = compact(items);  // null, undefined, false, 0, '' がすべて除去される
```

### compact() が除去する値

```typescript
compact([0, 1, false, true, '', 'hello', null, undefined, NaN]);
// → [1, true, 'hello']
// 除去: 0, false, '', null, undefined, NaN（falsy 値すべて）
```

### null/undefined のみ除去したい場合

`compact()` は `false`, `0`, `''` も除去する。`null`/`undefined` のみを除去したい場合は以下を使用:

```typescript
// null/undefined のみ除去（false, 0, '' は残す）
import { isNil } from 'es-toolkit';

const filtered = items.filter(item => !isNil(item));
// または TypeScript の型ガードを使用
const filtered = items.filter((item): item is NonNullable<typeof item> => item != null);
```

---

## isEmpty による空文字チェック

`value.trim().length === 0` パターンは `isEmpty` に置換すること（Domain層を除く）:

```tsx
// BAD
if (!value || value.trim().length === 0) { ... }

// GOOD
import { isEmpty } from 'es-toolkit';
if (isEmpty(value?.trim())) { ... }
```

**例外**: Domain層（`src/layers/domain/`）は外部ライブラリ依存を最小化するため、手動チェックを許容する。

---

## 詳細なパターン

- **配列・オブジェクト操作**: `es-toolkit-collection` スキル参照
- **debounce/throttle/delay**: `es-toolkit-function` スキル参照
