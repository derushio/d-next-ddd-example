# shadcn/ui Enhanced Components詳細

カスタマイズ済みshadcn/uiコンポーネントの使用方法とパターンを詳細に解説します。

---

## 🚫 ui:add禁止リスト

以下のコンポーネントは**カスタマイズ済み**のため、`pnpm ui:add`で**追加禁止**:

```
button, card, input, alert, alert-dialog, badge, dialog,
form, label, separator, sonner,
loading, spinner
```

これらは既に拡張機能が統合されており、再追加すると既存の機能が失われます。

### コンポーネント構成

```
src/components/
├── ui/          # shadcn/ui + カスタマイズ済みコンポーネント
├── features/    # 機能別コンポーネント
├── common/      # 共通コンポーネント
├── layout/      # レイアウトコンポーネント
└── providers/   # Context Providers（テーマ、認証、Toastプロバイダー等）
```

---

## 🎨 Button Enhanced

### 基本的な使用方法

```tsx
import { Button } from '@/components/ui/button';

// shadcn/ui標準variants
<Button variant="default">標準</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
<Button variant="link">リンク</Button>

// shadcn/ui標準sizes
<Button size="default">標準</Button>
<Button size="sm">小</Button>
<Button size="lg">大</Button>
<Button size="icon">アイコン</Button>
```

### Enhanced機能（既存システム統合）

```tsx
// ステート色variants
<Button variant="primary">プライマリ</Button>
<Button variant="success">成功</Button>
<Button variant="warning">警告</Button>
<Button variant="destructive">エラー</Button>

// グラデーションvariantsを使用（推奨）
<Button variant="aurora">オーロラグラデーション</Button>
<Button variant="sunset">サンセットグラデーション</Button>
<Button variant="ocean">オーシャングラデーション</Button>
<Button variant="cosmic">コズミックグラデーション</Button>
<Button variant="solar">ソーラーグラデーション</Button>
<Button variant="animated">アニメーショングラデーション</Button>
<Button variant="glass">ガラスエフェクト</Button>

// ❌ gradient={true} は廃止済み（variant="aurora" 等を使用すること）
// ✅ <Button variant="aurora">グラデーションボタン</Button>

// ローディング状態
<Button variant="primary" loading={isLoading}>
  送信
</Button>

// 全幅表示
<Button variant="primary" fullWidth={true}>
  全幅ボタン
</Button>

// sizeバリアント
<Button size="default">標準</Button>
<Button size="md">中</Button>
<Button size="sm">小</Button>
<Button size="lg">大</Button>
<Button size="icon">アイコン</Button>

// 組み合わせ
<Button
  variant="aurora"
  loading={isSubmitting}
  size="lg"
  className="cursor-pointer"
>
  送信中...
</Button>
```

### グラデーションVariants一覧

```tsx
// Button グラデーションvariantsの全パターン
<Button variant="aurora">Aurora（推奨）</Button>
<Button variant="sunset">Sunset（推奨）</Button>
<Button variant="ocean">Ocean（推奨）</Button>
<Button variant="cosmic">Cosmic（推奨）</Button>
<Button variant="solar">Solar（推奨）</Button>
<Button variant="animated">Animated（推奨）</Button>
<Button variant="glass">Glass（推奨）</Button>

// Legacy（後方互換）
<Button variant="gradient">グラデーション（非推奨）</Button>
<Button variant="gradient-danger">危険グラデーション（非推奨）</Button>
<Button variant="blue">ブルー（非推奨）</Button>

// Card グラデーションvariantsの全パターン
<Card variant="glass">ガラスエフェクト</Card>
<Card variant="aurora">オーロラ</Card>
<Card variant="sunset">サンセット</Card>
<Card variant="ocean">オーシャン</Card>
<Card variant="cosmic">コズミック</Card>

// Badge variants一覧
<Badge variant="default">デフォルト</Badge>
<Badge variant="secondary">セカンダリ</Badge>
<Badge variant="destructive">削除</Badge>
<Badge variant="outline">アウトライン</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="blue">ブルー</Badge>
```

