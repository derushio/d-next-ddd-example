---
name: skill-navigator
description: |
  タスク・ファイル・機能の分類とナビゲーション。
  - タスク→適切なSkillの振り分け
  - ファイル→所属レイヤーの判定
  - 機能→アーキテクチャ上の配置判断

  トリガー例:
  - 「何から始めればいい」「どのスキルを使う」
  - 「このファイルはどのレイヤー」「どこに作ればいい」
  - 「この機能はどこに実装」「アーキテクチャ的に」
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Skill Navigator

タスク、ファイル、機能を分析し、最適なスキル・レイヤー・アーキテクチャ配置を判定するナビゲーションスキル。

---

## 🎯 このスキルの目的

- **タスク振り分け**: ユーザーの要求を分析し、適切なスキルを推薦
- **ファイル分類**: パスから所属レイヤーを即座に判定
- **機能配置判断**: 実装内容からアーキテクチャ上の配置場所を決定
- **ドキュメント案内**: 関連する_DOCSドキュメントを提示

---

## 📋 Part 1: タスク → スキル振り分け

ユーザーの要求を分析し、最適なスキルを判定します。

### クイック判定表

| タスクキーワード | 推薦スキル | 備考 |
|----------------|-----------|------|
| UseCase/Entity/Repository作成 | code-generation → best-practices | 新規は生成、編集は手動 |
| Server Action/UI実装 | best-practices / frontend-patterns | レイヤーに応じて選択 |
| テスト作成 | test-patterns | 全レイヤー対応 |
| コミット | commit-review | Conventional Commits |
| 設定・自動化 | claude-config-creator | .claude設定 |

### タスク別推薦スキル

| カテゴリ | タスク例 | 推薦スキル |
|---------|---------|-----------|
| **設計** | プロジェクト構造理解、レイヤー判定 | skill-navigator |
| **Domain** | Entity/VO作成、Repository Interface | code-generation / best-practices |
| **Application** | UseCase作成・編集 | code-generation / best-practices |
| **Infrastructure** | Repository実装、外部API連携 | code-generation / infrastructure-impl |
| **Presentation** | Server Action、FormData処理 | code-generation / best-practices |
| **Frontend** | UIコンポーネント、フォーム | frontend-patterns / best-practices |
| **テスト** | 全レイヤーのテスト作成 | test-patterns |
| **コミット** | コードレビュー、コミットメッセージ | commit-review |
| **設定** | .claude設定、自動化 | claude-config-creator |

**詳細はreferences/skill-catalog.mdを参照してください。**

---

## 📂 Part 2: ファイルパス → レイヤー判定

ファイルパスから所属レイヤーを即座に判定します。

### 判定ルール

```typescript
function determineLayer(filePath: string): Layer {
  if (filePath.includes('/layers/domain/')) return 'Domain';
  if (filePath.includes('/layers/application/')) return 'Application';
  if (filePath.includes('/layers/infrastructure/')) return 'Infrastructure';
  if (filePath.includes('/layers/presentation/')) return 'Presentation';
  if (filePath.includes('/components/')) return 'Frontend';
  if (filePath.includes('/app/')) return 'Pages/API Routes';
  if (filePath.includes('/di/')) return 'DI Container';
  if (filePath.includes('/utils/')) return 'Utilities';
  if (filePath.includes('/hooks/')) return 'Custom Hooks';
  return 'Unknown';
}
```

### レイヤー別特性一覧

| レイヤー | パス | 責務 | 依存方向 | 主要スキル |
|---------|------|------|---------|-----------|
| **Domain** | `src/layers/domain/` | ビジネスルール、Entity、Value Object、Repository Interface | **独立** (他レイヤーへの依存禁止) | best-practices, code-generation |
| **Application** | `src/layers/application/` | UseCase、DTO、ビジネスフロー制御 | Domain ← | best-practices, code-generation, test-patterns |
| **Infrastructure** | `src/layers/infrastructure/` | Repository実装、外部サービス、技術的実装 | Domain ← (DIP) | best-practices, code-generation |
| **Presentation** | `src/layers/presentation/` | Server Actions、FormData処理、UI連携 | Application ← | best-practices, code-generation |
| **Frontend** | `src/components/` | UI表示、ユーザー入力処理 | Presentation ← | best-practices |
| **Pages/API** | `src/app/` | Next.js App Router、ルーティング | 全レイヤー可 (統合層) | best-practices |

