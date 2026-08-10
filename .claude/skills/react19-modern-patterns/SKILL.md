---
name: react19-modern-patterns
description: |
  React 19 の最新 API を使ったモダンなフロントエンドパターンを提供するスキル。
  useFormStatus・useOptimistic の活用、不要な 'use client' の検出、
  不要な Suspense の検出、notFound() パターン、フォーム実装の統一方針を扱う。

  トリガー例:
  - 「useTransition」「useState」「'use client'」「isPending」
  - フォーム実装時、「useFormStatus」「useOptimistic」「<Suspense」
  - src/app/ や src/components/ 配下のファイルを編集するとき
  - 「Suspense-First」「データローディング」「Loading状態」
---

# React 19 Modern Patterns Skill

React 19 の新 API を活用したモダンフロントエンドパターン。

---

## useFormStatus — SubmitButton のpending状態を自動取得

`useFormStatus()` は最寄りの `<form>` の送信状態を自動で取得できる。
SubmitButton コンポーネントに切り出すことで、親コンポーネントを汚染しない。

```tsx
// src/components/common/SubmitButton.tsx
'use client';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({ children, pendingLabel = '送信中...' }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

// 使い方（フォーム内に置くだけで自動的に pending 状態を反映）
<form action={serverAction}>
  <Input name="email" />
  <SubmitButton>送信</SubmitButton>
</form>
```

---

## useOptimistic — 削除・更新時の即時 UI 反映

非同期処理の完了を待たずに UI を先行更新するパターン。

```tsx
'use client';
import { useOptimistic, useTransition } from 'react';

interface ItemListClientProps {
  initialItems: Item[];
}

export function ItemListClient({ initialItems }: ItemListClientProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticItems, removeOptimisticItem] = useOptimistic(
    initialItems,
    (state, removedId: string) => state.filter((item) => item.id !== removedId),
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      // 先行してUIから削除（即時反映）
      removeOptimisticItem(id);
      // 実際のサーバー処理
      const result = await deleteItemAction(id);
      if (!result.success) {
        toast.error('削除に失敗しました');
        // React が自動的に optimisticItems を initialItems に戻す
      }
    });
  };

  return (
    <ul>
      {optimisticItems.map((item) => (
        <li key={item.id}>
          {item.name}
          <button type="button" onClick={() => handleDelete(item.id)}>削除</button>
        </li>
      ))}
    </ul>
  );
}
```

---

## 不要な 'use client' の検出ルール

`'use client'` を付ける必要がない場合のチェックリスト:

```tsx
// ❌ 不要な 'use client' の例
'use client';  // ← hooks を使っていないなら不要！

export function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

**'use client' が必要な条件（いずれか1つでも該当すれば必要）:**

- [ ] `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo` 等のReact Hooks を使用
- [ ] `useRouter`, `usePathname`, `useSearchParams` 等のNext.js Hooks を使用
- [ ] `onClick`, `onChange` 等のイベントハンドラを直接定義
- [ ] `useFormStatus`, `useOptimistic`, `useTransition` を使用
- [ ] `window`, `document`, `localStorage` 等のブラウザ API を使用

上記に該当しない場合は **Server Component のまま** にすること。

---

## cn('static-string') → 直接 className=

動的な条件合成がない場合、`cn()` は不要。

```tsx
// ❌ 不要: cn で静的文字列のみ
<div className={cn('flex items-center gap-4')}>

// ✅ 直接 className=
<div className="flex items-center gap-4">

// ✅ cn() を使うべきケース（動的合成）
<div className={cn(
  'flex items-center gap-4',
  isActive && 'bg-primary text-primary-foreground',
  variant === 'large' ? 'text-lg' : 'text-sm',
)}>
```

---

## 不要な Suspense の検出ルール

`<Suspense>` が必要な条件:

- [ ] **Server Component** が非同期データフェッチを含む子コンポーネントをラップしている
- [ ] `use()` hook で Promise を解決している
- [ ] `dynamic()` で lazy load したコンポーネントをラップしている

**不要な Suspense の例:**

```tsx
// ❌ 不要: Client Component 内で async 処理がない Suspense
'use client';
export function UserListClient({ users }: { users: User[] }) {
  return (
    <Suspense fallback={<Loading />}>  {/* ← このSuspenseは意味がない */}
      <ul>
        {users.map((u) => <li key={u.id}>{u.name}</li>)}
      </ul>
    </Suspense>
  );
}

