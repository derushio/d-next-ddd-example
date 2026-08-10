---
name: image-optimization
description: |
  Next.js Image コンポーネントの最適化パターンを提供するスキル。
  next/image の正しい使い方、sizes/priority/fill設定、外部ドメイン許可を扱う。

  トリガー例:
  - 「next/image」「Image」「<img」「画像最適化」「外部画像」
  - <img> タグを書こうとしているとき
  - 画像が表示されない・サイズがおかしい・遅いとき

globs:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Next.js Image 最適化 スキル

Next.js の `next/image` を使った画像最適化パターンを提供します。

---

## 1. なぜ `<img>` を禁止するのか

```tsx
// ❌ 絶対禁止
<img src="/images/hero.jpg" alt="ヒーロー画像" />

// ✅ 常に next/image を使用
import Image from 'next/image';
<Image src="/images/hero.jpg" alt="ヒーロー画像" width={1200} height={600} />
```

`next/image` が提供する最適化:

| 機能 | 説明 |
|------|------|
| **自動フォーマット変換** | WebP / AVIF に自動変換（ブラウザ対応に応じて） |
| **遅延読み込み** | `loading="lazy"` がデフォルト（viewport外の画像を遅延） |
| **サイズ最適化** | デバイス解像度・コンテナサイズに応じた画像を配信 |
| **CLS防止** | `width`/`height` または `fill` により Layout Shift を防止 |
| **キャッシュ最適化** | CDN対応の適切なキャッシュヘッダーを自動付与 |

---

## 2. 3つの使用モード

### 2-1. Fixed（固定サイズ）

```tsx
import Image from 'next/image';

// ✅ サイズが固定の場合（アバター、アイコン等）
<Image
  src="/images/avatar.jpg"
  alt="ユーザーアバター"
  width={64}
  height={64}
  className="rounded-full"
/>
```

### 2-2. Responsive（レスポンシブ）

```tsx
// ✅ 親要素の幅に応じてスケールする場合
// sizes 属性で実際の表示サイズを指定してパフォーマンスを最適化
<Image
  src="/images/hero.jpg"
  alt="ヒーロー画像"
  width={1200}
  height={600}
  className="w-full h-auto"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
/>
```

### 2-3. Fill（コンテナいっぱいに広げる）

```tsx
// ✅ 親要素いっぱいに表示する場合（バナー、カード背景等）
// 親要素に position: relative が必須
<div className="relative w-full h-64">
  <Image
    src="/images/banner.jpg"
    alt="バナー"
    fill
    className="object-cover"
    sizes="100vw"
  />
</div>
```

---

## 3. `sizes` 属性の設計

`sizes` はブラウザが画像を取得する前に「実際の表示幅」をヒントとして伝えるための属性です。
**適切に設定するとダウンロードサイズを大幅に削減できます。**

```tsx
// ✅ フルワイドバナー
sizes="100vw"

// ✅ 最大幅制約あり
sizes="(max-width: 1280px) 100vw, 1280px"

// ✅ グリッドレイアウト（モバイル1列/タブレット2列/デスクトップ3列）
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

// ✅ サイドバー付きレイアウト（サイドバー幅 256px を引いた残り）
sizes="(max-width: 768px) 100vw, calc(100vw - 256px)"

// ❌ sizes 未設定（デフォルトは 100vw → 大きすぎる画像が取得される）
<Image src="..." alt="..." width={300} height={300} />
// → 上記は width/height 固定なら問題ないが、className で幅を変える場合は要設定
```

---

## 4. `priority` の使い方

```tsx
// ✅ LCP（Largest Contentful Paint）対象の画像には priority を付与
// ページの最初の viewport に表示される最大の画像に設定する
<Image
  src="/images/hero.jpg"
  alt="メインビジュアル"
  width={1200}
  height={600}
  priority          // ← preload される / lazy loading が無効化される
  sizes="100vw"
/>

// ❌ すべての画像に priority を付けると逆効果
// → preload が増えて初期ロードが遅くなる
<Image src="/images/footer-logo.png" alt="ロゴ" width={120} height={40} priority /> // ❌
```

**priority を付ける画像の見分け方:**
- ページ最上部のヒーロー画像
- OG画像として使うサムネイル
- ATF（Above The Fold）に必ず表示される画像

---

## 5. このプロジェクトの `remotePatterns` 設定

`next.config.ts` には以下の設定が入っています：

```typescript
// next.config.ts
images: {
  remotePatterns:
    process.env.NODE_ENV === 'development'
      ? [{ hostname: '*' }]        // 開発環境: 全ホスト許可
      : [
          // 本番環境: 明示的に許可するホストを列挙
          // { hostname: 'your-cdn.example.com' },
        ],
},
```

### 本番環境への移行時

本番環境で外部画像を使う場合は、**必ず `hostname` を明示的に指定**してください：

