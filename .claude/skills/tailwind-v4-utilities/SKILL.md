---
name: tailwind-v4-utilities
description: |
  TailwindCSS v4.2+ のショートハンドユーティリティとテキストユーティリティを統合したスキル。
  w-N h-N → size-N 等の等価な省略形への統一と、text-balance / text-pretty / text-wrap
  の適切な適用ルールを提供する。

  トリガー例:
  - 「w-4 h-4」「w-8 h-8」「size-N」のような同値パターン
  - 「text-balance」「text-pretty」「text-wrap」
  - 「h1」「h2」「見出し」「段落」「テキスト折り返し」
  - <h1 className= を書こうとしたとき
  - lucide-react アイコンにサイズクラスを設定するとき

globs:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# TailwindCSS v4 ユーティリティ統合スキル

## このスキルの目的

- TailwindCSS v4.2+ で追加されたショートハンドユーティリティを一貫して適用する
- `w-N h-N` のような同値ペアを `size-N` に統一してクラス名を短縮する
- `text-balance` / `text-pretty` を適切な要素に適用してタイポグラフィ品質を向上させる
- ショートハンド・テキストユーティリティが適用**できない**ケースを明確にして誤用を防ぐ

---

## ショートハンド変換一覧

### size-N（w-N と h-N が同値の場合のみ）

```tsx
// ✅ 変換後: size-N を使う
<div className="size-4" />           // w-4 h-4 → size-4
<div className="size-8" />           // w-8 h-8 → size-8
<div className="size-full" />        // w-full h-full → size-full
<div className="size-screen" />      // w-screen h-screen → size-screen
<div className="size-[32px]" />      // w-[32px] h-[32px] → size-[32px]

// ❌ 変換しない: w と h が異なる場合
<div className="w-16 h-4" />         // 幅 ≠ 高さ → そのまま
<div className="w-full h-screen" />  // 異なる → そのまま
```

### p-N（px-N と py-N が同値の場合のみ）

```tsx
// ✅ 変換後: p-N を使う
<div className="p-4" />              // px-4 py-4 → p-4
<div className="p-2" />              // px-2 py-2 → p-2

// ❌ 変換しない: px と py が異なる場合
<div className="px-4 py-2" />        // 異なる → そのまま
```

### m-N（mx-N と my-N が同値の場合のみ、mx-auto は除外）

```tsx
// ✅ 変換後: m-N を使う
<div className="m-4" />              // mx-4 my-4 → m-4

// ❌ 変換しない: mx-auto は特殊用途
<div className="mx-auto" />          // センタリング用 → そのまま（my-auto とのペアでも変換しない）
<div className="mx-4 my-2" />        // 異なる → そのまま
```

### gap-N（gap-x-N と gap-y-N が同値の場合のみ）

```tsx
// ✅ 変換後: gap-N を使う
<div className="gap-4" />            // gap-x-4 gap-y-4 → gap-4
<div className="gap-2" />            // gap-x-2 gap-y-2 → gap-2

// ❌ 変換しない: 異なる場合
<div className="gap-x-4 gap-y-2" />  // 異なる → そのまま
```

### その他のショートハンド

| 変換前 | 変換後 | 条件 |
|---|---|---|
| `overflow-x-hidden overflow-y-hidden` | `overflow-hidden` | 同値のみ |
| `inset-x-0 inset-y-0` | `inset-0` | 同値のみ |
| `border-x-N border-y-N` | `border-N` | 同値のみ |
| `rounded-tl-N rounded-tr-N rounded-bl-N rounded-br-N` | `rounded-N` | 全角が同値のみ |

---

## lucide-react アイコンへの適用

アイコンは `w-N h-N` が常に同値になるため、`size-N` で統一する。

```tsx
import { Search, X, ChevronDown } from 'lucide-react';

// ✅ 正しい: size-N を使う
<Search className="size-4" />
<X className="size-5" />
<ChevronDown className="size-6" />

// ❌ 禁止: w-N h-N を個別指定
<Search className="w-4 h-4" />
<X className="w-5 h-5" />
```

ただし、`icon-consistency` スキルも参照すること（lucide-react の統一ルール全般）。

---

## ショートハンド判断フロー

```
w-N と h-N のクラスがある？
  → 同じ値（N が一致）? → size-N に変換
  → 異なる値?           → 変換しない

px-N と py-N のクラスがある？
  → 同じ値で mx-auto でない? → p-N / m-N に変換
  → 異なる、または mx-auto?  → 変換しない
```

---

## 変換が不要なケース（例外）

- `mx-auto`: センタリング目的で `my-auto` と組み合わせることはまれ。`mx-auto` 単独は変換禁止
- レスポンシブ修飾子がある場合: `sm:w-4 sm:h-4` は `sm:size-4` に変換可。ただし修飾子が異なる場合は変換しない
- アニメーションのみに使う一時的な値（`transition-[width]` 等と組み合わせている場合）

---

## テキストユーティリティ一覧

| ユーティリティ | CSSプロパティ | 効果 | 適用対象 |
|---|---|---|---|
| `text-balance` | `text-wrap: balance` | 行の長さを均等化（読みやすい見出し） | h1, h2, h3, h4 |
| `text-pretty` | `text-wrap: pretty` | 孤立語（orphan）を防止（本文向き） | p, 長い説明文 |
| `text-wrap` | `text-wrap: wrap` | 標準の折り返し（デフォルト） | 通常は明示不要 |

