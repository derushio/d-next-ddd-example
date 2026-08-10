---
name: react-cache-dedup
description: |
  React.cache() によるServer Componentデータ取得のデデュプリケーションパターン。
  同一レンダーツリー内での重複リクエスト排除、UseCaseラップ、
  Next.js unstable_cache との使い分けガイドを提供する。

  トリガー例:
  - Server Component でデータ取得しようとしたとき
  - 「cache」「デデュプリケーション」「重複リクエスト」
  - src/app/ 配下の page.tsx, layout.tsx でデータフェッチ実装時
---

# React.cache() デデュプリケーション スキル

Server Component のデータ取得でも同一リクエスト内の重複を排除するパターン集。

---

## 1. React.cache() の基本パターン

`react` から `cache` をインポートし、UseCase 呼び出しをラップする。

```typescript
// src/lib/cachedQueries.ts
import { cache } from 'react';
import { resolve } from '@/di/resolver';

export const getCachedUserById = cache(async (userId: string) => {
  const useCase = resolve('GetUserByIdUseCase');
  return useCase.execute({ userId });
});

export const getCachedCurrentUser = cache(async () => {
  const useCase = resolve('GetSessionUseCase');
  return useCase.execute();
});
```

### 呼び出し側（Server Component）

```typescript
// src/app/(protected)/users/[id]/page.tsx
import { getCachedUserById } from '@/lib/cachedQueries';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCachedUserById(id);

  if (result.isErr()) {
    // エラーハンドリング（error.tsx に投げる場合は throw）
    throw new Error(result.error.message);
  }

  return <UserDetail user={result.value} />;
}
```

> **注意**: UseCase ラップの `getCachedUserById` は `ResultAsync<T, AppError>` を返すため、
> `result.isErr()` / `result.error.code` パターンでエラーを判定する。
> Server Action ラップの場合は次のセクションを参照。
```

---

## 2. 使いどころ

### 同じデータを複数箇所で参照する場合

最も効果的なのは **同一レンダーツリー内** で同じデータを複数の Server Component が必要とするケース。

```typescript
// src/app/(protected)/layout.tsx — ユーザー情報をレイアウトで取得
import { getCachedCurrentUser } from '@/lib/cachedQueries';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getCachedCurrentUser();
  // ...
}

// src/app/(protected)/dashboard/page.tsx — 同じユーザー情報をページでも取得
import { getCachedCurrentUser } from '@/lib/cachedQueries';

export default async function DashboardPage() {
  // layout.tsx で既に呼ばれているが、React.cache() により重複リクエストは発生しない
  const result = await getCachedCurrentUser();
  // ...
}
```

### スコープの理解

```
1回のサーバーレンダリングリクエスト内でのみ有効
  ├── layout.tsx → getCachedCurrentUser() ← 1回目：実行される
  │
  └── page.tsx → getCachedCurrentUser()   ← 2回目：キャッシュから返る（UseCase は実行されない）

次のリクエストでは全てリセットされる（リクエスト間のキャッシュは行わない）
```

---

## 3. 使わない場面

### Client Component からのデータ取得

Client Component では `React.cache()` は動作しない。Server Action を使うこと。

```typescript
// ❌ 禁止: Client Component から cache() を呼ぶ
'use client';
import { getCachedUserById } from '@/lib/cachedQueries';

// Server Action を使うこと
'use client';
import { getUserByIdAction } from '@/layers/presentation/actions/user/getUserByIdAction';
```

### 時間ベースのキャッシュが必要な場合

リクエスト間を超えて一定時間キャッシュしたい場合は `unstable_cache` か `fetch` の cache オプションを使う。

```typescript
// ✅ 時間ベースのキャッシュ → unstable_cache
import { unstable_cache } from 'next/cache';

export const getCachedPublicConfig = unstable_cache(
  async () => {
    // 頻繁に変わらない設定データ等
    const useCase = resolve(GetPublicConfigUseCase);
    return useCase.execute();
  },
  ['public-config'],
  { revalidate: 3600 }, // 1時間キャッシュ
);
```

### GET API ルートのレスポンスキャッシュ

Route Handler のレスポンスキャッシュは Next.js の Route Handler cache を使用する。

---

## 4. React.cache() vs Next.js unstable_cache vs fetch cache

| 機能 | スコープ | 用途 | 場所 |
|------|---------|------|------|
| `React.cache()` | 1レンダリングリクエスト | デデュプリケーション（重複排除） | `src/lib/cachedQueries.ts` |
| `unstable_cache` | 時間ベース（リクエスト間） | データの永続キャッシュ | `src/lib/cachedQueries.ts` |
| `fetch` cache | 時間ベース | HTTP レスポンスキャッシュ | fetch オプション直接指定 |

### 選択フロー

```
同一リクエスト内の重複排除が目的？
  → YES: React.cache()
  → NO: データを一定時間キャッシュしたい？
        → YES: unstable_cache（revalidate 指定）
        → NO: キャッシュ不要（毎回リクエスト）
```

---

## 5. cachedQueries.ts の配置ルール

**全ての cached 関数は `src/lib/cachedQueries.ts` に集約すること。**

```
src/lib/
├── cachedQueries.ts  ← React.cache() / unstable_cache のラッパーはここに集約
├── routes.ts
└── utils.ts
```

### ファイルの構造例

```typescript
// src/lib/cachedQueries.ts
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { resolve } from '@/di/resolver';

