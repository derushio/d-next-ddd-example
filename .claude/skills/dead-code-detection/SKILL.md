---
name: dead-code-detection
description: |
  デッドコード検出・削除の判断基準と手順を提供するスキル。
  参照確認方法論、@deprecated管理ワークフロー、
  package.json依存クリーンアップ、tsconfig衛生管理を扱う。

  トリガー例:
  - 「デッドコード」「未使用」「削除判断」「クリーンアップ」
  - 「@deprecated」「使われていない」「参照元がない」
  - コードレビュー時の不要コード検出
---

# Dead Code Detection Skill

デッドコードの検出・削除判断・安全な削除手順を提供するスキル。

---

## 判断基準フローチャート

```
コードの参照を確認
      ↓
参照元が存在するか？
  ├─ YES → テストからのみ参照？
  │          ├─ YES → テストと共に削除を検討（本体コードが不要なら）
  │          └─ NO  → 保持（現役コード）
  └─ NO  → 削除候補
              ↓
         将来的に必要になる可能性は？
           ├─ 高い → @deprecated アノテーション追加 → 移行期間後に削除
           └─ 低い → 即削除
                       ↓
                  テストファイルが存在するか？
                    ├─ YES → テストも同時に削除
                    └─ NO  → ファイル削除のみ
                               ↓
                          DIコンテナに登録されているか？
                            ├─ YES → tokens.ts, container.ts, resolver.ts からも削除
                            └─ NO  → ファイル削除完了
```

---

## 参照確認方法論

### Step 1: import 検索

```bash
# ファイル名でimport検索（拡張子なし）
grep -r "from '@/utils/wait'" src/ tests/
grep -r "import.*wait" src/ tests/

# または Grep ツールで
# pattern: "from '@/utils/wait'"
# path: src/
```

### Step 2: 関数/クラス名でのシンボル検索

```bash
# 関数名で検索（ファイル名が変わっていても検出可能）
grep -r "combineResults" src/ tests/
grep -r "AuthService" src/ tests/ --include="*.ts" --include="*.tsx"
```

### Step 3: dynamic import の確認（見落とし注意）

静的 import だけでなく、動的 import も確認すること。

```bash
# dynamic import パターン
grep -r "import('@/utils/wait')" src/
grep -r "require('@/utils/wait')" src/

# React.lazy や dynamic() でも参照される場合がある
grep -r "dynamic.*wait" src/
```

### Step 4: テスト参照チェック

本体コードを削除する前に、テストが参照していないか確認する。

```bash
grep -r "AuthService" tests/
```

テストが参照している場合は、テストも同時に削除計画に含める。

### Step 5: index.ts / barrel export の確認

`index.ts` 経由で re-export されているケースがある。

```bash
grep -r "wait" src/utils/index.ts
```

バレルファイルに含まれている場合は、バレルファイルからも削除する。

---

## @deprecated アノテーションワークフロー

機能の移行が完了するまでの間、古いコードを段階的に廃止するための手順。

### Step 1: @deprecated アノテーション追加

```typescript
/**
 * @deprecated SignInUseCase に機能移行済み。このサービスは削除予定。
 * 新規コードでは SignInUseCase を直接使用すること。
 */
@injectable()
export class AuthService {
  // ...
}
```

### Step 2: tokens.ts にも deprecated コメント追加

```typescript
// src/di/tokens.ts
export const INJECTION_TOKENS = {
  // ...
  /** @deprecated AuthService削除予定 */
  AuthService: Symbol('AuthService'),
} as const;
```

### Step 3: 使用停止の確認

全ての参照元が新しい実装（UseCase等）に移行完了したことを確認する。

```bash
grep -r "AuthService" src/ --include="*.ts" --include="*.tsx"
# @deprecated の宣言自体とDI登録以外の参照がないことを確認
```

### Step 4: DIコンテナから登録解除

```typescript
// src/di/containers/application.container.ts
// 削除前
container.register(INJECTION_TOKENS.AuthService, AuthService);

// 削除後
// 上記行を削除
```

### Step 5: ファイル削除

```bash
rm src/layers/application/services/AuthService.ts
rm tests/unit/services/AuthService.test.ts
```

### Step 6: tokens.ts からトークン削除

```typescript
// src/di/tokens.ts から対応するシンボルを削除
// AuthService: Symbol('AuthService'), ← 削除
```

### Step 7: resolver.ts / container 参照の削除

```typescript
// src/di/resolver.ts のコメント・参照も整理
```

---

## package.json 依存クリーンアップ手順

ユーティリティラッパーごとパッケージを削除する場合の手順。

### ケース例: p-queue の削除（このプロジェクトの実績）

`src/utils/pq.ts` が `p-queue` のラッパーだったが、使用箇所がなかったため削除。

```bash
# 1. package.json から依存を削除
pnpm remove p-queue

# 2. ラッパーファイルを削除
rm src/utils/pq.ts

# 3. 関連テストがあれば削除
rm tests/unit/utils/pq.test.ts  # 存在する場合

# 4. ビルド確認
pnpm check
```

