---
name: typesafe-routing
description: |
  Next.js typedRoutes による型安全なルーティングパターンを提供するスキル。
  routes定数経由のページ遷移、search params の型安全な扱い、
  新ページ追加時の手順を含む。

  トリガー例:
  - router.push, Link href, ルーティング, ルート, ページ遷移
  - routes.ts, routes定数, $path
  - src/lib/routes.ts 編集時
  - 「リンク」「ナビゲーション」「search params」「route params」
  - 新しいページを追加するとき
globs:
  - "src/lib/routes.ts"
---

# typesafe-routing スキル

Next.js 16 の `typedRoutes: true`（`next.config.ts`）と `src/lib/routes.ts` の
routes 定数を組み合わせた型安全なルーティングパターン。

---

## 基本ルール

### routes 定数経由でルーティング

全てのページ遷移は `src/lib/routes.ts` の `routes` 定数を使用する。

```typescript
import { routes } from '@/lib/routes';

// router.push
router.push(routes.users.list());
router.push(routes.users.detail(userId));

// Link
<Link href={routes.users.edit(userId)}>編集</Link>
<Link href={routes.home}>ホーム</Link>
```

**禁止パターン:**

```typescript
// 文字列リテラルのルート指定は禁止
router.push('/users');
<Link href={`/users/${id}`}>

// 理由: typedRoutes の型チェックが効かず、ルート変更時に漏れが生じる
```

**例外（文字列リテラルのまま残してよいもの）:**

- `/api/auth/signin?callbackUrl=/` — NextAuth API ルート（routes定数の対象外）
- `/api/auth/signout?callbackUrl=/` — 同上

---

## routes.ts の構造

`src/lib/routes.ts` が全ルートの定義元。

```typescript
import type { Route } from 'next';

export const routes = {
  home: '/' as Route,
  users: {
    list: (params?: UsersListParams) => buildUsersListPath(params),
    new: '/users/new' as Route,
    detail: (id: string) => `/users/${id}` as Route,
    edit: (id: string) => `/users/${id}/edit` as Route,
  },
  auth: {
    signIn: '/auth/sign-in' as Route,
    register: '/auth/register' as Route,
    error: '/auth/error' as Route,
  },
  // ...
} as const;
```

### search params を持つルートは関数形式

```typescript
// search params ありのルートは型付きオブジェクトで渡す
router.push(routes.users.list({ page: 2, search: 'alice' }));
router.push(routes.users.list());  // 省略時はクエリなし

// route params のみのルートも関数形式
router.push(routes.users.detail(user.id));
```

---

## 新しいページを追加したら

1. `src/app/<route>/page.tsx` を作成
2. `src/lib/routes.ts` に以下を追加:
   - route params のみ: `` detail: (id: string) => `/items/${id}` as Route ``
   - search params あり: `list: (params?: ItemsListParams) => buildItemsListPath(params)`
   - パラメータなし: `new: '/items/new' as Route`

### routes.ts への追加パターン

```typescript
// パラメータなし
export const routes = {
  items: {
    new: '/items/new' as Route,
  },
};

// route params あり
export const routes = {
  items: {
    detail: (id: string) => `/items/${id}` as Route,
    edit: (id: string) => `/items/${id}/edit` as Route,
  },
};

// search params あり（型定義 + ビルド関数を追加）
export interface ItemsListParams {
  page?: number;
  search?: string;
  category?: string;
}

function buildItemsListPath(params?: ItemsListParams): Route {
  if (!params) return '/items' as Route;
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.search !== undefined) searchParams.set('search', params.search);
  if (params.category !== undefined) searchParams.set('category', params.category);
  const query = searchParams.toString();
  return (query ? `/items?${query}` : '/items') as Route;
}

export const routes = {
  items: {
    list: (params?: ItemsListParams) => buildItemsListPath(params),
  },
};
```

---

## Server Component での search params 取得

Next.js 16 では `searchParams` は Promise になっているため `await` が必要。

```typescript
// src/app/users/page.tsx
interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { page, search, sortBy, sortOrder } = await searchParams;

  const pageNum = page ? Number(page) : 1;
  // ...
}
```

---

## Client Component での search params 取得

`next/navigation` の `useSearchParams()` を使用。

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';

export function ItemsFilterClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get('page') ?? '1');
  const search = searchParams.get('search') ?? '';

  const handleSearch = (newSearch: string) => {
    router.push(routes.items.list({ page: 1, search: newSearch }));
  };
}
```

---

## 型チェックの仕組み

`next.config.ts` の `typedRoutes: true` により、`next dev` / `next build` 実行時に
`.next/types/` に `Route` 型定義が自動生成される。

```typescript
// next.config.ts（既に設定済み）
const nextConfig: NextConfig = {
  typedRoutes: true,
};
```

`import type { Route } from 'next'` で参照する Route 型はこの生成ファイルから来る。
`as Route` キャストは動的文字列で型チェックを通すために使用。

---

## チェックリスト

新しいページ追加・既存ページ修正時:

- [ ] `router.push()` / `<Link href>` に文字列リテラルを使っていない
- [ ] `routes.ts` にルート定数を追加した
- [ ] search params がある場合は型定義（`interface`）を追加した
- [ ] `pnpm check` でエラーなし（型チェック含む）
