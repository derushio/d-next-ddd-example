---
name: parallel-data-fetching
description: |
  Next.js App Router での並列データ取得パターンを提供するスキル。
  Promise.all による並列実行、waterfall 防止、React.cache() デデュプリケーションとの組み合わせを扱う。

  トリガー例:
  - 「Promise.all」「並列取得」「waterfall」「データフェッチ最適化」
  - 複数の await を順次呼んでいるとき
  - Server Component でデータ取得を実装するとき

globs:
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
---

# 並列データ取得パターン スキル

Server Component での複数データソースを効率的に並列取得するパターン集。

---

## 1. 概要: waterfall vs 並列

### Waterfall（順次実行）— 避けるべき

```
await A  ─── 200ms ───┐
                      await B ─── 150ms ───┐
                                          await C ─── 100ms ───┐
                                                                合計: 450ms
```

### 並列実行（Promise.all）— 推奨

```
await A  ─── 200ms ───┐
await B  ─── 150ms ───┤  → 全て同時開始
await C  ─── 100ms ───┘
                      合計: 200ms（最長のものだけ待つ）
```

Server Component で複数の非依存データを取得する場合、`Promise.all` を使って並列実行すること。

---

## 2. Pattern A: Promise.all による並列実行（同一 Server Component 内）

独立したデータを同一コンポーネント内で取得する最もシンプルなパターン。

```typescript
// src/app/(protected)/dashboard/page.tsx
import { getCachedCurrentUser, getCachedDashboardStats, getCachedRecentActivities } from '@/lib/cachedQueries';
import { notFound } from 'next/navigation';

export default async function DashboardPage() {
  // ✅ 並列実行: 3つのクエリを同時に開始
  const [userResult, statsResult, activitiesResult] = await Promise.all([
    getCachedCurrentUser(),
    getCachedDashboardStats(),
    getCachedRecentActivities({ limit: 10 }),
  ]);

  // エラーハンドリング
  if (userResult.isErr()) {
    if (userResult.error.code === 'USER_NOT_FOUND') notFound();
    throw new Error(userResult.error.message);
  }
  if (statsResult.isErr()) throw new Error(statsResult.error.message);
  if (activitiesResult.isErr()) throw new Error(activitiesResult.error.message);

  return (
    <DashboardView
      user={userResult.value}
      stats={statsResult.value}
      activities={activitiesResult.value}
    />
  );
}
```

### データに依存関係がある場合は順次実行

```typescript
// ✅ ユーザーID が必要な場合は先に取得してから並列
export default async function UserDashboardPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // まずユーザー取得（後続のクエリが userId に依存）
  const userResult = await getCachedUserById(userId);
  if (userResult.isErr()) {
    if (userResult.error.code === 'USER_NOT_FOUND') notFound();
    throw new Error(userResult.error.message);
  }

  // ユーザー取得後、残りを並列実行
  const [ordersResult, addressesResult] = await Promise.all([
    getCachedUserOrders({ userId }),
    getCachedUserAddresses({ userId }),
  ]);

  if (ordersResult.isErr()) throw new Error(ordersResult.error.message);
  if (addressesResult.isErr()) throw new Error(addressesResult.error.message);

  return (
    <UserDashboard
      user={userResult.value}
      orders={ordersResult.value}
      addresses={addressesResult.value}
    />
  );
}
```

---

## 3. Pattern B: 独立 Suspense 境界による並列ストリーミング

データ取得を複数コンポーネントに分割し、各々が独立してストリーミングされるパターン。
ページ全体のブロッキングを避け、準備できたコンテンツから順次表示する。

```typescript
// src/app/(protected)/dashboard/page.tsx
import { Suspense } from 'react';
import { DashboardStatsSection } from '@/components/features/dashboard/DashboardStatsSection';
import { RecentActivitiesSection } from '@/components/features/dashboard/RecentActivitiesSection';
import { Loading } from '@/components/ui/loading';

export default async function DashboardPage() {
  // ✅ ページコンポーネント自体はデータを取得しない
  // 各セクションが独立してデータを取得する
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* 統計: 独立して取得・表示 */}
      <Suspense fallback={<Loading />}>
        <DashboardStatsSection />
      </Suspense>

      {/* アクティビティ: 統計と並列でストリーミング */}
      <Suspense fallback={<Loading />}>
        <RecentActivitiesSection />
      </Suspense>
    </div>
  );
}
```

```typescript
// src/components/features/dashboard/DashboardStatsSection.tsx
import { getCachedDashboardStats } from '@/lib/cachedQueries';

// ✅ async Server Component — 独立してデータを取得
export async function DashboardStatsSection() {
  const result = await getCachedDashboardStats();
  if (result.isErr()) throw new Error(result.error.message);

  return <DashboardStats stats={result.value} />;
}
```

