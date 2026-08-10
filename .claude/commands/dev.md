# Development Planning Guide

新機能開発の計画・設計を支援します。

## 開発フロー

### Phase 1: 要件明確化

以下の観点で機能要件をヒアリングします:

- **機能の目的**: ユーザーストーリー、ビジネス価値
- **機能範囲**: 含む機能、含まない機能の境界
- **入出力仕様**: リクエスト/レスポンス、UI要件
- **既存機能との関係**: 影響範囲、依存関係
- **制約条件**: パフォーマンス、セキュリティ要件

### Phase 2: 設計検討

Clean Architecture + DDD に基づき、必要なコンポーネントを洗い出します:

#### Domain Layer
- **Entity**: ビジネスルールを持つドメインモデル
- **Value Object**: 不変な値オブジェクト（Email, UserId等）
- **Repository Interface**: データ永続化の抽象定義

#### Application Layer
- **UseCase**: ビジネスロジックの実行単位（Result型必須）
- **DTO**: リクエスト/レスポンス型定義
- **Application Service**: 複数UseCaseの調整

#### Infrastructure Layer
- **Repository Implementation**: Prismaを使ったデータアクセス
- **External Service**: API連携、メール送信等

#### Presentation Layer
- **Server Action**: フォーム処理、API呼び出し
- **UI Components**: ページ、フォーム、表示コンポーネント

### Phase 3: 実装計画

以下を含む実装計画書を作成します:

1. **ファイル一覧**: 作成/変更するファイルパス
2. **実装順序**: Domain → Application → Infrastructure → Presentation
3. **テスト計画**: ユニットテスト、E2Eテストの範囲
4. **タスクチェックリスト**: 実装項目の分割

## 出力形式

```markdown
# 機能名 実装計画書

## 1. 要件定義
- 目的:
- 入力:
- 出力:
- 制約:

## 2. アーキテクチャ設計

### Domain Layer
- [ ] Entity: path/to/entity.ts
- [ ] Value Object: path/to/vo.ts
- [ ] Repository Interface: path/to/interface.ts

### Application Layer
- [ ] UseCase: path/to/usecase.ts
- [ ] DTO: path/to/dto.ts

### Infrastructure Layer
- [ ] Repository: path/to/repo-impl.ts

### Presentation Layer
- [ ] Server Action: path/to/action.ts
- [ ] UI: path/to/page.tsx

## 3. 実装順序
1. Domain層のEntity/Value Object定義
2. Repository Interface定義
3. UseCase実装
4. Infrastructure実装 + DI登録
5. Server Action + UI実装
6. テスト作成

## 4. テスト計画
- [ ] Domain層: Entity/Value Objectのテスト
- [ ] Application層: UseCaseのテスト（カバレッジ94%+目標）
- [ ] Infrastructure層: Repository実装のテスト
- [ ] E2E: 主要フローのテスト
```

---

## 使い方

```bash
/dev
```

実行後、以下の情報を提供してください:
- 実装したい機能の概要
- 入力/出力の仕様（わかる範囲で）
- 既存機能との関係（あれば）

対話的に要件を明確化し、実装計画書を作成します。

---

**参考ドキュメント**:
- `_DOCS/guides/development/workflow.md`: 開発フロー全体
- `_DOCS/guides/code-generator.md`: Hygenテンプレート活用
- `_DOCS/architecture/overview.md`: アーキテクチャ概要
