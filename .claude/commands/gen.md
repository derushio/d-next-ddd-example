# コード生成ガイド

> **説明**: Hygenコード生成ツールの対話的ガイド

**`code-generation` スキルが自動適用されます。**

このコマンドでは、適切なコード生成コマンドを対話的に選択・実行し、Clean Architecture + DDD構造に準拠したコードを自動生成します。

## 利用可能なコマンド

| コマンド | 説明 | 生成内容 |
|---------|------|---------|
| `pnpm gen:usecase` | UseCase + テスト + DI登録 | Application Layer (UseCases, DTOs) |
| `pnpm gen:entity` | Entity + EntityId + テスト | Domain Layer (Entities) |
| `pnpm gen:repo` | Repository Interface + Prisma実装 + テスト + DI登録 | Domain + Infrastructure Layers |
| `pnpm gen:action` | Server Action + テスト | Presentation Layer (Server Actions) |
| `pnpm gen:vo` | Value Object + テスト | Domain Layer (Value Objects) |

## 実行フロー

### 1. 生成対象の確認

まず、ユーザーに生成したいコンポーネントの種類を質問してください:

**質問**: 何を生成しますか？
- UseCase（ビジネスロジック）
- Entity（ドメインエンティティ）
- Repository（データアクセス層）
- Server Action（プレゼンテーション層）
- Value Object（値オブジェクト）

### 2. 必要情報の収集

選択されたコンポーネントに応じて、対話的に以下の情報を収集してください:

#### UseCase生成時
- UseCase名（例: CreateUser, SignIn）
- カテゴリ/ドメイン（例: auth, user, product）
- 必要な依存関係（Repository等）

#### Entity生成時
- Entity名（例: User, Product）
- プロパティリスト

#### Repository生成時
- Repository名（例: User, Product）
- 対応するEntity名

#### Server Action生成時
- Action名（例: signIn, createUser）
- カテゴリ（例: auth, user）

#### Value Object生成時
- Value Object名（例: Email, PhoneNumber）
- バリデーションルール

### 3. コマンド実行

収集した情報を基に適切な`gen:xxx`コマンドを実行してください。

### 4. 生成後の確認

以下を確認してください:
- [x] ファイルが正しい場所に生成されているか
- [x] DI登録が必要な場合、`src/di/register.ts`に登録されているか
- [x] テストファイルが生成されているか
- [x] `pnpm check`でエラーが出ないか

### 5. テスト実行

```bash
pnpm test:unit
```

生成されたテストが正常に実行されることを確認してください。

## 注意事項

- 生成されたコードは**テンプレート**です。必要に応じてカスタマイズしてください
- **Result型パターン**を必ず使用してください（UseCaseで必須）
- **インポートは`@/`エイリアス**を使用してください（相対パス禁止）
- 生成後は**必ず`pnpm check`を実行**してください

## 参考ドキュメント

詳細は以下のドキュメントを参照してください:
- コード生成ツール全体: `_DOCS/guides/code-generator.md`
- UseCase: `_DOCS/guides/ddd/layers/components/use-cases.md`
- Entity: `_DOCS/guides/ddd/layers/components/entities.md`
- Repository: `_DOCS/guides/ddd/layers/components/repository-implementations.md`
- Server Actions: `_DOCS/guides/ddd/layers/components/server-actions.md`
- Value Objects: `_DOCS/guides/ddd/layers/components/value-objects.md`