### 実装パターン例

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SubmitButtonClient() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const result = await submitAction();

      if (result.success) {
        toast.success('送信しました');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="aurora"
      loading={isLoading}
      onClick={handleSubmit}
      className="cursor-pointer"
    >
      送信
    </Button>
  );
}
```

---

## 🃏 Card Enhanced

### 既存システムパターン（Compound Pattern）

```tsx
import { Card } from '@/components/ui/card';

// Enhanced variants
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

// variants: 'default' | 'bordered' | 'elevated' | 'glass' | 'aurora' | 'sunset' | 'ocean' | 'cosmic'
// padding: 'none' | 'sm' | 'md' | 'lg'
```

### shadcn/ui標準パターン

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
    <CardDescription>説明テキスト</CardDescription>
  </CardHeader>
  <CardContent>
    <p>コンテンツ</p>
  </CardContent>
  <CardFooter>
    <Button>アクション</Button>
  </CardFooter>
</Card>
```

### 実装パターン例

```tsx
// 商品カード
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      className="hover:shadow-xl transition-shadow cursor-pointer"
    >
      <Card.Header>
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={300}
          height={200}
          className="rounded-lg mb-4"
        />
        <Card.Title className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
          {product.name}
        </Card.Title>
      </Card.Header>

      <Card.Content>
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            {product.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-[var(--primary)]">
              ¥{product.price.toLocaleString()}
            </span>
            <Badge variant="secondary">{product.category}</Badge>
          </div>
        </div>
      </Card.Content>

      <Card.Footer>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 cursor-pointer">
            詳細
          </Button>
          <Button
            variant="aurora"
            className="flex-1 cursor-pointer"
          >
            カートに追加
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}
```

---

## 🚨 Alert Enhanced

### ステート色variants統合

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// 成功
<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>成功</AlertTitle>
  <AlertDescription>
    操作が正常に完了しました。
  </AlertDescription>
</Alert>

// エラー
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>エラー</AlertTitle>
  <AlertDescription>
    エラーが発生しました。もう一度お試しください。
  </AlertDescription>
</Alert>

// 警告
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>警告</AlertTitle>
  <AlertDescription>
    この操作には注意が必要です。
  </AlertDescription>
</Alert>

// 情報
<Alert variant="default">
  <Info className="h-4 w-4" />
  <AlertTitle>情報</AlertTitle>
  <AlertDescription>
    システムメンテナンスのお知らせ。
  </AlertDescription>
</Alert>
```

### 実装パターン例

```tsx
// エラーハンドリングコンポーネント
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  error: string | null;
  className?: string;
}

export function ErrorAlert({ error, className }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

// 使用例
export function UserFormClient() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ErrorAlert error={error} />
      {/* フォームコンテンツ */}
    </div>
  );
}
```

---

## 📋 Form Enhanced

### react-hook-form + zod統合

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// zodスキーマ定義
const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, 'ユーザー名は2文字以上で入力してください')
    .max(30, 'ユーザー名は30文字以内で入力してください'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  bio: z
    .string()
    .max(160, '自己紹介は160文字以内で入力してください')
    .optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function ProfileFormClient() {
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      email: '',
      bio: '',
    },
  });

  async function onSubmit(values: ProfileFormData) {
    const result = await updateProfileAction(values);

    if (result.success) {
      toast.success('プロフィールを更新しました');
    } else {
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
              <FormDescription>
                公開表示名として使用されます
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>自己紹介</FormLabel>
              <FormControl>
                <textarea
                  placeholder="自己紹介を入力"
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                最大160文字まで入力できます
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="aurora"
          loading={form.formState.isSubmitting}
          className="cursor-pointer"
        >
          保存
        </Button>

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
}
```

---

## 🔔 Dialog Enhanced