// ── React.cache() — デデュプリケーション専用 ──────────────────
export const getCachedCurrentUser = cache(async () => {
  const useCase = resolve('GetCurrentUserUseCase');
  return useCase.execute();
});

export const getCachedUserById = cache(async (userId: string) => {
  const useCase = resolve('GetUserByIdUseCase');
  return useCase.execute({ userId });
});

// ── unstable_cache — 時間ベースキャッシュ ────────────────────
export const getCachedSiteSettings = unstable_cache(
  async () => {
    const useCase = resolve('GetSiteSettingsUseCase');
    return useCase.execute();
  },
  ['site-settings'],
  { revalidate: 3600 },
);
```

---

## 6. エラーハンドリングとの組み合わせ

`React.cache()` でラップした関数が返す型によってエラーハンドリング方法が異なる。

### パターン A: UseCase ラップ（`ResultAsync<T, AppError>` を返す）

```typescript
// ✅ Result 型のまま cache でラップ
export const getCachedUserById = cache(async (userId: string) => {
  const useCase = resolve('GetUserByIdUseCase');
  return useCase.execute({ userId }); // ResultAsync<UserResponse, AppError>
});

// Server Component での使用 — result.isErr() / result.error.code でハンドリング
import { notFound } from 'next/navigation';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCachedUserById(id);

  if (result.isErr()) {
    if (result.error.code === 'USER_NOT_FOUND') {
      notFound(); // 404 ページへ
    }
    throw new Error(result.error.message); // error.tsx へ
  }

  return <UserDetail user={result.value} />;
}
```

### パターン B: Server Action ラップ（`ActionResult<T>` を返す）

Server Action をキャッシュする場合（`generateMetadata` + page で共有する場合等）、
戻り値は `ActionResult<T>` 形式（`{ success, data, error, code }`）になる。
`result.isOk()` / `result.isErr()` は**使用不可**。

```typescript
// ✅ Server Action を cache でラップ（generateMetadata + page で重複回避）
export const getCachedUserByIdAction = cache(async (userId: string) => {
  return getUserByIdAction({ userId }); // ActionResult<UserResponse>
});

// generateMetadata での使用
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getCachedUserByIdAction(id);
  // ActionResult は result.success / result.data / result.code で判定
  return { title: result.success ? `${result.data.name} — 詳細` : '詳細' };
}

// page での使用（同一リクエスト内では再実行されない）
export default async function Page({ params }: Props) {
  const { id } = await params;
  const result = await getCachedUserByIdAction(id);

  if (!result.success) {
    if (result.code === 'USER_NOT_FOUND') notFound();
    throw new Error(result.error);
  }

  return <UserDetail user={result.data} />;
}
```

---

## チェックリスト

- [ ] Server Component で同じクエリを2箇所以上で呼んでいる場合、`React.cache()` でラップしているか？
- [ ] `cache()` でラップした関数は `src/lib/cachedQueries.ts` に配置しているか？
- [ ] Client Component から `cachedQueries.ts` の関数を呼んでいないか？
- [ ] 時間ベースのキャッシュが必要な場合は `unstable_cache` を使用しているか？
- [ ] `React.cache()` をリクエスト間キャッシュとして誤用していないか（スコープはリクエスト内のみ）？

---

## 関連スキル

- `frontend-patterns` — Server Component / Client Component の使い分けパターン
- `application-impl` — UseCase の実装パターン
- `presentation-impl` — Server Action の実装パターン

## `cachedQueries.ts` レジストリ

**ファイル**: `src/lib/cachedQueries.ts`

このファイルは `React.cache()` でラップされたクエリ関数の一元管理レジストリ。

### 現在のエントリ

| 関数名 | ラップ対象 | 用途 |
|--------|-----------|------|
| `getCachedUserById` | `GetUserByIdUseCase` | Server Component でユーザー詳細取得 |
| `getCachedUsers` | `GetUsersUseCase` | Server Component でユーザー一覧取得 |
| `getCachedCurrentUser` | `GetCurrentUserUseCase` | 認証ユーザー情報の重複取得回避 |
| `getCachedUserByIdAction` | `getUserById` Server Action | `generateMetadata` + page での重複回避 |

### UseCase ラップ vs Server Action ラップ

| 方式 | 使いどころ |
|------|-----------|
| UseCase 直接ラップ | Server Component 内で DI 経由でデータ取得する場合 |
| Server Action ラップ | `generateMetadata` と page component で同一 SA を呼ぶ場合 |

**Server Action ラップの制約**:
- **読み取り系のみ**（`getUserById`, `getUsers` 等）
- ミューテーション系（`createUser`, `deleteUser` 等）をキャッシュしてはならない

### `generateMetadata` デデュプリケーションパターン

```ts
// src/app/users/[id]/page.tsx
import { getCachedUserByIdAction } from '@/lib/cachedQueries';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCachedUserByIdAction(id); // ← cache() ラップ済み
  return { title: result.success ? `${result.data.name} — 詳細` : '詳細' };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const result = await getCachedUserByIdAction(id); // ← 同一リクエスト内では再実行されない
  // ...
}
```

### 新規 cached query の追加基準

以下の**全条件**を満たす場合のみ `cachedQueries.ts` に追加:

1. 同一リクエスト（レンダーツリー）内で **2箇所以上** から呼ばれる
2. **読み取り専用** クエリである
3. レスポンスに **副作用がない**（呼び出しごとに状態が変わらない）
