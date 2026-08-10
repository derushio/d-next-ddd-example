---
name: code-generation
description: |
  Hygenコード生成ツール（UseCase, Entity, Repository, Server Action, Value Object）の
  対話的ガイド。gen:usecase, gen:entity等のコマンド実行支援。

  トリガー例:
  - 「コード生成」「UseCase作成」「Entity作成」「Repository追加」
  - 「gen:usecase実行」「Hygen使いたい」
---

# Code Generation Skill

Hygenベースのコード生成ツールを使用して、Clean Architecture + DDDパターンに準拠したボイラープレートコードを自動生成するスキルです。

---

## 🎯 このスキルの目的

ユーザーが新しいコードを生成する際に、適切なHygenコマンドを選択し、対話形式で必要な情報を収集してコード生成を支援します。

---

## 📋 Phase 1: 要件ヒアリング

### 1.1 生成したいコンポーネントの種類

| コマンド | 目的 | 生成対象 |
|---------|------|---------|
| `pnpm gen:usecase` | ビジネスロジック | UseCase + テスト + DI登録 |
| `pnpm gen:entity` | ドメインモデル | Entity + EntityId + テスト |
| `pnpm gen:repo` | データ永続化 | Repository Interface + Prisma実装 + テスト + DI登録 |
| `pnpm gen:action` | Server Action | Server Action + テスト |
| `pnpm gen:vo` | Value Object | Value Object + テスト |

### 1.2 コンテキストの確認

```
質問:
- どのドメイン（機能領域）に属しますか？
  例: auth, order, user, product

- 既存のコードと関連していますか？
  - 関連するEntity/Repository/UseCaseは存在しますか？

- 依存する外部要素はありますか？
  - Repositoryが必要ですか？
  - 他のUseCaseを呼び出しますか？
```

---

## 🛠️ Phase 2: コマンド実行ガイド

### 2.1 UseCase生成

```bash
pnpm gen:usecase
```

**対話プロンプト**:
1. `UseCase名`: PascalCase（例: `CreateOrder`）
2. `ドメイン名`: 小文字（例: `order`）
3. `Repository注入`: y/N（確認形式、デフォルト: true）
4. `Repository名`: PascalCase（例: `Order`）

**生成ファイル**: UseCase, テスト, DI登録

**非対話式**:
```bash
pnpm gen:usecase --name CreateOrder --domain order --withRepository true --repository Order
```

---

### 2.2 Entity生成

```bash
pnpm gen:entity
```

**対話プロンプト**:
1. `Entity名`: PascalCase（例: `Order`）

**生成ファイル**: Entity, EntityId, テスト

**注意点**:
- Repository生成の前に作成
- EntityIdは自動生成（UUID v4）

---

### 2.3 Repository生成

```bash
pnpm gen:repo
```

**対話プロンプト**:
1. `Entity名`: PascalCase（例: `Order`）

**生成ファイル**: Repository Interface, Prisma実装, テスト, DI登録

**前提条件**:
- 対応するEntityとEntityIdが存在
- Prismaスキーマにモデルが定義済み

---

### 2.4 Server Action生成

```bash
pnpm gen:action
```

**対話プロンプト**:
1. `Action名`: camelCase（例: `createOrder`）
2. `ドメイン名`: 小文字（例: `order`）
3. `UseCase名`: PascalCase（例: `CreateOrder`）

**生成ファイル**: Server Action, テスト

**前提条件**: 対応するUseCaseが存在

---

### 2.5 Value Object生成

```bash
pnpm gen:vo
```

**対話プロンプト**:
1. `Value Object名`: PascalCase（例: `Email`）
2. `内部値の型`: `string` | `number` | `boolean` | `Date`

**生成ファイル**: Value Object, テスト

**Value Objectの例**: Email, Money, PhoneNumber, Age

---

## 🔄 Phase 3: 典型的なワークフロー

### 3.1 新しいドメインエンティティを追加する場合

```bash
# 1. Entity生成
pnpm gen:entity --name Order

# 2. Repository生成
pnpm gen:repo --name Order

# 3. Prismaスキーマ更新
# prisma/schema.prisma に Order モデルを追加

# 4. マイグレーション実行
pnpm db:migrate:dev

# 5. UseCase生成
pnpm gen:usecase --name CreateOrder --domain order --withRepository true --repository Order

# 6. Server Action生成
pnpm gen:action --name createOrder --domain order --usecase CreateOrder

# 7. 型チェック
pnpm type-check
```

### 3.2 既存エンティティに新しいUseCaseを追加

```bash
# 1. UseCase生成（既存Repositoryを注入）
pnpm gen:usecase --name UpdateOrderStatus --domain order --withRepository true --repository Order

# 2. Server Action生成
pnpm gen:action --name updateOrderStatus --domain order --usecase UpdateOrderStatus

# 3. 型チェック
pnpm type-check
```

### 3.3 Value Objectを追加

