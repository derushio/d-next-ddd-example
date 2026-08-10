---
name: deprecated-import-cleanup
description: |
  @deprecated コメントを含むモジュールの検出と、
  直接 import への書き換えを促すスキル。
  deprecated shim ファイルの使用を禁止し、参照解消後の shim 削除をガイドする。

  トリガー例:
  - @deprecated コメントを含むファイルからの import を書こうとしたとき
  - 「deprecated」「非推奨」「移動されました」
  - import パスの整理・クリーンアップ時
---

# Deprecated Import クリーンアップ

## このスキルの目的

- `@deprecated` マークされた re-export shim からの import を検出・禁止する
- 正しいインポート元への直接 import を促す
- 全参照解消後に shim ファイルを安全に削除するワークフローを提供する

## 検出パターン

以下のパターンを含むファイルは deprecated shim である:

```typescript
/**
 * @deprecated このモジュールは移動されました。
 * 新しいインポートパス: `@/utils/toErrorMeta`
 */
export { toErrorMeta } from '@/utils/toErrorMeta';
```

## 禁止パターン

```typescript
// ❌ 禁止: deprecated shim 経由の import
import { toErrorMeta } from '@/layers/infrastructure/utils/toErrorMeta';

// ✅ 正しい: 移動先への直接 import
import { toErrorMeta } from '@/utils/toErrorMeta';
```

## shim 削除ワークフロー

1. **参照検索**: deprecated shim のパスで Grep し、全参照を洗い出す
2. **参照修正**: 各参照を直接 import に書き換え
3. **参照確認**: 再度 Grep し、参照が 0 件であることを確認
4. **shim 削除**: deprecated ファイルを削除
5. **検証**: `pnpm check` で型チェック・lint が通ることを確認

## 新しい deprecated を作る場合

モジュール移動時に deprecated shim を残す場合は、以下のテンプレートを使用:

```typescript
/**
 * @deprecated このモジュールは移動されました。
 * 新しいインポートパス: `@/new/path`
 *
 * 既存の参照は引き続き動作しますが、新規コードでは直接 import を使用してください。
 */
export { myFunction } from '@/new/path';
```

ただし、shim を残すよりも一括修正で即時削除する方が望ましい。

## チェックリスト

- [ ] `@deprecated` を含むファイルからの import がない
- [ ] 参照のなくなった deprecated shim が削除されている
- [ ] `pnpm check` が通る

## 関連スキル

- `dead-code-detection` — デッドコード検出全般
- `coding-standards` — import ルール
