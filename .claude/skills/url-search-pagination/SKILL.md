---
name: url-search-pagination
description: |
  検索・ページネーション付き一覧画面の実装パターンを提供するスキル。
  useUrlSearchPagination Hook によるURL-first状態管理、
  デバウンス検索、初期データスキップ、ページネーションコントロールを扱う。

  トリガー例:
  - 「一覧画面」「検索」「ページネーション」「useSearchParams」
  - useSearchParams() + useDebounceValue を書こうとしたとき
  - src/components/features/ 配下の一覧系コンポーネント作成時
globs:
  - "src/components/features/**/*.tsx"
  - "src/hooks/useUrlSearchPagination.ts"
---

# URL Search Pagination パターン

## このスキルの目的

- `useUrlSearchPagination` Hook を使って URL-first な状態管理を実現する
- 手書きの `useSearchParams + useDebounceValue + useEffect` 複数構成を禁止する
- SSR 初期データの活用によるウォーターフォールを防止する
- デバウンス検索・即時検索・ページネーションを一貫した API で提供する

---

## useUrlSearchPagination Hook 概要

**ファイル**: `src/hooks/useUrlSearchPagination.ts`

### 設計原則

- **URL search params がSingle Source of Truth**: `page`, `search`, `sortBy`, `sortOrder` はすべて URL に持つ
- **SSR初期データの活用**: `initialData` を渡すことで初回クライアントfetchをスキップ
- **デバウンス検索**: 入力値は `debounceMs`（デフォルト300ms）後にURLへ反映
- **即時検索**: Enter キー / 検索ボタン押下で debounce をスキップしてURL更新
- **`startTransition` による isPending**: React 19 の transition 機能でローディング状態を管理

### 返却値

| 値 | 型 | 説明 |
|---|---|---|
| `data` | `TData \| null` | 取得済みデータ |
| `setData` | `Dispatch` | データ setter（useOptimistic 連携用） |
| `error` | `string \| null` | エラーメッセージ |
| `isPending` | `boolean` | ローディング状態 |
| `searchInputValue` | `string` | 検索入力値（即時反映） |
| `setSearchInputValue` | `(value: string) => void` | 検索入力値 setter |
| `handlePageChange` | `(page: number) => void` | ページ変更ハンドラ |
| `handleSearch` | `() => void` | 検索ボタンハンドラ（即時検索） |
| `handleKeyDown` | `(event: KeyboardEvent) => void` | Enter キーハンドラ |
| `fetchData` | `(params?) => void` | データ再取得（削除後リフレッシュ等） |
| `currentPage` | `number` | 現在のページ番号 |
| `currentSortBy` | `TSortBy` | 現在のソートフィールド |
| `currentSortOrder` | `'asc' \| 'desc'` | 現在のソート順 |

---

## ✅ 推奨パターン

### 基本的な使い方

```typescript
'use client';

import { useUrlSearchPagination } from '@/hooks/useUrlSearchPagination';
import { getUsersAction } from '@/layers/presentation/actions/users/getUsersAction';
import { routes } from '@/lib/routes';

type SortField = 'name' | 'email' | 'createdAt';

interface Props {
  /** SSR初期データ（初回クライアントfetchスキップに使用） */
  initialData: GetUsersResponse;
}

export function UserListClient({ initialData }: Props) {
  const {
    data,
    setData,
    error,
    isPending,
    searchInputValue,
    setSearchInputValue,
    handlePageChange,
    handleSearch,
    handleKeyDown,
    fetchData,
    currentPage,
    currentSortBy,
    currentSortOrder,
  } = useUrlSearchPagination<GetUsersResponse, SortField>({
    initialData,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    pageSize: 10,
    buildRoute: (params) =>
      routes.users.list({
        page: params.page,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
    fetchFn: async (params) => getUsersAction(params),
  });

  return (
    <div>
      {/* 検索UI */}
      <input
        value={searchInputValue}
        onChange={(e) => setSearchInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='検索...'
      />
      <button type='button' onClick={handleSearch}>
        検索
      </button>

      {/* データ表示 */}
      {error && <p className='text-destructive'>{error}</p>}
      {isPending ? <Spinner /> : <UserTable data={data} />}

      {/* ページネーション */}
      <Pagination
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

### Server Component からの初期データ渡し（ドーナツ構造）

```typescript
// ✅ Server Component（外側）
export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialData = await getUsersAction({
    page: Number(params.page) || 1,
    limit: 10,
    search: params.search as string | undefined,
    sortBy: (params.sortBy as SortField) ?? 'createdAt',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  });

  return (
    <UserListClient
      initialData={initialData.success ? initialData.data : undefined}
    />
  );
}
```

---

## useOptimistic との組み合わせ

`setData` を使って Hook と `useOptimistic` を連携できる。

```typescript
const {
  data,
  setData,
  fetchData,
} = useUrlSearchPagination<UsersResponse, SortField>({ ... });