```bash
# 1. Value Object生成
pnpm gen:vo --name OrderStatus --type string

# 2. Entityに統合（手動編集）
# src/layers/domain/entities/Order.ts に OrderStatus を import

# 3. テスト実行
pnpm test:unit
```

---

## ✅ Phase 4: 生成後の確認チェックリスト

### 4.1 必須確認事項

```
- [ ] 生成されたファイルが期待通りの場所に配置された
- [ ] DI登録が正しく行われた（UseCase/Repository）
- [ ] TODOコメントを確認し、必要な実装を追加
- [ ] テストファイルが生成された
- [ ] import文が `@/` alias形式になっている
```

### 4.2 DI登録の確認（UseCase/Repository生成時）

**確認箇所**:

1. `src/di/tokens.ts`: Token追加、`ServiceTypeMap` への型マッピング追加
2. `src/di/containers/application.container.ts`: UseCase登録（UseCase生成時）
3. `src/di/containers/infrastructure.container.ts`: Repository登録（Repository生成時）

### 4.3 生成コードの品質チェック

```bash
# 型チェック
pnpm type-check

# 全体チェック（format + type-check + lint + test:unit）
pnpm check
```

---

## 🚨 Phase 5: トラブルシューティング

### 5.1 inject が動作しない

**原因**: マーカーコメントが削除された

**解決策**: 以下のマーカーコメントを確認・復元

```typescript
// src/di/tokens.ts
// [HYGEN:USECASE_TOKENS]
// [HYGEN:USECASE_TYPEMAP]
// [HYGEN:REPO_TOKENS]
// [HYGEN:REPO_TYPEMAP]

// src/di/containers/application.container.ts
// [HYGEN:USECASE_IMPORTS]
// [HYGEN:USECASE_REGISTER]

// src/di/containers/infrastructure.container.ts
// [HYGEN:REPO_IMPORTS]
// [HYGEN:REPO_REGISTER]
```

### 5.2 型エラーが発生

**原因**: TODOコメント箇所が未実装

**解決策**: 生成されたファイルのTODOコメントを実装

### 5.3 重複生成される

**原因**: `skip_if` が機能していない

**解決策**: 既存ファイルを削除してから再生成

### 5.4 Repositoryのテストが失敗

**原因**: Prismaスキーマに対応するモデルが未定義

**解決策**:
1. `prisma/schema.prisma` にモデルを追加
2. `pnpm db:migrate:dev` を実行
3. `pnpm db:generate` を実行（内部で `prisma generate --sql` が実行される。TypedSQL対応）

---

## 📚 Phase 6: 参考情報

### 6.1 命名規約

| 要素 | 規約 | 例 |
|------|------|-----|
| UseCase名 | PascalCase | `CreateOrder`, `UpdateUserProfile` |
| Entity名 | PascalCase | `Order`, `User`, `Product` |
| Repository名 | PascalCase（Entity名と一致） | `Order`, `User` |
| Server Action名 | camelCase | `createOrder`, `updateUserProfile` |
| Value Object名 | PascalCase | `Email`, `Money`, `OrderStatus` |
| ドメイン名 | lowercase | `order`, `user`, `product` |

### 6.2 テンプレートのカスタマイズ

テンプレートは `_templates/` ディレクトリに格納:

```
_templates/
├── usecase/new/
├── entity/new/
├── repository/new/
├── server-action/new/
└── value-object/new/
```

EJS形式で記述。プロジェクト固有のカスタマイズが可能。

### 6.3 ヘルパー関数（.hygen.js）

```javascript
h.toPascalCase(str)   // 'createOrder' → 'CreateOrder'
h.toCamelCase(str)    // 'CreateOrder' → 'createOrder'
h.toUpperSnake(str)   // 'CreateOrder' → 'CREATE_ORDER'
h.toKebabCase(str)    // 'CreateOrder' → 'create-order'
h.today()             // '2024-01-01'
```

---

## 🔍 詳細ガイド

より詳細な情報は以下を参照してください:

- **詳細ガイド**: `references/detailed-guide.md` - 生成コード例、テンプレート構造、実践例
- **プロジェクトドキュメント**: `_DOCS/guides/code-generator.md`
- **UseCase実装**: `_DOCS/guides/ddd/layers/components/use-cases.md`
- **Repository実装**: `_DOCS/guides/ddd/layers/components/repository-implementations.md`

---

## ✨ 実行フロー例

```
ユーザー: 「Order機能を作りたい」

アシスタント:
1. 「何を生成しますか？Entity/UseCase/Repository?」
2. 「Entity名は何ですか？（例: Order）」
3. → Entity生成
4. → Repository生成
5. 「Prismaスキーマを更新してください」
6. 「UseCase名は何ですか？（例: CreateOrder）」
7. → UseCase生成
8. 「Server Actionを生成しますか？」
9. → Server Action生成
10. → 型チェック実行
11. 「生成完了！TODOコメントを確認して実装を完成させてください」
```

---

**このスキルを通じて、効率的かつ一貫性のあるコード生成を実現してください。**