### 依存関係ルール（Biome強制）

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                         (依存性逆転の原則)
```

**禁止されているimport**:
- Domain層: Application/Infrastructure/Presentation への import 禁止
- Application層: Infrastructure/Presentation への import 禁止
- Infrastructure層: Presentation への import 禁止

---

## 🧩 Part 3: 機能 → 配置場所判定

実装したい機能内容から、アーキテクチャ上の配置場所を判定します。

### 判定フローチャート

```
実装したい機能内容
    ↓
[性質分析]
    ↓
    ├─ ビジネスルール? → Domain層
    │   └─ 不変条件・制約・エンティティ
    │
    ├─ ビジネスフロー? → Application層
    │   └─ 複数ドメインオブジェクトの調整
    │
    ├─ 技術的実装? → Infrastructure層
    │   └─ DB、外部API、ファイルI/O
    │
    ├─ UI連携? → Presentation層
    │   └─ FormData処理、Server Actions
    │
    └─ 表示・入力? → Frontend層
        └─ React Component、CSS
```

### 機能分類判定表

| 機能の性質 | 配置レイヤー | 具体例 | 関連ドキュメント |
|-----------|-------------|-------|----------------|
| **不変条件・制約** | Domain | メールアドレス形式検証、パスワード強度チェック | `_DOCS/guides/ddd/layers/components/value-objects.md` |
| **エンティティ** | Domain | User、Product、Orderの定義 | `_DOCS/guides/ddd/layers/components/entities.md` |
| **ビジネスロジック** | Domain | 割引計算、ポイント算出、在庫判定 | `_DOCS/guides/ddd/layers/domain-layer.md` |
| **ユースケース** | Application | ユーザー登録、商品購入、レポート生成 | `_DOCS/guides/ddd/layers/components/use-cases.md` |
| **ワークフロー** | Application | 複数エンティティの調整、トランザクション制御 | `_DOCS/guides/ddd/layers/application-layer.md` |
| **DB操作** | Infrastructure | Prismaによるデータ永続化 | `_DOCS/guides/ddd/layers/components/repository-implementations.md` |
| **外部API** | Infrastructure | 決済API、メール送信、S3アップロード | `_DOCS/guides/ddd/layers/components/external-services.md` |
| **認証・認可** | Infrastructure | JWT検証、セッション管理 | `_DOCS/guides/ddd/layers/components/security-services.md` |
| **Server Actions** | Presentation | FormData受取、UseCase呼び出し、リダイレクト | `_DOCS/guides/ddd/layers/components/server-actions.md` |
| **UI表示** | Frontend | ボタン、フォーム、モーダル | `_DOCS/guides/frontend-best-practices.md` |
| **状態管理** | Frontend | useState、useContext、カスタムフック | - |

### 判定の具体例

#### ケース1: ユーザー登録機能

```
要件: メールアドレスとパスワードでユーザー登録

判定結果:
1. Domain層
   - Email (Value Object): メールアドレス形式検証
   - Password (Value Object): パスワード強度検証
   - User (Entity): ユーザーエンティティ
   - IUserRepository (Interface): 永続化の抽象化

2. Application層
   - CreateUserUseCase: 登録フロー制御
   - CreateUserRequest/Response (DTO): データ転送

3. Infrastructure層
   - UserRepository (実装): Prismaによる永続化
   - HashService: パスワードハッシュ化

4. Presentation層
   - createUserAction (Server Action): フォーム処理

5. Frontend層
   - SignUpForm (Component): 入力UI