// useOptimistic: 楽観的削除
const [optimisticData, updateOptimistic] = useOptimistic(
  data,
  (currentData: UsersResponse | null, deletedId: string) => {
    if (!currentData) return currentData;
    return {
      ...currentData,
      users: currentData.users.filter((u) => u.id !== deletedId),
    };
  },
);

// 削除ハンドラ
const handleDelete = async (id: string) => {
  updateOptimistic(id); // 楽観的に即時反映
  const result = await deleteUserAction({ id });
  if (result.success) {
    await fetchData(); // サーバーデータで再同期
  } else {
    // エラー時: useOptimistic が自動でロールバック
  }
};
```

---

## initialParams の活用

`initialParams` を渡すことで、`useSearchParams()` が水和前に未解決の場合のフォールバックを設定できる。

```typescript
// 親（Server Component）から検索パラメータを渡す
useUrlSearchPagination({
  initialData,
  initialParams: {
    page: Number(searchParams.page) || 1,
    searchQuery: searchParams.search as string,
    sortBy: searchParams.sortBy as SortField,
    sortOrder: searchParams.sortOrder as 'asc' | 'desc',
  },
  ...
});
```

---

## ❌ 禁止パターン

### 手書きの useSearchParams + useDebounceValue + 複数 useEffect

```typescript
// ❌ 禁止: これを手書きしない
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebounceValue } from 'usehooks-ts';
import { useState, useEffect } from 'react';

const searchParams = useSearchParams();
const [search, setSearch] = useState(searchParams.get('search') ?? '');
const [debouncedSearch] = useDebounceValue(search, 300);
const [page, setPage] = useState(1);
const [data, setData] = useState(null);

useEffect(() => { /* fetch */ }, [debouncedSearch, page]);
useEffect(() => { /* URL更新 */ }, [debouncedSearch]);
// → useUrlSearchPagination に一本化すること
```

### useState で page/search を管理

```typescript
// ❌ 禁止: URL params ではなく state で管理
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
// → URL search params がSingle Source of Truth であるべき
// → ブックマーク不可、リロード時に状態消失、ブラウザ戻る動作が壊れる
```

---

## チェックリスト

- [ ] `useUrlSearchPagination` を使用しているか
- [ ] URL search params が Single Source of Truth か（`page`, `search`, `sortBy`, `sortOrder`）
- [ ] SSR初期データを `initialData` で渡しているか（初回フェッチのスキップ）
- [ ] `buildRoute` で `typesafe-routing` スキルに従った型安全なURLを構築しているか
- [ ] `setData` を `useOptimistic` と連携しているか（楽観的更新が必要な場合）
- [ ] 手書きの `useSearchParams + useDebounceValue + useEffect` を書いていないか

---

## 関連スキル

- `frontend-patterns`（Primary）: Next.js App Router パターン全般（ドーナツ構造）
- `typesafe-routing`: 型安全なルーティング（`buildRoute` 実装）
- `react19-modern-patterns`: `useOptimistic` の詳細パターン
- `hook-naming-convention`: Hook ファイルの命名規則
