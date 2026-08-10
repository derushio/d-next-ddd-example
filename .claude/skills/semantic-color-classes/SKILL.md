---
name: semantic-color-classes
description: |
  TailwindCSS リテラルカラー（text-gray-*, bg-gray-*, text-red-*, text-blue-*）の使用を禁止し、
  shadcn/ui の意味論的クラス（text-muted-foreground, bg-muted, text-destructive 等）への
  置換を強制するスキル。OKLCH ダークモード対応にも必須。

  トリガー例:
  - 「text-gray」「bg-gray」「text-red」「text-blue」「ハードコードカラー」
  - TailwindCSS リテラルカラークラスをTSXに書こうとしたとき
  - src/app/**/*.tsx, src/components/**/*.tsx 編集時
globs:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# semantic-color-classes

TailwindCSS リテラルカラーの使用を禁止し、shadcn/ui 意味論的クラスへの置換を強制する。

## なぜ？

1. **ダークモード対応**: リテラルカラーはOKLCHテーマ変数による自動変換が効かない
2. **一貫性**: 意味論的クラスを使えばテーマ変更が一箇所で完結
3. **保守性**: 「この灰色は text-gray-500 か text-gray-600 か」を考える必要がなくなる

## 禁止パターン → 代替マッピング

| ❌ 禁止 | ✅ 代替 | 用途 |
|---|---|---|
| `text-gray-400/500/600` | `text-muted-foreground` | 補助テキスト |
| `text-gray-700/800/900` | `text-foreground` | 主テキスト |
| `text-gray-300` | `text-muted-foreground/70` | 薄いテキスト |
| `bg-gray-50/100` | `bg-muted` | 薄い背景 |
| `bg-gray-500/40` | `bg-muted/40` | 半透明背景 |
| `text-red-500/600/700/800` | `text-destructive` | エラーテキスト |
| `bg-red-50/100` | `bg-destructive/10` | エラー背景 |
| `border-red-200/300` | `border-destructive/20` | エラーボーダー |
| `text-blue-600` | `text-primary` | リンク/アクション |
| `hover:text-blue-600` | `hover:text-primary` | リンクホバー |
| `bg-blue-500/20` | `bg-primary/20` | プライマリ薄背景 |
| `bg-white/*` | `bg-background/*` | 半透明白背景 |
| `border-gray-100/200` | `border-border` | 標準ボーダー |

## 例外（変換不要）

- **グラデーション内**: `from-violet-50`, `to-cyan-50`, `via-*` 等はデザイン意図
- **ガラスエフェクト**: `bg-white/80` 等のglassmorphism表現
- **ブランドカラー**: `text-violet-*`, `hover:text-violet-*` 等のブランド固有色

## チェックリスト

- [ ] `text-gray-*` を使っていないか？ → `text-foreground` or `text-muted-foreground`
- [ ] `bg-gray-*` を使っていないか？ → `bg-muted`
- [ ] `text-red-*` を使っていないか？ → `text-destructive`
- [ ] `text-blue-*` を使っていないか？ → `text-primary`
- [ ] `bg-white/*` を使っていないか？ → `bg-background/*`
