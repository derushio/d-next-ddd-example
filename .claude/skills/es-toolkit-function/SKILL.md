---
name: es-toolkit-function
description: |
  es-toolkit の関数ユーティリティ・タイミング制御パターンを提供するスキル。
  debounce, throttle, delay 等のイベント制御と、数値ユーティリティを扱う。

  トリガー例:
  - debounce, throttle, delay, once, memoize
  - イベントハンドラ最適化、入力フィールドの遅延検索
  - リサイズ対応、スクロール処理
  - random, round, 数値ユーティリティ
---

# es-toolkit-function スキル

`es-toolkit` の関数ユーティリティを使ったタイミング制御・数値操作のパターンです。

---

## debounce — 遅延実行

最後の呼び出しから指定時間後に1回だけ実行します。
検索入力・フォームバリデーション・リサイズ処理に使います。

### 基本パターン

```typescript
import { debounce } from 'es-toolkit';

// ✅ 基本的な debounce
const debouncedSearch = debounce((query: string) => {
  fetchSearchResults(query);
}, 300);

// ✅ キャンセル（pending な呼び出しを取り消す）
debouncedSearch.cancel();
```

### React コンポーネントでの正しい使い方

**`useRef` で debounce 関数を保持し、再レンダリングでも同一インスタンスを維持する。**

```typescript
import { debounce } from 'es-toolkit';
import { useRef, useEffect, useCallback } from 'react';

function SearchInput() {
  // ✅ useRef で保持（再レンダリングで再生成されない）
  const debouncedSearch = useRef(
    debounce((query: string) => {
      fetchSearchResults(query);
    }, 300),
  );

  // ✅ cleanup: アンマウント時に pending な呼び出しをキャンセル
  useEffect(() => {
    return () => {
      debouncedSearch.current.cancel();
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch.current(e.target.value);
  }, []);

  return <input onChange={handleChange} placeholder="検索..." />;
}
```

```typescript
// ❌ 間違い: コンポーネント直下で毎レンダリング再生成
function SearchInput() {
  // 再レンダリングのたびに新しいインスタンスが作られ、debounce が機能しない
  const debouncedSearch = debounce((query: string) => {
    fetchSearchResults(query);
  }, 300);
  ...
}
```

### ウィンドウリサイズへの適用

```typescript
import { debounce } from 'es-toolkit';
import { useEffect, useRef } from 'react';

function useWindowResize(callback: (width: number, height: number) => void) {
  const debouncedCallback = useRef(
    debounce(() => {
      callback(window.innerWidth, window.innerHeight);
    }, 200),
  );

  useEffect(() => {
    const handler = debouncedCallback.current;
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      handler.cancel(); // ✅ cleanup 必須
    };
  }, []);
}
```

---

## throttle — 間引き実行

指定時間内に最大1回だけ実行します。
スクロール・マウス追跡等の高頻度イベントに使います。

```typescript
import { throttle } from 'es-toolkit';

// ✅ スクロールイベントの間引き（100ms に1回だけ実行）
const throttledScroll = throttle(() => {
  const scrollY = window.scrollY;
  updateScrollPosition(scrollY);
}, 100);

window.addEventListener('scroll', throttledScroll);

// クリーンアップ
window.removeEventListener('scroll', throttledScroll);
```

```typescript
// ✅ マウス追跡の間引き
import { useRef, useEffect } from 'react';
import { throttle } from 'es-toolkit';

function useMouseTracking(callback: (x: number, y: number) => void) {
  const throttledCallback = useRef(
    throttle((e: MouseEvent) => {
      callback(e.clientX, e.clientY);
    }, 50),
  );

  useEffect(() => {
    const handler = throttledCallback.current;
    document.addEventListener('mousemove', handler);
    return () => {
      document.removeEventListener('mousemove', handler);
    };
  }, []);
}
```

**debounce vs throttle の使い分け:**

| | debounce | throttle |
|---|---|---|
| 実行タイミング | 最後の呼び出しから ms 後 | ms ごとに最大1回 |
| 検索入力 | ✅ 推奨（入力完了後に検索） | |
| フォームバリデーション | ✅ 推奨 | |
| スクロールイベント | | ✅ 推奨（定期的な更新） |
| マウス追跡 | | ✅ 推奨 |
| リサイズイベント | ✅ 推奨（完了後に処理） | |

---

## delay — Promise ベースの遅延

`setTimeout` + `new Promise` の代替。`await` で使えます。

```typescript
import { delay } from 'es-toolkit';

// ✅ async/await での遅延
async function retryWithDelay() {
  for (let i = 0; i < 3; i++) {
    const result = await fetchData();
    if (result.ok) return result;

    await delay(1000); // ✅ 1秒待機（Promise を返す）
  }
}

// ❌ setTimeout + Promise の手書き
await new Promise((resolve) => setTimeout(resolve, 1000));
```

