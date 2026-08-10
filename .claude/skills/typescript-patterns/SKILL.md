---
name: typescript-patterns
description: |
  TypeScript 6 の実装パターンとベストプラクティスを提供するスキル。
  tsconfig 構成、型エラー対応、TSyringe デコレーター、型安全パターン全般を支援。
  TS6 の主な特徴、isolatedModules、moduleResolution: "bundler" の挙動も解説。

  トリガー例:
  - 「TypeScript」「TypeScript 6」「TS6」「tsconfig」
  - 「型エラー」「tsc エラー」「型安全」「型定義」
  - 「デコレーター」「TSyringe」「DI」「experimentalDecorators」
  - 「isolatedModules」「moduleResolution」「bundler」
  - 「TypeScript 5 から移行」「TypeScript breaking changes」
  - 「esModuleInterop」「allowSyntheticDefaultImports」
---

# TypeScript 6 実装パターンスキル

TypeScript 6 を使ったこのプロジェクトの実装パターンと設定ガイド。

---

## 概要

TypeScript 6.0 は **JavaScript で書かれた最後のリリース**（TS 7 以降は Go で書き直し予定）。
主に既存の暗黙的な挙動が明示的になり、古い設定が削除される。

**このプロジェクトの tsconfig.json は TS6 互換済みのため、通常変更不要。**
エラーが発生した場合は下記を参照すること。

---

## このプロジェクトの tsconfig 構成

このプロジェクトの `tsconfig.json` は TS6 互換設定済み:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",  // Next.js + Turbopack 推奨
    "isolatedModules": true,         // Next.js 必須（各ファイルを独立トランスパイル）
    "strict": true,                  // TS6 ではデフォルト true
    "experimentalDecorators": true,  // TSyringe 必須
    "emitDecoratorMetadata": true,   // TSyringe 必須（reflect-metadata 連携）
    "paths": {
      "@/*": ["./src/*"]
    }
    // baseUrl: "." は非推奨（TS6 で警告）→ paths のみ使用
  }
}
```

---

## TSyringe + experimentalDecorators パターン

TSyringe が使用するデコレーターは TS6 でも引き続きサポート。
以下のオプションは **TS6 でも必須**:

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

```typescript
// OK: TS6 + TSyringe でのデコレーターパターン
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}
}
```

---

## isolatedModules: true の意味と制約

`isolatedModules: true` は Next.js が各ファイルを独立してトランスパイルするために必須。
以下の制約がある:

### 型のみのエクスポートには `export type` を使う

```typescript
// NG: 実行時に存在しない型をそのままエクスポート（isolatedModules でエラー）
export { SomeType };

// OK: 型エクスポートを明示
export type { SomeType };
```

### 再エクスポートも型は `export type` で

```typescript
// NG
export { User } from '@/layers/domain/entities/User'; // User が型のみの場合エラー

// OK
export type { User } from '@/layers/domain/entities/User';
```

### `const enum` は使用禁止

```typescript
// NG: isolatedModules と互換しない
const enum Direction { Up, Down }