### 削除前の依存関係確認

ラッパーを削除する前に、ラッパーを介さずに `p-queue` を直接 import している箇所がないか確認する。

```bash
grep -r "p-queue" src/ tests/
grep -r "PQueue" src/ tests/
```

### 間接依存への注意

削除するパッケージが他のパッケージから `peerDependency` として要求されていないか確認する。

```bash
# インストール後に依存ツリーを確認
pnpm why p-queue
```

---

## tsconfig パスエイリアス衛生管理

削除したファイルのエイリアスが `tsconfig.json` に残っていると、ビルド時に警告・エラーが出る。

### 実体のないエイリアスの検出方法

```bash
# tsconfig.json の paths を確認
cat tsconfig.json | grep -A 20 '"paths"'

# 各エイリアスの実体が存在するか確認
# 例: "@/utils/wait" → src/utils/wait.ts が存在するか
ls src/utils/wait.ts  # 存在しなければエラー
```

### エイリアスと vitest.config.ts の同期

tsconfig.json から削除したエイリアスは `vitest.config.ts` からも削除すること。

```typescript
// tsconfig.json paths から '@/utils/pq' を削除した場合
// vitest.config.ts の resolve.alias からも削除
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    // '@/utils/pq': ..., ← 削除
  },
},
```

---

## このプロジェクトで削除した実績

### 削除したユーティリティファイル（2026/03/30）

コミット `a34b856`: `refactor: remove dead code and unused utilities`

| ファイル | 内容 | 削除理由 |
|---------|------|---------|
| `src/utils/wait.ts` | `es-toolkit` の `delay` を re-export するだけのラッパー | 直接 `es-toolkit` を import すれば不要 |
| `src/utils/valueof.ts` | `ValueOf<T>` 型ユーティリティ | 使用箇所なし |
| `src/utils/kvmap.ts` | キーバリューマップユーティリティ | 使用箇所なし |
| `src/utils/objectkeys.ts` | `Object.keys` の型安全ラッパー | 使用箇所なし |
| `src/utils/pq.ts` | `p-queue` のラッパー | 使用箇所なし（`p-queue` も依存から削除） |
| `src/utils/number.ts` | 数値ユーティリティ集 | 使用箇所なし |
| `src/utils/hash.ts` | ハッシュユーティリティ | `@node-rs/argon2` に置換済み |

合わせて `p-queue` を `package.json` の依存から削除。

### 削除した Application Services（2026/03/30）

コミット `15d1a76`: `refactor: delete deprecated application services`

| ファイル | 内容 | 削除理由 |
|---------|------|---------|
| `src/layers/application/services/AuthService.ts` | 認証サービス | UseCase層に機能移行済み（`@deprecated` 期間後に削除） |
| `src/layers/application/services/TokenService.ts` | トークン管理サービス | UseCase層に機能移行済み |
| `src/layers/application/services/UserService.ts` | ユーザー管理サービス | UseCase層に機能移行済み |

対応するテストファイル3件、DI登録、injection tokensも同時削除。

### 削除した関数・メソッド（2026/03/30）

コミット `a34b856`:

| シンボル | 場所 | 削除理由 |
|---------|------|---------|
| `DomainError.create()` | `domain/errors/DomainError.ts` | `new DomainError()` と重複、参照なし |
| `Email.isCompanyEmail()` | `domain/value-objects/Email.ts` | 参照なし |
| `Email.getDomain()` | `domain/value-objects/Email.ts` | 参照なし |
| `combineResults()` | `application/types/Result.ts` | neverthrow の `combineWithAllErrors` で代替可能、参照なし |

---

## アンチパターンと注意事項

| アンチパターン | 問題 | 対策 |
|--------------|------|------|
| 静的importのみ確認して削除 | dynamic importや `require()` での参照を見落とす | grep で `import(` と `require(` も検索する |
| ファイル削除のみでDI登録を残す | 実行時エラー（コンテナに存在しないクラスの参照） | tokens.ts, container.ts, resolver.ts も同時に整理する |
| テスト参照を確認せずに削除 | テストが壊れ、CIが失敗する | 削除前に `tests/` ディレクトリも検索する |
| @deprecated を付けずに即削除 | 他チームメンバーや並行作業中のブランチで参照している可能性 | 移行期間を設けてから削除する |
| pnpm remove せずにファイルだけ削除 | package.json に使われないパッケージが残る | ファイルとpackage.jsonの両方を更新する |

---

## 削除作業後の確認チェックリスト

- [ ] `pnpm check` が通る（lint + type-check + test）
- [ ] `pnpm build` が成功する
- [ ] 削除したシンボルへの参照が残っていない（grep で確認）
- [ ] tsconfig.json のエイリアスを整理した場合は vitest.config.ts も確認
- [ ] DI tokens を削除した場合は container.ts と resolver.ts も確認

---

## 関連スキル

- **coding-standards**: インポートルールとエイリアスの規約
- **typescript-patterns**: TypeScript の型ユーティリティパターン
- **best-practices**: Clean Architecture の依存関係ルール
