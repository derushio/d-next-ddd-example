---
name: optimistic-ui-patterns
description: |
  React 19 useOptimistic を使った楽観的UI更新パターンを提供するスキル。
  即時UI更新、Server Action 完了後の自動 reconciliation、
  useTransition との組み合わせを扱う。

  トリガー例:
  - 「useOptimistic」「楽観的更新」「即時反映」「optimistic」
  - 削除・いいね等のアクション後に即座にUIを更新したいとき
  - Server Action の結果を待たずにリストを更新するとき

globs:
  - "src/components/features/**/*.tsx"
---

# 楽観的UI更新パターン スキル

React 19 `useOptimistic` を使ってサーバーの応答を待たずに UI を即時更新するパターン集。

---

## 1. useOptimistic の基本パターン（削除例）

`useOptimistic` は Server Action が完了するまでの間、仮の状態を表示するための Hook。
Server Action が成功すれば Server Component の再レンダリング後に自動的に同期され、
失敗すれば元の状態に自動ロールバックされる。

```typescript
// src/components/features/todo/TodoListClient.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import type { TodoResponse } from '@/layers/application/usecases/todo/GetTodosUseCase';
import { deleteTodoAction } from '@/layers/presentation/actions/todo/deleteTodoAction';

type Props = {
  initialTodos: TodoResponse[];
};

export function TodoListClient({ initialTodos }: Props) {
  const [isPending, startTransition] = useTransition();

  // ✅ useOptimistic: initialTodos を元に楽観的状態を管理
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(initialTodos);

  const handleDelete = (todoId: string) => {
    startTransition(async () => {
      // ✅ 即時UI更新（サーバー応答を待たない）
      setOptimisticTodos((prev) => prev.filter((todo) => todo.id !== todoId));

      // サーバーへのリクエスト（非同期）
      const result = await deleteTodoAction({ todoId });

      // ❌ 失敗時は useOptimistic が自動でロールバックするので手動処理不要
      // ただし、ユーザーへのエラー通知は明示的に行うこと
      if (!result.success) {
        // toast でエラー通知（状態は自動ロールバックされる）
        console.error('削除に失敗しました:', result.error);
      }
    });
  };

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id} className={isPending ? 'opacity-70' : ''}>
          {todo.title}
          <button
            onClick={() => handleDelete(todo.id)}
            disabled={isPending}
            className="ml-2 text-red-500"
          >
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### useOptimistic の動作フロー

```
ユーザーが削除ボタンをクリック
         ↓
setOptimisticTodos() で即時UI更新（削除後の状態を表示）
         ↓
deleteTodoAction() がサーバーに送信（非同期）
         ↓
  成功: Server Component 再レンダリング
        → initialTodos が更新 → useOptimistic が自動同期
  失敗: useOptimistic が元の initialTodos に自動ロールバック
```

---

## 2. useTransition との組み合わせ（isPending でローディング表示）

`useTransition` と組み合わせることで、非同期処理中の状態管理とローディング表示を行う。

```typescript
// src/components/features/post/PostLikeButton.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import type { PostResponse } from '@/layers/application/usecases/post/GetPostUseCase';
import { toggleLikeAction } from '@/layers/presentation/actions/post/toggleLikeAction';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  post: PostResponse;
  currentUserId: string;
};

