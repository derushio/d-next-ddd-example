# Server/Client分離パターン詳細

Next.js App Routerにおける、Server ComponentとClient Componentの分離パターンを詳細に解説します。

---

## 📌 基本原則

### Server Component優先

```
デフォルト: Server Component
必要な場合のみ: Client Component（'use client'ディレクティブ）
```

### ドーナツ構造の概念

```
┌─────────────────────────────────────────┐
│ Server Component（外側）                │
│  - データ取得                          │
│  - 静的コンテンツ                      │
│  - SEO重要コンテンツ                   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Client Component（内側）          │ │
│  │  - インタラクション               │ │
│  │  - 状態管理                       │ │
│  │  - ブラウザAPI                    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔍 Server Component使用ケース

### 1. データフェッチ

```tsx
// ✅ Server Component: async/awaitで直接データ取得
export default async function UsersPage() {
  // Server Actionを呼び出し
  const result = await getUsersAction();

  if (!result.success) {
    return <Alert variant="destructive">{result.error}</Alert>;
  }

  return (
    <div>
      <h1>ユーザー一覧</h1>
      <UserList users={result.data} />
    </div>
  );
}
```

**メリット:**
- サーバーサイドでデータ取得、高速レンダリング
- APIキー等の秘密情報を安全に扱える
- データベースへの直接アクセス可能

### 2. 静的コンテンツ表示

```tsx
// ✅ Server Component: 静的コンテンツ
export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">私たちについて</h1>
      <p className="text-[var(--text-secondary)] mb-4">
        私たちは革新的なソリューションを提供します。
      </p>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">ミッション</h2>
        <p>高品質なサービスを通じて、顧客の成功を支援します。</p>
      </section>
    </div>
  );
}
```

**メリット:**
- SEO最適化（サーバーサイドレンダリング）
- 初回読み込み高速化
- JavaScriptバンドルサイズ削減

### 3. 重いライブラリの使用

```tsx
// ✅ Server Component: 重いライブラリをサーバーサイドで使用
import { parseMarkdown } from 'heavy-markdown-library'; // 大きなライブラリ

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostAction(params.slug);

  if (!post.success) {
    notFound();
  }

  // サーバーサイドでMarkdownをHTMLに変換
  const htmlContent = parseMarkdown(post.data.content);

  return (
    <article>
      <h1>{post.data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </article>
  );
}
```

**メリット:**
- クライアント側のバンドルサイズ削減
- 初回レンダリング高速化
- サーバーリソースを活用した処理

---

## 🖱️ Client Component使用ケース

### 1. 状態管理（useState、useReducer）

```tsx
// ✅ Client Component: 状態管理が必要
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CounterClient() {
  const [count, setCount] = useState(0);

  return (
    <div className="space-y-4">
      <p className="text-xl">カウント: {count}</p>
      <Button
        variant="aurora"
        onClick={() => setCount(count + 1)}
        className="cursor-pointer"
      >
        増加
      </Button>
    </div>
  );
}
```

### 2. イベントハンドラ（onClick、onChange等）

```tsx
// ✅ Client Component: イベントハンドラが必要
'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NotificationButtonClient() {
  const handleClick = () => {
    toast.success('通知が送信されました');
  };

  return (
    <Button
      variant="aurora"
      onClick={handleClick}
      className="cursor-pointer"
    >
      通知を送信
    </Button>
  );
}
```

### 3. ブラウザAPI使用（window、localStorage等）

```tsx
// ✅ Client Component: ブラウザAPIが必要
'use client';
import { useEffect, useState } from 'react';

export function ThemeToggleClient() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // localStorageからテーマを読み込み
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="cursor-pointer p-2 rounded hover:bg-gray-100"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### 4. React Hooks（useEffect、useContext等）

```tsx
// ✅ Client Component: useEffectでデータフェッチ
'use client';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';

export function RealtimeDataClient() {
  const [data, setData] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // リアルタイムデータの取得（WebSocket等）
    const ws = new WebSocket('wss://api.example.com/realtime');

    ws.onmessage = (event) => {
      setData(prev => [...prev, event.data]);
    };

    ws.onerror = () => {
      setError('接続エラーが発生しました');
    };

    return () => ws.close();
  }, []);

  if (error) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="p-2 border rounded">
          {item}
        </div>
      ))}
    </div>
  );
}
```

---

## 🍩 ドーナツ構造実装例

### 例1: ユーザープロフィールページ

```tsx
// ❌ 悪い例: ページ全体をClient Component化
'use client';
import { useState } from 'react';

export default function UserProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <header>プロフィール</header> {/* 静的コンテンツもClient側に */}
      <UserInfo />
      <EditButton onClick={() => setIsEditing(!isEditing)} />
    </div>
  );
}
```

