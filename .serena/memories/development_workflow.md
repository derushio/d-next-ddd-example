# 開発ワークフロー

## 🚀 開発開始時の手順

### 1. 環境準備

```bash
# 依存関係インストール
pnpm install

# 環境設定
cp .env.example .env
# .env ファイルを編集して必要な環境変数を設定

# データベースセットアップ
make dev
pnpm db:migrate:dev
pnpm db:seed
```

### 2. 開発サーバー起動

```bash
# 重要: 3000ポートで起動中かを事前確認
pnpm dev  # Turbopack + DB生成ウォッチ + Prisma Studio
```

## 📋 機能実装ワークフロー

### 新機能開発の標準手順

#### Step 1: 要件分析・設計

1. **ドキュメント確認**: CLAUDE.mdのタスクマップから該当ドキュメント読み込み
2. **アーキテクチャ検討**: どのレイヤーに実装するか決定
3. **依存関係確認**: 必要なサービス・リポジトリの洗い出し

#### Step 2: Domain Layer実装

```bash
# 1. Value Object作成（必要に応じて）
# src/layers/domain/value-objects/

# 2. Entity作成・更新
# src/layers/domain/entities/

# 3. Repository Interface定義
# src/layers/domain/repositories/

# 4. Domain Service実装（必要に応じて）
# src/layers/domain/services/
```

#### Step 3: Infrastructure Layer実装

```bash
# 1. Repository実装
# src/layers/infrastructure/repositories/implementations/

# 2. DI設定更新
# src/layers/infrastructure/di/tokens.ts
# src/layers/infrastructure/di/containers/

# 3. データベーススキーマ更新（必要に応じて）
# prisma/schema.prisma
pnpm db:migrate:dev
```

#### Step 4: Application Layer実装

```bash
# 1. DTO定義
# UseCase内でRequest/Response型定義

# 2. UseCase実装（Result型必須）
# src/layers/application/usecases/

# 3. Application Service実装（必要に応じて）
# src/layers/application/services/
```

#### Step 5: Presentation Layer実装

```bash
# 1. Server Action実装
# src/app/server-actions/

# 2. Page Component実装
# src/app/.../page.tsx

# 3. UI Component実装（必要に応じて）
# src/components/features/
```

### 実装時の注意点

- **Result型**: 全UseCaseでResult<T>を返却
- **DI**: @injectable()とresolve()の適切な使用
- **インポート**: alias使用必須、相対パス禁止
- **Client Component**: 最小限に抑制、ドーナツ構造

## 🧪 テスト実装ワークフロー

### テスト作成順序

1. **Domain Layer**: Entity、Value Objectのテスト
2. **Application Layer**: UseCaseのテスト（vitest-mock-extended使用）
3. **Infrastructure Layer**: Repository実装のテスト
4. **E2E**: 主要ユーザーフローのテスト（Playwright）

### テスト実装パターン

```typescript
// 推奨：vitest-mock-extended使用
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMockRepository } from '@tests/utils/mocks/autoMocks';

describe('UseCase', () => {
 setupTestEnvironment(); // DIコンテナリセット必須

 let useCase: UseCase;
 let mockRepository: MockProxy<IRepository>;

 beforeEach(() => {
  mockRepository = createAutoMockRepository();
  container.registerInstance(INJECTION_TOKENS.Repository, mockRepository);
  useCase = container.resolve(UseCase);
 });

 // Result型対応テスト
 it('should execute successfully', async () => {
  const result = await useCase.execute(validInput);
  expect(isSuccess(result)).toBe(true);
 });
});
```

## 🔄 品質保証ワークフロー

### 開発中の継続的チェック

```bash
# コード品質チェック（開発中随時実行）
pnpm format       # Prettier実行
pnpm type-check   # TypeScript型チェック
pnpm lint         # ESLint実行

# テスト実行（機能実装後）
pnpm test:unit    # ユニットテスト
pnpm test:watch   # ウォッチモードでのテスト
```

### プルリクエスト前の最終チェック

```bash
# 包括的品質チェック
pnpm check        # format → type-check → lint → test:unit

# E2Eテスト（主要機能変更時）
pnpm test:e2e

# 本番ビルド確認
pnpm build
```

## 🔧 トラブルシューティング時のワークフロー

### よくある問題と解決手順

#### 1. DI関連エラー

- `reflect-metadata`のインポート確認
- トークン定義の確認（tokens.ts）
- コンテナ登録の確認

#### 2. Prismaエラー

```bash
pnpm db:generate  # クライアント再生成
pnpm db:push      # スキーマプッシュ
```

#### 3. テストエラー

- `setupTestEnvironment()`の呼び出し確認
- モック設定の確認
- DIコンテナのリセット確認

## 📦 リリース・デプロイワークフロー

### 1. リリース準備

```bash
# 最終品質チェック
pnpm check
pnpm test

# 本番ビルド確認
pnpm build

# ドキュメント更新確認
# _DOCS/ は読み取り専用（テンプレート配布物）。更新対象は README や独自ドキュメント
```

### 2. コミット・プッシュ

```bash
git add .
git commit -m "feat: 新機能の追加

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

## 🎯 効率的な開発のコツ

### 開発速度向上

- **CLAUDE.md**: 常に参照、タスクマップ活用
- **\_DOCS/**: 詳細実装パターンの確認
- **vitest-mock-extended**: 自動モック活用でテスト高速化
- **shadcn/ui**: UI開発の効率化

### コード品質維持

- **Result型**: 一貫したエラーハンドリング
- **ESLint**: 自動設定による品質保証
- **TypeScript strict**: 型安全性の確保
- **定期的リファクタリング**: 技術的負債の解消

**🚀 このワークフローに従うことで、高品質で保守性の高いアプリケーションを効率的に開発できます！**
