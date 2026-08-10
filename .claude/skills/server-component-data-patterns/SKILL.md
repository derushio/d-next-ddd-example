---
name: server-component-data-patterns
description: |
  Next.js App Router の Server Component でのデータ取得設計パターンを提供するスキル。
  ドーナツ構造（Server → Client props流し）、initialData パターン、
  searchParams の型安全な扱い方を提供する。

  トリガー例:
  - 「Server Component」「initialData」「SSRデータ」「ドーナツ構造」
  - page.tsx でデータを取得して Client Component に渡すとき
  - searchParams の型定義を書くとき

globs:
  - "src/app/**/page.tsx"
  - "src/components/features/**/*.tsx"
---

# Server Component データ取得設計パターン スキル

Next.js App Router における Server Component のデータ取得・Client Component へのデータ受け渡し設計パターン集。

---

## 1. ドーナツ構造パターン（Server → Client props 流し）

**ドーナツ構造**とは、Server Component を外側、Client Component を内側に配置し、
サーバーで取得したデータを props として Client に流すパターン。

```
page.tsx (Server Component) ← データ取得
  └── UserProfileClient.tsx (Client Component) ← インタラクション処理
```

```typescript
// src/app/(protected)/users/[id]/page.tsx — Server Component（外側）
import { getCachedUserById } from '@/lib/cachedQueries';
import { UserProfileClient } from '@/components/features/user/UserProfileClient';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ Server Component でデータ取得
  const result = await getCachedUserById(id);

  if (result.isErr()) {
    if (result.error.code === 'USER_NOT_FOUND') notFound();
    throw new Error(result.error.message);
  }

  // ✅ Client Component に props として渡す
  return <UserProfileClient initialData={result.value} userId={id} />;
}
```

```typescript
// src/components/features/user/UserProfileClient.tsx — Client Component（内側）
'use client';

import type { UserResponse } from '@/layers/application/usecases/user/GetUserByIdUseCase';

type Props = {
  initialData: UserResponse;
  userId: string;
};

export function UserProfileClient({ initialData, userId }: Props) {
  // ✅ initialData で初期表示、更新操作はここで行う
  const [user, setUser] = useState(initialData);

  const handleUpdate = async (data: UpdateUserInput) => {
    // Server Action を呼んで更新
    const result = await updateUserAction({ userId, ...data });
    if (result.success) setUser(result.data);
  };

  return (
    <div>
      <h1>{user.name}</h1>
      {/* インタラクティブなUI */}
    </div>
  );
}
```

### ドーナツ構造の設計原則

```
Server Component が持つべきもの:
  ✅ データ取得ロジック（UseCase 呼び出し）
  ✅ 認証・認可チェック（requireAuthentication）
  ✅ 静的なレイアウト・マークアップ

Client Component が持つべきもの:
  ✅ インタラクション（onClick, onChange 等）
  ✅ クライアント状態（useState, useReducer）
  ✅ ブラウザ API（window, document 等）
  ✅ リアルタイム更新（Server Action 呼び出し後の状態更新）
```

---

## 2. initialData による SSR-to-Client 橋渡しパターン

Server でフェッチしたデータを Client Component の初期値として使うパターン。
ページロード時の表示速度向上と、その後の Client 側更新を両立する。

```typescript
// src/app/(protected)/todos/page.tsx
import { getCachedTodos } from '@/lib/cachedQueries';
import { TodoListClient } from '@/components/features/todo/TodoListClient';

export default async function TodosPage() {
  const result = await getCachedTodos();
  if (result.isErr()) throw new Error(result.error.message);

  // ✅ initialData としてシリアライズ可能なデータを渡す
  return <TodoListClient initialTodos={result.value} />;
}
```

```typescript
// src/components/features/todo/TodoListClient.tsx
'use client';

import type { TodoResponse } from '@/layers/application/usecases/todo/GetTodosUseCase';
import { deleteTodoAction, createTodoAction } from '@/layers/presentation/actions/todo';
import { useOptimistic, useTransition } from 'react';

type Props = {
  initialTodos: TodoResponse[];
};

export function TodoListClient({ initialTodos }: Props) {
  // ✅ initialData → クライアント状態の初期値
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(initialTodos);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (todoId: string) => {
    startTransition(async () => {
      setOptimisticTodos((prev) => prev.filter((t) => t.id !== todoId));
      await deleteTodoAction({ todoId });
    });
  };

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id}>
          {todo.title}
          <button onClick={() => handleDelete(todo.id)} disabled={isPending}>
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## 3. 型共有: Server Action の返り値型 = Client Component の Props 型

Server Action（または UseCase）の返り値型を Client Component の Props 型として再利用し、
型の二重定義を防ぐ。

```typescript
// src/layers/application/usecases/user/GetUserByIdUseCase.ts
export type UserResponse = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: Date;
};
```

```typescript
// src/components/features/user/UserCard.tsx
// ✅ UseCase の返り値型を直接 import して使う（二重定義なし）
import type { UserResponse } from '@/layers/application/usecases/user/GetUserByIdUseCase';

type Props = {
  user: UserResponse;  // UseCase の型をそのまま使用
};

