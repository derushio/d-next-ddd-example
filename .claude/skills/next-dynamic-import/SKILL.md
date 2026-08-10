---
name: next-dynamic-import
description: |
  重いUIコンポーネント（Dialog, AlertDialog, Sheet, Drawer等）の
  遅延ロードパターンを提供するスキル。
  React.lazy + Suspense によるコード分割の判断基準と実装パターンを扱う。

  トリガー例:
  - 「AlertDialog」「Dialog」「Sheet」「Drawer」のimport
  - 重いコンポーネントを静的importしようとしたとき
  - バンドルサイズ最適化、コード分割
  - 「React.lazy」「lazy(」「next/dynamic」
---

# Next.js Dynamic Import Skill

`React.lazy` + `Suspense` によるコード分割パターン。
Dialog / AlertDialog / Sheet / Drawer 等のモーダル系コンポーネントを遅延ロードしてバンドルサイズを最適化する。

---

## 判断マトリクス

| ケース | 遅延ロード | 理由 |
|--------|-----------|------|
| AlertDialog / Dialog / Sheet / Drawer の Content 部分 | ✅ する | ユーザーアクション（クリック）後にのみ表示される |
| Trigger / Button | ❌ しない | 初期表示に必要なため |
| 頻繁に表示されるモーダル（毎ページ表示等） | ❌ しない | 遅延による UX 劣化（ちらつき）が生じる |
| ページレベルのコンポーネント | ✅ する | ルート遷移時にのみ必要 |
| 小さいコンポーネント（< 5KB 程度） | ❌ しない | 分割のオーバーヘッドが利点を上回る |
| データフェッチを含む重いコンポーネント | ✅ する | バンドルサイズ + 実行コスト削減 |

---

## ✅ 推奨パターン: React.lazy + Suspense

### 基本実装

```typescript
'use client';

import { lazy, Suspense } from 'react';
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// Content 部分のみ遅延ロード
const DeleteConfirmDialogContent = lazy(
  () => import('./DeleteConfirmDialog/DialogContent'),
);

interface Props {
  userId: string;
  onDeleted?: () => void;
}

export function DeleteConfirmDialogClient({ userId, onDeleted }: Props) {
  return (
    <AlertDialog>
      {/* Trigger は静的 import のまま（初期表示に必要） */}
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>削除</Button>
      </AlertDialogTrigger>
      {/* Content のみ Suspense でラップ */}
      <Suspense fallback={null}>
        <DeleteConfirmDialogContent userId={userId} onDeleted={onDeleted} />
      </Suspense>
    </AlertDialog>
  );
}
```

### DialogContent 側の実装

```typescript
// DeleteConfirmDialog/DialogContent.tsx
'use client';

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  userId: string;
  onDeleted?: () => void;
}

// default export 必須（React.lazy は default export のみ対応）
export default function DialogContent({ userId, onDeleted }: Props) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
        <AlertDialogDescription>
          この操作は取り消せません。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>キャンセル</AlertDialogCancel>
        <AlertDialogAction onClick={/* ... */}>削除</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
```

---

## ファイル構成パターン

```
src/components/features/users/
├── DeleteConfirmDialogClient.tsx     ← Trigger + lazy import（親）
└── DeleteConfirmDialog/
    └── DialogContent.tsx             ← default export（Content部分のみ）
```

同一ディレクトリ内でのバリエーション:

```
src/components/features/settings/
├── EditProfileDialogClient.tsx       ← Dialog（Trigger + lazy Content）
├── EditProfileDialog/
│   └── DialogContent.tsx
├── DeleteAccountAlertClient.tsx      ← AlertDialog（Trigger + lazy Content）
└── DeleteAccountAlert/
    └── DialogContent.tsx
```

---

## ❌ 禁止パターン

### next/dynamic を Client Component 内部で使用

```typescript
// ❌ 禁止: next/dynamic は Server Component または動的ルート用
import dynamic from 'next/dynamic';
const HeavyDialog = dynamic(() => import('./HeavyDialog'), { ssr: false });

// ✅ 推奨: Client Component 内では React.lazy を使う
import { lazy } from 'react';
const HeavyDialog = lazy(() => import('./HeavyDialog'));
```

### Trigger を lazy-load する

```typescript
// ❌ 禁止: Trigger は初期表示に必要なため遅延不可
const LazyTrigger = lazy(() => import('./DialogTrigger'));

// ✅ 推奨: Trigger は静的 import
import { AlertDialogTrigger } from '@/components/ui/alert-dialog';
```

### Suspense なしの lazy

```typescript
// ❌ 禁止: Suspense なしは React がエラーをスロー（Uncaught Error: Suspense boundary not found）
const LazyContent = lazy(() => import('./DialogContent'));
<LazyContent />

// ✅ 推奨: 必ず Suspense でラップ
<Suspense fallback={null}>
  <LazyContent />
</Suspense>
```

### named export のみのファイルを lazy-load

```typescript
// ❌ 禁止: React.lazy は named export に対応していない
const LazyContent = lazy(() => import('./DialogContent').then(m => ({ default: m.DialogContent })));
// ※ 技術的には動くが、プロジェクト規約として default export を使うこと

// ✅ 推奨: lazy-load 対象ファイルは必ず default export を使う
export default function DialogContent() { /* ... */ }
```

---

## Suspense fallback の選択

| コンテキスト | fallback | 理由 |
|-------------|---------|------|
| ダイアログ系（Dialog / AlertDialog / Sheet） | `null` | open animation が視覚フィードバックになるため |
| ページレベルのコンポーネント | `<LoadingSpinner />` | 全画面ローディングが適切 |
| データ依存コンポーネント（リスト等） | `<Skeleton />` | レイアウトシフトを防ぐ |
| インラインの小さな非同期コンポーネント | `null` または `<Spinner size='sm' />` | コンテキストに応じて選択 |

---

## チェックリスト

- [ ] AlertDialog / Dialog / Sheet / Drawer の Content 部分を `lazy` でロードしているか
- [ ] Trigger は静的 import のままか（`lazy` にしていないか）
- [ ] `lazy` コンポーネントを `<Suspense>` でラップしているか
- [ ] lazy-load 対象ファイルが `default export` を使用しているか
- [ ] Client Component 内で `next/dynamic` ではなく `React.lazy` を使っているか
- [ ] `fallback` の選択がコンテキストに合っているか（ダイアログ系は `null`）

---

## React.lazy 禁止ルール

Next.js プロジェクトでは `React.lazy()` の使用を禁止し、`next/dynamic` に統一する。

### 禁止パターン
```typescript
// ❌ React.lazy — Next.js では使用禁止
import { lazy, Suspense } from 'react';
const Component = lazy(() => import('./Component'));
<Suspense fallback={<Loading />}><Component /></Suspense>
```

### 推奨パターン
```typescript
// ✅ next/dynamic — SSR制御・ローディング統合
import dynamic from 'next/dynamic';
import { Loading } from '@/components/ui/loading';
const Component = dynamic(() => import('./Component'), {
  loading: () => <Loading variant="spinner" size="sm" />,
});
<Component />  // Suspense ラッパー不要
```

### 理由
- `next/dynamic` は SSR 制御（`ssr: false`）を提供
- loading プロパティで Suspense ラッパーが不要
- Next.js の最適化パイプラインと統合される
- Webpack/Turbopack のチャンク戦略と連携

### チェックリスト追加
- [ ] `React.lazy` を使用していないか？ → `next/dynamic` に置換
- [ ] 不要な `Suspense` ラッパーを削除したか？

---

## 関連スキル

- **`frontend-patterns`**（Primary）: Next.js App Router + shadcn/ui の全般的なコンポーネントパターン
- **`react19-modern-patterns`**: React 19 の最新 API（use、Suspense 拡張等）の活用パターン
