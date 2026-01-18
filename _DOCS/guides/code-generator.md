# コード生成ツール使用ガイド

Hygenベースのコード生成ツールを使用して、Clean Architecture + DDDパターンに準拠したボイラープレートコードを自動生成できます。

## コマンド一覧

| コマンド | 説明 | 生成ファイル |
|----------|------|--------------|
| `pnpm gen:usecase` | UseCase生成 | UseCase, テスト, DI登録 |
| `pnpm gen:entity` | Entity生成 | Entity, EntityId, テスト |
| `pnpm gen:repo` | Repository生成 | Interface, Prisma実装, テスト, DI登録 |
| `pnpm gen:action` | Server Action生成 | Server Action, テスト |
| `pnpm gen:vo` | Value Object生成 | Value Object, テスト |

---

## UseCase 生成

```bash
pnpm gen:usecase
```

### 対話プロンプト

1. **UseCase名**: PascalCase（例: `CreateOrder`）
2. **ドメイン名**: 小文字（例: `order`）
3. **Repository注入**: yes/no
4. **Repository名**: PascalCase（例: `Order`）

### 生成されるファイル

```
src/layers/application/usecases/{domain}/{Name}UseCase.ts
tests/unit/usecases/{domain}/{Name}UseCase.test.ts
```

### 自動注入

- `src/di/tokens.ts`: Token追加, TypeMap追加, import追加
- `src/di/containers/application.container.ts`: import追加, 登録追加

### 使用例

```bash
# 対話式
pnpm gen:usecase

# 引数指定（非対話式）
pnpm gen:usecase --name CreateOrder --domain order --withRepository true --repository Order
```

---

## Entity 生成

```bash
pnpm gen:entity
```

### 対話プロンプト

1. **Entity名**: PascalCase（例: `Order`）

### 生成されるファイル

```
src/layers/domain/entities/{Name}.ts
src/layers/domain/value-objects/{Name}Id.ts
tests/unit/domain/entities/{Name}.test.ts
```

### 使用例

```bash
# 対話式
pnpm gen:entity

# 引数指定
pnpm gen:entity --name Order
```

---

## Repository 生成

```bash
pnpm gen:repo
```

### 対話プロンプト

1. **Entity名**: PascalCase（例: `Order`）

### 生成されるファイル

```
src/layers/domain/repositories/I{Name}Repository.ts
src/layers/infrastructure/repositories/implementations/Prisma{Name}Repository.ts
tests/unit/repositories/{Name}Repository.test.ts
```

### 自動注入

- `src/di/tokens.ts`: Token追加, TypeMap追加, import追加
- `src/di/containers/infrastructure.container.ts`: import追加, 登録追加

### 前提条件

- 対応するEntityとEntityIdが存在すること
- Prismaスキーマに対応するモデルが定義されていること

### 使用例

```bash
# 対話式
pnpm gen:repo

# 引数指定
pnpm gen:repo --name Order
```

---

## Server Action 生成

```bash
pnpm gen:action
```

### 対話プロンプト

1. **Action名**: camelCase（例: `createOrder`）
2. **ドメイン名**: 小文字（例: `order`）
3. **UseCase名**: PascalCase（例: `CreateOrder`）

### 生成されるファイル

```
src/app/server-actions/{domain}/{name}.ts
tests/unit/server-actions/{domain}/{name}.test.ts
```

### 前提条件

- 対応するUseCaseが存在すること

### 使用例

```bash
# 対話式
pnpm gen:action

# 引数指定
pnpm gen:action --name createOrder --domain order --usecase CreateOrder
```

---

## Value Object 生成

```bash
pnpm gen:vo
```

### 対話プロンプト

1. **Value Object名**: PascalCase（例: `Email`, `Money`）
2. **内部値の型**: `string` | `number` | `boolean` | `Date`

### 生成されるファイル

```
src/layers/domain/value-objects/{Name}.ts
tests/unit/domain/value-objects/{Name}.test.ts
```

### 使用例

```bash
# 対話式
pnpm gen:vo

# 引数指定
pnpm gen:vo --name Email --type string
```

---

## 典型的なワークフロー

新しい機能を追加する際の推奨順序:

### 1. Entity + EntityId を生成

```bash
pnpm gen:entity --name Order
```

### 2. Repository を生成

```bash
pnpm gen:repo --name Order
```

### 3. Prismaスキーマを更新

```prisma
// prisma/schema.prisma
model Order {
  id        String   @id
  // ...fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4. マイグレーション実行

```bash
pnpm db:migrate:dev
```

### 5. UseCase を生成

```bash
pnpm gen:usecase --name CreateOrder --domain order --withRepository true --repository Order
```

### 6. Server Action を生成

```bash
pnpm gen:action --name createOrder --domain order --usecase CreateOrder
```

### 7. 型チェック

```bash
pnpm type-check
```

---

## テンプレートのカスタマイズ

テンプレートは `_templates/` ディレクトリに格納されています:

```
_templates/
├── usecase/new/
├── entity/new/
├── repository/new/
├── server-action/new/
└── value-object/new/
```

EJS形式で記述されており、プロジェクト固有のカスタマイズが可能です。

### ヘルパー関数

`.hygen.js` で定義されたヘルパー関数:

- `h.toPascalCase(str)`: `createOrder` → `CreateOrder`
- `h.toCamelCase(str)`: `CreateOrder` → `createOrder`
- `h.toUpperSnake(str)`: `CreateOrder` → `CREATE_ORDER`
- `h.toKebabCase(str)`: `CreateOrder` → `create-order`
- `h.today()`: `2024-01-01`

---

## トラブルシューティング

### inject が動作しない

マーカーコメントが存在するか確認:

```typescript
// tokens.ts
// [HYGEN:USECASE_TOKENS]
// [HYGEN:USECASE_TYPEMAP]
// [HYGEN:REPO_TOKENS]
// [HYGEN:REPO_TYPEMAP]

// application.container.ts
// [HYGEN:USECASE_IMPORTS]
// [HYGEN:USECASE_REGISTER]

// infrastructure.container.ts
// [HYGEN:REPO_IMPORTS]
// [HYGEN:REPO_REGISTER]
```

### 重複生成される

`skip_if` が機能していない場合、既存のコードに同名のシンボルが存在するか確認してください。

### 型エラーが発生

生成後に `pnpm type-check` を実行し、必要に応じてTODOコメント箇所を実装してください。

---

## 参考リンク

- [Hygen公式ドキュメント](https://www.hygen.io/)
- [プロジェクトアーキテクチャ](../architecture/overview.md)
- [UseCase実装ガイド](./ddd/layers/components/use-cases.md)
