---
name: biome-layer-enforcement
description: |
  Biome (biome.json) によるClean Architectureレイヤー依存制御ルールのガイド。
  noRestrictedImports エラーの原因と修正方法、レイヤー間の許可された依存方向を解説。

  トリガー例:
  - 「Biome」「noRestrictedImports」「import禁止」「レイヤー依存」
  - 「Clean Architecture依存方向」「レイヤー間import」
  - Biome lint エラー: 「This import is not allowed」
  - biome.json の overrides 編集時
  - src/layers/ 配下でのimportエラー発生時
globs:
  - "biome.json"
  - "src/layers/**"
---

# Biome Layer Enforcement Skill

Biome の `noRestrictedImports` ルールによる Clean Architecture レイヤー依存制御のガイドです。

---

## 1. レイヤー依存方向

```
Presentation → Application → Domain ← Infrastructure
```

| レイヤー | importできる対象 | importできない対象 |
|---------|----------------|-----------------|
| **Domain** | なし（他レイヤー全て禁止） | Application / Infrastructure / Presentation |
| **Application** | Domain のみ | Infrastructure / Presentation |
| **Infrastructure** | Domain + Application | Presentation |
| **Presentation** | 全レイヤー | なし |

### 設計上の理由

- **Domain** はビジネスロジックの核であり、外部の実装詳細に依存してはならない
- **Application** はユースケースを表現し、インフラ実装を知らない（DIで注入される）
- **Infrastructure** は技術的実装詳細を持ち、Application の interface を実装する
- **Presentation** は最外層であり全レイヤーを利用できる

---

## 2. biome.json の実際のルール設定

### グローバルルール（全ファイル対象）

```json
{
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "patterns": [
              {
                "group": ["../*", "./*"],
                "message": "相対参照は禁止です。@/* のalias参照を使用してください。"
              }
            ]
          }
        }
      }
    }
  }
}
```

### overrides によるレイヤー別ルール

| overrides `includes` | 禁止 import パターン | エラーメッセージ |
|---------------------|-------------------|----------------|
| `src/layers/domain/**` | `@/layers/application/*`, `@/layers/application/**` | Domain層からApplication層へのインポートは禁止 |
| `src/layers/domain/**` | `@/layers/infrastructure/*`, `@/layers/infrastructure/**` | Domain層からInfrastructure層へのインポートは禁止 |
| `src/layers/domain/**` | `@/layers/presentation/*`, `@/layers/presentation/**` | Domain層からPresentation層へのインポートは禁止 |
| `src/layers/application/**` | `@/layers/infrastructure/*`, `@/layers/infrastructure/**` | Application層からInfrastructure層へのインポートは禁止 |
| `src/layers/application/**` | `@/layers/presentation/*`, `@/layers/presentation/**` | Application層からPresentation層へのインポートは禁止 |
| `src/layers/infrastructure/**` | `@/layers/presentation/*`, `@/layers/presentation/**` | Infrastructure層からPresentation層へのインポートは禁止 |

> **テストファイルの除外**: `tests/**` は `noRestrictedImports: off` + `noExplicitAny: off` に設定済み。
> テストコードではレイヤー制約なしに全レイヤーをimportできる。

---

## 3. よくあるエラーと修正パターン

| エラー箇所 | 原因 | 修正方法 |
|-----------|------|---------|
| Domain層で `@/layers/application/` をimport | 依存方向違反 | interfaceをDomain層に定義し、Application層で実装 |
| Domain層で `@/layers/infrastructure/` をimport | 依存方向違反 | Repository interfaceをDomain層に定義し、Infrastructure層で実装する |
| Application層で `@/layers/infrastructure/` をimport | 依存方向違反 | DIでインターフェースを注入する。`import type { IUserRepository }` はDomain層から |
| Application層で `@/layers/presentation/` をimport | 依存方向違反 | Presentation固有の型はPresentation層のみで使用する |
| Infrastructure層で `@/layers/presentation/` をimport | 依存方向違反 | Presentation固有の関数・型への依存を除去する |
| 相対パス `../` や `./` でimport | `@/` alias必須ルール違反 | `@/layers/...` などに変更する |

### 修正例: Domain → Application 依存の解消

