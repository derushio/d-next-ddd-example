---
name: react19-compiler-readiness
description: |
  React Compiler導入準備。手動メモ化（useCallback/useMemo/React.memo）の必要性判断ガイド。
  React Compiler採用後に不要になるメモ化を識別し、コメントで文書化するパターンを提供。

  トリガー例:
  - 「useCallback」「useMemo」「React.memo」「memo(」「メモ化」
  - useCallback(, useMemo(, React.memo(, memo( を書こうとしたとき
  - src/components/, src/hooks/ 配下のTSX/TS編集時
globs:
  - "src/components/**/*.tsx"
  - "src/hooks/**/*.ts"
---

# React Compiler Readiness

## 目的

React Compilerは自動メモ化を提供する。手動メモ化の必要性を判断し、
将来のCompiler導入時にスムーズに移行できるようコメントで文書化する。

## 判断ツリー

```
useCallback / useMemo / React.memo を書こうとしている
  ↓
このメモ化された値/関数は React.memo() でラップされた子コンポーネントに props として渡されるか？
  → Yes → 維持: `// React Compiler: keep — memo'd child dependency`
  → No  ↓
ホットパス（大量リストレンダリング、頻繁な再レンダリング）にあるか？
  → Yes → 維持: `// React Compiler: keep — hot path`
  → No  → 維持するが削除可能マーク: `// React Compiler: removable when adopted`
```

## コメント規約

手動メモ化には必ず以下のプレフィックスコメントを付与:

| コメント | 意味 |
|---------|------|
| `// React Compiler: keep — memo'd child dependency` | memo子への依存。Compiler後も維持推奨 |
| `// React Compiler: keep — hot path` | パフォーマンスクリティカル。Compiler後も計測して判断 |
| `// React Compiler: removable when adopted` | Compiler導入後に削除可能 |

## 禁止パターン

- コメントなしの `useCallback` / `useMemo` 追加（理由の文書化が必須）
- `React.memo()` のネスト（`memo(memo(Component))`）

## 移行計画

React Compiler 導入時:
1. `grep -rn "React Compiler: removable" src/` で対象を検出
2. 該当する `useCallback` / `useMemo` を削除
3. `pnpm check` で動作確認

## チェックリスト

- [ ] 新規 `useCallback` / `useMemo` にコメントプレフィックスを付与したか
- [ ] メモ化の理由（memo'd child / hot path / removable）を正しく判断したか
- [ ] `React.memo()` を使う場合、対応する props の `useCallback` / `useMemo` も確認したか

## 関連スキル

- `react19-modern-patterns` — React 19 モダンパターン全般
- `frontend-patterns` — フロントエンド実装パターン
