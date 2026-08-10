---
name: ui-performance-patterns
description: |
  UIパフォーマンス最適化パターン。描画・アニメーション・スクロールパフォーマンスのベストプラクティスを自動適用する。
  ホバー時やスクロール時の描画パフォーマンス、CSS transition/animation、GPU合成レイヤー最適化に関連するコンテキストで発動せよ。

  トリガー例:
  - `transition-all` を書こうとしたとき
  - `transition-shadow` / `hover:shadow-` を書こうとしたとき
  - `backdrop-blur-lg` 以上を fixed/sticky 要素に書こうとしたとき
  - `blur-3xl` / `blur-2xl` 装飾要素を追加するとき
  - `will-change-auto` を書こうとしたとき
  - 大量カード・リストを実装するとき（contain / content-visibility）
  - WQHD / 4K 対応レイアウトを設計するとき
  - ライトボックス / モーダルを実装するとき

globs:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/**/*.css"
---

# UI パフォーマンスパターン

## このスキルの目的

- `transition-all` / `transition-shadow` 等の重い CSS アニメーションを排除する
- GPU 合成レイヤーを適切に活用してスクロール・ホバーパフォーマンスを向上させる
- WQHD / 4K ディスプレイでも快適に動作するレイアウトを設計する
- `contain` / `content-visibility` で大量要素の描画コストを削減する

---

## CSS Transition ルール

### transition-all 禁止

`transition-all` は全 CSS プロパティをアニメーション対象にするため**使用禁止**。
変化するプロパティのみ明示的に指定すること。

| 用途 | 使うクラス |
|------|-----------|
| 背景色・テキスト色 | `transition-colors` |
| 変形のみ | `transition-transform` |
| 変形 + 透明度 | `transition-[transform,opacity]` |
| 複数指定 | `transition-[transform,colors,opacity]` |

### box-shadow transition 禁止

`box-shadow` の補間は GPU 合成外で非常に重い。

```tsx
// ❌ 禁止
<div className="hover:shadow-lg transition-shadow">
<div className="hover:shadow-xl transition-[box-shadow,transform]">

// ✅ 推奨: ring + transform
<div className="hover:ring-1 hover:ring-primary/20 hover:scale-[1.01] transition-[transform,opacity]">
```

### ホバーエフェクトの統一パターン

```tsx
// カード・リストアイテムの標準ホバー
className="... transition-[transform,opacity] hover:ring-1 hover:ring-primary/20 hover:scale-[1.01]"

// 微細なホバー（サムネイルなど）
className="... transition-[transform,opacity] hover:opacity-90 hover:scale-[1.02]"
```

---

## GPU 合成レイヤー最適化

### backdrop-filter の使用制限

| 要素種別 | 許可 | 禁止 |
|----------|------|------|
| fixed / sticky ヘッダー | `backdrop-blur-sm` + `bg-background/95` | `backdrop-blur-lg` 以上 |
| モーダル背景 | `bg-black/90`（ソリッド） | `backdrop-blur-md` 以上 |
| 通常カード | 使用しない | - |

スクロール時に `backdrop-blur-lg` 以上は GPU 負荷が極めて高いため fixed/sticky では禁止。

```tsx
// ✅ ヘッダーの推奨パターン
<header className="sticky top-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-sm">

// ❌ 禁止
<header className="sticky top-0 backdrop-blur-lg bg-background/60">
```

### will-change の適切な使用

```tsx
// ✅ 推奨: アニメーションするプロパティのみ
<div className="will-change-transform">  // transform アニメーション前
<div className="will-change-[filter]">   // blur 装飾要素

// ❌ 禁止
<div className="will-change-auto">  // デフォルト値と同義
<div className="will-change-transform"> // 静的要素（アニメーションしない）への付与
```

### blur 装飾要素のルール

```tsx
// ✅ blur 装飾には will-change と motion-reduce 対応を追加
<div
  className="
    absolute blur-3xl opacity-20 bg-primary
    will-change-[filter]
    motion-reduce:hidden
  "
/>
```

---

## CSS contain / content-visibility

### perf-contain-paint クラス

カード・リストアイテムなど繰り返し要素に適用してペイント範囲を限定する。

```css
/* globals.css に定義 */
.perf-contain-paint {
  contain: layout paint style;
}
```

```tsx
// ✅ カードコンポーネントに適用
<div className="perf-contain-paint rounded-lg border bg-card ...">
```

### perf-content-auto クラス

大量リストのコンテナに適用してスクロール外要素の描画をスキップする。

```css
/* globals.css に定義 */
.perf-content-auto {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px; /* 推定高さを設定 */
}
```

```tsx
// ✅ 大量リストのコンテナ（50件以上が目安）
<div className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id} className="perf-contain-paint perf-content-auto">
      <ItemCard item={item} />
    </div>
  ))}
</div>
```

---

## WQHD / 4K 対応ルール

### コンテナ幅

```tsx
// ✅ メインコンテナ（WQHD 最大幅）
<div className="max-w-[2560px] mx-auto">

// ✅ パディング体系（画面幅に応じてスケール）
<div className="px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-12 4xl:px-16">

// テキストコンテンツ
<div className="max-w-prose">    // 読みやすい行長
<div className="max-w-4xl">     // 中幅コンテンツ
```

### グリッドカラム拡張

```tsx
// ✅ カードグリッド（WQHD〜4K まで拡張）
<div className="
  grid grid-cols-2
  sm:grid-cols-3
  md:grid-cols-4
  lg:grid-cols-5
  xl:grid-cols-6
  2xl:grid-cols-7
  3xl:grid-cols-8
  4xl:grid-cols-9
  gap-2 sm:gap-3 lg:gap-4
">
```

### tailwind.config での 3xl / 4xl ブレークポイント定義

```ts
// tailwind.config.ts
screens: {
  '3xl': '1920px',  // WQHD
  '4xl': '2560px',  // 4K
}
```

---

## ライトボックス / モーダル

```tsx
// ✅ ライトボックス背景（ソリッド推奨）
<div className="fixed inset-0 bg-black/90 z-50">

// ❌ 禁止（重い）
<div className="fixed inset-0 backdrop-blur-md bg-black/50 z-50">
```

### 画像サイズの使い分け

```tsx
// ✅ サムネイルグリッド
<Image src={src} width={400} height={225} sizes="(max-width: 768px) 50vw, 25vw" />

// ✅ ライトボックス表示（高解像度）
<Image src={src} width={1920} height={1080} sizes="100vw" priority />
```

---

## パフォーマンス チェックリスト

カード・一覧ページを実装したら以下を確認:

- [ ] `transition-all` を使っていない
- [ ] `transition-shadow` / `hover:shadow-*` の組み合わせがない
- [ ] fixed/sticky 要素で `backdrop-blur-lg` 以上を使っていない
- [ ] `blur-3xl` 装飾に `will-change-[filter]` と `motion-reduce:hidden` がある
- [ ] 大量リスト（50 件以上）に `perf-contain-paint` を適用している
- [ ] WQHD ブレークポイント（`3xl:` / `4xl:`）でグリッドが適切に拡張される
- [ ] モーダル背景に `backdrop-blur` を使っていない
- [ ] 画像に適切な `sizes` 属性が設定されている
