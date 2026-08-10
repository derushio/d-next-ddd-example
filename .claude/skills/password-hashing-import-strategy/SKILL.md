---
name: password-hashing-import-strategy
description: |
  `@node-rs/argon2` を Next.js (Turbopack / webpack) + サーバーレス環境で
  安全に使うための import 戦略と Next.js config 設定を強制するスキル。
  top-level import 禁止 (dynamic import 必須) と、
  `serverExternalPackages` + `outputFileTracingIncludes` の両立を強制する。

  トリガー例:
  - `@node-rs/argon2` を import しようとしたとき
  - HashService, IHashService, argon2, argon2id を含むコード編集
  - next.config.ts の serverExternalPackages / outputFileTracingIncludes 編集
  - 「Failed to load native binding」「Failed to load external module」エラー
  - Vercel / サーバーレス へのデプロイ時に auth 以外の route が 500 になる症状
  - `.node` native binding, `optionalDependencies`, `@vercel/nft` に関する話
---

# password-hashing-import-strategy スキル

`@node-rs/argon2` のような native binding を持つパッケージを Next.js の
サーバーレスデプロイ環境 (Vercel Fluid Compute 等) で安全に使うための
import 戦略と next.config.ts 設定を定義します。

---

## 背景: なぜ top-level import で 500 が起きるか

`@node-rs/argon2` は napi-rs 系の native binding パッケージで、
`optionalDependencies` として `@node-rs/argon2-<platform>` を持ち、
その中の `.node` ファイルを runtime で `require` する。

Next.js の Function bundling (`@vercel/nft`) は `optionalDependencies`
経由の native binary を **trace しない**。 pnpm の isolated mode では
top-level `node_modules/@node-rs/argon2-<platform>/` の symlink は
作られず、実体は `node_modules/.pnpm/@node-rs+argon2-<platform>@<ver>/`
配下にしか存在しない。 このため、素のデプロイでは `.node` が
Function bundle から抜け落ちる。

top-level で `import { hash } from '@node-rs/argon2'` すると、
`HashService` を含むモジュールが評価された時点で `.node` の require が走る。
`HashService` は DI コンテナに `@injectable()` として登録され、
`resolve()` の初期化グラフ経由でほぼ全 Server Action / SSR route の
bundle 評価時に評価される。 → 認証以外の route (`/`, `/user`, etc) までもが
`Failed to load native binding` / `Failed to load external module @node-rs/argon2`
で 500 に落ちる。

Turbopack の chunk 分割の都合で、 `outputFileTracingIncludes` で正しく
`.node` を同梱していても、 trace に載っていない chunk に argon2 が
引き摺り込まれると同じ症状が起きる。

---

## ルール

### ルール 1: `@node-rs/argon2` の top-level import 禁止

以下は **禁止**:

```typescript
// NG: モジュール評価時に .node がロードされる
import { hash, verify } from '@node-rs/argon2';
```

以下が **正**:

```typescript
// OK: hash / verify を実際に呼ぶ関数の中で dynamic import
type Argon2Module = typeof import('@node-rs/argon2');
let argon2ModulePromise: Promise<Argon2Module> | null = null;
function loadArgon2(): Promise<Argon2Module> {
  if (argon2ModulePromise === null) {
    argon2ModulePromise = import('@node-rs/argon2');
  }
  return argon2ModulePromise;
}

async function generateHash(text: string): Promise<string> {
  const { hash } = await loadArgon2();
  return hash(text, options);
}
```

**型 import は許可**:

```typescript
// OK: type-only import は runtime に何も評価しない
import type { Options } from '@node-rs/argon2';
```

**cache は module-scope で 1 度だけ**: dynamic import 自体が内部で cache するが、
Promise を明示的に module-scope で保持することで型と挙動を分かりやすくし、
2 回目以降の呼び出しに追加コストが無いことを保証する。

**このルールは script (`src/tools/*.ts`) にも適用する**: script は Next.js の
bundling 経路には乗らないが、 import 戦略を揃えることで
「HashService は lazy だが script は eager」 のような不整合を防ぐ。