```typescript
// ✅ 本番環境での設定例
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'images.example.com',
    pathname: '/uploads/**',
  },
  {
    protocol: 'https',
    hostname: '**.cloudinary.com',
  },
  {
    protocol: 'https',
    hostname: 'avatars.githubusercontent.com',
  },
],
```

### よく使う外部サービスの設定

```typescript
// Gravatar
{ hostname: 'www.gravatar.com' }
{ hostname: 'secure.gravatar.com' }

// GitHub アバター
{ hostname: 'avatars.githubusercontent.com' }

// Google OAuth プロフィール画像
{ hostname: 'lh3.googleusercontent.com' }

// Cloudinary
{ hostname: 'res.cloudinary.com' }

// Supabase Storage
{ protocol: 'https', hostname: '*.supabase.co' }
```

---

## 6. プレースホルダー（blur/empty）

```tsx
// ✅ ローカル画像: import で自動的にデータURL生成
import heroImage from '@/public/images/hero.jpg';

<Image
  src={heroImage}
  alt="ヒーロー"
  placeholder="blur"   // ← import した場合は自動でblurDataURL生成
  priority
/>

// ✅ 外部画像: blurDataURL を手動指定（Base64 の低解像度画像）
<Image
  src="https://example.com/photo.jpg"
  alt="写真"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." // ← 低解像度版
/>

// ✅ 画像読み込みまで空のスペースを確保（CLS防止）
<Image
  src={dynamicUrl}
  alt="動的画像"
  width={400}
  height={300}
  placeholder="empty"  // ← デフォルト: 読み込み中は透明
/>
```

---

## 7. よくある実装パターン

### ユーザーアバター

```tsx
// src/components/common/UserAvatar.tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
};

export function UserAvatar({ src, name, size = 40, className }: UserAvatarProps) {
  if (!src) {
    // フォールバック: イニシャル表示
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label={name}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
    />
  );
}
```

### カード内のサムネイル（fill モード）

```tsx
// src/components/features/items/ItemCard.tsx
import Image from 'next/image';

type ItemCardProps = {
  title: string;
  thumbnailUrl: string;
};

export function ItemCard({ title, thumbnailUrl }: ItemCardProps) {
  return (
    <article className="rounded-lg overflow-hidden border">
      {/* ✅ fill + relative親要素のパターン */}
      <div className="relative aspect-video">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
    </article>
  );
}
```

### OGP / ソーシャルカード用画像

```tsx
// src/app/og/route.tsx（ImageResponse を使う場合は別途）
// 通常の画像表示:
<Image
  src="/images/og-default.png"
  alt="OGP画像"
  width={1200}
  height={630}
  priority   // ← ATF表示のためpriority付与
  className="w-full h-auto"
  sizes="(max-width: 1200px) 100vw, 1200px"
/>
```

---

## 8. 禁止パターン

```tsx
// ❌ <img> タグの直接使用（Lint で検出される）
<img src="/images/hero.jpg" alt="ヒーロー" />

// ❌ fill + width/height の併用（fill は親要素がサイズ決定）
<div className="relative">
  <Image src="..." alt="..." fill width={800} height={600} /> {/* ❌ */}
</div>

// ❌ fill を使うのに親要素の position が static
<div className="w-full h-64">          {/* ← position: static がデフォルト */}
  <Image src="..." alt="..." fill />    {/* ❌ 正しく表示されない */}
</div>
// → 親要素に relative / absolute / fixed を付けること

// ❌ すべての画像に priority を設定
<Image src="..." alt="..." priority />  {/* フッターのロゴなど不要な場合に設定 ❌ */}

// ❌ 外部画像で remotePatterns 未設定のまま本番デプロイ
// → next.config.ts の remotePatterns に許可ホストを追加すること

// ❌ alt 属性の省略または空文字（装飾目的でない限り意味のある alt が必要）
<Image src="..." alt="" />             {/* ❌ スクリーンリーダーに情報なし */}
<Image src="..." alt="image" />        {/* ❌ 意味のない alt */}
```

---

## 9. チェックリスト

```
next/image 実装チェックリスト:
[ ] <img> タグは使用していない（すべて next/image に置き換え済み）
[ ] fill モードを使う場合、親要素に relative/absolute/fixed が付いている
[ ] ATF（ファーストビュー）の最大画像には priority を付与している
[ ] sizes 属性でレスポンシブ表示サイズを正しく記述している
[ ] 外部画像ホストは next.config.ts の remotePatterns に追加されている
[ ] alt 属性に意味のあるテキストを設定している（装飾画像は alt="" + role="presentation"）
[ ] プレースホルダーを設定してCLSを防止している（任意だが推奨）
```

---

## 関連スキル

- `frontend-patterns` — フロントエンド全般のパターン
- `tailwind-v4-shorthands` — TailwindCSS v4 のレイアウトユーティリティ
- `env-management` — 環境変数（外部CDN URLの管理等）