---

## once — 1回限りの実行

初期化処理など、複数回呼ばれても最初の1回だけ実行したい場合に使います。

```typescript
import { once } from 'es-toolkit';

// ✅ 初期化処理を1回だけ実行
const initialize = once(() => {
  setupAnalytics();
  registerServiceWorker();
  console.log('初期化完了');
});

// 何度呼んでも最初の1回だけ実行される
initialize(); // → 「初期化完了」と出力
initialize(); // → 何も起きない
initialize(); // → 何も起きない

// ✅ グローバル初期化パターン
const setupOnce = once(async () => {
  await connectDatabase();
  await loadConfiguration();
});

// アプリ起動時に呼ばれても安全
await setupOnce();
await setupOnce(); // 2回目以降は即座に return
```

---

## memoize — 純粋関数のキャッシュ

計算コストの高い純粋関数の結果をキャッシュします。
**同じ引数なら必ず同じ結果を返す純粋関数にのみ使用してください。**

```typescript
import { memoize } from 'es-toolkit';

// ✅ 重い計算のキャッシュ
const computeStats = memoize((data: number[]) => {
  // 重い集計処理
  return {
    mean: data.reduce((a, b) => a + b, 0) / data.length,
    max: Math.max(...data),
    min: Math.min(...data),
  };
});

computeStats([1, 2, 3]); // 計算実行
computeStats([1, 2, 3]); // キャッシュから返す（計算なし）
```

```typescript
// ✅ カスタムキャッシュキーの指定（複数引数の場合）
const fetchUserData = memoize(
  (userId: string, includeDetails: boolean) => {
    return getUserFromDb(userId, includeDetails);
  },
  // 第2引数: キャッシュキー生成関数
  (userId, includeDetails) => `${userId}:${includeDetails}`,
);
```

---

## 数値ユーティリティ

### random — 整数乱数生成

```typescript
import { random } from 'es-toolkit';

// ✅ min〜max の整数乱数（両端を含む）
const dice = random(1, 6);    // 1〜6
const percent = random(0, 100); // 0〜100

// ❌ 手書き（計算ミスしやすい）
const dice = Math.floor(Math.random() * 6) + 1;
```

**セキュリティ用途には `crypto` を使うこと:**

```typescript
// ❌ セキュリティトークン生成に random を使わない
const token = random(100000, 999999).toString();

// ✅ セキュリティ用途は crypto
import { randomBytes } from 'node:crypto';
const token = randomBytes(32).toString('hex');
```

### round — 小数点の丸め

```typescript
import { round } from 'es-toolkit';

// ✅ 指定精度での丸め
round(1.005, 2); // → 1.01（浮動小数点誤差を補正）
round(1234.5, -2); // → 1200（100の位で丸め）

// ❌ toFixed（文字列を返す・浮動小数点誤差あり）
(1.005).toFixed(2); // → '1.00'（誤差で期待値と異なることがある）
Number((1.005).toFixed(2)); // → 1 （型変換が必要で冗長）
```

---

## React hooks との使い分け

| 手段 | 用途 | React 依存 |
|------|------|-----------|
| `useMemo` | レンダリング間で値をメモ化 | React ライフサイクル依存 |
| `useCallback` | 関数参照の安定化 | React ライフサイクル依存 |
| es-toolkit `memoize` | 汎用メモ化（キャッシュキー制御可能） | React 不要 |
| es-toolkit `debounce` | 汎用タイミング制御 | React 不要 |

```typescript
// ✅ React コンポーネント内の値メモ化 → useMemo
const expensiveValue = useMemo(() => computeHeavy(data), [data]);

// ✅ コールバック参照の安定化 → useCallback
const handleClick = useCallback(() => onClick(id), [onClick, id]);

// ✅ React 外での汎用メモ化（サービス層・ユーティリティ） → memoize
const getConfig = memoize((env: string) => loadConfig(env));

// ✅ React 外でのタイミング制御 → debounce/throttle
const debouncedLog = debounce((msg: string) => logger.info(msg), 500);

---

## Web Crypto API 代替パターン

Edge Runtime対応が必要な場合は Web Crypto API を使用:

```typescript
// ランダムバイト生成（Edge Runtime互換）
const bytes = new Uint8Array(32);
crypto.getRandomValues(bytes);
const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

// UUID生成（uuidパッケージ不要）
const id = crypto.randomUUID();
```

Node.js専用コンテキスト（CLIツール、シード等）では `node:crypto` を引き続き使用。
```
