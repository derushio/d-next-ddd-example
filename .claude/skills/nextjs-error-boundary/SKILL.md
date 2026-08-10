---
name: nextjs-error-boundary
description: |
  Next.js App Router の error.tsx パターンを提供するスキル。
  ページ/ルート作成時のError Boundary設計、reset()リトライ、
  not-found.tsxとの棲み分け、デザイン一貫性を扱う。

  トリガー例:
  - 「error.tsx」「Error Boundary」「エラーページ」「エラーハンドリング」
  - 新しいページ/ルートを作成しようとしたとき
  - src/app/ 配下のディレクトリ作成時
globs:
  - "src/app/**/error.tsx"
  - "src/app/**/page.tsx"
---

# Next.js Error Boundary パターン

## このスキルの目的

- `error.tsx` の実装パターンを標準化する
- Next.js App Router の Error Boundary 階層設計を明確にする
- `not-found.tsx` との棲み分けルールを提供する
- デザインの一貫性（Card・アイコン・ボタン）を維持する

---

## error.tsx の基本パターン

```typescript
'use client'; // ❗必須: error.tsx は常に Client Component

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // NOTE: デバッグログ削除禁止（プロジェクトルール）
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4'>
      <Card variant='elevated' padding='lg' className='max-w-md w-full text-center'>
        <div className='flex justify-center mb-4'>
          <AlertTriangle className='size-12 text-destructive' />
        </div>
        <h1 className='text-2xl font-bold text-balance mb-2'>
          エラーが発生しました
        </h1>
        <p className='text-sm text-pretty text-muted-foreground mb-6'>
          予期しないエラーが発生しました。
          しばらく時間をおいてから再度お試しください。
        </p>
        {error.digest && (
          <p className='text-xs text-muted-foreground mb-4 font-mono'>
            Error ID: {error.digest}
          </p>
        )}
        <div className='flex flex-col gap-3'>
          <Button variant='aurora' onClick={reset}>
            もう一度試す
          </Button>
          <Button variant='outline' asChild>
            <Link href='/'>ホームに戻る</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

## 階層設計

| ファイル | スコープ | 使い方 |
|---|---|---|
| `src/app/error.tsx` | 全ルート | グローバルフォールバック（必須） |
| `src/app/users/error.tsx` | `/users/*` | ユーザー管理セクション固有 |
| `src/app/auth/error.tsx` | `/auth/*` | 認証セクション固有 |
| `src/app/global-error.tsx` | Root Layout 含む全体 | Root Layout 自体がクラッシュした場合 |

### global-error.tsx の注意点

Root Layout のクラッシュを捕捉するため、`html` / `body` タグが必要。

```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='ja'>
      <body>
        {/* error.tsx と同じデザインを再現 */}
        <div className='flex min-h-screen items-center justify-center p-4'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-balance mb-4'>
              予期しないエラーが発生しました
            </h1>
            <button type='button' onClick={reset}>
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

---

## not-found.tsx との棲み分け

| ファイル | 発火条件 | 用途 |
|---|---|---|
| `error.tsx` | 未キャッチの例外（throw） | ランタイムエラー、サーバーエラー |
| `not-found.tsx` | `notFound()` 関数の呼び出し | 404（リソースが存在しない） |

```typescript
// ✅ not-found.tsx を使うべきケース: リソースが見つからない
import { notFound } from 'next/navigation';

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUserAction({ id: params.id });
  if (!user.success || !user.data) {
    notFound(); // → not-found.tsx が表示される
  }
  return <UserProfile user={user.data} />;
}

// ✅ error.tsx が発火するケース: 予期しない例外
export default async function DashboardPage() {
  const data = await getDashboardData(); // DB接続エラー等が throw される
  // → error.tsx が表示される
}
```

---

## ✅ デザインルール

| 要素 | 指定 |
|---|---|
| コンテナ | `Card variant='elevated' padding='lg'` |
| アイコン | `AlertTriangle` from `lucide-react`（`size-12 text-destructive`） |
| 見出し h1 | `text-balance` 必須 |
| 説明文 p | `text-pretty` 必須 |
| リトライボタン | `Button variant='aurora' onClick={reset}` |
| ナビゲーション | コンテキストに応じた戻り先（ホーム等）を `Button variant='outline' asChild` + `Link` |
| 背景 | セクションのカラーテーマに合わせたグラデーション |
| Error ID | `error.digest` があれば `font-mono text-xs` で表示 |

### セクション別グラデーション例

```tsx
{/* グローバル / 汎用 */}
className='bg-gradient-to-br from-red-50 to-orange-50'

{/* 認証セクション */}
className='bg-gradient-to-br from-blue-50 to-indigo-50'

{/* ユーザー管理 */}
className='bg-gradient-to-br from-purple-50 to-pink-50'
```

---

## ❌ 禁止パターン

```typescript
// ❌ 'use client' の省略（Next.js がビルドエラーをスロー）
export default function ErrorPage({ error, reset }) { ... }

// ❌ console.error の省略（プロジェクトルール: デバッグログ削除禁止）
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // useEffect 内の console.error を削除しない
  return <div>...</div>;
}

// ❌ error.tsx 内でのデータフェッチ
export default function ErrorPage() {
  const data = useSomeData(); // エラー状態でサーバーリクエストしない
}

// ❌ reset() なしのエラーページ（リトライ手段がない）
export default function ErrorPage({ error }: { error: Error }) {
  return <div>エラー: {error.message}</div>;
}
```

---

## loading.tsx 必須ルール

**`page.tsx` を作成するときは必ず同一ディレクトリに `loading.tsx` を作成すること。**

### loading.tsx テンプレート

```tsx
import { Loading } from '@/components/ui/loading';

export default function LoadingPage() {
  return (
    <div className='flex min-h-[50vh] items-center justify-center'>
      <Loading size='lg' />
    </div>
  );
}
```

### 作成順序

1. `page.tsx` を作成
2. 同一ディレクトリに `loading.tsx` を作成（上記テンプレート使用）
3. 必要に応じて `error.tsx` を作成

### 検出コマンド

```bash
# loading.tsx が不足している page.tsx を検出
find src/app -name 'page.tsx' | while read p; do
  dir=$(dirname "$p")
  [ ! -f "$dir/loading.tsx" ] && echo "Missing loading.tsx: $dir"
done
```

---

## 新しいルート追加時のチェックリスト

- [ ] `loading.tsx` を同一ディレクトリに作成したか
- [ ] 親ディレクトリ（または `src/app/`）に `error.tsx` が存在するか確認
- [ ] `'use client'` ディレクティブが先頭にあるか
- [ ] `useEffect` で `console.error` を呼んでいるか
- [ ] `reset()` ボタンが実装されているか
- [ ] ナビゲーションリンク（コンテキストに応じた戻り先）があるか
- [ ] `not-found.tsx` との棲み分けが適切か（リソース未発見は `notFound()` を使う）
- [ ] `error.digest` の表示を実装しているか
- [ ] h1 に `text-balance`、p に `text-pretty` を適用しているか

---

## 関連スキル

- `frontend-patterns`（Primary）: Next.js App Router パターン全般（`notFound()` パターンを含む）
- `tailwind-v4-text-utilities`: `text-balance` / `text-pretty` の適用ルール
- `icon-consistency`: `lucide-react` アイコンの統一ルール
