---
name: cursor-pointer-enforcement
description: |
  クリック可能な要素（Button, Link, インタラクティブ要素）には必ず cursor-pointer を明示的に付与するスキル。
  TailwindCSS v4 でもデフォルトで cursor:pointer にならないため、明示が必須。

  トリガー例:
  - Button, Link, a タグ, onClick ハンドラ付き要素を書くとき
  - src/app/**/*.tsx, src/components/**/*.tsx 編集時
globs:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# cursor-pointer-enforcement

クリック可能な全要素に `cursor-pointer` を明示的に付与することを強制する。

## なぜ？

TailwindCSS v4 のプリフライトはインタラクティブ要素に `cursor: pointer` を**自動設定しない**。
`<button>`, `<a>`, `<Link>` 等でもデフォルトは `cursor: default` のまま。
ユーザー体験のため、クリック可能な要素には必ず `cursor-pointer` を付けること。

## ルール

### ✅ 必須: cursor-pointer を付ける要素

- `<Button>` コンポーネント（shadcn/ui）
- `<Link>` コンポーネント（next/link）
- `<a>` タグ
- `onClick` ハンドラを持つ `<div>`, `<span>` 等の非インタラクティブ要素
- `<Card>` の interactive variant

### ❌ 例外: cursor-pointer が不要な要素

- `disabled` 状態の要素 → `disabled:cursor-not-allowed` を使用
- テキスト選択用の要素
- フォーム入力要素（input, textarea）→ テキストカーソルが適切

## パターン

```tsx
// ✅ 正しい
<Button className="cursor-pointer">送信</Button>
<Link href="/users" className="cursor-pointer">ユーザー一覧</Link>
<div onClick={handleClick} className="cursor-pointer">クリック可能な領域</div>

// ✅ disabled 時
<Button className="cursor-pointer disabled:cursor-not-allowed" disabled={isPending}>
  送信
</Button>

// ❌ 間違い: cursor-pointer なし
<Button>送信</Button>
<Link href="/users">ユーザー一覧</Link>
```

## チェックリスト

- [ ] `<Button>` に `cursor-pointer` が付いているか？
- [ ] `<Link>` に `cursor-pointer` が付いているか？
- [ ] `onClick` を持つ非インタラクティブ要素に `cursor-pointer` が付いているか？
- [ ] `disabled` 時は `disabled:cursor-not-allowed` を併用しているか？