```typescript
// src/components/features/dashboard/RecentActivitiesSection.tsx
import { getCachedRecentActivities } from '@/lib/cachedQueries';

export async function RecentActivitiesSection() {
  const result = await getCachedRecentActivities({ limit: 10 });
  if (result.isErr()) throw new Error(result.error.message);

  return <ActivitiesList activities={result.value} />;
}
```

### Pattern A vs B の使い分け

| パターン | 適用場面 |
|---------|---------|
| **Pattern A (Promise.all)** | データが全て揃ってからレンダリングしたい場合。小さいページ、シンプルな構成 |
| **Pattern B (Suspense 境界)** | 大きなページで一部を先に表示したい場合。重いデータが他のコンテンツをブロックしてほしくない場合 |

---

## 4. Pattern C: React.cache() との組み合わせ（重複リクエスト排除）

`React.cache()` でラップすることで、同一リクエスト内で複数箇所から呼ばれても1回しか実行されない。

```typescript
// src/lib/cachedQueries.ts
import { cache } from 'react';
import { resolve } from '@/di/resolver';

// ✅ cache() でラップ → 同一リクエスト内での重複実行を防止
export const getCachedDashboardStats = cache(async () => {
  const useCase = resolve('GetDashboardStatsUseCase');
  return useCase.execute();
});

export const getCachedCurrentUser = cache(async () => {
  const useCase = resolve('GetCurrentUserUseCase');
  return useCase.execute();
});
```

```typescript
// src/app/(protected)/dashboard/page.tsx
// layout.tsx が getCachedCurrentUser() を呼んでいても、
// Promise.all 内で呼ぶと重複実行にはならない（React.cache() が吸収する）
const [userResult, statsResult] = await Promise.all([
  getCachedCurrentUser(),     // layout で既に呼ばれていても OK
  getCachedDashboardStats(),
]);
```

---

## 5. 判断フロー

```
データを取得する必要がある
         ↓
  データ同士が互いに依存するか？
         ↓
  YES → 依存するものを先に取得してから、
        残りを Promise.all で並列実行
         ↓
  NO → Promise.all で全て並列実行
         ↓
  ページ全体が揃ってから表示でよいか？
         ↓
  YES → Pattern A（Promise.all on page.tsx）
  NO  → Pattern B（Suspense 境界 + async Server Component）
         ↓
  同じデータが複数箇所で必要か？
         ↓
  YES → React.cache() でラップ（cachedQueries.ts）
  NO  → ラップ不要
```

---

## 6. 禁止パターン: 不要な await チェーン（アンチパターン）

```typescript
// ❌ アンチパターン: 独立したデータを順次実行している（waterfall）
export default async function BadPage() {
  const userResult = await getCachedCurrentUser();       // 200ms 待機
  const statsResult = await getCachedDashboardStats();   // 終わってから 150ms 待機
  const newsResult = await getCachedLatestNews();        // さらに 100ms 待機
  // 合計 450ms — 全て独立しているのに順次実行している

  return <Dashboard user={userResult.value} stats={statsResult.value} news={newsResult.value} />;
}

// ✅ 修正後: Promise.all で並列実行
export default async function GoodPage() {
  const [userResult, statsResult, newsResult] = await Promise.all([
    getCachedCurrentUser(),
    getCachedDashboardStats(),
    getCachedLatestNews(),
  ]);
  // 合計 200ms（最長のものだけ）

  return <Dashboard user={userResult.value} stats={statsResult.value} news={newsResult.value} />;
}
```

```typescript
// ❌ アンチパターン: Promise.all なしで変数を宣言してから await
export default async function BadPage2() {
  const userPromise = getCachedCurrentUser();
  const statsPromise = getCachedDashboardStats();
  const userResult = await userPromise;   // まだ OK（並列開始できている）
  const statsResult = await statsPromise; // まだ OK

  // しかし以下は NG（userResult に依存していないのに順次になっている）
  const newsResult = await getCachedLatestNews(); // ❌ 後から追加するとwaterfallになりやすい
}
```

---

## チェックリスト

- [ ] 複数の非依存データを取得する際は `Promise.all` を使っているか？
- [ ] データ間に依存関係がある場合のみ、順次 `await` を使っているか？
- [ ] 大きなページで部分的に先表示したい場合は Suspense 境界を使っているか？
- [ ] 同一データを複数箇所で使う場合は `React.cache()` でラップしているか（`cachedQueries.ts`）？
- [ ] `Promise.all` の各要素は独立したデータ取得になっているか？

---

## 関連スキル

- `server-component-data-patterns` — Server Component でのデータ取得設計パターン
- `react-cache-dedup` — React.cache() によるデデュプリケーション詳細
- `streaming-ssr-patterns` — Suspense を活用したストリーミング SSR パターン
- `nextjs-error-boundary` — error.tsx による Server Component エラーハンドリング