### 基本的な使用方法

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="cursor-pointer">
          削除
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>削除の確認</DialogTitle>
          <DialogDescription>
            この操作は取り消すことができません。本当に削除しますか？
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" className="cursor-pointer">
            キャンセル
          </Button>
          <Button variant="destructive" className="cursor-pointer">
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 実装パターン例（状態管理付き）

```tsx
'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeleteDialogProps {
  itemId: string;
  itemName: string;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function DeleteDialogClient({
  itemId,
  itemName,
  onDelete,
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await onDelete(itemId);

      if (result.success) {
        toast.success('削除しました');
        setOpen(false);
      } else {
        toast.error(result.error || '削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="cursor-pointer">
          削除
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>削除の確認</DialogTitle>
          <DialogDescription>
            「{itemName}」を削除しますか？
            <br />
            この操作は取り消すことができません。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
            className="cursor-pointer"
          >
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🏷️ Badge Enhanced

### 基本的な使用方法

```tsx
import { Badge } from '@/components/ui/badge';

// shadcn/ui標準variants
<Badge variant="default">デフォルト</Badge>
<Badge variant="secondary">セカンダリ</Badge>
<Badge variant="destructive">削除</Badge>
<Badge variant="outline">アウトライン</Badge>

// ステート色
<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="destructive">エラー</Badge>
```

### 実装パターン例

```tsx
// ステータスバッジコンポーネント
import { Badge } from '@/components/ui/badge';

type Status = 'active' | 'pending' | 'inactive' | 'error';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<Status, { label: string; variant: string }> = {
    active: { label: 'アクティブ', variant: 'success' },
    pending: { label: '保留中', variant: 'warning' },
    inactive: { label: '非アクティブ', variant: 'secondary' },
    error: { label: 'エラー', variant: 'destructive' },
  };

  const { label, variant } = config[status];

  return <Badge variant={variant as any}>{label}</Badge>;
}

// 使用例
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="error" />
```

---

## 🍞 Toast (Sonner) Enhanced

### 基本的な使用方法

```tsx
import { toast } from 'sonner';

// 成功
toast.success('操作が完了しました');

// エラー
toast.error('エラーが発生しました');

// 警告
toast.warning('注意が必要です');

// 情報
toast.info('システムメンテナンスのお知らせ');

// カスタムメッセージ
toast('通常のメッセージ');

// 長いメッセージ
toast.success('操作が完了しました', {
  description: '変更は即座に反映されます',
});

// アクション付き
toast('メッセージ', {
  action: {
    label: '元に戻す',
    onClick: () => console.log('Undo'),
  },
});
```

### 実装パターン例

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NotificationButtonsClient() {
  return (
    <div className="flex gap-2">
      <Button
        variant="success"
        onClick={() => toast.success('成功しました')}
        className="cursor-pointer"
      >
        成功通知
      </Button>

      <Button
        variant="destructive"
        onClick={() => toast.error('エラーが発生しました')}
        className="cursor-pointer"
      >
        エラー通知
      </Button>

      <Button
        variant="default"
        onClick={() =>
          toast('変更を保存しました', {
            description: '2024年1月18日 12:00',
            action: {
              label: '元に戻す',
              onClick: () => toast.info('元に戻しました'),
            },
          })
        }
        className="cursor-pointer"
      >
        アクション付き通知
      </Button>
    </div>
  );
}
```

---

## ⏳ Loading/Spinner Enhanced

### 基本的な使用方法

```tsx
import { Loading } from '@/components/ui/loading';
import { Spinner } from '@/components/ui/spinner';

// ページ全体のローディング
<Loading />

// インラインスピナー
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// カラーカスタマイズ
<Spinner className="text-[var(--primary)]" />
```

### 実装パターン例

```tsx
'use client';
import { useState, useEffect } from 'react';
import { Loading } from '@/components/ui/loading';
import { Card } from '@/components/ui/card';

export function DataViewClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().then(result => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      {/* データ表示 */}
    </div>
  );
}
```

---

## ✅ 使用時のチェックリスト

### Enhanced Components使用時

