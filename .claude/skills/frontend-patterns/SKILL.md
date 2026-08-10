---
name: frontend-patterns
description: |
  Next.js App Router + shadcn/ui + TailwindCSS v4.2+ でのフロントエンド実装パターン。
  ドーナツ構造、Server Component優先、Client Component最小化を実現。
  OKLCH色空間テーマシステム、radix-ui統一パッケージ、data-slot/data-variant属性対応。
  notFound() + not-found.tsx の 404 ハンドリング、lucide-react 統一（インライン SVG 禁止）、
  Button asChild パターン、不要な <Suspense> 検出ルールも提供。

  トリガー例:
  - 「UI実装」「コンポーネント作成」「Server Component」「Client Component」
  - 「ページ作成」「フォーム実装」「shadcn/ui使いたい」
  - 「notFound」「404」「not-found.tsx」「アイコン」「SVG」「Button asChild」
  - src/app/, src/components/ 配下のファイルを編集するとき
---

# Frontend Implementation Patterns Skill

Next.js 16 App Router + shadcn/ui + TailwindCSS v4.2+ のフロントエンド実装パターンを提供します。

### テーマシステム
- **OKLCH色空間**: globals.css で `--primary: oklch(L C H);` 形式で定義
- **@theme inline マッピング**: `--color-primary: var(--primary);`（hsl()ラッピング不要）
- 詳細は `references/shadcn-enhanced.md` の「OKLCH色空間テーマシステム」セクション参照

### CSSカラー管理ルール
- **OKLCHがソース**: `--primary`, `--background` 等の shadcn/ui OKLCH変数が唯一のソース
- **❌ 禁止**: `--aurora-primary-start: #8b5cf6` のような別系統HEXカスタム変数の並行管理
- グラデーション用に特定HEX値が必要な場合も、OKLCH変数から参照するかインライン記述を優先すること

### Tailwind v4 内蔵ユーティリティ優先
- **❌ 禁止**: `sr-only` など Tailwind v4 内蔵ユーティリティを globals.css に手動再実装すること
- Tailwind v4 では `sr-only`, `not-sr-only`, `text-balance`, `text-pretty` 等が標準提供される
- globals.css への追加前に Tailwind v4 組み込みユーティリティを確認すること

### 共通UIの抽出判断
- **3箇所以上で同一マークアップ → Server Component に抽出**: `src/components/common/` 配下に配置
- 抽出基準: 完全同一構造で props により差分のみ変わる場合（色、テキスト等）
- 例: BackgroundDecoration（背景2-blobグラデーション）、PageLayout（min-h-screen + padding 共通ラッパー）等
- **❌ 禁止**: 同一JSX構造を 4 ページ以上にコピーペーストすること

### コンポーネント基盤
- **radix-ui統一パッケージ**: `import { Dialog } from "radix-ui"` / `import { Slot } from "radix-ui"`
- **Slot.Root パターン**: `asChild ? Slot.Root : "button"`
- **data属性**: `data-slot="button"`, `data-variant={variant}` でセマンティック識別
- 詳細は `references/shadcn-enhanced.md` の「radix-ui 統一パッケージ」セクション参照

---

## 🎯 Phase 1: Server/Client分離判断

### 判断基準

```
Server Component使用:
- [ ] async/awaitでのデータフェッチ
- [ ] サーバーサイドのみで実行すべき処理
- [ ] 重いライブラリ（クライアント不要）
- [ ] SEO最適化重要
- [ ] 静的コンテンツ表示

Client Component使用:
- [ ] useState、useEffect等のReact Hooks
- [ ] ブラウザAPI（window、localStorage）
- [ ] onClickなどのイベントハンドラ
- [ ] リアルタイムUI更新
```

### 命名規則

```
Client Componentには必ず`Client`サフィックスを付与:

✅ UserFilterClient.tsx
✅ SignInFormClient.tsx
❌ UserFilter.tsx（区別不明）
```

---

## 🍩 Phase 2: ドーナツ構造実装

### 基本パターン