export function PostLikeButton({ post, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition();

  const isLiked = post.likedUserIds.includes(currentUserId);

  // ✅ 楽観的ないいね状態
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(isLiked);
  const [optimisticCount, setOptimisticCount] = useOptimistic(post.likeCount);

  const handleToggleLike = () => {
    startTransition(async () => {
      // 即時更新
      setOptimisticLiked(!optimisticLiked);
      setOptimisticCount(optimisticLiked ? optimisticCount - 1 : optimisticCount + 1);

      await toggleLikeAction({ postId: post.id });
    });
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={isPending}
      className="flex items-center gap-1"
    >
      <Heart
        className={cn(
          'size-5 transition-colors',
          optimisticLiked ? 'fill-red-500 text-red-500' : 'text-gray-400',
          isPending && 'opacity-50',
        )}
      />
      <span>{optimisticCount}</span>
    </button>
  );
}
```

### isPending の活用パターン

```typescript
// ✅ isPending を使ったローディング表示パターン
<button disabled={isPending} className={cn(isPending && 'cursor-not-allowed opacity-50')}>
  {isPending ? '処理中...' : '送信'}
</button>

// ✅ リスト全体への適用
<ul className={cn('transition-opacity', isPending && 'opacity-70 pointer-events-none')}>
  {optimisticItems.map(item => <li key={item.id}>{item.name}</li>)}
</ul>
```

---

## 3. ロールバック: Server Action 失敗時の自動 reconciliation の仕組み

`useOptimistic` は **Transition が完了した時点で `initialState`（props）の値に戻る**。
Server Action が失敗 → Server Component が再レンダリングされない → `initialTodos` が変わらない
→ Transition 完了後に楽観的状態が元の `initialTodos` に自動ロールバックされる。

```typescript
// ✅ ロールバックは自動のため、手動実装は不要
const handleDelete = (todoId: string) => {
  startTransition(async () => {
    setOptimisticTodos((prev) => prev.filter((t) => t.id !== todoId));
    const result = await deleteTodoAction({ todoId });

    // ✅ 失敗時は useOptimistic が自動でロールバック（何もしなくてよい）
    // エラー通知のみ明示的に行う
    if (!result.success) {
      toast.error('削除に失敗しました。もう一度お試しください。');
      // setOptimisticTodos で手動ロールバックは不要（むしろ状態が二重になる）
    }
  });
};
```

---

## 4. 複数操作パターン（追加/更新/削除のそれぞれ）

### 追加（Create）

```typescript
'use client';

import { useOptimistic, useTransition } from 'react';
import type { CommentResponse } from '@/layers/application/usecases/comment/GetCommentsUseCase';
import { createCommentAction } from '@/layers/presentation/actions/comment/createCommentAction';

type Props = {
  postId: string;
  initialComments: CommentResponse[];
  currentUser: { id: string; name: string };
};

export function CommentListClient({ postId, initialComments, currentUser }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticComments, setOptimisticComments] = useOptimistic(initialComments);

  const handleCreate = (content: string) => {
    startTransition(async () => {
      // ✅ 仮のIDで楽観的追加
      const tempComment: CommentResponse = {
        id: `temp-${Date.now()}`,
        content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: new Date(),
        isOptimistic: true, // 仮フラグ（型に含める場合）
      };

      setOptimisticComments((prev) => [...prev, tempComment]);

      const result = await createCommentAction({ postId, content });
      if (!result.success) {
        toast.error('コメントの投稿に失敗しました。');
      }
    });
  };

  return (
    <div>
      {optimisticComments.map((comment) => (
        <div key={comment.id} className={comment.isOptimistic ? 'opacity-60' : ''}>
          {comment.content}
        </div>
      ))}
      <CommentForm onSubmit={handleCreate} disabled={isPending} />
    </div>
  );
}
```

### 更新（Update）

```typescript
const handleUpdate = (todoId: string, newTitle: string) => {
  startTransition(async () => {
    // ✅ 対象アイテムのみ更新
    setOptimisticTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId ? { ...todo, title: newTitle } : todo,
      ),
    );

    const result = await updateTodoAction({ todoId, title: newTitle });
    if (!result.success) toast.error('更新に失敗しました。');
  });
};
```

### 削除（Delete）

```typescript
const handleDelete = (todoId: string) => {
  startTransition(async () => {
    // ✅ フィルタリングで除外
    setOptimisticTodos((prev) => prev.filter((todo) => todo.id !== todoId));

    const result = await deleteTodoAction({ todoId });
    if (!result.success) toast.error('削除に失敗しました。');
  });
};
```

---

## 5. 禁止パターン

```typescript
// ❌ 禁止: useState で手動ロールバック
'use client';
const [todos, setTodos] = useState(initialTodos);

const handleDelete = async (todoId: string) => {
  const backup = todos; // バックアップを手動で保存
  setTodos((prev) => prev.filter((t) => t.id !== todoId)); // 手動楽観更新

  const result = await deleteTodoAction({ todoId });
  if (!result.success) {
    setTodos(backup); // ❌ 手動ロールバック — useOptimistic を使えば不要
  }
};
// → useOptimistic + useTransition を使うこと

// ❌ 禁止: useOptimistic を useTransition の外で呼ぶ
const handleDelete = (todoId: string) => {
  setOptimisticTodos((prev) => prev.filter((t) => t.id !== todoId)); // ❌ Transition外
  startTransition(async () => {
    await deleteTodoAction({ todoId });
  });
};
// → setOptimisticTodos は必ず startTransition の中で呼ぶこと

// ❌ 禁止: Server Component で useOptimistic を使う
export default async function ServerPage() {
  const [optimistic, setOptimistic] = useOptimistic([]); // ❌ Server Component では使えない
}

// ❌ 禁止: 楽観更新失敗時に手動で setOptimisticTodos を呼んでロールバック
if (!result.success) {
  setOptimisticTodos(originalTodos); // ❌ Transition 完了後は自動ロールバックされるため二重になる
}
```

---

## チェックリスト

- [ ] `useOptimistic` を使う前に `useTransition` もインポートしているか？
- [ ] `setOptimisticXxx` は必ず `startTransition` の中で呼んでいるか？
- [ ] Server Action 失敗時のユーザー通知（toast 等）は実装しているか？
- [ ] 手動ロールバック（`useState` + try/catch）を使っていないか？
- [ ] `isPending` を活用してボタンの `disabled` やローディング表示をしているか？
- [ ] 楽観更新のデータ変換（filter/map）が正しい状態になるか確認したか？

---

## 関連スキル

- `react19-modern-patterns` — React 19 の最新 API（useOptimistic, useTransition 等）
- `react19-form-patterns` — useTransition を使ったフォーム送信パターン
- `server-component-data-patterns` — Server → Client の initialData パターン
- `server-action-form-hook` — Client Component から Server Action を呼ぶ Hook