```typescript
// ❌ 禁止: Domain層でApplication層をimport
// src/layers/domain/entities/User.ts
import { UserDto } from '@/layers/application/dtos/UserDto'; // 依存方向違反

// ✅ 正しい: DTO変換はApplication層の責務。Domain層はEntityのみ定義する
// src/layers/domain/entities/User.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}
```

### 修正例: Application → Infrastructure 依存の解消

```typescript
// ❌ 禁止: Application層でInfrastructure実装をimport
// src/layers/application/usecases/GetUserUseCase.ts
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/PrismaUserRepository';

// ✅ 正しい: DomainのInterfaceを使用し、DIで実装を注入する
// src/layers/application/usecases/GetUserUseCase.ts
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';

@injectable()
export class GetUserUseCase {
  constructor(
    @inject(TOKEN.UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}
}
```

---

## 4. `@/` alias必須ルールの根拠

1. **依存方向の視覚的明確化**: `@/layers/domain/...` の形式でどのレイヤーか一目でわかる
2. **Biome overrides パターンとの一致**: biome.json の `includes` は `src/layers/domain/**` 形式で記述されており、`@/` alias での import のみ静的検出が可能
3. **相対パスだと検出できない**: `../../domain/entities/User` は `@/layers/application/...` の禁止パターンにマッチしないため、Biome が依存方向違反を検出できない

```typescript
// ❌ 禁止: 相対パス（Biomeが検出できず、依存方向違反が隠れる可能性がある）
import { User } from '../../domain/entities/User';

// ✅ 必須: @/ alias（Biomeのレイヤー依存ルールが正しく機能する）
import { User } from '@/layers/domain/entities/User';
```

---

## 5. 新しいレイヤー固有ルールを追加する方法

`biome.json` の `overrides` 配列に新しいブロックを追加する。

### 手順

1. `biome.json` を開く
2. `overrides` 配列の末尾（テスト用 `tests/**` ブロックの前）に追加する
3. `includes` に対象ファイルの glob パターンを指定する
4. `linter.rules.style.noRestrictedImports.options.patterns` に禁止パターンを追加する

### テンプレート

```json
{
  "includes": [
    "src/layers/<新レイヤー名>/**/*.ts",
    "src/layers/<新レイヤー名>/**/*.tsx"
  ],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "patterns": [
              {
                "group": ["../*", "./*"],
                "message": "相対参照は禁止です。@/* のalias参照を使用してください。"
              },
              {
                "group": [
                  "@/layers/<禁止レイヤー>/*",
                  "@/layers/<禁止レイヤー>/**"
                ],
                "message": "<新レイヤー>層から<禁止レイヤー>層へのインポートは禁止です。Clean Architectureの依存関係に違反しています。"
              }
            ]
          }
        }
      }
    }
  }
}
```

### 注意事項

- 相対パス禁止パターン（`../*`, `./*`）は全 overrides ブロックに必ず含めること
- 追加後は `pnpm check` で既存コードにエラーがないことを確認すること
- 新しいルールはプロジェクト全体に適用されるため、既存コードの修正が必要になる場合がある

---

## 6. チェックリスト

### レイヤー依存

- [ ] Domain層から他レイヤー（Application / Infrastructure / Presentation）をimportしていない
- [ ] Application層からInfrastructure層・Presentation層をimportしていない
- [ ] Infrastructure層からPresentation層をimportしていない
- [ ] Repository interfaceはDomain層に定義し、Infrastructure層で実装している
- [ ] UseCaseはDomain interfaceのみに依存し、DIで実装を注入している

### Import形式

- [ ] 全てのimportが `@/` aliasを使用している（`../` や `./` 形式ではない）
- [ ] `src/layers/` 配下では特に `@/layers/<layer>/...` 形式を厳守している

### 検証

- [ ] `pnpm check` でBiomeエラーが出ない
- [ ] `pnpm lint` で `noRestrictedImports` エラーが出ない

---

## 7. Biome lint 抑制コメントの書き方

やむを得ず抑制が必要な場合（原則として避けること）:

```typescript
// biome-ignore lint/style/noRestrictedImports: <理由を必ず記述>
import { SomeThing } from '@/layers/infrastructure/...';
```

> ESLint の `// eslint-disable-next-line` は無効（このプロジェクトはBiome使用）。
> 必ず `// biome-ignore lint/...` 形式を使うこと。
