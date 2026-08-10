---
name: react19-form-patterns
description: |
  React 19 の useTransition + react-hook-form の共存パターンを提供するスキル。
  isPending管理、Server Action form submission、TextFormField共通コンポーネント、
  Sonner toast連携パターンを扱う。

  トリガー例:
  - 「useTransition」「react-hook-form」「フォーム送信」「isPending」
  - 「Server Action form」「useActionState」
  - src/components/features/*/Form*.tsx の編集時
  - シンプルなフォーム、1〜2フィールドのフォーム
---

# React 19 Form Patterns Skill

React 19 + react-hook-form + Server Action を組み合わせたフォーム実装パターン。

---

## useTransition + react-hook-form 共存パターン

### 基本構造

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

export function SomeFormClient() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { /* ... */ },
  });

  const onSubmit = async (values: FormValues) => {
    form.clearErrors('root'); // 前回のサーバーエラーをクリア

    startTransition(async () => {
      try {
        const result = await someServerAction(values);

        if (result.success) {
          toast.success('操作が成功しました');
          // 成功後の処理（router.push等）
        } else {
          const errorMessage = result.error || '予期しないエラーが発生しました';
          form.setError('root', { type: 'server', message: errorMessage });
          toast.error(errorMessage);
        }
      } catch (error) {
        // NOTE: Client ComponentではサーバーサイドDI(ILogger/pino)が使用不可のため、console.errorが正当
        console.error('フォーム送信エラー:', error);
        form.setError('root', { type: 'server', message: '予期しないエラーが発生しました' });
        toast.error('予期しないエラーが発生しました');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* フィールド */}
        <Button type='submit' disabled={isPending}>
          {isPending ? '送信中...' : '送信'}
        </Button>
      </form>
    </Form>
  );
}
```

### isPending のみで十分な理由

`form.formState.isSubmitting` との二重チェックが不要な理由:

`useTransition` の `isPending` は React の並行レンダリング機構と統合されており、
`startTransition` 内の非同期処理が完了するまで `true` になる。

`form.formState.isSubmitting` は `handleSubmit` 内で管理される別のフラグだが、
`startTransition` を使用すると両者が競合する場合がある。

**このプロジェクトの方針**: `isPending` のみを使用し、`isSubmitting` は参照しない。

```typescript
// ✅ 推奨: isPending のみ使用
<Button disabled={isPending}>

// ❌ 避ける: isPending と isSubmitting の二重チェック
<Button disabled={isPending || form.formState.isSubmitting}>

// ❌ useTransition なしの isSubmitting 使用（Server Actionには不適）
<Button disabled={form.formState.isSubmitting}>
```

### startTransition の正しい使い方

`onSubmit` 内で `startTransition` を呼び出す位置が重要:

```typescript
// ✅ 推奨: onSubmit ハンドラ内で startTransition を開始
const onSubmit = async (values: FormValues) => {
  form.clearErrors('root'); // startTransition の前でクリア（同期処理）

  startTransition(async () => {
    // この中が非同期処理の本体
    const result = await serverAction(values);
    // ...
  });
};

// ❌ 避ける: onSubmit 自体を startTransition でラップ（form.handleSubmit との相性が悪い）
const onSubmit = startTransition(async (values: FormValues) => { /* ... */ });
```

---

## form.setError('root', ...) によるサーバーエラー表示

### サーバーエラーの設定と表示パターン

```typescript
// サーバーエラーを root フィールドに設定
form.setError('root', {
  type: 'server',
  message: 'メールアドレスまたはパスワードが正しくありません',
});

// フィールド別エラーがある場合
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

```tsx
// JSX でのエラー表示
{form.formState.errors.root?.message && (
  <div className={cn('mb-6')}>
    <Alert variant='destructive'>
      <AlertTitle>エラー</AlertTitle>
      {form.formState.errors.root.message}
    </Alert>
  </div>
)}
```

### 送信時のエラークリア

```typescript
const onSubmit = async (values: FormValues) => {
  form.clearErrors('root'); // 再送信前に前回のサーバーエラーをクリア必須
  // ...
};
```

---

## TextFormField 共通コンポーネントパターン

`src/components/common/TextFormField.tsx` の FormField render prop DRY化コンポーネント。

### コンポーネント定義

```typescript
// src/components/common/TextFormField.tsx
'use client';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

interface TextFormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

export function TextFormField<T extends FieldValues>({
  form, name, label, placeholder, type = 'text', disabled = false,
}: TextFormFieldProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} disabled={disabled} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### TextFormField の使い方

```tsx
import { TextFormField } from '@/components/common/TextFormField';

// フォーム内での使用（CreateUserFormClient.tsx の例）
<TextFormField
  form={form}
  name='name'
  label='名前'
  placeholder='田中太郎'
  disabled={isPending}
/>

<TextFormField
  form={form}
  name='email'
  label='メールアドレス'
  placeholder='example@example.com'
  type='email'
  disabled={isPending}
/>

<TextFormField
  form={form}
  name='password'
  label='パスワード'
  type='password'
  disabled={isPending}
/>
```

### TextFormField を使うべきケース

- テキスト、メール、パスワード等の標準的なテキスト入力
- `FormField` + `FormItem` + `FormLabel` + `FormControl` + `FormMessage` の定型パターンが繰り返される場合

### TextFormField では対応できないケース（カスタム実装が必要）

- セレクト、チェックボックス、ラジオボタン等の非テキスト入力
- カスタムバリデーション表示が必要な場合
- 複雑なレイアウトが必要なフィールド

この場合は `FormField` の `render` prop を直接使う（SignInFormClient.tsx のパターン）。

---

## Sonner toast 連携パターン

### 基本的な使い方

```typescript
import { toast } from 'sonner';

// 成功
toast.success('ユーザーを作成しました');

// エラー
toast.error('メールアドレスが既に使用されています');

// ローディング付き（長時間処理の場合）
const toastId = toast.loading('処理中...');
// 処理完了後
toast.success('完了しました', { id: toastId });
// または
toast.error('エラーが発生しました', { id: toastId });
```

### Server Action との組み合わせパターン

```typescript
startTransition(async () => {
  const result = await serverAction(values);

  if (result.success) {
    toast.success('成功しました'); // ユーザーへの即時フィードバック
    // フォームリセットまたはページ遷移
  } else {
    const errorMessage = result.error || '予期しないエラーが発生しました';
    form.setError('root', { type: 'server', message: errorMessage });
    toast.error(errorMessage); // toast でもエラーを通知（フォームエラーと両立）
  }
});
```

### toast と form.setError の使い分け

| 状況 | toast | form.setError('root', ...) |
|------|-------|--------------------------|
| サーバーエラー | 両方使用 | フォーム内に表示するため |
| 成功 | toast のみ | エラーではないため不要 |
| フィールドバリデーション | 不要（FormMessage が表示） | フィールド別エラーに設定 |

---

## useActionState への将来的移行ガイド

React 19 で追加された `useActionState` は `useTransition` + Server Action の統合 API。

### useActionState の基本

```typescript
import { useActionState } from 'react';

// 現在パターン（useTransition + react-hook-form）
const [isPending, startTransition] = useTransition();

// 将来パターン（useActionState）
const [state, formAction, isPending] = useActionState(serverAction, initialState);
```

### このプロジェクトでの採用判断

**現在は `useTransition + react-hook-form` を推奨。** 理由:

1. `react-hook-form` の zodResolver によるクライアントサイドバリデーションが必要
2. `form.setError()` によるフィールド別エラー表示が必要
3. `useActionState` は生の `<form action>` 向きで、react-hook-form との統合が複雑

`useActionState` が適切なケース:
- クライアントサイドバリデーション不要のシンプルなフォーム
- `<form action={formAction}>` で直接フォームをServer Actionに接続する場合

---

## 実装チェックリスト

- [ ] `useTransition` の `isPending` でボタンの `disabled` を制御している
- [ ] `form.formState.isSubmitting` との二重チェックをしていない
- [ ] `onSubmit` 内の先頭で `form.clearErrors('root')` を呼んでいる
- [ ] Server Action の成功/失敗を適切にハンドリングしている
- [ ] エラー時は `form.setError('root', ...)` と `toast.error()` の両方で通知している
- [ ] `disabled={isPending}` を全フィールドとボタンに適用している
- [ ] Client Component では `console.error` でログを記録している（ILogger 不可のため）

---

## useFormStatus の制約（CRITICAL）

`useFormStatus()` は **`<form action={serverAction}>` パターンの子コンポーネントでのみ** `pending` を検出する。

### react-hook-form との非互換

react-hook-form の `form.handleSubmit(onSubmit)` でフォームを送信する場合、ネイティブ `<form action>` ではないため `useFormStatus` の `pending` は**常に `false`** になる。

### 対策パターン

**パターンA（推奨）: isPending prop を渡す**
```tsx
// 親コンポーネント
const [isPending, startTransition] = useTransition();
<SubmitButton isPending={isPending}>送信</SubmitButton>

// SubmitButton
const { pending } = useFormStatus();
const isLoading = isPending || pending; // 両方に対応
```

**パターンB: `<form action>` に移行**（react-hook-form の zodResolver が不要な場合のみ）

### useActionState への将来移行

`useActionState` は Server Action の状態を宣言的に管理できるが、react-hook-form の zodResolver による client-side validation との共存が複雑。現時点では パターンA を推奨。

---

## useActionState パターン（シンプルフォーム用）

React 19 の `useActionState` は、react-hook-form が不要なシンプルなフォームに適する。

### 判断基準

| 条件 | 推奨パターン |
|------|------------|
| フィールド数 1-2個、バリデーション最小限 | `useActionState` |
| クロスフィールドバリデーション必要 | react-hook-form + `useServerAction` |
| リアルタイムフィールドバリデーション | react-hook-form + zodResolver |
| フィールドエラーの個別表示 | react-hook-form + `applyFieldErrors` |
| 確認ダイアログ付きアクション | react-hook-form or 独自フック |

### 基本パターン
```typescript
'use client';
import { useActionState } from 'react';

const [state, formAction, isPending] = useActionState(serverAction, null);

<form action={formAction}>
  <input name="email" type="email" required />
  <Button type="submit" disabled={isPending}>
    {isPending ? '処理中...' : '送信'}
  </Button>
  {state?.success === false && <p className="text-destructive">{state.error}</p>}
</form>
```

### 使い分けの例
- **削除確認（1ボタン）**: `useActionState` が適切
- **ログインフォーム（email + password + エラー表示）**: react-hook-form が適切
- **ユーザー編集（複数フィールド + バリデーション）**: react-hook-form が適切

---

## 関連スキル

- **presentation-impl**: Server Action の実装パターン
- **frontend-patterns**: Next.js App Router + shadcn/ui のコンポーネントパターン
- **neverthrow-patterns**: Server Action が返す Result 型の扱い方
- `server-action-form-hook`: useServerAction Hook によるServer Action呼び出しパターン