// OK: 通常の enum または as const オブジェクト
enum Direction { Up = 'UP', Down = 'DOWN' }
// または
const Direction = { Up: 'UP', Down: 'DOWN' } as const;
```

---

## moduleResolution: "bundler" の特徴

`"bundler"` は Next.js + Turbopack 環境での推奨設定:

- `exports` フィールド（package.json）を優先解決する
- ファイル拡張子の省略が可能（`.js`, `.ts` 等）
- `"node16"` や `"nodenext"` と異なり、`.js` 拡張子での import を強制しない
- `"classic"` は TS6 で削除されたため使用不可

```typescript
// OK: 拡張子なしで import（bundler モードでは許容）
import { User } from '@/layers/domain/entities/User';
```

---

## TS6 の主な特徴まとめ

| 項目 | TS5 | TS6 |
|------|-----|-----|
| `esModuleInterop` | 明示指定が必要 | 常時有効（削除可） |
| `allowSyntheticDefaultImports` | 明示指定が必要 | 常時有効（削除可） |
| `strict` | デフォルト false | デフォルト true |
| `moduleResolution: "classic"` | 使用可 | **削除** |
| `baseUrl` | 使用可 | **非推奨（警告）** |
| JS 実装 | JS で実装 | **最後の JS バージョン** |
| TS7 以降 | - | Go で書き直し予定 |

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `'classic' is not a valid value for 'moduleResolution'` | `moduleResolution: "classic"` | `"bundler"` に変更 |
| `Option 'baseUrl' is deprecated` | `baseUrl` を使用中 | `paths` に移行して `baseUrl` を削除 |
| デコレーターが動作しない | `experimentalDecorators` が未設定 | tsconfig に追加 |
| `Re-exporting a type when the '--isolatedModules' flag is provided` | 型の再エクスポートに `export` を使用 | `export type` に変更 |
| `Cannot use 'const enum' with 'isolatedModules'` | `const enum` の使用 | 通常の `enum` または `as const` に変更 |

---

## 参考: TS5 からの移行

TS5 から TS6 へ移行する場合の手順:

### 1. 自動移行ツールの実行

```bash
npx @andrewbranch/ts5to6 .
```

このツールは以下を自動処理:
- 非推奨オプションの削除・置換
- `moduleResolution` の更新
- `strict` の明示指定追加

### 2. 移行チェックリスト

- [ ] `moduleResolution` が `"classic"` でないことを確認
- [ ] `baseUrl` を `paths` に移行（非推奨警告の解消）
- [ ] `experimentalDecorators: true` と `emitDecoratorMetadata: true` が残っていること（TSyringe 必須）
- [ ] `export type` が適切に使われていること（`isolatedModules` 制約）
- [ ] `const enum` を使っている箇所を確認・置換
- [ ] `npx @andrewbranch/ts5to6 .` で自動チェック実行
- [ ] `pnpm check` でエラーがないことを確認

---

## satisfies T as const パターン

`as const` のみのオブジェクトに `satisfies T` を組み合わせることで、型安全性を向上できる。
`as const` だけでは型制約がないため、誤ったキーや値型を持つオブジェクトをコンパイル時に検出できない。

### 使い分け表

| パターン | 使いどころ |
|---------|-----------|
| `as const` のみ | 単純な文字列・数値定数（型制約が不要） |
| `satisfies T as const` | 設定オブジェクト・キーに型制約を持たせたい場合 |
| `Record<string, V>` + satisfies | Union型キー保証が必要な場合 |

### コード例1: interface 制約

```typescript
interface ValidationConfig {
  MIN_LENGTH: number;
  MAX_LENGTH: number;
  PATTERN: string;
}

// ✅ satisfies で型制約を保ちつつ、as const でリテラル型を保持
const PASSWORD_VALIDATION = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  PATTERN: '^[a-zA-Z0-9!@#$%]+$',
} as const satisfies ValidationConfig;

// PASSWORD_VALIDATION.MIN_LENGTH は 8（リテラル型）として推論される
```

### コード例2: Record 制約

```typescript
// ✅ Record<string, number> の satisfies でキーが文字列・値が数値であることを保証
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const satisfies Record<string, number>;

// HTTP_STATUS.OK は 200（リテラル型）として推論される
```

### コード例3: テンプレートリテラル制約

```typescript
// ✅ テンプレートリテラル型で値の形式を強制
const SPACING = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const satisfies Record<string, `${number}px`>;

// ❌ 以下はコンパイルエラー（テンプレートリテラル制約違反）
// const SPACING_BAD = {
//   sm: 'small', // '${number}px' を満たさない
// } as const satisfies Record<string, `${number}px`>;
```

---

## satisfies 演算子の高度なパターン

### as const satisfies の組み合わせ

リテラル型を維持しつつ、型チェックも行う:

```typescript
// ✅ リテラル型を維持 + Record 型でキーの網羅性チェック
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const satisfies Record<string, `${number}px`>;