```tsx
// ✅ Server Component（外側）
export default async function UsersPage() {
  const users = await getUsersAction(); // サーバーでデータ取得

  return (
    <div>
      <h1>ユーザー一覧</h1> {/* 静的コンテンツ */}
      <UserList users={users} /> {/* データ表示 */}
      <UserFilterClient /> {/* インタラクティブな部分のみClient */}
    </div>
  );
}

// ✅ Client Component（内側）
'use client';
export function UserFilterClient() {
  const [filter, setFilter] = useState('');
  // インタラクティブな機能のみ
}
```

**詳細パターン**: `references/server-client-patterns.md`

---

## 🎨 Phase 3: shadcn/ui Enhanced Components

### カスタマイズ済みコンポーネント（ui:add禁止）

```
button, card, input, alert, alert-dialog, badge, dialog,
form, label, separator, sonner,
loading, spinner
```

### Button Enhanced

```tsx
import { Button } from '@/components/ui/button';

// shadcn/ui標準
<Button variant="default">標準</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>

// Enhanced機能（グラデーション variant 推奨）
<Button variant="aurora" loading={isLoading}>
  グラデーション＋ローディング
</Button>
{/* gradient={true} は廃止済み。variant="aurora" 等を使用すること */}
```

### Card Enhanced

```tsx
import { Card } from '@/components/ui/card';

// Compound Pattern
<Card variant="elevated" padding="lg">
  <Card.Header>
    <Card.Title>タイトル</Card.Title>
  </Card.Header>
  <Card.Content>
    <p>コンテンツ</p>
  </Card.Content>
  <Card.Footer>
    <Button>アクション</Button>
  </Card.Footer>
</Card>
```

### Alert Enhanced

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert';

<Alert variant="success">
  <AlertDescription>操作が完了しました</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertDescription>エラーが発生しました</AlertDescription>
</Alert>
```

**詳細パターン**: `references/shadcn-enhanced.md`

---

## 📋 Phase 4: フォーム実装

### react-hook-form + zod + shadcn/ui統合

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  username: z.string().min(2, 'ユーザー名は2文字以上で入力してください'),
  email: z.email('有効なメールアドレスを入力してください'),
});

export function UserFormClient() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', email: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await createUserAction(values);
    if (!result.success) {
      form.setError('root', { message: result.error });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー名</FormLabel>
              <FormControl>
                <Input placeholder="ユーザー名を入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="aurora"
          loading={form.formState.isSubmitting}
        >
          送信
        </Button>
      </form>
    </Form>
  );
}
```

---

## 🎨 Phase 5: TailwindCSS v4.2+最適化

### 透明度指定（v4記法）

```tsx
// ✅ TailwindCSS v4.2+（推奨）
<div className="bg-black/50 text-gray-500/80 border-blue-300/30">

// ❌ TailwindCSS v3（非推奨）
<div className="bg-black bg-opacity-50">
```

### CSS変数を使用したテーマカラー（OKLCH）

```tsx
// ✅ 推奨: Tailwindテーマカラー（@theme inlineでマッピング済み）
<Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
  プライマリボタン
</Button>

// グラデーション
<div className="bg-gradient-to-r from-primary to-accent">
  ブランドグラデーション
</div>

// ❌ 非推奨: hsl()ラッピング
// <div className="bg-[hsl(var(--primary))]">

// ✅ カスタムCSS変数を直接使う場合
<div className="bg-[var(--primary)]">
```

### cn()関数でクラス名結合

```tsx
import { cn } from '@/lib/utils';

<div
  className={cn(
    "base-class",
    isActive && "active-class",
    isPrimary ? "primary-style" : "secondary-style"
  )}
>
```

### CVA バリアント管理ルール

コンポーネントの variant/size 管理には `class-variance-authority (CVA)` のみを使用する。

| コンポーネント種類 | パターン | 理由 |
|---|---|---|
| UIコンポーネント（variant あり） | CVA 必須 | 一貫性、型安全なバリアント |
| レイアウトコンポーネント（シングルトン） | `cn()` で十分 | variant 不要、CVA は過剰 |

