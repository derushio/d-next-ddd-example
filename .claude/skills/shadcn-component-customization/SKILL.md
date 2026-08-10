---
name: shadcn-component-customization
description: |
  shadcn/ui コンポーネントのカスタマイズパターンを提供するスキル。
  カスタマイズ済みコンポーネント（Button/Card/Input/Alert等）の拡張方法、
  variant 追加、data-slot/data-variant属性、cn() ユーティリティの正しい使い方を扱う。

  トリガー例:
  - 「shadcn」「shadcn/ui」「variant 追加」「カスタムUI」
  - Button/Card/Input/Alert/Badge/Dialog 等を拡張するとき
  - 既存の shadcn コンポーネントに新しい variant を追加するとき

globs:
  - "src/components/ui/**/*.tsx"
---

# shadcn/ui コンポーネントカスタマイズ スキル

このプロジェクトにおける shadcn/ui コンポーネントのカスタマイズパターンを提供します。

---

## 1. このプロジェクトでの shadcn/ui 運用方針

shadcn/ui はコンポーネントのソースコードをプロジェクトに直接取り込む設計（copy-paste方式）です。
そのため、このプロジェクトでは以下の方針を採用しています。

- **`src/components/ui/` がすべての shadcn/ui コンポーネントの唯一の置き場所**
- コンポーネントはプロジェクト固有の要件に合わせてカスタマイズ済み
- 新しいコンポーネントの追加は `pnpm ui:add <name>` を使用
- 追加後は必ずプロジェクトスタイル（OKLCH, data-slot 等）に合わせて調整すること

### 使用している主要パッケージ

| パッケージ | 用途 |
|-----------|------|
| `radix-ui` | Radix UI 統一パッケージ（旧 `@radix-ui/*` の代替） |
| `class-variance-authority (cva)` | 型安全な variant 管理 |
| `clsx` + `tailwind-merge` | クラス名の安全な結合（`cn()` 関数） |

---

## 2. カスタマイズ済みコンポーネント一覧

以下のコンポーネントは `pnpm ui:add` では**追加禁止**（既にカスタマイズ済み）:

| コンポーネント | ファイル | カスタマイズ内容 |
|--------------|---------|----------------|
| `button` | `src/components/ui/button.tsx` | `aurora` variant 追加、`loading` prop 追加 |
| `card` | `src/components/ui/card.tsx` | Compound Pattern (`Card.Header` 等)、`variant`/`padding` prop |
| `input` | `src/components/ui/input.tsx` | エラー状態スタイル、`data-error` 属性対応 |
| `alert` | `src/components/ui/alert.tsx` | `success` variant 追加 |
| `alert-dialog` | `src/components/ui/alert-dialog.tsx` | デフォルトスタイル調整 |
| `badge` | `src/components/ui/badge.tsx` | カラースキーム拡張 |
| `dialog` | `src/components/ui/dialog.tsx` | デフォルト幅調整、アニメーション改善 |
| `form` | `src/components/ui/form.tsx` | エラーメッセージスタイル調整 |
| `label` | `src/components/ui/label.tsx` | 必須マーク対応 |
| `separator` | `src/components/ui/separator.tsx` | カスタムスタイル |
| `sonner` | `src/components/ui/sonner.tsx` | OKLCH テーマ統合 |
| `loading` | `src/components/ui/loading.tsx` | カスタムローディングコンポーネント |
| `spinner` | `src/components/ui/spinner.tsx` | スピナーアニメーション |

---

## 3. variant 追加パターン（CVA による型安全な拡張）

新しい variant を追加する場合は `class-variance-authority` の `cva` を使用します。

### Button に新しい variant を追加する例

```tsx
// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import * as Slot from 'radix-ui';

const buttonVariants = cva(
  // ベースクラス
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        // shadcn/ui 標準 variant
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // ✅ カスタム variant を追加
        aurora: 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow hover:opacity-90',
        // 新しい variant を追加する場合はここに記述
        // success: 'bg-green-600 text-white shadow hover:bg-green-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// Props 型に VariantProps を統合
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean; // カスタム prop
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        data-slot="button"
        data-variant={variant}
        {...props}
      >
        {loading && <Spinner className="size-4" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 使用例

```tsx
// ✅ 標準 variant
<Button variant="default">保存</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">キャンセル</Button>

// ✅ カスタム variant
<Button variant="aurora" loading={isPending}>
  グラデーションボタン
</Button>

// ✅ size 指定
<Button variant="outline" size="sm">小さいボタン</Button>
<Button size="icon">
  <PlusIcon className="size-4" />
