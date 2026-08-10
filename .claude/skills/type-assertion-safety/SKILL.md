---
name: type-assertion-safety
description: |
  型エラー解決時の as 型アサーション多用を防ぎ、安全な代替手段を提供するスキル。
  satisfies演算子、型ガード、オーバーロード、ジェネリクスによる根本解決を強制する。

  トリガー例:
  - 「as unknown as」「型アサーション」「as SomeType」
  - 型エラーを as で解決しようとしたとき
  - src/**/*.ts, src/**/*.tsx 編集時
globs:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# type-assertion-safety

`as` 型アサーションの多用を防ぎ、型安全な代替手段を推奨する。

## なぜ？

`as` はコンパイラの型チェックをバイパスする。実行時に型が異なればバグになるが、コンパイラは検出できない。

## 型エラー解決フローチャート

```
型エラーが出た
  ├→ 1. satisfies で解決できる？ → satisfies を使う
  ├→ 2. 型ガード（typeof, instanceof, in, Array.isArray）で絞れる？ → 型ガードを使う
  ├→ 3. ジェネリクスで型を伝播できる？ → ジェネリクス化する
  ├→ 4. オーバーロードで型を分岐できる？ → オーバーロードを追加する
  └→ 5. 上記全て不可能 → as を使う（コメントで理由を明記）
```

## ❌ 禁止パターン

```typescript
// ❌ 二重アサーション（ほぼ常にバグの温床）
const x = value as unknown as TargetType;

// ❌ any 経由のアサーション
const x = value as any as TargetType;

// ❌ 型ガードで代替可能なアサーション
const id = token.id as string;  // token.id は string | undefined
```

## ✅ 代替パターン

```typescript
// ✅ 型ガード
const id = typeof token.id === 'string' ? token.id : '';

// ✅ Array.isArray ガード
const target = Array.isArray(error.meta?.target) ? error.meta.target as string[] : [];

// ✅ satisfies
const config = { ... } satisfies Config;

// ✅ ジェネリクス
function applyMasking<T extends Record<string, unknown>>(data: T): T { ... }

// ✅ オーバーロード（mapData有無で返却型を分ける）
function convert(result: Result<string, Error>): ActionResult<string>;
function convert<T>(result: Result<string, Error>, map: (v: string) => T): ActionResult<T>;
```

## as が許容されるケース

以下の場合は `as` を使ってよい。ただし必ずコメントで理由を記載:

1. **外部ライブラリの型が不十分**: ライブラリの型定義が `unknown` や `any` を返す場合
2. **Clean Architecture の型境界**: Domain層の抽象インターフェースとInfrastructure層の具象型の変換
3. **globalThis 型拡張**: TypeScriptの制約上 `as unknown as` が唯一の方法

```typescript
// ✅ 理由コメント付きの as
// Clean Architecture: Domain層のITransactionはPrisma型に依存できないためアサーション必須
const client = (transaction as unknown as Prisma.TransactionClient) ?? this.prisma;
```

## チェックリスト

- [ ] `as unknown as` を使っていないか？（ほぼ常にNG）
- [ ] 型ガードで代替できる `as` がないか？
- [ ] ジェネリクスで型を伝播できないか？
- [ ] やむを得ない `as` には理由コメントがあるか？
