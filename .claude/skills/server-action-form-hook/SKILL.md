---
name: server-action-form-hook
description: |
  Client ComponentからServer Actionをフォーム経由で呼び出す際の
  useServerAction Hook使用パターンを提供するスキル。
  try/catch/toast/redirect のボイラープレートを排除し、
  統一的なエラーハンドリングとフォーム状態管理を実現する。

  トリガー例:
  - 「Server Action呼び出し」「フォーム送信」「useServerAction」
  - startTransition(async () => { try { ... } catch を書こうとしたとき
  - src/components/features/ 配下のフォームコンポーネント編集時
---

# Server Action Form Hook Skill

`useServerAction` Hook を使ったフォーム送信の統一パターン。
手書きの `startTransition + try/catch + toast + router.push` ボイラープレートを排除する。

---

## useServerAction Hook 概要

- **目的**: フォーム送信時の定型パターン（startTransition、try/catch、toast通知、エラー設定、リダイレクト）を統一的に管理する
- **ファイル**: `src/hooks/useServerAction.ts`
- **提供機能**:
  - `execute(action)` — startTransition + try/catch ラッパー。送信前に `form.clearErrors('root')` を自動実行
  - `handleActionResult(result)` — `ActionResult` の成功/失敗を処理し、成功なら `true`、失敗なら `false` を返す
  - `isPending` — ローディング状態（`useTransition` の isPending を公開）

---

## API

### useServerAction オプション

| オプション | 型 | 説明 |
|-----------|-----|------|
| `form` | `UseFormReturn<T>` | （任意）react-hook-form の form インスタンス |
| `successMessage` | `string` | （任意）成功時に表示する toast メッセージ |
| `defaultErrorMessage` | `string` | 予期しないエラー時に表示するメッセージ |
| `redirectTo` | `string` | （任意）成功後のリダイレクト先 URL |
| `onSuccess` | `() => void` | （任意）成功時のコールバック |

### execute(action)

```typescript
execute(async () => {
  const result = await someServerAction(values);
  if (handleActionResult(result)) {
    form.reset(); // 追加の成功処理
  }
});
```

- `startTransition` 内でラップされる
- 実行前に `form.clearErrors('root')` を自動呼び出し（form が渡された場合）
- catch ブロック内でデフォルトエラーメッセージを toast 表示し、`form.setError('root', ...)` を設定

### handleActionResult(result)

```typescript
const success = handleActionResult(result);
// true  → 成功（successMessage toast + redirectTo / onSuccess を実行済み）
// false → 失敗（エラーメッセージを toast + form.setError('root', ...) に設定済み）
```

---

## 使用パターン

### ✅ パターン1: CRUD系フォーム（handleActionResult 使用）

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useServerAction } from '@/hooks/useServerAction';
import { createUser } from '@/layers/presentation/actions/user/createUser';
import { routes } from '@/app/routes';

export function CreateUserFormClient({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const { execute, handleActionResult, isPending } = useServerAction({
    form,
    successMessage: 'ユーザーを作成しました',
    defaultErrorMessage: '予期しないエラーが発生しました',
    redirectTo: routes.users.list(),
    onSuccess,
  });

  const onSubmit = (values: FormValues) => {
    execute(async () => {
      const result = await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (handleActionResult(result)) {
        form.reset();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* フィールド */}
        <Button type='submit' disabled={isPending}>
          {isPending ? '作成中...' : 'ユーザーを作成'}
        </Button>
      </form>
    </Form>
  );
}
```

### ✅ パターン2: NextAuth signIn（execute() のみ使用）

```typescript
'use client';

import { useServerAction } from '@/hooks/useServerAction';
import { signIn } from 'next-auth/react';

export function SignInFormClient() {
  const form = useForm<FormValues>({ /* ... */ });

  // signIn はActionResult型ではないため、handleActionResult は使わない
  // カスタムエラーハンドリングをaction内で行う
  const { execute, isPending } = useServerAction({
    form,
    defaultErrorMessage: '予期しないエラーが発生しました',
  });

  const onSubmit = (values: FormValues) => {
    execute(async () => {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        form.setError('root', {
          type: 'server',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }
    });
  };

  return (/* ... */);
}
```

### ✅ パターン3: 削除ボタン（form なし）

```typescript
'use client';

import { useServerAction } from '@/hooks/useServerAction';
import { deleteUser } from '@/layers/presentation/actions/user/deleteUser';
import { routes } from '@/app/routes';

export function DeleteUserButtonClient({
  userId,
  onSuccess,
}: { userId: string; onSuccess?: () => void }) {
  const { execute, handleActionResult, isPending } = useServerAction({
    defaultErrorMessage: '削除に失敗しました',
    redirectTo: routes.users.list(),
    onSuccess,
  });

  const handleDelete = () => {
    execute(async () => {
      const result = await deleteUser({ id: userId });
      handleActionResult(result);
    });
  };

  return (
    <Button variant='destructive' onClick={handleDelete} disabled={isPending}>
      {isPending ? '削除中...' : '削除'}
    </Button>
  );
}
```

---

## ❌ 禁止パターン

### 手書き startTransition + try/catch（useServerAction で代替）

```typescript
// ❌ 禁止: ボイラープレートを手書きしている
const onSubmit = (values: FormValues) => {
  form.clearErrors('root');
  startTransition(async () => {
    try {
      const result = await someServerAction(values);
      if (result.success) {
        toast.success('成功しました');
        router.push(routes.list());
        router.refresh();
      } else {
        form.setError('root', { type: 'server', message: result.error });
        toast.error(result.error);
      }
    } catch {
      form.setError('root', { type: 'server', message: '予期しないエラーが発生しました' });
      toast.error('予期しないエラーが発生しました');
    }
  });
};
```

```typescript
// ✅ 推奨: useServerAction に委任する
const { execute, handleActionResult, isPending } = useServerAction({
  form,
  successMessage: '成功しました',
  defaultErrorMessage: '予期しないエラーが発生しました',
  redirectTo: routes.list(),
});

const onSubmit = (values: FormValues) => {
  execute(async () => {
    const result = await someServerAction(values);
    handleActionResult(result);
  });
};
```

### form.clearErrors('root') の直接呼び出し

```typescript
// ❌ 禁止: execute() が自動で clearErrors を呼ぶ
const onSubmit = (values: FormValues) => {
  form.clearErrors('root'); // 不要
  execute(async () => { /* ... */ });
};
```

### router.push + router.refresh の直接使用

```typescript
// ❌ 禁止: handleActionResult または redirectTo で処理される
if (result.success) {
  router.push(routes.list()); // 不要（redirectTo オプションで処理）
  router.refresh();           // 不要（useServerAction が内部で処理）
}
```

**例外**: signIn 等の独自フロー（NextAuth の result.url へのリダイレクト等）は直接 router.push を使ってよい。

---

## チェックリスト

- [ ] `useServerAction` を使用しているか
- [ ] 手書きの `try/catch + toast` パターンが残っていないか
- [ ] `form.clearErrors('root')` を直接呼んでいないか（`execute()` が自動処理）
- [ ] `router.push + router.refresh` を直接呼んでいないか（特例: signIn 等の独自フロー以外）
- [ ] `handleActionResult` は `ActionResult` 型の返り値にのみ使用しているか
- [ ] `isPending` でボタンの `disabled` とテキストを制御しているか

---

## 関連スキル

- **`react19-form-patterns`**（Primary）: useTransition + react-hook-form の共存パターン。useServerAction がラップしている低レベルの仕組みを理解したい場合に参照
- **`form-field-consistency`**: TextFormField コンポーネント使用ルール
- **`zod-error-handling`**: Server Action の Zod バリデーションエラー処理
- **`presentation-impl`**: Server Action 本体の実装パターン
