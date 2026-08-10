---
name: date-formatting
description: |
  日付フォーマットの統一ルールを自動適用するスキル。
  date-fns + dfUtils.ts経由での日付操作を徹底し、
  ネイティブDate APIの直接使用を禁止します。

  トリガー例:
  - 「日付」「フォーマット」「date-fns」「dfUtils」
  - 「日付演算」「日付比較」「isPast」「isFuture」「isAfter」「isBefore」
  - 「addMilliseconds」「subDays」
  - toLocaleDateString, toLocaleTimeString, new Date( を含むコード
  - src/utils/dfUtils.ts 編集時
  - `new Date() >`, `< new Date()`, `Date.now() +` を書こうとしたとき
---

# date-formatting スキル

日付の表示・操作を `@/utils/dfUtils.ts` 経由で統一し、ロケールや形式のばらつきを排除します。

---

## ルール

### 必須: dfUtils.ts 経由で日付操作

日付のフォーマット・比較は全て `@/utils/dfUtils.ts` 経由で行うこと。

**禁止パターン:**

```typescript
// ❌ 禁止: ネイティブDate API によるUI表示
new Date(x).toLocaleDateString('ja-JP')
new Date(x).toLocaleDateString()
new Date(x).toLocaleTimeString()
new Date(x).toLocaleString('ja-JP')
date.toLocaleString()
```

**推奨パターン:**

```typescript
// ✅ 正しい: dfUtils.ts の関数を使用
import { formatJaDate, formatJaDateTime } from '@/utils/dfUtils';

formatJaDate(user.createdAt)      // UI表示の日付
formatJaDateTime(user.updatedAt)  // UI表示の日時
```

**例外（そのまま使用してよい）:**

```typescript
// ✅ OK: 機械可読値（ログタイムスタンプ・セッション有効期限）
new Date().toISOString()           // タイムスタンプログ
new Date(Date.now() + ...).toISOString()  // セッションexpires
```

---

## 利用可能な関数・定数

`src/utils/dfUtils.ts` に定義されています。

### フォーマット定数

| 定数 | フォーマット | 用途 |
|------|------------|------|
| `dateShortFormats` | `yyyy-MM-dd` | DB保存・APIやり取り |
| `japaneseDateShortFormats` | `yyyy/MM/dd` | UI表示（スラッシュ区切り） |
| `japaneseDateLocaleFormats` | `yyyy年M月d日` | UI表示（和暦風） |
| `japaneseDateTimeLocaleFormats` | `yyyy年M月d日 HH:mm` | UI表示（和暦風 + 時刻） |
| `dateTimeShortFormats` | `yyyy-MM-dd HH:mm` | DB保存・APIやり取り（日時） |
| `japaneseDateTimeFormats` | `yyyy/MM/dd (eee) HH:mm` | UI表示（曜日付き日時） |
| `japaneseDateFormats` | `yyyy/MM/dd (eee)` | UI表示（曜日付き日付） |
| `japaneseTimeFormats` | `HH:mm` | UI表示（時刻のみ） |

### ユーティリティ関数

| 関数 | 返り値例 | 用途 |
|------|--------|------|
| `formatJaDate(date)` | `2026/03/25` | 日付表示（旧 `toLocaleDateString('ja-JP')` 相当） |
| `formatJaDateTime(date)` | `2026年3月25日 14:30` | 日時表示（旧 `toLocaleString('ja-JP')` 相当） |
| `formatJaDateTimeFull(date)` | `2026/03/25 (水) 14:30` | 曜日付き日時表示 |
| `formatTime(date)` | `14:30` | 時刻表示（旧 `toLocaleTimeString()` 相当） |
| `formatLockoutDateTime(date)` | `2026年3月25日 14:30` | ロックアウト解除日時表示 |
| `cloneDate(date)` | `Date` | Dateオブジェクトのディープコピー |

### date-fns 直接使用

高度なフォーマットが必要な場合は `dfns` をエクスポートしています：

```typescript
import { dfns } from '@/utils/dfUtils';
import { ja } from 'date-fns/locale';
// dfns は date-fns の全APIを含む
// ja は date-fns/locale から直接インポート（dfUtils はエクスポートしていない）
```

フォーマット定数と組み合わせて使用:

```typescript
import { dfns, japaneseDateFormats } from '@/utils/dfUtils';
dfns.format(new Date(), ...japaneseDateFormats)  // 2026/03/25 (水)
```

---

## 新しいフォーマット関数が必要な場合

`src/utils/dfUtils.ts` に追加する手順：

1. 既存の定数で対応できるか確認する
2. 対応できない場合のみ新しい定数または関数を追加する
3. JSDocコメント（フォーマット例を必ず記載）を付与する
4. このスキルの「利用可能な関数・定数」表を更新する

```typescript
/**
 * date-fns format 説明
 * フォーマット例（例: yyyy/MM/dd）
 */
export function formatXxx(date: Date | string | number): string {
  return dfns.format(new Date(date), ...xxxFormats);
}
```

---

## 既存コードの修正方法

既存コードにネイティブDate APIが使われている場合の対処：

```bash
# 違反箇所の検索
grep -rn "toLocaleDateString\|toLocaleTimeString\|toLocaleString" src/ --include="*.tsx" --include="*.ts"
```

置き換えの目安：

| 旧コード | 新コード |
|---------|---------|
| `new Date(x).toLocaleDateString('ja-JP')` | `formatJaDate(x)` |
| `new Date(x).toLocaleString('ja-JP')` | `formatJaDateTime(x)` |
| `new Date().toLocaleTimeString()` | `formatTime(new Date())` |
| `date.toLocaleString('ja-JP')` | `formatJaDateTime(date)` |

---

## 日付比較パターン

date-fns の `isAfter` / `isBefore` による意味的な日付比較を推奨:

```tsx
// 推奨（意味が明確）
import { isAfter } from 'date-fns';
if (isAfter(expireAt, new Date())) { /* 有効期限内 */ }

// 許容（シンプルなケース）
if (expireAt > new Date()) { /* 有効期限内 */ }
```

**例外**: Domain層は外部ライブラリ依存最小化のため `>` `<` 演算子を許容。

---

## 日付演算リファレンス

date-fns の演算関数を使うことで、`new Date(Date.now() + offset)` のようなマジック計算を避け、意図が明確なコードになります。

### 主要関数一覧

| 関数 | 用途 | 使用例 |
|------|------|--------|
| `isPast(date)` | 指定日時が過去かどうか | `isPast(session.expireAt)` |
| `isFuture(date)` | 指定日時が未来かどうか | `isFuture(token.expireAt)` |
| `isAfter(date, dateToCompare)` | date が dateToCompare より後か | `isAfter(expireAt, new Date())` |
| `isBefore(date, dateToCompare)` | date が dateToCompare より前か | `isBefore(startAt, new Date())` |
| `addMilliseconds(date, amount)` | ミリ秒を加算 | `addMilliseconds(new Date(), 3600000)` |
| `subMilliseconds(date, amount)` | ミリ秒を減算 | `subMilliseconds(expireAt, 1000)` |
| `addDays(date, amount)` | 日数を加算 | `addDays(new Date(), 30)` |
| `subDays(date, amount)` | 日数を減算 | `subDays(new Date(), 7)` |
| `addHours(date, amount)` | 時間を加算 | `addHours(new Date(), 24)` |
| `subHours(date, amount)` | 時間を減算 | `subHours(expireAt, 1)` |

### プロジェクトでの実使用例

`LoginAttemptService.ts` での使用パターン:

```typescript
import { isPast, addMilliseconds, subDays, subMilliseconds } from 'date-fns';

// ロックアウト期限チェック（isPast）
const isLocked = isPast(lockoutUntil);

// ロックアウト解除日時の計算（addMilliseconds）
const lockoutUntil = addMilliseconds(new Date(), lockoutDurationMs);

// 集計対象期間の開始日（subDays）
const since = subDays(new Date(), windowDays);

// バッファ付き有効期限（subMilliseconds）
const bufferExpireAt = subMilliseconds(expireAt, bufferMs);
```

`PrismaSessionRepository.ts` での使用パターン:

```typescript
import { isPast } from 'date-fns';

// セッション有効期限チェック（isPast）
isExpired: isPast(session.accessTokenExpireAt),
```

### 変換パターン（before → after）

```typescript
// ❌ 変換前: マジックナンバーで意図が不明瞭
new Date(Date.now() + 3600000)
session.expireAt < new Date()

// ✅ 変換後: 意図が明確
addMilliseconds(new Date(), 3600000)
isPast(session.expireAt)
```

> **Domain層の例外**: 外部ライブラリ依存最小化のため `>` `<` 演算子を許容。ただし Infrastructure/Application 層では date-fns 関数を優先使用すること。

## import パターン

`import * as dfns` パターン（dfUtils.ts での re-export）は許容。プロジェクトの dfUtils.ts 設計による。