### ルール 2: `Algorithm` const enum は数値リテラルで代替

`@node-rs/argon2` の `Algorithm` は `const enum` のため、
`verbatimModuleSyntax` / `isolatedModules` (本 Pj で有効) 配下では
`import { Algorithm } from '@node-rs/argon2'` すると
TS エラー "Cannot import const enum" が発生する。

```typescript
// NG:
import { Algorithm } from '@node-rs/argon2';
const algo = Algorithm.Argon2id;

// OK: 数値リテラル定数で代替
const ARGON2_ALGORITHM_ID = 2; // 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
```

### ルール 3: モジュールロード失敗は fail loud、暗黙フォールバック禁止

`@node-rs/argon2` の dynamic import 自体が失敗した場合 (native binding
不在) と、 verify() が投げる例外 (保存された hash 文字列の形式不正) は
**別カテゴリのエラー**として扱う。 前者は上位に伝播させ、 後者は認証
失敗として false に落とす。

**禁止パターン**: `compareHash` の外側で `try/catch` して全部 `false` を返す。
これをすると native binding 欠落 (= 全ユーザー認証破綻) が「パスワード不一致」
として観測されるだけで、 監視系は「不正アクセス増加」としか見えず原因発見が遅れる。

```typescript
// NG: モジュールロード失敗が false に潰れる
async compareHash(text: string, hashed: string): Promise<boolean> {
  try {
    const { verify } = await loadArgon2(); // ← ロード失敗もここで catch される
    return await verify(hashed, text, options);
  } catch {
    return false;
  }
}

// OK: ロード失敗は throw、 verify の実行時例外だけ false
async compareHash(text: string, hashed: string): Promise<boolean> {
  const { verify } = await loadArgon2(); // 失敗すれば Argon2ModuleUnavailableError が throw
  try {
    return await verify(hashed, text, options);
  } catch {
    return false; // 保存された hash 文字列が壊れているケース
  }
}
```

`loadArgon2()` 側で `import()` の失敗を専用エラーで throw し、 module-scope
の cache は解除して次回リトライを許す:

```typescript
export class Argon2ModuleUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      '@node-rs/argon2 native binding failed to load; server cannot hash or verify passwords',
      { cause },
    );
    this.name = 'Argon2ModuleUnavailableError';
  }
}

let argon2ModulePromise: Promise<Argon2Module> | null = null;
function loadArgon2(): Promise<Argon2Module> {
  if (argon2ModulePromise === null) {
    argon2ModulePromise = import('@node-rs/argon2').catch((cause) => {
      argon2ModulePromise = null; // hot reload / hot swap でリトライ可能に
      throw new Argon2ModuleUnavailableError(cause);
    });
  }
  return argon2ModulePromise;
}
```

**pure-JS フォールバックの暗黙導入は禁止** (bcryptjs / @noble/hashes 等)。
理由: (a) 供給網面積の純増、 (b) event-loop ブロッキングによる co-tenant
リクエストへの副作用、 (c) 認証ハッシュのアルゴリズム分散はセキュリティ
監査面で不利。 native binding が読めないなら 500 で明示的に落として運用側に
気付かせる。

### ルール 4: `next.config.ts` に必ず 2 点セットで設定

