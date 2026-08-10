---
name: streaming-ssr-patterns
description: |
  Next.js App Router のストリーミング SSR パターンを提供するスキル。
  Suspense 境界設計、loading.tsx vs inline Suspense の使い分け、
  段階的コンテンツ表示、use() hook による Promise unwrap を扱う。

  トリガー例:
  - 「Suspense」「streaming」「loading.tsx」「段階的表示」
  - page.tsx でデータを非同期に取得して表示するとき
  - Suspense で重いコンポーネントを包むとき

globs:
  - "src/app/**/loading.tsx"
  - "src/app/**/page.tsx"
---

# Streaming SSR パターン スキル

Next.js App Router のストリーミング SSR と Suspense 境界の設計パターンを提供します。

---

## 1. Streaming SSR の仕組み

### HTML チャンク分割と順次送信

従来の SSR はすべてのデータが揃うまでレスポンスを返せませんでした。
Streaming SSR では HTML を複数のチャンクに分割し、準備できた部分から順次クライアントへ送信します。

```
従来の SSR:
[データ取得完了まで待機] → [全体を一括レスポンス]
      ↓ ユーザーは何も見えない（長時間）

Streaming SSR:
[シェル即時レスポンス] → [データ取得中: ローディング表示] → [データ準備完了: 差し替え]
      ↓ ユーザーはすぐにページ骨格を見られる（UX向上）
```

### Next.js App Router での仕組み

Next.js は `<Suspense>` 境界を検出すると、その境界内のコンポーネントを非同期的に処理します。
`loading.tsx` は特定のルートセグメント全体を自動的に `<Suspense>` で包む仕組みです。

---

## 2. loading.tsx の配置ルール

### ルートセグメントごとの配置

```
src/app/
├── loading.tsx           # ルート全体のローディング（フォールバック）
├── dashboard/
│   ├── loading.tsx       # /dashboard 全体のローディング
│   ├── page.tsx
│   └── users/
│       ├── loading.tsx   # /dashboard/users のローディング
│       └── page.tsx
```

### このプロジェクトの標準テンプレート

```tsx
// src/app/dashboard/loading.tsx
import { Spinner } from '@/components/ui/spinner';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}
```

### スケルトンを使ったローディング UI

```tsx
// src/app/dashboard/users/loading.tsx
export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 3. loading.tsx vs inline Suspense の使い分け

### 判断フロー

```
ページ全体がデータ待ち？
    ↓ YES → loading.tsx を使用（自動的にページ全体を囲む）
    ↓ NO  → inline Suspense を使用（特定部分のみ非同期化）

ページ内に複数の独立した非同期コンポーネントがある？
    ↓ YES → 各コンポーネントを個別の inline Suspense で囲む（並列ローディング）
    ↓ NO  → loading.tsx で十分
```

### loading.tsx が適切なケース

```tsx
// ページ全体のデータが必要な場合
// src/app/user/[id]/page.tsx
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserAction(id);  // この1件のデータが揃えばページ表示可能
  // ...
}

// → loading.tsx で十分
// src/app/user/[id]/loading.tsx でローディング UI を定義
```

### inline Suspense が適切なケース

```tsx
// ページ内に複数の独立したデータソースがある場合
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  // ✅ 各セクションを独立した Suspense で囲む（並列ローディング）
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />  {/* DB クエリA */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivitySection />  {/* DB クエリB */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <SalesChartSection />  {/* 外部API呼び出し */}
      </Suspense>
    </div>
  );
}
```

---

## 4. Suspense 境界の粒度設計

### 粗すぎる Suspense（避けるべき）

```tsx
// ❌ 粗すぎ: ページ全体を1つの Suspense で囲む
// → すべてのデータが揃うまで何も表示されない
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <StatsSection />
      <RecentActivitySection />
      <SalesChartSection />
    </Suspense>
  );
}
```

### 細かすぎる Suspense（避けるべき）

```tsx
// ❌ 細かすぎ: リストの各アイテムを Suspense で囲む
// → ローディングインジケータが多数表示されてレイアウトが崩れる
export default async function UserListPage() {
  const users = await getUsersAction();
  return (
    <ul>
      {users.map((user) => (
        <Suspense key={user.id} fallback={<ItemSkeleton />}>
          <UserItem user={user} />  {/* 同期コンポーネントなので Suspense 不要 */}
        </Suspense>
      ))}
    </ul>
  );
}
```

### 適切な粒度

```tsx
// ✅ 適切: ページの主要セクションを単位とした粒度
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダーは即時表示（非同期なし） */}
      <DashboardHeader />

      {/* 統計セクションはデータ待ち */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* 最近の活動はデータ待ち（統計と並列） */}
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivitySection />
      </Suspense>
    </div>
  );
}
```

---

## 5. React 19 use() Hook による Promise unwrap

React 19 の `use()` hook を使うと、コンポーネント内で Promise を直接 unwrap できます。
`use()` を含むコンポーネントは自動的に Suspense に対応します。

### 基本パターン

```tsx
// src/components/features/users/UserProfile.tsx
import { use } from 'react';

interface UserProfileProps {
  // Promise を直接受け取る
  userPromise: Promise<User>;
}

