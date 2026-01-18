---
name: frontend-patterns
description: |
  Next.js App Router + shadcn/ui + TailwindCSS v4 でのフロントエンド実装パターン。
  ドーナツ構造、Server Component優先、Client Component最小化を実現。

  トリガー例:
  - 「UI実装」「コンポーネント作成」「Server Component」「Client Component」
  - 「ページ作成」「フォーム実装」「shadcn/ui使いたい」
  - src/app/, src/components/ 配下のファイルを編集するとき
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Frontend Implementation Patterns Skill

Next.js 16 App Router + shadcn/ui + TailwindCSS v4 のフロントエンド実装パターンを提供します。

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
button, card, input, alert, badge, dialog,
form, label, separator, sonner, toast,
loading, spinner
```

### Button Enhanced

```tsx
import { Button } from '@/components/ui/button';

// shadcn/ui標準
<Button variant="default">標準</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>

// Enhanced機能
<Button variant="primary" gradient={true} loading={isLoading}>
  グラデーション＋ローディング
</Button>
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

<Alert variant="error">
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
  email: z.string().email('有効なメールアドレスを入力してください'),
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
          variant="primary"
          gradient={true}
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

## 🎨 Phase 5: TailwindCSS v4最適化

### 透明度指定（v4記法）

```tsx
// ✅ TailwindCSS v4（推奨）
<div className="bg-black/50 text-gray-500/80 border-blue-300/30">

// ❌ TailwindCSS v3（非推奨）
<div className="bg-black bg-opacity-50">
```

### CSS変数を使用したテーマカラー

```tsx
// ✅ 推奨: CSS変数でテーマカラー
<Button className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)]">
  プライマリボタン
</Button>

// グラデーション
<div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
  ブランドグラデーション
</div>

// ダークモード自動対応
<Card className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)]">
```

### cn()関数でクラス名結合

```tsx
import { cn } from '@/lib/utils-shadcn';

<div
  className={cn(
    "base-class",
    isActive && "active-class",
    isPrimary ? "primary-style" : "secondary-style"
  )}
>
```

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

```tsx
import dynamic from 'next/dynamic';

const HeavyChartClient = dynamic(
  () => import('./HeavyChartClient'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64" />,
    ssr: false
  }
);

export function DashboardPage() {
  return (
    <div>
      <h1>ダッシュボード</h1>
      <HeavyChartClient />
    </div>
  );
}
```

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
          <Alert variant="error" className="mb-4">
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

## ✅ 実装チェックリスト

### UI実装前

- [ ] Server/Client分離を判断した
- [ ] 必要最小限のClient Component化を設計した
- [ ] ドーナツ構造で実装方針を決定した

### UI実装中

- [ ] Client Componentには`Client`サフィックスを付与
- [ ] カスタマイズ済みshadcn/uiコンポーネントを活用
- [ ] TailwindCSS v4記法（透明度: `/50`）を使用
- [ ] CSS変数でテーマカラーを指定
- [ ] クリック可能要素に`cursor-pointer`を付与

### UI実装後

- [ ] next/imageで画像最適化
- [ ] 重いコンポーネントは動的インポート
- [ ] アクセシビリティ設定を確認
- [ ] レスポンシブデザインを確認

---

## 🔗 関連リソース

### 詳細ドキュメント

- **Server/Client分離詳細**: `references/server-client-patterns.md`
- **shadcn/ui Enhanced Components**: `references/shadcn-enhanced.md`

### プロジェクトドキュメント

- `_DOCS/guides/frontend-best-practices.md`
- `_DOCS/guides/theme-system.md`
- `_DOCS/guides/nextjs-integration-patterns.md`

---

## 🚀 適用方法

上記のパターンを参照しながら、フロントエンド実装を進めてください。

不明点がある場合は、`references/`内の詳細ドキュメントを確認してください。