// typeof breakpoints.sm = '640px'（リテラル型が維持される）
```

### 型の絞り込みと satisfies

```typescript
// Prisma の CreateInput で使用
const userData = {
  name: 'テストユーザー',
  email: 'test@example.com',
  password: 'Test@1234!',
} satisfies Prisma.UserCreateInput;

// userData の型は { name: string; email: string; password: string }
// （Prisma.UserCreateInput の型チェックは通りつつ、推論された具体的な型を維持）
```

---

## `satisfies` vs `as` 判断ツリー

```
型を付けたい
  ↓
値の型をコンパイル時に検証したいだけ？（型推論は保持）
  → Yes → `satisfies T`
  → No  ↓
動的に構築された値で、コンパイラが型を検証できない？
  → Yes → `as T`（最後の手段。コメントで理由を明記）
  → No  → 明示的な型注釈 `const x: T = ...`
```

### 二重型アサーション禁止

```typescript
// ❌ 禁止: 二重アサーション
return value as unknown as TargetType;

// ✅ 代替: 型設計を見直す
return { value: true } satisfies TargetType;
// または適切な型ガードを使用
```

**理由**: `as unknown as T` は型安全性を完全に放棄する。
型設計を見直して根本的に解決すること。

---

## Explicit Resource Management（using キーワード）

TypeScript 5.2+ で利用可能な `using` / `await using` キーワードによるリソースの自動解放パターン。
TC39 Stage 3 提案（Explicit Resource Management）に基づく。

### 基本パターン

```typescript
// Symbol.dispose を実装したリソース
class DatabaseConnection {
  constructor(private connection: Connection) {}

  query(sql: string) {
    return this.connection.query(sql);
  }

  [Symbol.dispose]() {
    this.connection.close();
    console.log('Connection closed');
  }
}

// using で自動解放
function processData() {
  using conn = new DatabaseConnection(getConnection());
  // conn を使用...
  // スコープ終了時に自動的に conn[Symbol.dispose]() が呼ばれる
}
```

### 非同期パターン（await using）

```typescript
class AsyncResource {
  async [Symbol.asyncDispose]() {
    await this.cleanup();
  }
}

async function process() {
  await using resource = new AsyncResource();
  // resource を使用...
  // スコープ終了時に await resource[Symbol.asyncDispose]() が呼ばれる
}
```

### このプロジェクトでの適用場面

- Prisma のトランザクション管理（将来的に `using tx = await prisma.$transaction(...)` パターン）
- テストでの一時リソース管理（テスト終了時の自動クリーンアップ）
- ファイルハンドルやストリームの管理

**注意**: 現時点では `tsconfig.json` の `target: "ES2022"` + `lib: ["esnext"]` で利用可能。
ランタイムポリフィル不要（V8 / Node.js 20+ でネイティブサポート）。

---

## NoInfer<T> ユーティリティ型

TypeScript 5.4+ の `NoInfer<T>` は、型推論のブロッカーとして機能する。
特定の型パラメータ位置からの推論を防ぎ、別の位置から推論させたい場合に使用。

```typescript
// ❌ NoInfer なし: defaultValue からも T が推論される
function getOrDefault<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

getOrDefault('hello', 42); // T = string | number（意図しない）

// ✅ NoInfer あり: value からのみ T が推論される
function getOrDefault<T>(value: T | undefined, defaultValue: NoInfer<T>): T {
  return value ?? defaultValue;
}

getOrDefault('hello', 42); // ❌ エラー: number は string に割り当て不可
```

### DI Token の型安全性向上

```typescript
// resolve() の型パラメータ推論を token のみに限定
function resolve<K extends keyof ServiceTypeMap>(
  token: K,
  fallback?: NoInfer<ServiceTypeMap[K]>,
): ServiceTypeMap[K] {
  return container.resolve(token) ?? fallback;
}
```