```typescript
// ✅ UIコンポーネント: CVA
const buttonVariants = cva('base-classes', {
  variants: { variant: { default: '...', aurora: '...' } },
});

// ✅ レイアウトコンポーネント: cn() のみ
<header className={cn('fixed top-0 bg-gradient-to-r', className)} />

// ❌ 禁止: UIコンポーネントで手書き条件分岐
className={variant === 'primary' ? 'bg-primary' : 'bg-secondary'}
```

### ダークモード対応

現状は**意図的にライト/ダーク同一表示**を維持している（設計判断）。
将来のダーク値分離の実装パターンは `dark-mode-oklch` スキルを参照。

---

## 🖱️ Phase 6: アクセシビリティ必須設定

### cursor-pointer の付与（必須）

```tsx
// ✅ 必須: クリック可能要素には必ずcursor-pointerを付与
<button className="cursor-pointer" onClick={handleClick}>
  ボタン
</button>

<div className="cursor-pointer hover:bg-blue-50" onClick={handleClick}>
  クリック可能なDiv
</div>

<Card className="cursor-pointer hover:shadow-lg" onClick={() => router.push(`/details/${id}`)}>
  クリック可能なカード
</Card>

// ❌ 禁止: クリック可能なのにcursor-pointerがない
<div onClick={handleClick}>クリックしてね</div>
```

**チェックリスト**:

- [ ] onClickハンドラを持つ要素
- [ ] カスタムボタン/リンクコンポーネント
- [ ] クリック可能なカード/リストアイテム
- [ ] タブ、アコーディオンヘッダー
- [ ] ドロップダウントリガー

---

## 🚀 Phase 7: パフォーマンス最適化

### 画像最適化（next/image）

```tsx
import Image from 'next/image';

// ✅ 推奨
<Image
  src="/profile.jpg"
  alt="プロフィール画像"
  width={300}
  height={300}
  className="rounded-full cursor-pointer"
  priority // 重要な画像の場合
/>

// ❌ 非推奨
<img src="/profile.jpg" alt="プロフィール画像" />
```

### 動的インポート（コード分割）

Client Component 内では `next/dynamic` は使用禁止。`React.lazy + Suspense` パターンを使用すること。

```tsx
'use client';
import { lazy, Suspense } from 'react';

const HeavyChartClient = lazy(() => import('./HeavyChartClient'));

export function DashboardPage() {
  return (
    <div>
      <h1>ダッシュボード</h1>
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64" />}>
        <HeavyChartClient />
      </Suspense>
    </div>
  );
}
```

> 詳細なパターン（Server Component での動的インポート、SSR制御等）は `next-dynamic-import` スキル参照。

---

## 📚 Phase 8: コンポーネント設計パターン

### Error Boundaryパターン

```tsx
'use client';
import React from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <Alert variant="destructive" className="mb-4">
            {this.state.error?.message || '予期しないエラーが発生しました'}
          </Alert>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            再試行
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🔗 ルーティング

### 基本ルール

全てのページ遷移は `src/lib/routes.ts` の `routes` 定数を使用する。文字列リテラルのルート指定は禁止。

```typescript
import { routes } from '@/lib/routes';

// router.push
router.push(routes.users.list());
router.push(routes.users.detail(userId));

// Link
<Link href={routes.users.edit(userId)}>編集</Link>
<Link href={routes.home}>ホーム</Link>