```

**詳細な判定例はreferences/layer-decision-tree.mdを参照してください。**

---

## 📚 Part 4: ドキュメントナビゲーション

タスク・レイヤー・機能に応じた関連ドキュメントを案内します。

### アーキテクチャ理解

| 目的 | ドキュメント | 内容 |
|------|-------------|------|
| 全体構造理解 | `_DOCS/architecture/overview.md` | プロジェクトアーキテクチャ概要 |
| 設計原則 | `_DOCS/architecture/principles.md` | SOLID、DDD原則 |
| レイヤー詳細 | `_DOCS/architecture/layers/overview.md` | 各レイヤーの役割 |
| Clean Architecture | `_DOCS/guides/ddd/concepts/clean-architecture.md` | Clean Architecture詳細 |
| DDD基礎 | `_DOCS/guides/ddd/concepts/domain-driven-design.md` | ドメイン駆動設計 |
| DI基礎 | `_DOCS/guides/ddd/concepts/whats-di.md` | 依存性注入の基本 |

### レイヤー別実装ガイド

| レイヤー | ドキュメント | 内容 |
|---------|-------------|------|
| Domain | `_DOCS/guides/ddd/layers/domain-layer.md` | Domain層全体ガイド |
| Domain (Entity) | `_DOCS/guides/ddd/layers/components/entities.md` | エンティティ実装 |
| Domain (VO) | `_DOCS/guides/ddd/layers/components/value-objects.md` | 値オブジェクト実装 |
| Domain (Repo Interface) | `_DOCS/guides/ddd/layers/components/repository-interfaces.md` | Repository抽象化 |
| Application | `_DOCS/guides/ddd/layers/application-layer.md` | Application層全体ガイド |
| Application (UseCase) | `_DOCS/guides/ddd/layers/components/use-cases.md` | ユースケース実装 |
| Infrastructure | `_DOCS/guides/ddd/layers/infrastructure-layer.md` | Infrastructure層全体ガイド |
| Infrastructure (Repo) | `_DOCS/guides/ddd/layers/components/repository-implementations.md` | Repository実装 |
| Infrastructure (External) | `_DOCS/guides/ddd/layers/components/external-services.md` | 外部サービス連携 |
| Infrastructure (Security) | `_DOCS/guides/ddd/layers/components/security-services.md` | 認証・認可実装 |
| Presentation | `_DOCS/guides/ddd/layers/presentation-layer.md` | Presentation層全体ガイド |
| Presentation (Server Action) | `_DOCS/guides/ddd/layers/components/server-actions.md` | Server Actions実装 |
| Frontend | `_DOCS/guides/frontend-best-practices.md` | フロントエンド実装 |

### 横断的関心事

| トピック | ドキュメント | 内容 |
|---------|-------------|------|
| エラーハンドリング | `_DOCS/guides/ddd/cross-cutting/error-handling.md` | Result型パターン |
| ログ戦略 | `_DOCS/guides/ddd/cross-cutting/logging-strategy.md` | ロギング実装 |
| セキュリティ | `_DOCS/guides/ddd/cross-cutting/security.md` | セキュリティ対策 |
| DI設定 | `_DOCS/architecture/patterns/dependency-injection.md` | TSyringe設定 |

### テスト関連

| 目的 | ドキュメント | 内容 |
|------|-------------|------|
| テスト戦略 | `_DOCS/testing/strategy.md` | テスト方針全体 |
| ユニットテスト | `_DOCS/testing/unit/overview.md` | ユニットテスト基礎 |
| モック | `_DOCS/testing/unit/mocking.md` | vitest-mock-extended詳細 |
| E2Eテスト | `_DOCS/guides/e2e-testing-guide.md` | Playwrightテスト |
| Clean Architecture テスト | `_DOCS/guides/testing-with-clean-architecture.md` | アーキテクチャとテスト |

### ツール・開発環境

| 目的 | ドキュメント | 内容 |
|------|-------------|------|
| 開発フロー | `_DOCS/guides/development/workflow.md` | 開発の流れ |
| 初回セットアップ | `_DOCS/guides/setup.md` | 環境構築手順 |
| コード生成 | `_DOCS/guides/code-generator.md` | Hygen使用方法 |
| コマンド一覧 | `_DOCS/reference/commands.md` | pnpm/makeコマンド |
| 環境変数 | `_DOCS/reference/environment-variables.md` | .env設定 |

---

## 🚀 使用例

### ユーザー登録機能を実装したい

```
タスク分析 → 新規機能実装（複数レイヤー）

レイヤー判定:
  Domain: Email, User Entity, IUserRepository
  Application: CreateUserUseCase
  Infrastructure: UserRepository
  Presentation: createUserAction
  Frontend: SignUpForm

スキル推薦:
  新規: code-generation (gen:entity, gen:usecase, gen:repo, gen:action)
  編集: best-practices

ドキュメント案内:
  _DOCS/guides/development/first-feature.md
```

**その他の使用例はreferences/skill-catalog.mdとlayer-decision-tree.mdを参照してください。**

---

## 📖 関連リソース

- **[Skill Catalog](./references/skill-catalog.md)** - 全スキル一覧と概要
- **[Layer Decision Tree](./references/layer-decision-tree.md)** - レイヤー判定詳細フローチャート

---

**🧭 適切なスキル・レイヤー・配置を判定し、効率的な実装を支援します！**
