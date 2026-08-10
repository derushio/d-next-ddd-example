---
name: dark-mode-oklch
description: |
  OKLCH色空間変数を使用したダークモード実装パターンを提供するスキル。
  現状は意図的にライト/ダーク同一表示を維持。
  将来の分離手順（.dark CSSブロック復活、data-theme属性、OKLCH L値反転）を文書化。

  トリガー例:
  - 「ダークモード」「dark mode」「テーマ切り替え」「data-theme」
  - 「.dark」「prefers-color-scheme」「OKLCH ダーク」
  - globals.css のテーマ変数編集時
  - テーマ切り替えボタン実装時
---

# Dark Mode OKLCH Skill

OKLCH 色空間変数を使ったダークモード設計方針と将来の分離手順を解説します。

---

## 1. 現状の設計判断

**現在はライトモード = ダークモードの同一表示が意図的に維持されています。**

`src/app/globals.css` では `:root` ブロックのみで OKLCH 変数が定義されており、
`.dark` ブロックは存在しません。これはデザインの優先度・実装コストのトレードオフによる設計判断です。

```css
/* src/app/globals.css — 現状 */
:root {
  --aurora-primary-start: oklch(0.606 0.219 292.7); /* violet-500 */
  --aurora-primary-mid: oklch(0.656 0.212 354.3);   /* pink-500 */
  /* ... */

  /* shadcn/ui の意味的色変数 */
  --background: oklch(1 0 0);      /* white */
  --foreground: oklch(0.145 0 0);  /* near-black */
  /* ... */
}

/* .dark ブロックは現時点では存在しない */
```

---

## 2. OKLCH 色空間の基礎

OKLCH は `L（明度）C（彩度）H（色相）` の3軸で色を定義する知覚均一な色空間。

```
oklch(L C H)
  L: 0.0（黒）〜 1.0（白）
  C: 0.0（無彩色）〜 0.4（高彩度）
  H: 0°〜 360°（色相環）
```

### ダーク変換の原理

ダークモードへの変換は **L値を反転**し、C・H を維持するのが基本:

```css
/* ライトモード */
--background: oklch(1 0 0);       /* L=1.0（白） */
--foreground: oklch(0.145 0 0);   /* L=0.145（ほぼ黒） */

/* ダークモード（L値を反転: 1 - L） */
--background: oklch(0.145 0 0);   /* L=0.145（ほぼ黒） */
--foreground: oklch(0.9 0 0);     /* L=0.9（明るいグレー）*/
```

グラデーション変数は C・H を維持したまま L を調整:

```css
/* ライトモードの primary */
--aurora-primary-start: oklch(0.606 0.219 292.7);

/* ダークモードでは少し明るく */
--aurora-primary-start: oklch(0.75 0.219 292.7); /* L を上げる */
```

---

## 3. 将来のダークモード分離手順

以下は **将来的にダークモードを実装する際の手順** です。現時点では実装不要です。

### Step 1: `.dark` CSS ブロックを追加

```css
/* src/app/globals.css */
:root {
  /* 既存のライトモード変数 */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... */
}

/* ダークモード変数（.dark クラス or [data-theme="dark"] が付与された場合） */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.9 0 0);
  --card: oklch(0.17 0 0);
  --card-foreground: oklch(0.9 0 0);
  --primary: oklch(0.75 0.219 292.7);
  /* ... OKLCH L値を反転させた変数 */
}
```

### Step 2: TailwindCSS v4 のセレクタ戦略設定

TailwindCSS v4 では `@custom-variant dark` でダークモードの検出方法を設定する:

```css
/* src/app/globals.css */

/* 戦略1: .dark クラスベース（推奨 — JavaScript で制御可能） */
@custom-variant dark (&:where(.dark, .dark *));

/* 戦略2: data-theme 属性ベース */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* 戦略3: メディアクエリベース（OS 設定に従う） */
@custom-variant dark (@media (prefers-color-scheme: dark));
```

### Step 3: ThemeToggle コンポーネント

```tsx
// src/components/common/ThemeToggle.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="cursor-pointer"
      aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </Button>
  );
}
```

### Step 4: useTheme フック（localStorage 永続化）

```typescript
// src/hooks/useTheme.ts
'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // localStorage から復元
    const saved = localStorage.getItem('theme') as Theme | null;
    const initial = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('theme', next);
  };

  return { theme, toggleTheme };
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
```

### Step 5: FOUC 防止（Flash of Unstyled Content）

初回ロード時にテーマが適用される前に一瞬ライトモードが表示される問題（FOUC）を防ぐため、
`layout.tsx` の `<head>` にインラインスクリプトを追加する:

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* FOUC防止: ページロード前にテーマを適用 */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC防止のため必須
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 4. OKLCH 変数設計のベストプラクティス

### shadcn/ui 変数との整合性

shadcn/ui は独自の意味的 CSS 変数（`--background`, `--foreground`, `--primary` 等）を定義している。
カスタム変数は可能な限り shadcn/ui 変数のエイリアスとして定義し、二重管理を避ける:

```css
/* ✅ 推奨: shadcn/ui 変数のエイリアスとして定義 */
--error: var(--destructive);  /* shadcn/ui --destructive を参照 */

/* ❌ 避けるべき: shadcn/ui と同じ値を独自変数で重複定義 */
--error: oklch(0.636 0.208 25.38);  /* --destructive と同じ値の独自定義 */
```

### グラデーション変数命名規則

グラデーション変数は意味・方向・色の変化が分かる名前にする:

```css
/* 命名パターン: --<意味>-<対象>-<位置> */
--aurora-primary-start: oklch(...);  /* グラデーション開始色 */
--aurora-primary-mid: oklch(...);    /* グラデーション中間色 */
--aurora-primary-end: oklch(...);    /* グラデーション終了色 */
--aurora-primary-light: oklch(...);  /* 薄い背景色（アイコン背景等） */
```

---

## 5. チェックリスト

ダークモードに関する実装時:

- [ ] 現状の設計判断（ライト=ダーク同一）を理解した上で実装している
- [ ] 新しい CSS 変数を追加する場合、shadcn/ui 変数のエイリアスとして定義できないか検討した
- [ ] TailwindCSS v4 の `@custom-variant dark` 戦略を決定した（`.dark` クラス推奨）
- [ ] ThemeToggle は `lucide-react` の `Sun`/`Moon` アイコンを使用している
- [ ] FOUC 防止のインラインスクリプトを `layout.tsx` に追加した
- [ ] `dangerouslySetInnerHTML` 使用箇所に `biome-ignore` コメントを付与した（FOUC防止は例外）
- [ ] OKLCH L値反転でダーク変換していること（C・H は基本維持）

---

## 関連スキル

- `frontend-patterns` — Next.js App Router + shadcn/ui の UI 実装パターン全般
- `tailwind-v4-shorthands` — TailwindCSS v4.2+ のショートハンドユーティリティ
- `icon-consistency` — lucide-react アイコン使用ルール（Sun/Moon アイコン等）