export function UserCard({ user }: Props) {
  return <div>{user.name}</div>;
}
```

```typescript
// src/components/features/user/UserListClient.tsx
'use client';

import type { UserResponse } from '@/layers/application/usecases/user/GetUsersUseCase';

type Props = {
  initialUsers: UserResponse[];  // Server から渡された型と一致
};
```

### 型共有の原則

```
Application Layer（UseCase）が型を定義
  ↓
  ├── Server Component（page.tsx）が UseCase を呼び出して結果を取得
  └── Client Component が初期データとして受け取る
        ↓
        型の流れは一方向（Application → Presentation）
        Client Component は独自に型を定義しない
```

---

## 4. Server Component でのエラーハンドリング

エラーの種類に応じて適切な Next.js のメカニズムを使い分ける。

```typescript
// src/app/(protected)/users/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getCachedUserById } from '@/lib/cachedQueries';

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCachedUserById(id);

  if (result.isErr()) {
    switch (result.error.code) {
      case 'USER_NOT_FOUND':
        notFound();           // → 404 ページ（not-found.tsx）
      case 'UNAUTHORIZED':
        redirect('/login');   // → ログインページへリダイレクト
      case 'FORBIDDEN':
        redirect('/403');     // → 403 ページへリダイレクト
      default:
        throw new Error(result.error.message); // → error.tsx へ
    }
  }

  return <UserDetail user={result.value} />;
}
```

### エラーハンドリング使い分け表

| エラー種別 | 対応方法 | 表示先 |
|-----------|---------|-------|
| リソース未発見（404） | `notFound()` | `not-found.tsx` |
| 未認証 | `redirect('/login')` | ログインページ |
| 権限不足 | `redirect('/403')` | エラーページ |
| サーバーエラー（500系） | `throw new Error(...)` | `error.tsx` |
| バリデーションエラー | Server Action 側で処理 | フォームエラー表示 |

---

## 5. searchParams の型安全な扱い方（Next.js 16 では Promise<SearchParams>）

Next.js 16 では `searchParams` は `Promise<SearchParams>` 型になった。

```typescript
// ✅ Next.js 16 での searchParams の扱い方
type SearchParams = {
  page?: string;
  q?: string;
  sort?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function UsersPage({ searchParams }: Props) {
  // ✅ await で解決
  const { page = '1', q = '', sort = 'createdAt' } = await searchParams;

  const pageNumber = Number.parseInt(page, 10);
  const validPage = Number.isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;

  const result = await getCachedUsers({ page: validPage, q, sort });
  if (result.isErr()) throw new Error(result.error.message);

  return <UserListClient initialUsers={result.value} />;
}
```

### Zod による searchParams バリデーション

```typescript
// src/app/(protected)/users/page.tsx
import { z } from 'zod';

// ✅ Zod でバリデーション + デフォルト値適用
const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().default(''),
  sort: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

type ValidatedSearchParams = z.infer<typeof searchParamsSchema>;

export default async function UsersPage({ searchParams }: Props) {
  const rawParams = await searchParams;

  // ✅ parse でデフォルト値含む安全な型に変換
  const params = searchParamsSchema.parse(rawParams);

  const result = await getCachedUsers(params);
  if (result.isErr()) throw new Error(result.error.message);

  return (
    <UserListClient
      initialUsers={result.value}
      currentPage={params.page}
      searchQuery={params.q}
    />
  );
}
```

---

## 6. 禁止パターン

```typescript
// ❌ 禁止: Client Component から直接 DB アクセス
'use client';
import { prisma } from '@/lib/prisma'; // Client Component から Prisma を使うことは不可

// ❌ 禁止: Client Component 内での Server Action でないデータ取得
'use client';
async function loadData() {
  const res = await fetch('/api/internal-data'); // 内部APIを経由して DB アクセス
}

// ❌ 禁止: Server Component 間での props リレー（不要な中間コンポーネント）
// Layout → MiddleComponent（データを持ちたくないが渡すだけ） → TargetComponent
// → `React.cache()` + `cachedQueries.ts` で解決すること

// ❌ 禁止: Server Component で Client 状態を管理しようとする
export default async function BadPage() {
  const [count, setCount] = useState(0); // ❌ Server Component で useState は使えない
}
```

---

## チェックリスト

- [ ] データ取得は Server Component（page.tsx, layout.tsx, async Server Component）で行っているか？
- [ ] Client Component には `initialData` として props 経由でデータを渡しているか？
- [ ] Client Component の Props 型は UseCase の返り値型を再利用しているか？
- [ ] `searchParams` は `Promise<SearchParams>` として `await` しているか（Next.js 16）？
- [ ] `notFound()` / `redirect()` / `throw` を適切に使い分けているか？
- [ ] Client Component 内で直接 DB アクセスや内部 API 呼び出しをしていないか？

---

## 関連スキル

- `parallel-data-fetching` — 並列データ取得パターン（Promise.all / Suspense境界）
- `react-cache-dedup` — React.cache() デデュプリケーション
- `nextjs-error-boundary` — error.tsx / not-found.tsx パターン
- `react19-modern-patterns` — React 19 の最新 API
- `url-search-pagination` — searchParams を使った検索・ページネーション
- `optimistic-ui-patterns` — useOptimistic による楽観的 UI 更新