</Button>
```

---

## 4. data-slot / data-variant 属性の使い方

このプロジェクトでは Radix UI の `data-slot` および `data-variant` 属性を使用してコンポーネントをセマンティックに識別します。

### data-slot の役割

```tsx
// コンポーネントの「役割」を識別するための属性
// TailwindCSS v4 のコンテナクエリや親子スタイリングで活用

<button data-slot="button" data-variant="aurora">
  ボタン
</button>

<div data-slot="card">
  <div data-slot="card-header">...</div>
  <div data-slot="card-content">...</div>
  <div data-slot="card-footer">...</div>
</div>
```

### TailwindCSS v4 での data 属性活用

```css
/* globals.css または tailwind コンポーネント内 */
/* data-slot を使った親子スタイリング */
[data-slot="card"]:has([data-slot="card-footer"]) {
  /* フッターがある場合のカードスタイル */
}
```

### data-variant の役割

```tsx
// variant 情報を DOM に公開し、E2E テストやスタイリングで活用
<button data-slot="button" data-variant="destructive">
  削除
</button>

// テストでの使用例
const deleteButton = page.locator('[data-slot="button"][data-variant="destructive"]');
```

---

## 5. cn() ユーティリティの正しい使い方

`cn()` は `clsx` + `tailwind-merge` を組み合わせたユーティリティ関数です。

### 基本的な使い方

```tsx
import { cn } from '@/lib/utils';

// ✅ 条件付きクラス
<div className={cn('base-class', isActive && 'active-class')} />

// ✅ 三項演算子
<div className={cn('base', isPrimary ? 'primary-style' : 'secondary-style')} />

// ✅ 外部 className の受け取り（コンポーネント内）
interface CardProps {
  className?: string;
}
function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  );
}
```

### tailwind-merge の効果

```tsx
// ✅ tailwind-merge が重複クラスを自動解決
cn('p-4 text-sm', 'p-8')
// → 'text-sm p-8'（p-4 が p-8 で上書き）

cn('bg-blue-500 text-white', 'bg-red-500')
// → 'text-white bg-red-500'（bg-blue-500 が bg-red-500 で上書き）

// ❌ 単純な文字列結合では競合が解決されない
'p-4 text-sm' + ' p-8'
// → 'p-4 text-sm p-8'（p-4 と p-8 が両方残る、CSS優先度に依存）
```

### CVA と cn() の組み合わせ

```tsx
// ✅ CVA の結果を cn() でラップして外部 className を受け取る
const buttonVariants = cva('base-classes', {
  variants: { variant: { default: '...' } },
});

function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      // ↑ buttonVariants が生成したクラスに className を追加・上書き
      {...props}
    />
  );
}

// 使用側でスタイルをオーバーライド可能
<Button className="w-full" variant="default">
  フルワイドボタン
</Button>
```

---

## 6. Card コンポーネントの Compound Pattern

このプロジェクトの `Card` コンポーネントは Compound Pattern を採用しています。

```tsx
// src/components/ui/card.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground',
  {
    variants: {
      variant: {
        default: 'shadow',
        elevated: 'shadow-lg',
        outline: 'shadow-none',
        ghost: 'border-transparent shadow-none',
      },
      padding: {
        none: '',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  },
);

// Compound Pattern の実装
interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, padding }), className)}
      data-slot="card"
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5', className)}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none tracking-tight text-balance', className)}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('pt-0', className)}
      data-slot="card-content"
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center pt-0', className)}
      data-slot="card-footer"
      {...props}
    />
  );
}

// Compound Pattern でエクスポート
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card };
```

### 使用例

```tsx
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ✅ Compound Pattern での使用
<Card variant="elevated" padding="lg">
  <Card.Header>
    <Card.Title>ユーザー設定</Card.Title>
    <Card.Description>アカウント情報を管理します</Card.Description>
  </Card.Header>
  <Card.Content className="space-y-4">
    <p>コンテンツエリア</p>
  </Card.Content>
  <Card.Footer className="justify-end gap-2">
    <Button variant="outline">キャンセル</Button>
    <Button variant="aurora">保存</Button>
  </Card.Footer>
</Card>

// ✅ シンプルな使用
<Card>
  <Card.Content>
    シンプルなカード
  </Card.Content>
