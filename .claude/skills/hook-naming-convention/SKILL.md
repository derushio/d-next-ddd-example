---
name: hook-naming-convention
description: |
  React Hooks の命名規則を強制するスキル。
  src/hooks/ 配下のファイルには React hook を使用する関数のみ配置する。
  React hook を使用しない純粋関数は src/utils/ に配置する。

  トリガー例:
  - src/hooks/ 配下のファイル作成・編集時
  - 「カスタムフック」「useXxx」「hooks ディレクトリ」
  - React hook を使わない関数を hooks/ に作ろうとしたとき
globs:
  - "src/hooks/**/*.ts"
---

# Hook 命名規則

## このスキルの目的

- `src/hooks/` ディレクトリには React hook を使用する関数のみ配置する
- React hook を使わない純粋関数が `src/hooks/` に紛れ込むのを防止する
- ESLint/Biome の rules-of-hooks が誤検知しない配置を維持する

## ルール

### `src/hooks/` に配置する関数

React の hook（`useState`, `useEffect`, `useCallback`, `useTransition`, `useRef` 等）を
1つ以上使用する関数のみ。関数名は `use` プレフィックス必須。

```typescript
// ✅ 正しい: React hook を使用する → src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => { ... }, [value, delay]);
  return debouncedValue;
}
```

### `src/utils/` に配置する関数

React hook を一切使わない純粋なユーティリティ関数。

```typescript
// ✅ 正しい: React hook 不使用 → src/utils/formUtils.ts
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string[] | undefined> | undefined,
): void {
  // react-hook-form の API を使うが、React hook は使わない
  if (!fieldErrors) return;
  for (const [key, value] of Object.entries(fieldErrors)) { ... }
}
```

### 判断基準フローチャート

```
関数は useState/useEffect/useCallback 等の React hook を呼ぶか？
├── はい → src/hooks/useXxx.ts
└── いいえ → src/utils/xxx.ts
```

## アンチパターン

```typescript
// ❌ 禁止: React hook を使わないのに hooks/ に配置
// src/hooks/useServerActionForm.ts  ← 名前が "use" だが hook を使っていない
export function applyFieldErrors(...) { ... }  // 純粋関数

// ✅ 正しい: src/utils/formUtils.ts に配置
```

## 既存ファイルの移動手順

1. `src/hooks/` 内のファイルを確認
2. React hook を使っていない関数を特定
3. `src/utils/` に移動
4. 全インポート元を更新（Grep で `@/hooks/xxx` を検索）
5. 古いファイルを削除

## チェックリスト

- [ ] `src/hooks/` 内の全ファイルが React hook を使用している
- [ ] `use` プレフィックスは React hook を使う関数にのみ使用
- [ ] 純粋関数は `src/utils/` に配置されている

## 関連スキル

- `coding-standards` — 全般的なコーディング規約
- `react19-modern-patterns` — React 19 パターン