`serverExternalPackages` と `outputFileTracingIncludes` は **両方必須**。
片方だけでは runtime エラーが再発する。

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // 1. Turbopack / webpack のバンドル対象から除外し native require で読ませる
  serverExternalPackages: [
    // ...他の外部パッケージ
    '@node-rs/argon2',
  ],
  // 2. Function bundle に platform 別 `.node` を強制同梱
  //    pnpm isolated mode 対応で `.pnpm/` 配下を明示する
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/.pnpm/@node-rs+argon2-linux-x64-gnu@*/node_modules/@node-rs/argon2-linux-x64-gnu/*.node',
      './node_modules/.pnpm/@node-rs+argon2-linux-x64-musl@*/node_modules/@node-rs/argon2-linux-x64-musl/*.node',
      './node_modules/.pnpm/@node-rs+argon2-linux-arm64-gnu@*/node_modules/@node-rs/argon2-linux-arm64-gnu/*.node',
    ],
  },
};
```

**glob 記法の注意**:

- `.node` suffix に限定する (`*.node`)。 recursive `**/*` で symlink を include
  するとサーバーレスデプロイの "Download deployment files" 段階で symlink 重複
  展開により EEXIST が発生し deploy 失敗する。
- version wildcard `@*` で lockfile bump に追随する。
- 本命は `linux-x64-gnu` (Vercel Fluid Compute / 一般的な Node.js Linux LTS)。
  `linux-x64-musl` (Alpine / Musl 移行) と `linux-arm64-gnu` (Graviton / ARM Lambda)
  は将来の runtime 変更保険として同梱する。

---

### ルール 5: `next build` の trace 出力を CI で静的検査する

`serverExternalPackages` + `outputFileTracingIncludes` の 2 点セットが
生きていることを、 `next build` 直後に `.next/**/*.nft.json` を parse して
確認する。 Turbopack standalone build のリグレッション
(vercel/next.js issues [#88844](https://github.com/vercel/next.js/issues/88844),
[#74816](https://github.com/vercel/next.js/issues/74816) 系) が再燃した場合、
config は正しくても bundle から `.node` が抜けて runtime 500 に落ちる。
CI で毎回検出できるようにしておく。

```bash
# 手動実行
pnpm check:argon2-tracing
# 内部で `pnpm build && node scripts/checkArgon2Tracing.mjs` を走らせる
```

script (`scripts/checkArgon2Tracing.mjs`) が検証する内容:

1. `.next/` 配下の `*.nft.json` を再帰列挙
2. 少なくとも 1 route の trace に `@node-rs/argon2-<platform>-<arch>/*.node`
   が含まれる
3. Linux ホストで build した場合 (= CI 想定) は `linux-x64-gnu` が
   含まれることを追加で強制 (`outputFileTracingIncludes` の glob が
   実際に resolved されたことの確認)

**追加観察**: 検証が緑になった場合、 argon2 native binding は auth 系
route だけでなく **全 SSR route の trace に含まれる**。 これは DI コンテナ
経由で `HashService` が全 route のモジュールグラフに乗るため。 ここに
top-level `import { hash } from '@node-rs/argon2'` を戻すと、
全 route の bundle 評価時に native binding load が走り、 tracing が
1 route でも欠けた瞬間に非認証 route まで 500 に落ちる (このスキルが
禁止している元の症状に戻る)。

CI (例: GitHub Actions / Gitea Actions) 側で:

```yaml
- name: Verify argon2 native binding tracing
  run: pnpm check:argon2-tracing
```

`pnpm check` (format / type-check / lint / test:unit) には含めない
(build が走るため遅い、 かつ DB 起動を必要としない)。 build 系タスクの
下流に別建てで置く。

---

## 実装テンプレート (コピペ用)

`src/layers/infrastructure/services/HashService.ts`:

```typescript
import type { Options } from '@node-rs/argon2';
import { injectable } from 'tsyringe';
import type { IHashService } from '@/layers/domain/interfaces/IHashService';
import { TIMING_SAFE_DUMMY_HASH } from '@/layers/infrastructure/constants/security';

type Argon2Module = typeof import('@node-rs/argon2');

export class Argon2ModuleUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      '@node-rs/argon2 native binding failed to load; server cannot hash or verify passwords',
      { cause },
    );
    this.name = 'Argon2ModuleUnavailableError';
  }
}

let argon2ModulePromise: Promise<Argon2Module> | null = null;
function loadArgon2(): Promise<Argon2Module> {
  if (argon2ModulePromise === null) {
    argon2ModulePromise = import('@node-rs/argon2').catch((cause) => {
      argon2ModulePromise = null;
      throw new Argon2ModuleUnavailableError(cause);
    });
  }
  return argon2ModulePromise;
}

const ARGON2_ALGORITHM_ID = 2; // Argon2id
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: ARGON2_ALGORITHM_ID,
} as const satisfies Options;

@injectable()
export class HashService implements IHashService {
  async generateHash(text: string): Promise<string> {
    const { hash } = await loadArgon2();
    return await hash(text, ARGON2_OPTIONS);
  }

  async compareHash(text: string, hashedText: string): Promise<boolean> {
    // ロード失敗は throw、 verify の実行時例外だけ false
    const { verify } = await loadArgon2();
    try {
      return await verify(hashedText, text, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }

  getTimingSafeDummyHash(): string {
    return TIMING_SAFE_DUMMY_HASH;
  }
}
```

---

## トラブルシューティング

### 症状: 認証以外の route (例: `/`, `/user/*`) までもが 500

`Failed to load native binding` / `Failed to load external module @node-rs/argon2` /
`Cannot find module '@node-rs/argon2-linux-x64-gnu'` などが出る場合:

1. **top-level import が残っていないか grep で確認**:
   ```sh
   grep -rn "from '@node-rs/argon2'" src/ tests/ | grep -v "import type"
   ```
   `import type { Options }` 以外の実 import が引っかかったら NG。

2. **`next.config.ts` の 2 点セット確認**:
   - `serverExternalPackages` に `'@node-rs/argon2'` が含まれる
   - `outputFileTracingIncludes` に platform 別 `.node` の glob が含まれる

3. **lockfile bump 後に platform-specific package の version が変わったら**
   `@*` wildcard が効くので明示的な追従は不要。 それでも失敗する場合は
   `pnpm-lock.yaml` を確認し、 platform-specific package が
   `optionalDependencies` として実際に install されているかを確認する:
   ```sh
   ls node_modules/.pnpm/ | grep argon2
   ```

### 症状: `Cannot import const enum 'Algorithm'`

`verbatimModuleSyntax` / `isolatedModules` 有効時。 `Algorithm` は
数値リテラル (2 = Argon2id) で代替する。 型 import は許可されている:

```typescript
// NG
import { Algorithm } from '@node-rs/argon2';
// OK
import type { Options } from '@node-rs/argon2';
const ARGON2_ALGORITHM_ID = 2;
```

### 症状: 認証だけが「パスワード不一致」で失敗、 監視系に SYSTEM_ERROR が出ない

`compareHash` の外側で全部 `try/catch` して false を返してしまっている。
ルール 3 (fail loud) 参照。 `loadArgon2()` の失敗と `verify()` の失敗を
分離する。 `Argon2ModuleUnavailableError` が上位に伝播すれば、 Server Action
の Result 変換で SYSTEM_ERROR にマップされ、 ログに明示的に記録される。

### 症状: `EEXIST: file already exists, symlink`

`outputFileTracingIncludes` に `**/*` の recursive glob を書いて
`.pnpm/` の symlink を巻き込んでいる。 `*.node` suffix 固定に絞る。

---

## 適用範囲

このスキルは以下の変更時に強制的に適用する:

- `src/layers/infrastructure/services/HashService.ts` (実装本体)
- `src/tools/generateHash.ts` (CLI script)
- `next.config.ts` の `serverExternalPackages` / `outputFileTracingIncludes`
- 新規に `@node-rs/argon2` を import する箇所を追加するとき

---

## 関連スキル

- `password-hashing`: パスワードハッシュ全体の設計方針 (Argon2id 選択、
  timing-safe dummy hash、 IHashService 経由の DI 使用)。 このスキルは
  import / bundling 戦略に特化した補助スキル。
- `security-review`: セキュリティレビュー全体
- `next-dynamic-import`: 一般的な dynamic import パターン (UI コンポーネント遅延ロード等)

---

## 関連ファイル

- **実装**: `src/layers/infrastructure/services/HashService.ts`
- **CLI script**: `src/tools/generateHash.ts`
- **Next.js 設定**: `next.config.ts`
- **既定 policy 定数**: `src/layers/infrastructure/constants/security.ts`