</Card>
```

---

## 7. asChild パターン（Radix UI Slot）

`asChild` prop を使用すると、コンポーネントのデフォルトレンダリング要素を子要素に委譲できます。

### Button asChild の使用例

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routes } from '@/lib/routes';

// ✅ 正しい: asChild で Link として振る舞う Button
<Button asChild variant="aurora">
  <Link href={routes.dashboard()}>
    ダッシュボードへ
  </Link>
</Button>

// ✅ 外部リンクの場合
<Button asChild variant="outline">
  <a href="https://docs.example.com" target="_blank" rel="noopener noreferrer">
    ドキュメントを開く
  </a>
</Button>

// ❌ 禁止: button > a のネスト（HTML的に無効）
<Button>
  <Link href={routes.dashboard()}>
    ダッシュボードへ
  </Link>
</Button>

// ❌ 禁止: a > button のネスト（同様に無効）
<Link href={routes.dashboard()}>
  <Button>ダッシュボードへ</Button>
</Link>
```

### Slot の仕組み

```tsx
// asChild の内部実装
import * as Slot from 'radix-ui';

function Button({ asChild, ...props }: ButtonProps) {
  // asChild が true の場合、<Slot.Root> が子要素にすべての props を転送
  // asChild が false の場合、通常の <button> としてレンダリング
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp {...props} />;
}
```

---

## 8. 禁止パターン

### ❌ shadcn/ui コンポーネントを ui/ 外に配置

```
// ❌ 禁止: features/ や components/ の他のディレクトリへの配置
src/components/features/CustomButton.tsx  // shadcn Button の別バージョン
src/components/common/MyCard.tsx          // shadcn Card の別実装

// ✅ 正しい: ui/ で一元管理
src/components/ui/button.tsx
src/components/ui/card.tsx
```

### ❌ npm パッケージとして shadcn をインストール

```bash
# ❌ 禁止: shadcn/ui は npm パッケージではない
npm install shadcn-ui
npm install @shadcn/ui

# ✅ 正しい: CLI でソースコードをプロジェクトに追加
pnpm ui:add button
pnpm ui:add dialog
```

### ❌ CVA を使わない手書き条件分岐

```tsx
// ❌ 禁止: variant に応じた手書き条件分岐
function Button({ variant }: { variant: string }) {
  return (
    <button
      className={
        variant === 'primary'
          ? 'bg-primary text-white'
          : variant === 'destructive'
          ? 'bg-red-500 text-white'
          : 'bg-secondary'
      }
    >
      ...
    </button>
  );
}

// ✅ 正しい: CVA を使用した型安全な variant 管理
const buttonVariants = cva('base', {
  variants: {
    variant: {
      primary: 'bg-primary text-white',
      destructive: 'bg-red-500 text-white',
      secondary: 'bg-secondary',
    },
  },
});
```

### ❌ 旧パッケージ記法の使用

```tsx
// ❌ 禁止: 個別の Radix UI パッケージ（廃止済み）
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SlotPrimitive from '@radix-ui/react-slot';

// ✅ 正しい: radix-ui 統一パッケージ
import { Dialog } from 'radix-ui';
import { Slot } from 'radix-ui';
// または
import * as Slot from 'radix-ui';
const Comp = asChild ? Slot.Root : 'button';
```

---

## 9. チェックリスト

### 新しい variant を追加するとき

- [ ] `cva` の `variants` オブジェクトに追加した
- [ ] TypeScript の型が正しく推論されることを確認した
- [ ] `data-variant` 属性を付与した
- [ ] デフォルト値の変更が不要なことを確認した（`defaultVariants`）
- [ ] Storybook またはページで表示確認した

### 新しいコンポーネントを追加するとき

- [ ] `pnpm ui:add <name>` で追加した
- [ ] `@radix-ui/*` の import を `radix-ui` に統一した
- [ ] OKLCH テーマカラー変数を使用している
- [ ] `data-slot` 属性を付与した
- [ ] `cn()` で className を受け取れるようにした
- [ ] 既存のカスタマイズ済みコンポーネント一覧を確認し重複がないことを確認した

### コンポーネントを使用するとき

- [ ] `src/components/ui/` からインポートしている（`@/components/ui/`）
- [ ] 適切な variant を使用している
- [ ] クリック可能な要素には `cursor-pointer` を付与した
- [ ] `asChild` が必要な場所で適切に使用している

---

## 10. 関連スキル

- `frontend-patterns`: Server/Client コンポーネント分離、フォーム実装、TailwindCSS v4 パターン全般
- `dark-mode-oklch`: OKLCH 色空間変数を使ったダークモード対応
- `tailwind-v4-shorthands`: TailwindCSS v4.2+ ショートハンドユーティリティ（`size-N`, `p-{x y}` 等）
- `tailwind-v4-text-utilities`: `text-balance`, `text-pretty` 等のテキストユーティリティ
