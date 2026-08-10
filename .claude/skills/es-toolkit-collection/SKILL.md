---
name: es-toolkit-collection
description: |
  es-toolkit を使った配列・オブジェクト操作パターンを提供するスキル。
  データ変換、フィルタリング、グルーピング等の実装パターンを扱う。

  トリガー例:
  - 「配列操作」「オブジェクト操作」「データ変換」
  - groupBy, keyBy, pick, omit, merge, chunk, uniq, sortBy
  - flatten, difference, intersection
  - 配列やオブジェクトの変換処理を実装するとき
---

# es-toolkit-collection スキル

`es-toolkit` を使った配列・オブジェクト操作の推奨パターンです。
全て `import { xxx } from 'es-toolkit'` の個別 named import で使用してください。

---

## 配列操作

### chunk — 配列を固定サイズに分割

```typescript
import { chunk } from 'es-toolkit';

// ✅ es-toolkit パターン
const pages = chunk(items, 10);
// items = [1,2,3,4,5] → [[1,2],[3,4],[5]]（size=2の場合）

// ❌ 手書きパターン（冗長・可読性低）
const pages = items.reduce<number[][]>((acc, item, i) => {
  if (i % 10 === 0) acc.push([]);
  acc[acc.length - 1].push(item);
  return acc;
}, []);
```

### uniq / uniqBy — 重複除去

```typescript
import { uniq, uniqBy } from 'es-toolkit';

// ✅ プリミティブの重複除去
const unique = uniq([1, 2, 2, 3, 3, 3]);
// → [1, 2, 3]

// ✅ オブジェクトの重複除去（キー指定）
const users = [
  { id: 1, name: '田中' },
  { id: 2, name: '佐藤' },
  { id: 1, name: '田中（重複）' },
];
const uniqueUsers = uniqBy(users, (u) => u.id);
// → [{ id: 1, name: '田中' }, { id: 2, name: '佐藤' }]

// ❌ 手書きパターン
const unique = [...new Set(arr)]; // プリミティブのみ対応
const uniqueUsers = users.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);
```

### groupBy — グルーピング

```typescript
import { groupBy } from 'es-toolkit';

// ✅ es-toolkit パターン
const orders = [
  { id: 1, status: 'pending', amount: 100 },
  { id: 2, status: 'completed', amount: 200 },
  { id: 3, status: 'pending', amount: 300 },
];
const byStatus = groupBy(orders, (o) => o.status);
// → { pending: [...], completed: [...] }

// ❌ 手書き .reduce() パターン（毎回書くのは冗長）
const byStatus = orders.reduce<Record<string, typeof orders>>((acc, o) => {
  (acc[o.status] ??= []).push(o);
  return acc;
}, {});
```

### keyBy — キーでインデックス化

```typescript
import { keyBy } from 'es-toolkit';

// ✅ ID → オブジェクトのマップ生成
const usersById = keyBy(users, (u) => u.id);
// → { '1': { id: 1, ... }, '2': { id: 2, ... } }

// ❌ 手書きパターン
const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
```

### sortBy — ソート

```typescript
import { sortBy } from 'es-toolkit';

// ✅ 複数キーでのソート
const sorted = sortBy(users, [(u) => u.lastName, (u) => u.firstName]);

// ❌ 複数キー手書きソート（複雑で可読性低）
const sorted = [...users].sort((a, b) => {
  if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
  return a.firstName.localeCompare(b.firstName);
});
```

### difference / intersection — 集合演算

```typescript
import { difference, intersection } from 'es-toolkit';

const a = [1, 2, 3, 4, 5];
const b = [3, 4, 5, 6, 7];

// ✅ 差集合（a にあって b にないもの）
const diff = difference(a, b); // → [1, 2]

// ✅ 積集合（両方にあるもの）
const inter = intersection(a, b); // → [3, 4, 5]
```

### flatten — ネスト配列の平坦化

```typescript
import { flatten, flattenDeep } from 'es-toolkit';

// ✅ 1段階平坦化
const flat = flatten([[1, 2], [3, [4, 5]]]);
// → [1, 2, 3, [4, 5]]

// ✅ 完全平坦化
const deep = flattenDeep([[1, [2, [3, [4]]]]]);
// → [1, 2, 3, 4]
```

### sample — ランダム要素取得

