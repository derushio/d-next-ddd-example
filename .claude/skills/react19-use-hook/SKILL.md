---
name: react19-use-hook
description: |
  React 19 の use() によるPromise/Context消費パターンを提供するスキル。
  useContext() の代替、Server Component からのPromise受け渡し、
  Suspense連携パターンを扱う。

  トリガー例:
  - useContext() を書こうとしたとき
  - Client Component でデータフェッチ（useEffect + useState）を書こうとしたとき
  - 「React.use」「use(」を記述時
  - Promise を Client Component で消費しようとしたとき
---

# React 19 use() Hook スキル

`use()` は React 19 で追加された、Promise や Context をレンダリング中に消費するための Hook。
条件付き呼び出しが可能な唯一の React Hook。

---

## 1. useContext() → use() への移行

React 19 では `useContext()` の代わりに `use()` が推奨される。
**最大の利点**: `use()` は `if` 文や早期リターンの後でも呼び出せる。

```typescript
import { use } from 'react';
import { ThemeContext } from '@/components/providers/ThemeProvider';

// ❌ React 18 スタイル
function Component() {
  const theme = useContext(ThemeContext); // 必ずトップレベルで呼ぶ必要あり
  if (!isReady) return null;
  return <div className={theme.className} />;
}

// ✅ React 19 スタイル
function Component() {
  if (!isReady) return null;
  const theme = use(ThemeContext); // 条件付きで呼べる
  return <div className={theme.className} />;
}
```

---

## 2. Promise 消費パターン（Server → Client Component）

Server Component で作成した Promise を Client Component に渡し、`use()` で消費する。
**Suspense boundary が必須。**

```typescript
// Server Component (page.tsx)
import { Suspense } from 'react';
import { UserProfile } from './UserProfile';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Next.js 16: params は Promise
  const userPromise = fetchUser(id); // Promise を作成（await しない）

  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Client Component
'use client';
import { use } from 'react';

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspense が解決するまで待機
  return <div>{user.name}</div>;
}
```

---

## 3. ドーナツアーキテクチャとの関係

**重要**: `use()` はドーナツアーキテクチャ（SSR初期データ + クライアント再取得）の代替ではない。

| パターン | 使い場面 |
|---------|---------|
| **ドーナツ（現行推奨）** | SSR でデータ取得 → props で Client Component に渡す → ページネーション/検索でクライアント再取得 |
| **use() + Suspense** | Promise を Client Component に渡して Suspense でストリーミング。リアルタイムデータや遅延ロードに有効 |
| **useEffect + useState** | ❌ 非推奨: use() + Suspense で置換可能 |

```typescript
// ✅ ドーナツアーキテクチャ（引き続き推奨）
// page.tsx (Server Component)
export default async function UsersPage() {
  const result = await getUsers({ page: 1, limit: 10 });
  return <UserListClient initialData={result.data} />;
}

// ✅ use() パターン（ストリーミング向け）
export default function UsersPage() {
  const usersPromise = getUsers({ page: 1, limit: 10 }); // await しない
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UserList usersPromise={usersPromise} />
    </Suspense>
  );
}
```

---

## 4. use() の制約

- `use()` は **レンダリング中** にのみ呼び出せる（イベントハンドラや useEffect 内では不可）
- Promise を `use()` で消費する場合、**Suspense boundary が必須**
- Promise が reject された場合、最も近い **Error Boundary** がキャッチ
- `use()` に渡す Promise は **キャッシュ済み** であるべき（レンダリングごとに新しい Promise を作らない）

```typescript
// ❌ NG: レンダリングごとに新しい Promise を作成
function Component() {
  const data = use(fetch('/api/data').then(r => r.json())); // 毎回新しい Promise
}

// ✅ OK: Server Component で作成した Promise を渡す
function Component({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise); // 安定した参照
}

// ✅ OK: React.cache() でメモ化
const getData = cache(async (id: string) => {
  const res = await fetch(`/api/data/${id}`);
  return res.json();
});
```

---

## useContext() → use() 移行ルール（必須）

React 19 では `useContext()` は `use()` に置き換えること。これは推奨ではなく**必須**。

### 移行手順

1. `import { use } from 'react';` を追加
2. `useContext(XxxContext)` → `use(XxxContext)` に置換
3. `useContext` の import が不要になったら削除
4. 動作確認

### 例外

- サードパーティライブラリが `useContext` を内部で要求する場合のみ許容
- その場合はコメントで理由を明記: `// useContext required by <library>`

### 検出コマンド

```bash
grep -rn 'useContext' src/ --include='*.ts' --include='*.tsx'
```

---

## チェックリスト

- [ ] `useContext()` が残っていないか（`use()` に置換済みか）
- [ ] `useContext()` を `use()` に置き換えられるか確認（条件付き呼び出しが必要な場合は必須）
- [ ] `useEffect` + `useState` でデータフェッチしている場合、`use()` + `Suspense` に置換可能か検討
- [ ] `use(promise)` を使う場合、適切な `Suspense` boundary があるか？
- [ ] Promise がレンダリングごとに再生成されていないか？（React.cache() やServer Componentからの受け渡しを使用）
- [ ] ドーナツアーキテクチャで十分な場合に、不要に `use()` パターンに変更していないか？

---

## 関連スキル

- `frontend-patterns` — Server/Client Component 分離パターン
- `react-cache-dedup` — React.cache() デデュプリケーション
- `react19-modern-patterns` — React 19 のその他のモダン API
