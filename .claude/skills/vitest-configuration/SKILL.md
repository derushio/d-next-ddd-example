---
name: vitest-configuration
description: |
  vitest.config.ts の設定最適化パターンと projects 設定を統合したスキル。
  clearMocks/restoreMocks の意味・使い分け、projects 設定の継承ルール（Vitest v4）、
  environmentMatchGlobs、server.deps.inline、resolve alias管理、
  setupFiles のベストプラクティス、共有設定の DRY 化テクニックを扱う。

  トリガー例:
  - 「vitest設定」「テスト設定」「vitest.config.ts」
  - 「clearMocks」「restoreMocks」「environmentMatchGlobs」
  - 「vitest projects」「テスト環境分離」「node vs jsdom」
  - vitest.config.ts の追加・変更・編集時

globs:
  - "vitest.config.ts"
  - "vitest.config.*.ts"
---

# Vitest 設定統合スキル

vitest.config.ts の最適な設定・projects 分離・継承ルールを網羅したスキル。

---

## このプロジェクトの実際の vitest.config.ts

```typescript
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    server: {
      deps: {
        // next-auth が `next/server`（拡張子なし）をimportするため、
        // vitestのトランスフォームパイプライン（resolve.alias適用）を通す
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@prisma/generated': path.resolve(
        __dirname,
        './src/layers/infrastructure/persistence/prisma/generated',
      ),
      '@tests': path.resolve(__dirname, './tests'),
      '@/components/ui': path.resolve(__dirname, './src/components/ui'),
      // next-auth v5 が `next/server` (拡張子なし) をimportするが、
      // Next.js 16 では `next/server.js` に変更されたため vitest で解決できない。
      // エイリアスで `next/server` → `next/server.js` にマッピングして解決する。
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
});
```

---

## clearMocks / restoreMocks の意味と使い分け

### clearMocks: true

各テスト後に以下をリセットする:
- モック関数の呼び出し履歴（`.mock.calls`）
- 呼び出し回数（`.mock.instances`）
- 戻り値の記録

**効果**: `beforeEach` で `mockFn.mockClear()` を手動で呼ぶ必要がなくなる。

```typescript
// clearMocks: true の場合、以下が不要になる
beforeEach(() => {
  mockUserRepository.findByEmail.mockClear(); // 不要
  mockUserRepository.save.mockClear();        // 不要
});
```

**注意**: `mockImplementation()` で設定した実装は保持される。呼び出し記録のみリセット。

### restoreMocks: true

各テスト後に `vi.spyOn()` で作成したスパイを元の実装に戻す。

**効果**: `afterEach` での `vi.restoreAllMocks()` 呼び出しが不要になる。

**重大な注意点**: `vi.mock()` によるモジュールモックは `restoreMocks` では復元されない。
`vi.mock()` は `vi.restoreAllMocks()` の対象外であり、テスト間でモジュールモックが持続する。
モジュールモックが必要な場合は `vi.resetModules()` との組み合わせを検討すること。

```typescript
// vi.spyOn → restoreMocks: true で自動復元される
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
// テスト後、console.error は元の実装に戻る

// vi.mock → restoreMocks では復元されない（注意）
vi.mock('@/lib/someModule', () => ({ fn: vi.fn() }));
// このモックはテストファイル全体で持続する
```

### resetMocks との違い

| オプション | 呼び出し履歴 | 実装 | スパイの復元 |
|-----------|------------|------|------------|
| `clearMocks: true` | リセット | 保持 | 保持 |
| `resetMocks: true` | リセット | リセット | 保持 |
| `restoreMocks: true` | リセット | リセット | 復元 |

このプロジェクトでは `clearMocks: true` + `restoreMocks: true` の組み合わせを採用している。

---

## environmentMatchGlobs によるバックエンド/フロントエンドの使い分け

現在の設定では全テストが `jsdom` 環境だが、バックエンドテストには `node` 環境が適切な場合がある。

### environmentMatchGlobs パターン（参考）

```typescript
// vitest.config.ts での設定例
test: {
  environment: 'node', // デフォルトはnode（バックエンド向け）
  environmentMatchGlobs: [
    // フロントエンドコンポーネントのテストはjsdom
    ['tests/unit/components/**', 'jsdom'],
    ['tests/unit/hooks/**', 'jsdom'],
    // バックエンド（UseCase, Repository等）はnode
    ['tests/unit/layers/**', 'node'],
  ],
}
```

### このプロジェクトの現状

UseCase・Repository・Domain等のバックエンドテストが大半であり、
`jsdom` 環境でも問題なく動作しているため、現在は統一設定を採用している。

フロントエンドコンポーネントのテストを追加する際は `environmentMatchGlobs` の導入を検討すること。

---

## server.deps.inline パターン

### なぜ inline が必要か

vitestはデフォルトで `node_modules` のファイルをトランスフォームしない（ESModuleの変換等をスキップ）。
一部のパッケージ（特に `next-auth`, `@auth/core`）は:
1. 拡張子なしのインポート（`next/server`）を使用する
2. ESM/CJS混在構造を持つ
3. vitestのresolve.aliasが適用されるためのトランスフォームが必要

このため `server.deps.inline` でこれらをトランスフォームパイプラインに通す。

```typescript
server: {
  deps: {
    inline: ['next-auth', '@auth/core'],
  },
},
```

### 合わせて必要な resolve.alias

```typescript
resolve: {
  alias: {
    // next-auth v5 が `next/server` をimportするが、
    // Next.js 16 では `next/server.js` に変更されたため
    'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
  },
},
```

### inline が必要なパッケージを見つける方法

