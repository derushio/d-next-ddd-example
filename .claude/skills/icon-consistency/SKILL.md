---
name: icon-consistency
description: |
  UIアイコン使用の一貫性を強制するスキル。
  lucide-react を唯一のアイコンソースとし、
  インラインSVG、絵文字アイコン、他のアイコンライブラリを禁止する。

  トリガー例:
  - 「アイコン」「SVG」「絵文字」「emoji」「lucide」
  - <svg を書こうとしたとき
  - 絵文字をUIの視覚的インジケータとして使おうとしたとき
  - src/components/, src/app/ 配下のTSX編集時
---

# アイコン一貫性ルール

## このスキルの目的

- 全てのアイコンを `lucide-react` に統一する
- アクセシビリティ（`aria-hidden`）とテーマ対応（`currentColor`）を保証する
- アイコンサイズの一貫性を維持する

## 基本パターン

```tsx
// ✅ 正しい: lucide-react からインポート
import { User, Mail, Pencil, Loader2 } from 'lucide-react';

// インラインアイコン
<User className="inline-block w-4 h-4 mr-1" />
<Mail className="inline-block w-4 h-4 mr-1" />

// スピナー
<Loader2 className="animate-spin w-4 h-4" />
```

## 禁止パターン

```tsx
// ❌ 禁止: インラインSVG
<svg className="animate-spin" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" />
</svg>

// ❌ 禁止: 絵文字をUIアイコンとして使用
<span>👤 ユーザー名</span>
<span>📧 メールアドレス</span>
<span>✏️ 編集</span>

// ❌ 禁止: 他のアイコンライブラリ
import { FaUser } from 'react-icons/fa';
import { MdEmail } from '@mui/icons-material';
```

## よく使うアイコンマッピング

| 用途 | lucide-react |
|------|-------------|
| ユーザー | `<User />` |
| メール | `<Mail />` |
| 編集 | `<Pencil />` |
| 削除 | `<Trash2 />` |
| 検索 | `<Search />` |
| 設定 | `<Settings />` |
| ログイン | `<LogIn />` |
| ログアウト | `<LogOut />` |
| スピナー/ローディング | `<Loader2 className="animate-spin" />` |
| 閉じる | `<X />` |
| メニュー | `<Menu />` |
| ホーム | `<Home />` |
| 警告 | `<AlertTriangle />` |
| 成功 | `<CheckCircle />` |
| エラー | `<XCircle />` |

## 絵文字の適切な使用場所

HTMLコメント内のセクションマーカーは絵文字OK（UIには表示されない）:

```tsx
{/* 🌟 Header Section */}  // ✅ コメント内はOK
```

## サイズ規約

| 場所 | クラス |
|------|-------|
| インラインテキスト横 | `inline-block w-4 h-4` |
| ボタン内 | `w-4 h-4` |
| ヘッダー/タイトル | `w-5 h-5` または `w-6 h-6` |
| ヒーロー/大きな表示 | `w-8 h-8` 以上 |

## チェックリスト

- [ ] `<svg` タグがコンポーネント内に直接書かれていない
- [ ] 絵文字がUIの視覚的要素として使われていない
- [ ] 全アイコンが `lucide-react` からインポートされている
- [ ] アイコンに適切なサイズクラスが設定されている

## 関連スキル

- `frontend-patterns` — フロントエンド実装全般
- `coding-standards` — コーディング規約
