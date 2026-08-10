---
name: form-field-consistency
description: |
  フォームフィールドの一貫した実装パターンを提供するスキル。
  TextFormField コンポーネントの使用を強制し、
  手動配線による重複コードを防止する。

  トリガー例:
  - 「フォーム」「FormField」「FormItem」「setError」「fieldErrors」
  - FormItem, FormLabel, FormControl, FormMessage を直接使おうとしたとき
  - src/components/features/ 配下のフォームコンポーネント編集時
  - react-hook-form + Server Action のエラーハンドリング
---

# Form Field Consistency Skill

フォームフィールド実装の一貫性を保つパターンを提供します。
`TextFormField` コンポーネントによる統一された実装と、
`applyFieldErrors()` による Server Action エラーの反映を徹底します。

---

## 1. TextFormField コンポーネントを使用する

### 基本ルール

テキスト入力フィールドは必ず `@/components/common/TextFormField` を使用すること。
`FormItem` / `FormLabel` / `FormControl` / `FormMessage` を直接組み合わせて書くことは禁止。

### ✅ 正しいパターン

```tsx
import { TextFormField } from '@/components/common/TextFormField';

// 単純なテキスト入力
<TextFormField
  form={form}
  name="email"
  label="メールアドレス"
  placeholder="example@example.com"
  type="email"
/>

// パスワード入力
<TextFormField
  form={form}
  name="password"
  label="パスワード"
  type="password"
  disabled={isPending}
/>
```

### ❌ 禁止パターン（手動配線）

```tsx
// ❌ FormItem/FormLabel/FormControl/FormMessage を手動で配線してはならない
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>メールアドレス</FormLabel>
      <FormControl>
        <Input type="email" placeholder="example@example.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### TextFormField の Props

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `form` | `UseFormReturn<T>` | 必須 | react-hook-form の form インスタンス |
| `name` | `Path<T>` | 必須 | フォームフィールド名 |
| `label` | `string` | 必須 | ラベルテキスト |
| `placeholder` | `string` | undefined | プレースホルダー |
| `type` | `string` | `'text'` | input の type 属性 |
| `disabled` | `boolean` | `false` | 無効化フラグ |

---

## 2. Server Action エラーをフォームに反映する

### applyFieldErrors() の使い方

Server Action が返す `fieldErrors` を react-hook-form に適用するには
`applyFieldErrors()` ユーティリティを使用すること。

```typescript
import { applyFieldErrors } from '@/hooks/useServerActionForm';
```

### ✅ 正しいパターン

```typescript
const onSubmit = async (data: FormValues) => {
  startTransition(async () => {
    const result = await signInAction(data);

    if (!result.success) {
      // ✅ applyFieldErrors でフィールドエラーをまとめて適用
      applyFieldErrors(form, result.fieldErrors);

      if (result.message) {
        toast.error(result.message);
      }
      return;
    }

    toast.success('ログインしました');
    router.push(routes.dashboard);
  });
};
```

### ❌ 禁止パターン（for...of ループの手動重複）

```typescript
// ❌ fieldErrors を手動でループして setError するのは禁止
if (result.fieldErrors) {
  for (const [key, value] of Object.entries(result.fieldErrors)) {
    if (Array.isArray(value) && value.length > 0) {
      form.setError(key as keyof FormValues, {
        type: 'server',
        message: value[0],
      });
    }
  }
}
```

---

## 3. フォームコンポーネントの全体構成パターン

### ✅ 標準的なフォームコンポーネント

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TextFormField } from '@/components/common/TextFormField';
import { applyFieldErrors } from '@/hooks/useServerActionForm';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

const schema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const result = await loginAction(data);

      if (!result.success) {
        applyFieldErrors(form, result.fieldErrors);
        return;
      }

      // 成功時の処理
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextFormField
          form={form}
          name="email"
          label="メールアドレス"
          type="email"
          disabled={isPending}
        />
        <TextFormField
          form={form}
          name="password"
          label="パスワード"
          type="password"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'ログイン中...' : 'ログイン'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 4. カスタム入力が必要な場合

セレクトボックス、テキストエリア、チェックボックス等、
`TextFormField` で対応できない場合のみ手動配線を許可する。
その場合でも `FormItem` / `FormLabel` / `FormControl` / `FormMessage` の構造は維持すること。

```tsx
// ✅ TextFormField で対応できないカスタム入力の例
<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>ロール</FormLabel>
      <FormControl>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger>
            <SelectValue placeholder="ロールを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">管理者</SelectItem>
            <SelectItem value="user">一般ユーザー</SelectItem>
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## チェックリスト

- [ ] テキスト入力に `TextFormField` を使用している
- [ ] `FormItem/FormLabel/FormControl/FormMessage` を手動配線していない
- [ ] Server Action エラーは `applyFieldErrors()` で適用している
- [ ] `fieldErrors` のループを手動で書いていない
- [ ] `disabled={isPending}` で送信中の多重送信を防止している

---

## 関連スキル

- **presentation-impl**: Server Action の実装パターン
- **react19-form-patterns**: `useTransition` + react-hook-form の共存パターン
- **react19-modern-patterns**: `useFormStatus` 等の React 19 最新パターン
- **frontend-patterns**: shadcn/ui を使ったフロントエンド実装全般