---

## 見出し要素 → text-balance

```tsx
{/* h1: ページタイトル */}
<h1 className='text-3xl font-bold tracking-tight text-balance'>
  ユーザー管理
</h1>

{/* h2: セクションタイトル */}
<h2 className='text-xl font-semibold text-balance'>
  アカウント設定
</h2>

{/* h3: サブセクション（静的コンテンツ限定） */}
<h3 className='text-lg font-medium text-balance'>
  プロフィール情報
</h3>

{/* CardTitle 等の見出し系コンポーネントにも */}
<CardTitle className='text-balance'>カード見出し</CardTitle>
```

---

## Dialog / AlertDialog タイトルへの適用

shadcn/ui の `DialogTitle` / `AlertDialogTitle` コンポーネントにも `text-balance` を適用する。

```tsx
// ✅ 正しい
<DialogTitle className={cn('text-lg font-semibold leading-none text-balance', className)}>

// ❌ 不足
<DialogTitle className={cn('text-lg font-semibold leading-none', className)}>
```

### 検出コマンド

```bash
# text-balance が不足している heading を検出
grep -rn 'text-lg font-semibold\|text-lg font-bold' src/ --include='*.tsx' | grep -v text-balance
```

---

## 説明文・段落 → text-pretty

```tsx
{/* 説明文 */}
<p className='text-sm text-pretty text-[var(--text-muted)]'>
  このページではユーザーのアカウント情報を管理します。
  変更を保存するには保存ボタンをクリックしてください。
</p>

{/* フォームの説明 */}
<p className='text-xs text-pretty text-muted-foreground'>
  パスワードは8文字以上で、大文字・小文字・数字を含めてください。
</p>

{/* エラーページの説明文 */}
<p className='text-sm text-pretty'>
  予期しないエラーが発生しました。しばらく時間をおいてから再度お試しください。
</p>
```

### error.tsx での活用例

```tsx
<h1 className='text-2xl font-bold text-balance'>
  エラーが発生しました
</h1>
<p className='text-sm text-pretty text-muted-foreground mt-2'>
  予期しないエラーが発生しました。
  問題が続く場合はサポートにお問い合わせください。
</p>
```

---

## テキストユーティリティを適用しない場合

| ケース | 理由 |
|---|---|
| Badge / Button / Label 内テキスト | 短いテキストには効果がない（`balance` は複数行が前提） |
| 動的なユーザー名（一覧の h3 等） | 長さが不定で `balance` が逆効果になりうる |
| テーブルのセル | カラム幅が固定されており効果がない |
| input / textarea のプレースホルダー | フォーム要素への適用は不適切 |
| toast / sonner メッセージ | 短い通知テキストには不要 |
| アニメーション中のテキスト | 計算コストがかかる |

```tsx
{/* ❌ 適用しない: Badge は短いテキスト */}
<Badge className='text-balance'>管理者</Badge>

{/* ❌ 適用しない: 動的なユーザー名 */}
<h3 className='text-balance'>{user.name}</h3>  // ユーザー名は可変長

{/* ✅ 適用しない: 短い静的テキストなら何も付けない */}
<span className='text-sm font-medium'>名前</span>
```

---

## ブラウザサポート

| ユーティリティ | Chrome | Firefox | Safari |
|---|---|---|---|
| `text-balance` | 114+ | 121+ | 17.5+ |
| `text-pretty` | 117+ | 未対応 | 未対応 |

**フォールバック**: サポート外ブラウザでは `text-wrap: wrap`（デフォルト）にフォールバックされる。視覚的な差異は限定的なので安全に使用できる。

---

## テキスト判断フロー

```
要素が h1/h2/h3/h4 か？
  → 静的テキスト？ → text-balance を適用
  → 動的テキスト（ユーザー入力等）？ → 慎重に判断（適用しない方が安全）

要素が p か？
  → 2行以上になりうる長い説明文？ → text-pretty を適用
  → 1行で収まる短い文？ → 不要

Badge / Button / Label か？ → 適用しない
```

---

## チェックリスト

### ショートハンド

- [ ] アイコンに `w-N h-N` でなく `size-N` を使用している
- [ ] 同値の `w-N h-N` を `size-N` に変換している
- [ ] 同値の `px-N py-N` を `p-N` に変換している（`mx-auto` は除外）
- [ ] 同値の `gap-x-N gap-y-N` を `gap-N` に変換している
- [ ] 異なる値のペアは変換していない（`w-16 h-4` はそのまま）

### テキストユーティリティ

- [ ] h1/h2 要素に `text-balance` を適用しているか
- [ ] 長い説明文の p 要素に `text-pretty` を適用しているか
- [ ] Badge / Button / Label には適用していないか
- [ ] 動的コンテンツの見出しには慎重に判断したか（ユーザー名等）
- [ ] フォーム要素（input/textarea）のラベルやプレースホルダーには適用していないか

---

## 関連スキル

- `frontend-patterns` — フロントエンド実装パターン全般
- `icon-consistency` — lucide-react アイコンの統一ルール
- `nextjs-error-boundary` — error.tsx での実践的な使用例