テスト実行時に以下のようなエラーが出たら `inline` 追加を検討する:
- `Cannot find module 'xxx'`（拡張子なしインポート失敗）
- `SyntaxError: Cannot use import statement`（ESM変換失敗）
- `The requested module 'xxx' does not provide an export named 'yyy'`

---

## resolve alias 管理ガイドライン

### tsconfig.json と vitest.config.ts の同期

tsconfig.jsonのpaths設定とvitest.config.tsのaliasは必ず同期させること。
片方にしか存在しないエイリアスはビルド時またはテスト時に解決失敗する。

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@tests/*": ["./tests/*"],
      "@prisma/generated": ["./src/layers/infrastructure/persistence/prisma/generated"]
    }
  }
}
```

```typescript
// vitest.config.ts（tsconfig.jsonと対応させる）
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@tests': path.resolve(__dirname, './tests'),
    '@prisma/generated': path.resolve(__dirname, './src/layers/...'),
  },
},
```

### エイリアス追加時のチェックリスト

- [ ] `tsconfig.json` の `paths` に追加
- [ ] `vitest.config.ts` の `resolve.alias` に追加
- [ ] 実体のディレクトリ/ファイルが存在することを確認
- [ ] `pnpm check` でビルドエラーがないことを確認

---

## setupFiles のベストプラクティス

### このプロジェクトの setup.ts の責務

`tests/setup.ts` はグローバルな `beforeEach` / `afterEach` を定義する。

```typescript
// tests/setup.ts の主な責務
import '@testing-library/jest-dom'; // カスタムマッチャー追加（必要な場合）
import { container } from 'tsyringe';

// 全テスト前にDIコンテナをリセット
beforeEach(() => {
  container.reset();
});
```

### setupFiles で行うべきこと

- グローバルなポリフィル設定
- テストフレームワークのマッチャー拡張
- DIコンテナの初期化

### setupFiles で行うべきでないこと

- 特定のテストにしか必要でないモック（各テストファイルで行う）
- テスト固有のデータセットアップ（各テストで行う）
- 副作用のある初期化（テスト間の干渉原因になる）

### setupTestEnvironment との関係

各テストファイルの `describe` ブロック内で `setupTestEnvironment()` を呼ぶことで、
DIコンテナのリセットを各テストスイート単位で保証している。

```typescript
// tests/unit/xxx.test.ts
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

describe('XxxUseCase', () => {
  setupTestEnvironment(); // DIコンテナをリセットする beforeEach を登録
  // ...
});
```

`setup.ts` がグローバルな初期化を担い、`setupTestEnvironment()` が各スイートの分離を保証する二重構造になっている。

---

## アンチパターンと対策

| アンチパターン | 問題 | 対策 |
|--------------|------|------|
| `restoreMocks: true` のみ設定 | vi.mock()モジュールモックは復元されない | vi.mock()はファイルトップレベルに配置し、影響範囲をファイルスコープに限定する |
| tsconfig.jsonとの非同期エイリアス | ビルド成功・テスト失敗の不整合が発生 | エイリアス追加時は必ず両ファイルを同時更新する |
| inline を多用する | テスト実行が遅くなる | 本当に必要なパッケージのみinlineに追加する |
| setupFilesで過剰な初期化 | テスト間の状態汚染 | setupFilesはグローバルポリフィルのみ、モックは各テストで行う |

---

## 設定の継承ルール（Vitest v4）— 重要

**注意: Vitest v4 では `projects` 内の各プロジェクトはトップレベルの `test` 設定を継承しない。**
`globals`, `clearMocks`, `restoreMocks` 等の設定は**各 project 内に明示的に記述する必要がある**。

トップレベルの `test` にも記述しておくことで、IDE や `vitest --project` 未指定時のフォールバックとして機能する。

---

## projects 設定（推奨構造）

```typescript
export default defineConfig({
  test: {
    // フォールバック設定（projects 未指定時に使用される）
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    reporters: [...],
    coverage: { ... },       // coverage はトップレベルのみで OK

    projects: [
      {
        test: {
          name: 'unit-node',
          // ⚠️ projects はトップレベルを継承しないため明示的に記述
          globals: true,
          clearMocks: true,
          restoreMocks: true,
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['tests/unit/components/**'],
        },
        resolve: { alias: sharedAlias },
      },
    ],
  },
});
```

---

## 設定分類ガイド

| 設定 | 場所 | 理由 |
|------|------|------|
| `globals` | トップレベル + 各project | 継承されないため両方に必要 |
| `clearMocks` | トップレベル + 各project | 継承されないため両方に必要 |
| `restoreMocks` | トップレベル + 各project | 継承されないため両方に必要 |
| `reporters` | トップレベル | 全テスト共通の出力設定 |
| `coverage` | トップレベル | カバレッジ設定は共通 |
| `environment` | projects個別 | node/jsdom で異なる |
| `include`/`exclude` | projects個別 | テスト対象が異なる |
| `setupFiles` | projects個別 | 環境ごとに setup が異なる場合 |
| `server.deps.inline` | projects個別 | 環境固有の依存解決 |

---

## 共有設定の DRY 化テクニック

重複が気になる場合は、共有設定をオブジェクトとして切り出す:

```typescript
const sharedTestConfig = {
  globals: true,
  clearMocks: true,
  restoreMocks: true,
} as const;

export default defineConfig({
  test: {
    ...sharedTestConfig,
    projects: [
      {
        test: {
          ...sharedTestConfig,
          name: 'unit-node',
          environment: 'node',
          // ...
        },
      },
    ],
  },
});
```

---

## 関連スキル

- **test-patterns**: vitest-mock-extended、Result型テスト、E2Eテストのパターン
- **typescript-patterns**: tsconfig 設定とaliasの詳細
- **test-config-optimization**: テスト設定最適化全般