// ✅ use() で Promise を unwrap（このコンポーネントは Suspense が必要）
export function UserProfile({ userPromise }: UserProfileProps) {
  const user = use(userPromise);  // Promise が解決されるまで Suspend

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Server Component から Promise を渡す

```tsx
// src/app/user/[id]/page.tsx
import { Suspense } from 'react';
import { getUserAction } from '@/layers/presentation/actions/user/getUserAction';
import { UserProfile } from '@/components/features/users/UserProfile';
import { UserProfileSkeleton } from '@/components/features/users/UserProfileSkeleton';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ Promise を await せずに渡す（ストリーミングの恩恵を受ける）
  const userPromise = getUserAction(id).then((result) => {
    if (result.isErr()) throw result.error;
    return result.value;
  });

  return (
    <div>
      <h1>ユーザー詳細</h1>
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
    </div>
  );
}
```

### Context の use() 用途

```tsx
'use client';
import { use } from 'react';
import { ThemeContext } from '@/components/providers/ThemeProvider';

// ✅ use() は Context の unwrap にも使える（useContext の代替）
function ThemeToggle() {
  const theme = use(ThemeContext);
  return <button onClick={theme.toggle}>テーマ切替</button>;
}
```

---

## 6. Deferred Shell Pattern（高速な外殻、遅いデータ）

ページの骨格（ヘッダー、ナビゲーション、レイアウト）を即時表示し、
重いデータ部分だけを遅延ロードするパターンです。

```tsx
// src/app/reports/page.tsx
export default async function ReportsPage() {
  // ✅ 軽量なメタデータは即時取得
  const reportTypes = await getReportTypesAction();  // 高速なマスタデータ

  return (
    <div className="space-y-6">
      {/* シェル: 即時表示 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-balance">レポート</h1>
        <ReportTypeSelector types={reportTypes} />
      </div>

      {/* 重いデータ部分: Suspense で遅延 */}
      <Suspense fallback={<ReportDataSkeleton />}>
        <ReportDataSection />  {/* 重い集計クエリ */}
      </Suspense>

      {/* 別のデータ: 独立した Suspense */}
      <Suspense fallback={<RecentReportsSkeleton />}>
        <RecentReportsSection />  {/* 最近のレポート一覧 */}
      </Suspense>
    </div>
  );
}

// ✅ 非同期 Server Component として分離
async function ReportDataSection() {
  const data = await getReportDataAction();  // 重い処理はここで
  return <ReportChart data={data} />;
}

async function RecentReportsSection() {
  const reports = await getRecentReportsAction();
  return <ReportList reports={reports} />;
}
```

---

## 7. 禁止パターン

### ❌ ページ最上位の単一 Suspense

```tsx
// ❌ 禁止: ページ全体を1つの大きな Suspense で囲む
// → Streaming の恩恵がない（すべてのデータが揃うまで何も表示されない）
export default function DashboardPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <StatsSection />
      <ActivitySection />
      <ChartSection />
    </Suspense>
  );
}
```

### ❌ loading.tsx がある場合の不要な inline Suspense

```tsx
// loading.tsx が既にページ全体をカバーしている場合
// ❌ 冗長: page.tsx 内で再度 Suspense を使う
export default async function UsersPage() {
  return (
    <Suspense fallback={<Spinner />}>  {/* loading.tsx と重複 */}
      <UserList />
    </Suspense>
  );
}
```

### ❌ fallback なしの Suspense

```tsx
// ❌ 禁止: fallback が null または undefined
<Suspense fallback={null}>
  <AsyncComponent />
</Suspense>

// ❌ 禁止: fallback が空の Fragment
<Suspense fallback={<></>}>
  <AsyncComponent />
</Suspense>

// ✅ 正しい: 適切なスケルトン UI を提供
<Suspense fallback={<UserListSkeleton />}>
  <UserList />
</Suspense>
```

### ❌ 同期コンポーネントへの Suspense 適用

```tsx
// ❌ 不要: Client Component は Suspend しない
<Suspense fallback={<Loading />}>
  <UserFilterClient />  {/* 'use client' コンポーネント */}
</Suspense>

// ❌ 不要: 同期 Server Component への適用
<Suspense fallback={<Loading />}>
  <StaticContent />  {/* データフェッチなし */}
</Suspense>
```

---

## 8. チェックリスト

### loading.tsx 作成時

- [ ] ルートセグメントの階層に合わせて配置した
- [ ] スケルトン UI が実際のコンテンツ構造を模倣している（レイアウトシフト防止）
- [ ] `Spinner` / `Loading` コンポーネントを `@/components/ui/` から import している

### inline Suspense 使用時

- [ ] 非同期コンポーネント（データフェッチあり）を囲んでいる
- [ ] 適切な fallback（スケルトン UI）を提供している
- [ ] 独立したデータソースは独立した Suspense で囲んでいる（並列ローディング）
- [ ] loading.tsx との重複がない

### use() hook 使用時

- [ ] Promise を渡すコンポーネントを `<Suspense>` で囲んでいる
- [ ] エラーハンドリングのために `error.tsx` が配置されている

---

## 9. 関連スキル

- `react19-use-hook`: React 19 の `use()` による Promise/Context unwrap の詳細パターン
- `loading-boundary-completeness`: 各ルートセグメントへの loading.tsx 配置の完全性チェック
- `nextjs-error-boundary`: `error.tsx` による Error Boundary パターン（Suspense と併用）
- `react-cache-dedup`: `React.cache()` による Server Component データフェッチのデデュプリケーション
- `next-dynamic-import`: 重いコンポーネントの動的インポートと Suspense の連携