```tsx
// ✅ 良い例: ドーナツ構造
// app/users/[id]/page.tsx (Server Component)
export default async function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // サーバーでデータ取得
  const result = await getUserAction(params.id);

  if (!result.success) {
    return <Alert variant="destructive">{result.error}</Alert>;
  }

  return (
    <div className="container mx-auto py-8">
      {/* 静的コンテンツはServer Component */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">プロフィール</h1>
      </header>

      {/* データ表示もServer Component */}
      <UserInfoDisplay user={result.data} />

      {/* インタラクティブな部分のみClient Component */}
      <UserEditClient initialData={result.data} />
    </div>
  );
}

// components/features/users/UserEditClient.tsx (Client Component)
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function UserEditClient({ initialData }: { initialData: User }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="mt-6">
      <Button
        variant="primary"
        onClick={() => setIsEditing(!isEditing)}
        className="cursor-pointer"
      >
        {isEditing ? '編集完了' : '編集する'}
      </Button>

      {isEditing && <UserEditFormClient data={initialData} />}
    </div>
  );
}
```

### 例2: 検索ページ

```tsx
// ✅ ドーナツ構造: 検索ページ
// app/search/page.tsx (Server Component)
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  let results = null;

  // クエリがある場合のみ検索実行
  if (searchParams.q) {
    const result = await searchAction(searchParams.q);
    if (result.success) {
      results = result.data;
    }
  }

  return (
    <div className="container mx-auto py-8">
      {/* 静的コンテンツ */}
      <h1 className="text-3xl font-bold mb-6">検索</h1>

      {/* リアルタイムフィルタリングのみClient */}
      <SearchFormClient initialQuery={searchParams.q} />

      {/* 検索結果表示（Server Component） */}
      {results && (
        <div className="mt-8 space-y-4">
          {results.map(item => (
            <SearchResultCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// components/features/search/SearchFormClient.tsx (Client Component)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchFormClient({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || '');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="検索キーワード"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        variant="aurora"
        className="cursor-pointer"
      >
        検索
      </Button>
    </form>
  );
}
```

---

## 🔄 Server Action連携パターン

### パターン1: フォーム送信（Server Component）

```tsx
// ✅ Server Component: Server Actionでフォーム送信
// app/contact/page.tsx
import { submitContactAction } from '@/app/server-actions/contact/submitContactAction';

export default function ContactPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">お問い合わせ</h1>

      <form action={submitContactAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block mb-2">
            お名前
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label htmlFor="email" className="block mb-2">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label htmlFor="message" className="block mb-2">
            メッセージ
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          送信
        </button>
      </form>
    </div>
  );
}
```

### パターン2: バリデーション付きフォーム（Client Component）

```tsx
// ✅ Client Component: react-hook-form + zodでバリデーション
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitContactAction } from '@/app/server-actions/contact/submitContactAction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const contactSchema = z.object({
  name: z.string().min(2, 'お名前は2文字以上で入力してください'),
  email: z.email('有効なメールアドレスを入力してください'),
  message: z.string().min(10, 'メッセージは10文字以上で入力してください'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactFormClient() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    const result = await submitContactAction(data);

    if (result.success) {
      toast.success('お問い合わせを送信しました');
      reset();
    } else {
      toast.error(result.error || '送信に失敗しました');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block mb-2">
          お名前
        </label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block mb-2">
          メールアドレス
        </label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block mb-2">
          メッセージ
        </label>
        <textarea
          id="message"
          {...register('message')}
          rows={4}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="aurora"
        loading={isSubmitting}
        className="cursor-pointer"
      >
        送信
      </Button>
    </form>
  );
}
```

---

## 📊 判断フローチャート

```
機能要件を確認
  ↓
  ├─ 状態管理（useState、useReducer）が必要？
  │   └─ Yes → Client Component
  │
  ├─ イベントハンドラ（onClick等）が必要？
  │   └─ Yes → Client Component
  │
  ├─ ブラウザAPI（window、localStorage）が必要？
  │   └─ Yes → Client Component
  │
  ├─ React Hooks（useEffect、useContext）が必要？
  │   └─ Yes → Client Component
  │
  └─ 上記のいずれも不要
      └─ Server Component（デフォルト）
```

---

## ✅ チェックリスト

### Server Component実装時

- [ ] async/awaitでデータフェッチを実装
- [ ] 静的コンテンツを優先配置
- [ ] SEO重要コンテンツを含める
- [ ] 重いライブラリをサーバーサイドで処理

### Client Component実装時

- [ ] ファイル名に`Client`サフィックスを付与
- [ ] 'use client'ディレクティブを先頭に配置
- [ ] 必要最小限のコードのみClient化
- [ ] クリック可能要素に`cursor-pointer`を付与

### ドーナツ構造実装時

- [ ] Server Componentで外側を構成
- [ ] Client Componentを内側に配置
- [ ] データフェッチはServer Component
- [ ] インタラクションのみClient Component

---

## 📚 参考リソース

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Server Components vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
