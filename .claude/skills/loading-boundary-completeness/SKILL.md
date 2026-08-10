---
name: loading-boundary-completeness
description: |
  Next.js App Router の各ルートセグメントに loading.tsx を必須化するスキル。
  page.tsx 作成時に loading.tsx + error.tsx の同時作成を強制する。

  トリガー例:
  - 「loading.tsx」「loading state」「ルートセグメント」「新しいページ」
  - src/app/ 配下のディレクトリ作成時、page.tsx 作成時
  - 「ローディング」「読み込み中」「Suspense boundary」
globs:
  - "src/app/**/page.tsx"
---

# Loading Boundary Completeness

## 目的

全ルートセグメントに `loading.tsx` を配置し、
ページ遷移時のローディング体験を統一する。

## ルール

| ファイル | 必須条件 | テンプレート |
|---------|---------|------------|
| `page.tsx` | 常に必須 | — |
| `loading.tsx` | **常に必須** | 下記参照 |
| `error.tsx` | 常に必須（または親から継承） | `nextjs-error-boundary` スキル参照 |
| `not-found.tsx` | `[id]` 動的ルートのみ | — |

## loading.tsx テンプレート

```tsx
import { Loading } from '@/components/ui/loading';

export default function XxxLoading() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Loading size='lg' text='読み込み中...' />
    </div>
  );
}
```

- `Xxx` は機能名に置換（例: `UsersLoading`, `UserDetailLoading`）
- `@/components/ui/loading` の `Loading` コンポーネントを使用
- `size='lg'` をデフォルトとする

## 新ルート作成時のチェックリスト

1. `page.tsx` を作成
2. **`loading.tsx` を作成**（本スキルのテンプレート使用）
3. `error.tsx` を作成（`nextjs-error-boundary` スキル参照）
4. 動的ルート（`[id]`）なら `not-found.tsx` も作成

## 禁止パターン

- `loading.tsx` なしのルートセグメント
- `Suspense` でラップして `loading.tsx` を省略（Suspense は補助的に使うが loading.tsx は必須）

## 検出コマンド

```bash
# loading.tsx が無いルートセグメントを検出
for dir in $(find src/app -name 'page.tsx' -exec dirname {} \;); do
  [ ! -f "$dir/loading.tsx" ] && echo "MISSING: $dir/loading.tsx"
done
```

## 関連スキル

- `nextjs-error-boundary` — error.tsx / not-found.tsx パターン
- `frontend-patterns` — Server Component / Client Component 設計
