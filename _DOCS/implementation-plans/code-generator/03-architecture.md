# テンプレートアーキテクチャ

## ディレクトリ構造

```
_templates/
├── usecase/
│   └── new/
│       ├── usecase.ejs.t           # UseCase本体
│       ├── test.ejs.t              # テストファイル
│       ├── inject-token.ejs.t      # tokens.ts への注入
│       ├── inject-typemap.ejs.t    # ServiceTypeMap への注入
│       ├── inject-container.ejs.t  # container への注入
│       └── prompt.js               # 対話式プロンプト
│
├── entity/
│   └── new/
│       ├── entity.ejs.t            # Entity本体
│       ├── entity-id.ejs.t         # EntityId Value Object
│       ├── test.ejs.t              # テストファイル
│       └── prompt.js
│
├── value-object/
│   └── new/
│       ├── value-object.ejs.t      # Value Object本体
│       ├── test.ejs.t              # テストファイル
│       └── prompt.js
│
├── repository/
│   └── new/
│       ├── interface.ejs.t         # Repository Interface
│       ├── implementation.ejs.t    # Prisma Repository実装
│       ├── test.ejs.t              # テストファイル
│       ├── inject-token.ejs.t      # tokens.ts への注入
│       ├── inject-typemap.ejs.t    # ServiceTypeMap への注入
│       ├── inject-container.ejs.t  # container への注入
│       └── prompt.js
│
├── server-action/
│   └── new/
│       ├── action.ejs.t            # Server Action本体
│       ├── test.ejs.t              # テストファイル
│       └── prompt.js
│
├── domain-service/
│   └── new/
│       ├── service.ejs.t           # Domain Service本体
│       ├── test.ejs.t              # テストファイル
│       ├── inject-token.ejs.t
│       ├── inject-typemap.ejs.t
│       ├── inject-container.ejs.t
│       └── prompt.js
│
└── feature/
    └── new/
        ├── component.ejs.t         # React Component
        ├── client.ejs.t            # Client Component（必要時）
        └── prompt.js
```

---

## コマンド設計

### UseCase 生成

```bash
# 対話式
pnpm gen:usecase

# 引数指定
pnpm gen:usecase --name CreateOrder --domain order
```

**生成ファイル**:

```
src/layers/application/usecases/order/CreateOrderUseCase.ts
tests/unit/usecases/order/CreateOrderUseCase.test.ts
```

**注入先**:

```
src/di/tokens.ts               # Token追加
src/di/tokens.ts               # ServiceTypeMap追加
src/di/containers/application.container.ts  # 登録追加
```

---

### Entity 生成

```bash
pnpm gen:entity --name Order
```

**生成ファイル**:

```
src/layers/domain/entities/Order.ts
src/layers/domain/value-objects/OrderId.ts
tests/unit/domain/entities/Order.test.ts
```

---

### Value Object 生成

```bash
pnpm gen:vo --name Money --type number
```

**生成ファイル**:

```
src/layers/domain/value-objects/Money.ts
tests/unit/domain/value-objects/Money.test.ts
```

---

### Repository 生成

```bash
pnpm gen:repo --name Order
```

**生成ファイル**:

```
src/layers/domain/repositories/IOrderRepository.ts
src/layers/infrastructure/repositories/implementations/PrismaOrderRepository.ts
tests/unit/repositories/PrismaOrderRepository.test.ts
```

**注入先**:

```
src/di/tokens.ts
src/di/containers/infrastructure.container.ts
```

---

### Server Action 生成

```bash
pnpm gen:action --name createOrder --domain order --usecase CreateOrderUseCase
```

**生成ファイル**:

```
src/app/server-actions/order/createOrder.ts
tests/unit/server-actions/order/createOrder.test.ts
```

---

## テンプレート変数設計

### 共通変数

| 変数 | 説明 | 例 |
|------|------|-----|
| `name` | 名前（入力値そのまま） | `createOrder` |
| `Name` | PascalCase | `CreateOrder` |
| `NAME` | UPPER_SNAKE_CASE | `CREATE_ORDER` |
| `domain` | ドメイン名 | `order` |
| `Domain` | ドメインPascalCase | `Order` |

### ヘルパー関数

```javascript
// _templates/_helpers.js
module.exports = {
  toPascalCase: (str) => str.charAt(0).toUpperCase() + str.slice(1),
  toKebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
  toCamelCase: (str) => str.charAt(0).toLowerCase() + str.slice(1),
  toSnakeCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),
};
```

---

## inject（注入）設計

### tokens.ts への注入

```
注入ポイント:
1. INJECTION_TOKENS オブジェクト
2. ServiceTypeMap インターフェース
3. 必要なimport文
```

**注入マーカー**:

```typescript
// src/di/tokens.ts
export const INJECTION_TOKENS = {
  // ... existing tokens ...
  // [HYGEN-INJECT:TOKENS]  ← 注入ポイント
} as const;

export interface ServiceTypeMap {
  // ... existing mappings ...
  // [HYGEN-INJECT:TYPEMAP]  ← 注入ポイント
}

// [HYGEN-INJECT:IMPORTS]  ← import注入ポイント
```

### container への注入

```typescript
// src/di/containers/application.container.ts

// [HYGEN-INJECT:IMPORTS]

// ... 既存の登録 ...
// [HYGEN-INJECT:REGISTER]  ← 登録注入ポイント
```

---

## 対話式プロンプト設計

### UseCase プロンプト例

```javascript
// _templates/usecase/new/prompt.js
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'UseCase名（例: CreateOrder）:',
    validate: (input) => input.length > 0 || '名前は必須です',
  },
  {
    type: 'input',
    name: 'domain',
    message: 'ドメイン名（例: order）:',
    validate: (input) => input.length > 0 || 'ドメインは必須です',
  },
  {
    type: 'confirm',
    name: 'withRepository',
    message: 'Repositoryを注入しますか？',
    default: true,
  },
  {
    type: 'input',
    name: 'repository',
    message: 'Repository名（例: Order）:',
    when: (answers) => answers.withRepository,
  },
];
```

---

## package.json スクリプト

```json
{
  "scripts": {
    "gen": "hygen",
    "gen:usecase": "hygen usecase new",
    "gen:entity": "hygen entity new",
    "gen:vo": "hygen value-object new",
    "gen:repo": "hygen repository new",
    "gen:action": "hygen server-action new",
    "gen:service": "hygen domain-service new",
    "gen:feature": "hygen feature new"
  }
}
```

---

## エラーハンドリング

### skip_if 条件

```ejs
---
to: src/layers/application/usecases/<%= domain %>/<%= Name %>UseCase.ts
skip_if: <%= Name %>UseCase
---
```

既に同名ファイルが存在する場合はスキップ。

### force オプション

```bash
# 上書き許可
pnpm gen:usecase --name CreateOrder --domain order --force
```

---

## 次のステップ

→ [04-templates.md](./04-templates.md) で各テンプレートの詳細仕様を確認