// ✅ Suspense が有効なケース（Server Component で非同期データフェッチ）
export default async function UsersPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UserListServer />  {/* ← 内部でDB取得する Server Component */}
    </Suspense>
  );
}
```

---

## notFound() + not-found.tsx パターン

存在しないリソースへのアクセスには `notFound()` を使う。

```tsx
// src/app/users/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const result = await getUserAction(params.id);

  // ✅ 正しい: notFound() で 404 ページに遷移
  if (!result.success || !result.data) {
    notFound();
  }

  return <UserDetailClient user={result.data} />;
}
```

```tsx
// src/app/users/[id]/not-found.tsx
export default function UserNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h1 className="text-2xl font-bold">ユーザーが見つかりません</h1>
      <p className="text-muted-foreground">指定されたユーザーは存在しないか、削除されました。</p>
      <Button asChild>
        <Link href={routes.users.list()}>ユーザー一覧に戻る</Link>
      </Button>
    </div>
  );
}
```

**注意**: エラー表示に `alert` コンポーネントや `try/catch` を使うより、
`notFound()` + `not-found.tsx` の方が Next.js の規約に沿っており適切。

---

## フォームでの useTransition 統一パターン

全フォームで `useTransition` + `startTransition(async () => {...})` に統一する。

```tsx
'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

export function CreateUserFormClient() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors('root');
    startTransition(async () => {
      const result = await createUserAction(values);
      if (result.success) {
        toast.success('ユーザーを作成しました');
        router.push(routes.users.list());
      } else {
        form.setError('root', { type: 'server', message: result.error });
        toast.error(result.error);
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        {/* フィールド */}
        <Button type="submit" disabled={isPending}>
          {isPending ? '作成中...' : 'ユーザーを作成'}
        </Button>
      </form>
    </Form>
  );
}
```

**禁止パターン:**

```tsx
// ❌ 禁止: useState(isLoading) + try/finally パターン
const [isLoading, setIsLoading] = useState(false);
const onSubmit = async (values) => {
  setIsLoading(true);
  try {
    await createUserAction(values);
  } finally {
    setIsLoading(false);
  }
};
```

---

## React Compiler Readiness

React Compiler（React 19 の自動メモ化コンパイラ）の導入に備えて、手動メモ化には目的を明示するコメントを付ける。

### コメント規約

```tsx
// React Compiler: keep — memo'd child dependency
// → メモ化された子コンポーネントへの prop として渡す場合（参照安定性が必要）
const handleSubmit = useCallback(() => { ... }, [deps]);

// React Compiler: keep — hot path
// → 高頻度レンダリングの最適化が必要な場合
const expensiveValue = useMemo(() => heavyCalc(data), [data]);

// React Compiler: removable when adopted
// → React Compiler 導入後に削除可能（念のためのメモ化）
const stableRef = useCallback(() => { ... }, [deps]);
```

### 判断ツリー

```
useMemo / useCallback を書こうとしている
  ↓
メモ化された子コンポーネントへの prop？
  → Yes → // React Compiler: keep — memo'd child dependency
  ↓
高頻度レンダリング（仮想リスト、アニメーション等）？
  → Yes → // React Compiler: keep — hot path
  ↓
どちらでもない（念のためのメモ化）
  → // React Compiler: removable when adopted
```

詳細は `react19-compiler-readiness` スキルを参照。

---

## チェックリスト

### 'use client' の見直し

- [ ] hooks/イベントハンドラを使っていないコンポーネントから `'use client'` を削除した
- [ ] Server Component にできる箇所は Server Component にした

### フォーム実装

- [ ] `useTransition` + `startTransition(async () => {...})` パターンを使用している
- [ ] `useState(isLoading)` パターンを使っていない
- [ ] `isPending` のみでボタンの disabled を制御している（`isSubmitting` との二重チェックなし）

### UI パターン

- [ ] 静的 className は `cn()` を使わず直接 `className=` を使用している
- [ ] 不要な `<Suspense>` を削除した
- [ ] リソース未検出時は `notFound()` + `not-found.tsx` を使用している

---

## Suspense-First データローディング

React 19 では、条件分岐による Loading 表示よりも Suspense 境界を推奨する。

### 条件分岐パターン（従来）
```typescript
// △ 動作するが宣言的ではない
{isPending && <Loading />}
{!isPending && <DataComponent data={data} />}
```

### Suspense パターン（推奨）
```typescript
// ✅ 宣言的でReact 19推奨
<Suspense fallback={<Loading />}>
  <DataComponent />
</Suspense>
```

### 使い分け
- **Server Component のデータ取得**: Suspense が最適
- **Client Component の useTransition**: isPending による条件分岐も適切（Suspense は useTransition と直接統合しない）
- **フォーム送信のペンディング**: useFormStatus / isPending が適切

### 注意
Client Component で `isPending` を使う場合は、Suspense に置換する必要はない。
Suspense-First は主に Server Component のデータフェッチパターンに適用される。

---

## 関連スキル

- **react19-form-patterns**: useTransition + react-hook-form の詳細パターン
- **frontend-patterns**: Server/Client 分離、shadcn/ui コンポーネントパターン
- **presentation-impl**: Server Action の実装パターン