```typescript
import { sample } from 'es-toolkit';

// ✅ ランダムに1要素を取得
const random = sample(['apple', 'banana', 'cherry']);
// → 'banana'（毎回ランダム）
```

---

## オブジェクト操作

### pick / omit — プロパティの選択・除外

```typescript
import { pick, omit } from 'es-toolkit';

const user = { id: 1, name: '田中', email: 'tanaka@example.com', password: 'hashed' };

// ✅ 必要なプロパティだけ選択（APIレスポンス整形等）
const publicUser = pick(user, ['id', 'name', 'email']);
// → { id: 1, name: '田中', email: '...' }

// ✅ 不要なプロパティを除外（password等の機密情報を除く）
const safeUser = omit(user, ['password']);
// → { id: 1, name: '田中', email: '...' }

// ❌ 分割代入での除外（変数名が残る）
const { password, ...safeUser } = user; // password が未使用変数になる
```

### merge — オブジェクトの深いマージ

```typescript
import { merge } from 'es-toolkit';

// ✅ ネストされたオブジェクトのマージ（第1引数を変更）
const defaults = { theme: { color: 'blue', size: 'md' }, lang: 'ja' };
const overrides = { theme: { color: 'red' } };
const config = merge({}, defaults, overrides);
// → { theme: { color: 'red', size: 'md' }, lang: 'ja' }

// ❌ スプレッド演算子（シャロー: ネストが上書きされる）
const config = { ...defaults, ...overrides };
// → { theme: { color: 'red' }, lang: 'ja' }  ← size が消える！
```

### clone / cloneDeep — コピー

```typescript
import { clone, cloneDeep } from 'es-toolkit';

// ✅ シャローコピー（ネストなし or ネストを参照したい場合）
const shallowCopy = clone(obj);

// ✅ ディープコピー（完全独立したコピーが必要な場合）
const deepCopy = cloneDeep(complexObj);
```

**`cloneDeep` vs `structuredClone` の使い分け:**

| | `cloneDeep` | `structuredClone` |
|---|---|---|
| 対象 | 汎用（関数・Symbol・プロトタイプ対応） | プレーンデータ（JSON相当） |
| 関数 | コピー可能 | エラーになる |
| Symbol | コピー可能 | 無視される |
| クラスインスタンス | プロトタイプ保持 | プレーンオブジェクトに変換 |
| 推奨場面 | ドメインオブジェクトなど複雑な構造 | 純粋なデータ転送オブジェクト（DTO） |

```typescript
// ✅ DTO（プレーンデータ）のコピーは structuredClone でよい
const dtoCopy = structuredClone(responseDto);

// ✅ クラスインスタンスや関数を含むオブジェクトは cloneDeep
const entityCopy = cloneDeep(domainEntity);
```

---

## ガード・判定

### isEmpty — 空チェック

```typescript
import { isEmpty } from 'es-toolkit';

// ✅ 配列・オブジェクト・文字列の空チェック（型を問わず統一）
isEmpty([]);          // → true
isEmpty({});          // → true
isEmpty('');          // → true
isEmpty([1, 2]);      // → false
isEmpty({ a: 1 });   // → false

// ❌ 型ごとにバラバラな書き方
arr.length === 0;
Object.keys(obj).length === 0;
str === '';
```

### isNil — null/undefined チェック

```typescript
import { isNil } from 'es-toolkit';

// ✅ null と undefined をまとめてチェック
if (isNil(value)) {
  // value が null または undefined
}

// ❌ 冗長な二重チェック
if (value === null || value === undefined) { ... }
```

### isEqual — 深い同値比較

```typescript
import { isEqual } from 'es-toolkit';

// ✅ オブジェクト・配列の深い比較
const prev = { user: { id: 1, roles: ['admin'] } };
const next = { user: { id: 1, roles: ['admin'] } };

isEqual(prev, next); // → true（参照が異なっても値が同じならtrue）

// ❌ 参照比較（常にfalse）
prev === next; // → false（別参照）

// ❌ JSON.stringify（順序依存・関数/Symbol非対応）
JSON.stringify(prev) === JSON.stringify(next);
```

## omitBy + isNil パターン

オブジェクトから undefined/null 値を除外する場合は `omitBy` + `isNil` を使用:

```tsx
import { omitBy, isNil } from 'es-toolkit';

const params = omitBy({ page: 1, search: undefined, sort: 'name' }, isNil);
// → { page: 1, sort: 'name' }
```
