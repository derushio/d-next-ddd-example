---
name: react-import-hygiene
description: |
  React コンポーネントでの import パターンを統一するスキル。
  import * as React from 'react' を禁止し、named import + import type 分離を強制。
  React 19 + TypeScript 6 の isolatedModules 環境での正しい書き方を提供。

  トリガー例:
  - 「import React」「import * as React」「React.useState」「React.FC」
  - TSXファイルでReactをimportしようとしたとき
  - src/**/*.tsx 編集時
globs:
  - "src/**/*.tsx"
---

# react-import-hygiene

React の import パターンを統一し、namespace import を禁止する。

## なぜ？

1. **Tree-shaking**: `import * as React` は全てのエクスポートをバンドルに含める可能性がある
2. **明示性**: 使用している API が一目で分かる
3. **TypeScript 6 互換**: `isolatedModules` 環境で型と値を明確に分離する必要がある

## ルール

### ❌ 禁止パターン

```tsx
// ❌ namespace import
import * as React from 'react';
const ctx = React.createContext(null);
const id = React.useId();

// ❌ default import（React 17以降不要）
import React from 'react';

// ❌ React.FC（推奨されない）
const MyComponent: React.FC<Props> = (props) => { ... };
```

### ✅ 正しいパターン

```tsx
// ✅ named import（値）+ inline type（型）
import { createContext, use, useId, useState, type ComponentProps, type ReactNode } from 'react';

// ✅ 型のみの場合は import type
import type { ComponentProps, ReactNode } from 'react';

// ✅ 関数宣言（React.FC不使用）
function MyComponent(props: Props) { ... }
// or
const MyComponent = (props: Props) => { ... };
```

## よく使う named imports チートシート

| 値（named import） | 型（import type / inline type） |
|---|---|
| `useState`, `useEffect`, `useCallback`, `useMemo` | `ComponentProps`, `ReactNode` |
| `createContext`, `use`, `useId` | `Ref`, `RefObject` |
| `Suspense`, `lazy` | `JSX` |
| `startTransition`, `useTransition` | `PropsWithChildren` |
| `useOptimistic`, `useActionState` | `FormEvent` |

## チェックリスト

- [ ] `import * as React` を使っていないか？
- [ ] `import React from 'react'` を使っていないか？
- [ ] `React.xxx` の参照が残っていないか？（直接 named import に）
- [ ] 型は `import type` または inline `type` で分離しているか？
- [ ] `React.FC` を使っていないか？