// 禁止: 文字列リテラル直接指定
router.push('/users');          // ❌
<Link href={`/users/${id}`}>   // ❌
```

### search params

search params を持つルートは関数形式で型付きオブジェクトを渡す。

```typescript
router.push(routes.users.list({ page: 2, search: 'alice' }));
router.push(routes.users.list());  // 省略時はクエリなし
```

### 新しいページを追加したら

1. `src/app/<route>/page.tsx` を作成
2. `src/lib/routes.ts` に定数を追加

詳細は `typesafe-routing` スキル参照。

---

## ✅ 実装チェックリスト

### UI実装前

- [ ] Server/Client分離を判断した
- [ ] 必要最小限のClient Component化を設計した
- [ ] ドーナツ構造で実装方針を決定した

### UI実装中

- [ ] Client Componentには`Client`サフィックスを付与
- [ ] カスタマイズ済みshadcn/uiコンポーネントを活用
- [ ] TailwindCSS v4.2+記法（透明度: `/50`）を使用
- [ ] OKLCH色空間テーマカラーを使用（hsl()ラッピング不要）
- [ ] クリック可能要素に`cursor-pointer`を付与

### UI実装後

- [ ] next/imageで画像最適化
- [ ] 重いコンポーネントは動的インポート
- [ ] アクセシビリティ設定を確認
- [ ] レスポンシブデザインを確認

---

## 🎯 lucide-react v1 注意事項

lucide-react 1.0 で多数のアイコンがリネームされた。インポートエラーが発生した場合はリネーム表を参照すること。

**import 文のパターン自体は変更なし**:

```typescript
// 変更前も変更後も同じ形式
import { TriangleAlert, X, CircleAlert } from 'lucide-react';
```

### アイコンリネーム表（主要なもの）

| 旧名 (0.x) | 新名 (1.x) |
|------------|------------|
| `AlertTriangle` | `TriangleAlert` |
| `AlertCircle` | `CircleAlert` |
| `AlertOctagon` | `OctagonAlert` |
| `XIcon` | `X` |
| `ArrowDownLeft` | `ArrowLeftDown` |
| `ArrowDownRight` | `ArrowRightDown` |
| `ArrowUpLeft` | `ArrowLeftUp` |
| `ArrowUpRight` | `ArrowRightUp` |
| `ChevronDownSquare` | `SquareChevronDown` |
| `ChevronLeftSquare` | `SquareChevronLeft` |
| `ChevronRightSquare` | `SquareChevronRight` |
| `ChevronUpSquare` | `SquareChevronUp` |
| `MinusSquare` | `SquareMinus` |
| `PlusSquare` | `SquarePlus` |
| `XSquare` | `SquareX` |
| `CheckSquare` | `SquareCheck` |
| `CheckCircle` | `CircleCheck` |
| `CheckCircle2` | `CircleCheckBig` |
| `XCircle` | `CircleX` |
| `MinusCircle` | `CircleMinus` |
| `PlusCircle` | `CirclePlus` |

完全なリストは [lucide.dev/docs/migration](https://lucide.dev/docs/migration) 参照。

### 削除されたブランドアイコン

`Facebook`, `Twitter`, `Instagram`, `Github`, `Gitlab`, `Youtube` 等は著作権問題で削除された。
代替: [lucide-lab](https://github.com/lucide-icons/lucide-lab) または各ブランド公式 SVG を使用。

### 新機能

**`aria-hidden` デフォルト設定**: すべてのアイコンに `aria-hidden="true"` がデフォルトで設定されるようになった。
ラベルが必要な場合は明示する:

```tsx
<TriangleAlert aria-hidden={false} aria-label="警告" />
```

**LucideProvider**: アイコンのデフォルトプロパティをグローバルに設定できる:

```tsx
import { LucideProvider } from 'lucide-react';

<LucideProvider size={20} strokeWidth={1.5}>
  {/* すべての子コンポーネントのアイコンに適用 */}
  <App />