- [ ] カスタマイズ済みコンポーネントは`ui:add`しない
- [ ] グラデーションvariantsを活用（aurora/sunset/ocean/cosmic等）
- [ ] loading等のEnhanced機能を活用
- [ ] ステート色variants（success、warning、destructive）を活用
- [ ] クリック可能要素に`cursor-pointer`を付与

### Form実装時

- [ ] react-hook-form + zodでバリデーション
- [ ] Server Actionと連携
- [ ] エラーハンドリングを適切に実装
- [ ] loading状態をButtonに反映

### Dialog実装時

- [ ] 状態管理（open、onOpenChange）を実装
- [ ] 非同期処理中の無効化（disabled）を実装
- [ ] エラーハンドリングをtoastで通知

---

## 📚 参考リソース

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Sonner (Toast)](https://sonner.emilkowal.ski/)

---

## OKLCH色空間テーマシステム（TailwindCSS v4.2+ / shadcn/ui最新）

### 概要
TailwindCSS v4.2+ / shadcn/ui最新版ではOKLCH色空間を標準採用。
HSLと異なり、人間の知覚に均一な色空間で、コントラスト管理が容易。

### CSS変数定義パターン（globals.css）

```css
:root {
  /* OKLCH直接定義（hsl()ラッピング不要） */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.626 0.186 259.6);
  --primary-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.636 0.208 25.38);
  --success: oklch(0.623 0.169 149.18);
  --warning: oklch(0.669 0.159 57.96);
  --info: oklch(0.678 0.148 238.1);
}
```

### @theme inline マッピング（hsl()ラッピング不要）

```css
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive: var(--destructive);
  /* hsl()ラッピングは不要。var()で直接マッピング */
}
```

### カスタム色の追加手順
1. [oklch.com](https://oklch.com) でOKLCH値を取得
2. `globals.css` の `:root` に `--custom: oklch(L C H);` を追加
3. `@theme inline` に `--color-custom: var(--custom);` を追加
4. Tailwindクラスで `bg-custom`, `text-custom` として使用可能

### 禁止パターン
```css
/* NG: HSL形式の定義 */
--primary: 217 91% 60%;

/* NG: hsl()ラッピング */
--color-primary: hsl(var(--primary));

/* OK: OKLCH直接定義 + var()マッピング */
--primary: oklch(0.626 0.186 259.6);
--color-primary: var(--primary);
```

---

## radix-ui 統一パッケージ

### インポートパターン

```tsx
// NG: 旧・個別パッケージ（非推奨）
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Slot } from "@radix-ui/react-slot"

// OK: 新・統一パッケージ
import { Dialog as DialogPrimitive } from "radix-ui"
import { Slot } from "radix-ui"
```

### Slot.Root パターン

```tsx
// NG: 旧パターン
const Comp = asChild ? Slot : "button"

// OK: 新パターン
const Comp = asChild ? Slot.Root : "button"
```

### data属性パターン（最新shadcn/ui標準）

```tsx
<button
  data-slot="button"
  data-variant={variant}
  data-size={size}
  className={cn(buttonVariants({ variant, size }), className)}
/>
```

### 最新コンポーネント構造の特徴
- `function` 宣言（`const` + forwardRef ではなく）
- `React.ComponentProps<T>` で型定義
- `data-slot` 属性でセマンティック識別
- CardTitle/AlertTitle: `h3/h5` → `div` に変更
- CardAction: 新規追加コンポーネント

---

## ダークモード対応戦略

### CSS変数方式（将来のダークモード追加時に適用）

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

### TailwindCSS v4.2 dark: プレフィックス

```tsx
// ダークモード時の透明度
"dark:bg-input/30"
// ダークモード+ホバー
"dark:hover:bg-accent/50"
// ダークモード+aria-invalid
"dark:aria-invalid:ring-destructive/40"
```

### 注意
本プロジェクトは現在ライトモードのみ。将来ダークモード追加時にこの戦略を適用する。