</LucideProvider>
```

### よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `Module '"lucide-react"' has no exported member 'AlertTriangle'` | アイコンがリネームされた | 上記リネーム表で新名を確認 |
| `Module '"lucide-react"' has no exported member 'Facebook'` | ブランドアイコン削除 | lucide-lab または公式 SVG を使用 |

---

## 404 ハンドリング: notFound() + not-found.tsx

Next.js App Router での 404 ページは `notFound()` + `not-found.tsx` で実装する。
手動で `{ status: 404 }` を返したり、条件分岐で空ページを表示するパターンは禁止。

### notFound() の使い方

```tsx
// src/app/users/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserAction(id);

  if (result.isErr() || !result.value) {
    // ✅ notFound() を呼ぶと自動的に not-found.tsx を表示する
    notFound();
  }

  const user = result.value;
  return <UserDetailClient user={user} />;
}
```

### not-found.tsx の配置

```tsx
// src/app/users/[id]/not-found.tsx
// ↑ このページ専用の 404 ページ

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export default function UserNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">ユーザーが見つかりません</h1>
      <p className="text-muted-foreground">
        指定されたユーザーは存在しないか、削除された可能性があります。
      </p>
      <Button asChild variant="outline">
        <Link href={routes.users.list()}>ユーザー一覧に戻る</Link>
      </Button>
    </div>
  );
}
```

### グローバル not-found.tsx

```tsx
// src/app/not-found.tsx
// ↑ どのルートにも not-found.tsx がない場合のフォールバック

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">ページが見つかりません</p>
    </div>
  );
}
```

**禁止パターン**:

```tsx
// ❌ 禁止: null を返す（空白ページになる）
if (!user) return null;

// ❌ 禁止: 手動で 404 レスポンスを返す
if (!user) {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

// ❌ 禁止: redirect でごまかす
if (!user) redirect(routes.users.list());
```

---

## 絵文字アイコンの禁止

UI上の視覚的インジケータとして絵文字を使用することは禁止。

```tsx
// ❌ 禁止: 絵文字をアイコンとして使用
<span>👤 ユーザー名</span>
<span>📧 メール</span>

// ✅ 正しい: lucide-react アイコンを使用
import { User, Mail } from 'lucide-react';
<User className="inline-block w-4 h-4 mr-1" />
```

HTMLコメント内のセクションマーカー（`{/* 🌟 Section */}`）は表示されないためOK。

詳細は `icon-consistency` スキルを参照。

---

## アイコン: lucide-react 統一（インライン SVG 禁止）

アイコンはすべて `lucide-react` を使用する。インライン SVG の直書きは禁止。

```tsx
// ✅ 正しい: lucide-react から import
import { User, Mail, Lock, ChevronRight, Search } from 'lucide-react';

<User className="size-4" />
<Mail className="size-4 text-muted-foreground" />
```

**禁止パターン**:

```tsx
// ❌ 禁止: インライン SVG 直書き
<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  <circle cx="12" cy="7" r="4" />
</svg>

// ❌ 禁止: 別パッケージのアイコンライブラリを混在させる
import { FaUser } from 'react-icons/fa';   // react-icons は使わない
import UserIcon from '@heroicons/react/...'; // heroicons も不要
```

**アイコンサイズ規則**:

| 用途 | クラス |
|------|--------|
| テキスト横のインラインアイコン | `size-4` |
| ボタン内アイコン | `size-4` |
| ヘッダー・大きいUI | `size-5` / `size-6` |
| サムネイル・装飾 | `size-8` 以上 |

### size-N ショートハンドルール（TailwindCSS v4.2+）

`w-N h-N` が同値の場合は `size-N` に統一すること（TailwindCSS v4.2+ で安定サポート）。

```tsx
// ❌ 冗長: w-N と h-N を個別に指定（同値の場合）
<User className="w-4 h-4" />
<Search className="w-5 h-5 text-muted-foreground" />

// ✅ size-N ショートハンドに統一
<User className="size-4" />
<Search className="size-5 text-muted-foreground" />
```

幅と高さが異なる場合は個別指定を維持すること:

```tsx
// ✅ 幅 ≠ 高さの場合は個別指定
<div className="w-16 h-8">...</div>
```

> 詳細は `tailwind-v4-shorthands` スキル参照。

---

## Button asChild パターン

`<Button>` を `<Link>` や `<a>` のラッパーとして使う場合は `asChild` を使用する。
`<Button>` の中に `<Link>` をネストするパターンは禁止（`button > a` は HTML 的に無効）。

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routes } from '@/lib/routes';

// ✅ 正しい: asChild でレンダリング要素を Link に委譲
<Button asChild variant="outline">
  <Link href={routes.users.list()}>一覧に戻る</Link>
</Button>

// ✅ 外部リンクの場合
<Button asChild variant="ghost">
  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
    ドキュメントを開く
  </a>
</Button>
```

**禁止パターン**:

```tsx
// ❌ 禁止: button > a のネスト（HTML 的に無効）
<Button>
  <Link href={routes.users.list()}>一覧に戻る</Link>
</Button>

// ❌ 禁止: onClick で router.push（リンクとして扱うべき場合）
<Button onClick={() => router.push(routes.users.list())}>
  一覧に戻る
</Button>
```

---

## 不要な `<Suspense>` の検出

`<Suspense>` は非同期コンポーネント（データフェッチ等）の読み込み中に fallback を表示するためのものです。
以下の場合は `<Suspense>` 不要なので削除すること。

### 不要な Suspense の条件

```tsx
// ❌ 不要: Suspense 内に非同期コンポーネントがない
<Suspense fallback={<Loading />}>
  <UserCard user={user} />   {/* 同期コンポーネントのみ */}
</Suspense>

// ❌ 不要: fallback が null（何も表示しないなら Suspense の意味がない）
<Suspense fallback={null}>
  <AsyncComponent />
</Suspense>

// ❌ 不要: クライアントコンポーネントをラップしている（クライアントは Suspend しない）
<Suspense fallback={<Loading />}>
  <UserFormClient />   {/* 'use client' コンポーネント */}
</Suspense>
```

### Suspense が必要な条件

```tsx
// ✅ 必要: サーバーコンポーネントが非同期データフェッチを含む
<Suspense fallback={<UserListSkeleton />}>
  <UserListAsync />   {/* async function で DB を呼ぶ Server Component */}
</Suspense>

// ✅ 必要: dynamic() でインポートされたコンポーネント
const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false });
<Suspense fallback={<ChartSkeleton />}>
  <HeavyChart />
</Suspense>

// ✅ 必要: use(promise) を使うコンポーネント（React 19）
<Suspense fallback={<Skeleton />}>
  <ComponentUsingUseHook promise={dataPromise} />
</Suspense>
```

---

## 🔗 関連リソース

### 詳細ドキュメント

- **Server/Client分離詳細**: `references/server-client-patterns.md`
- **shadcn/ui Enhanced Components**: `references/shadcn-enhanced.md`

### 関連スキル

- `next-dynamic-import`: 重いUIコンポーネント（Dialog等）の遅延ロードパターン
- `url-search-pagination`: 検索・ページネーション付き一覧画面の実装パターン
- `nextjs-error-boundary`: error.tsx によるError Boundaryパターン

### プロジェクトドキュメント

- `_DOCS/guides/frontend-best-practices.md`
- `_DOCS/guides/theme-system.md`
- `_DOCS/guides/nextjs-integration-patterns.md`

---

## React 19 useTransition パターン

Server Action呼び出し時のローディング管理には `useTransition` を使用する。
`useState(isLoading)` + `try/finally` パターンは非推奨。

```typescript
'use client';
import { useTransition } from 'react';

function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await onDelete();
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? '処理中...' : '削除'}
    </Button>
  );
}
```

### react-hook-form + useTransition 併用パターン

react-hook-formを使用するフォームでは、RHFの`isSubmitting`と`useTransition`の`isPending`を併用:

```typescript
const [isPending, startTransition] = useTransition();

const onSubmit = form.handleSubmit(async (data) => {
  startTransition(async () => {
    const result = await createUser(data);
    // エラーハンドリング
  });
});

// ボタンの disabled 状態
<Button disabled={isPending || form.formState.isSubmitting}>
```

### レスポンシブ対応

`useMediaQuery` フックを使用してレスポンシブ対応を行う:

```typescript
import { useBreakpoint } from '@/hooks/useMediaQuery';
const isMobile = useBreakpoint('sm'); // sm未満でtrue
```

手動の `window.addEventListener('resize', ...)` は使用しない。

---

## ⚓ React Hooks ベストプラクティス

### useMemo vs useCallback の使い分け

```typescript
// ✅ useMemo: 値（オブジェクト・配列・計算結果）のメモ化
const contextValue = useMemo(
  () => ({ state, dispatch, setOpen }),
  [state, setOpen],
);

// ✅ useCallback: 関数参照の安定化（依存配列が変わらない関数）
const handleClose = useCallback(() => {
  setOpen(false);
}, []);

// ❌ 禁止: useCallback でオブジェクトを返す
const contextValue = useCallback(
  () => ({ state, dispatch }),
  [state],
);
// → 毎レンダリングで新しいオブジェクト参照が生成される（メモ化の意味がない）
```

### stale closure 防止パターン

```typescript
// ❌ stale closure 問題: useCallback の依存配列が長くなり、
//    状態変更前の値を参照してしまう
const fetchData = useCallback(async () => {
  // currentPage が setCurrentPage 直後にstaleな値を参照する可能性
  await getItems({ page: currentPage, query: searchQuery });
}, [currentPage, searchQuery]);

// ✅ useRef で最新値を追跡（依存配列から除外できる）
const currentPageRef = useRef(currentPage);
const searchQueryRef = useRef(searchQuery);
currentPageRef.current = currentPage; // レンダリング時に最新化

const fetchData = useCallback(async (params = {}) => {
  await getItems({
    page: currentPageRef.current,
    query: searchQueryRef.current,
    ...params,
  });
}, []); // 依存配列が安定する

// ✅ または: 全パラメータを明示的に引数として渡す
const handlePageChange = (page: number) => {
  setCurrentPage(page);
  fetchData({ page }); // 変更した値を直接渡す
};
```

### 成功後ナビゲーションパターン

```typescript
// ✅ 正しい: toast → 即 router.push（setTimeout禁止）
if (result.success) {
  toast.success('保存しました');
  router.push(routes.users.list());
  router.refresh();
}

// ❌ 禁止: setTimeout による遅延ナビゲーション
if (result.success) {
  setSuccess(true); // 中間状態表示
  setTimeout(() => {
    router.push(routes.users.list());
  }, 1500); // タイミングに依存、UXが悪い
}
```

**理由**: `setTimeout` は不確実なタイミング制御であり、ネットワーク状況によってUXが一貫しない。`toast.success()` が十分なフィードバックを提供するため、中間状態表示は不要。

### エラーフィードバック必須ルール

```typescript
// ✅ 必須: mutation 失敗時は必ず toast.error() でユーザーに通知
} else {
  console.error('操作失敗:', result.error); // ログは残す
  toast.error(result.error || '操作に失敗しました'); // ユーザーへの通知も必須
}

} catch (error) {
  console.error('予期しないエラー:', error);
  toast.error('予期しないエラーが発生しました'); // 必須
}

// ❌ 禁止: console.error のみでユーザーへの通知なし
} else {
  console.error('操作失敗:', result.error); // ユーザーは何も知らない
}
```

---

## 検索・一覧UIのURL State管理

検索・ページネーション付きリストは `useSearchParams` + `useRouter` でURL stateを管理すること。

### 必須パターン
- `useState` でのローカル管理は禁止（ブラウザバック・URL共有で状態喪失）
- テキスト検索は `usehooks-ts` の `useDebounceValue` で 300ms debounce 必須
- URL変更は `router.push` or `router.replace` で実施

### Button asChild ルール

`<Link>` の中に `<Button>` を配置する DOM ネスト（`<a><button>`）は禁止。
必ず `<Button asChild>` を使用すること:

```tsx
// BAD: <a><button> の無効な DOM ネスト
<Link href="/path"><Button>テキスト</Button></Link>

// GOOD: asChild で <a> に統合
<Button asChild><Link href="/path">テキスト</Link></Button>
```

### Context Provider の dispatch 非公開

Context Provider の型から `dispatch` を直接公開しないこと。ヘルパー関数（`setXxx`）のみを公開し、内部実装を隠蔽する。

---

## 🚀 適用方法

上記のパターンを参照しながら、フロントエンド実装を進めてください。

不明点がある場合は、`references/`内の詳細ドキュメントを確認してください。
