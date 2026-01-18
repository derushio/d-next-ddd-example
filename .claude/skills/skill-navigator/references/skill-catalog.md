# Skill Catalog

このプロジェクトで利用可能な全スキルの一覧と概要。

---

## 🎯 ナビゲーション・メタスキル

### skill-navigator（本スキル）

**目的**: タスク・ファイル・機能の分類とナビゲーション

**機能**:
- タスク → 適切なスキルへの振り分け
- ファイルパス → 所属レイヤーの判定
- 機能内容 → アーキテクチャ上の配置場所決定
- 関連ドキュメントへの案内

**トリガー**:
- 「何から始めればいい」「どのスキルを使う」
- 「このファイルはどのレイヤー」「どこに作ればいい」
- 「この機能はどこに実装」「アーキテクチャ的に」

**ステータス**: ✅ 実装済み

---

## 🏗️ アーキテクチャ・実装支援スキル

### best-practices

**目的**: Clean Architecture + DDD のベストプラクティスを自動適用

**機能**:
- Phase 1: あるべき姿を考える（実装前必須）
- Phase 2: アーキテクチャ原則（レイヤー構造、DIP、DRY）
- Phase 3: コンポーネント分離（SRP、React分離、ドーナツ構造）
- Phase 4: ファイルサイズと構成管理
- Phase 5: 日本語コメント規約
- Phase 6: 実装チェックリスト

**トリガー**:
- 「実装したい」「機能を作りたい」「コードを書きたい」
- 「UseCase」「Entity」「Repository」「Server Action」
- 「アーキテクチャ」「設計」「リファクタリング」
- src/layers/ 配下のファイルを編集・作成するとき

**ステータス**: ✅ 実装済み

### coding-standards

**目的**: コーディング規約の自動適用

**機能**:
- Import Rules（@/ alias必須、相対パス禁止）
- 命名規約（ファイル名、変数名、関数名）
- CSS規約（cursor-pointer、TailwindCSS v4）
- コメント規約（Why重視、引数インラインコメント）

**トリガー**:
- 「コーディング規約を確認」「スタイル規約」「命名規則」
- 「import文の書き方」「cursor-pointerルール」
- コードファイルを作成・編集するとき（軽量なので常時適用OK）

**ステータス**: ✅ 実装済み

---

## 🎨 レイヤー別実装スキル（計画中）

### application-impl（計画中）

**目的**: Application層（UseCase、DTO、Services）の実装パターン

**機能**:
- UseCase実装: ビジネスフロー制御、Result型パターン
- DTO設計: レイヤー間データ変換
- Application Services: 複数ドメインの調整

**トリガー**:
- 「UseCaseを実装」「ビジネスフロー」「Result型」
- src/layers/application/ 配下のファイル編集時

**ステータス**: 🚧 計画中（現在は best-practices で対応）

### domain-impl（計画中）

**目的**: Domain層（Entity、Value Object、Repository Interface）の実装パターン

**機能**:
- Entity設計: ビジネスルールのカプセル化
- Value Object: 不変条件・制約の実装
- Repository Interface: 永続化の抽象化
- Domain Services: ドメインロジック

**トリガー**:
- 「Entityを作成」「Value Object」「Repository Interface」
- src/layers/domain/ 配下のファイル編集時

**ステータス**: 🚧 計画中（現在は best-practices で対応）

### infrastructure-impl

**目的**: Infrastructure層の実装パターン

**機能**:
- Repository実装: Prismaによる永続化
- 外部サービス連携: API、メール、ストレージ
- セキュリティサービス: 認証、認可、暗号化
- DIP遵守: Domain層への依存性逆転

**トリガー**:
- 「Repository実装」「Prisma」「外部API」
- 「Infrastructure層」「データベース」
- src/layers/infrastructure/ 配下のファイル編集時

**ステータス**: ✅ 実装済み

### presentation-impl（計画中）

**目的**: Presentation層（Server Actions）の実装パターン

**機能**:
- Server Actions: FormData処理、UseCase呼び出し
- バリデーション: Zod等による入力検証
- レスポンス処理: リダイレクト、エラーハンドリング

**トリガー**:
- 「Server Actionを実装」「FormData処理」
- src/layers/presentation/ 配下のファイル編集時

**ステータス**: 🚧 計画中（現在は best-practices で対応）

### frontend-patterns

**目的**: Next.js App Router + shadcn/ui + TailwindCSS v4 でのフロントエンド実装パターン

**機能**:
- ドーナツ構造: Server Component優先、Client Component最小化
- shadcn/ui活用: カスタマイズ済みコンポーネント
- TailwindCSS v4: CSS変数、クラス名結合
- 状態管理: useState、useContext、カスタムフック

**トリガー**:
- 「UI実装」「コンポーネント作成」「Server Component」「Client Component」
- 「ページ作成」「フォーム実装」「shadcn/ui使いたい」
- src/app/, src/components/ 配下のファイルを編集するとき

**ステータス**: ✅ 実装済み

---

## 🧪 テストスキル

### test-patterns

**目的**: vitest-mock-extended、setupTestEnvironment、Result型テストのベストプラクティス自動適用

**機能**:
- vitest-mock-extended: 型安全な自動モック生成
- setupTestEnvironment: DI環境分離
- Result型テスト: isSuccess/isFailure パターン
- レイヤー別カバレッジ目標: Application 94%+, Domain 90%+, Infrastructure 85%+

**トリガー**:
- 「テストを書きたい」「テスト作成」「ユニットテスト」
- *.test.ts ファイルを作成・編集するとき
- 「モック」「mock」「スタブ」
- 「Result型のテスト」「成功/失敗ケース」
- 「UseCase テスト」「Repository テスト」
- 「カバレッジ向上」「テストケース追加」

**ステータス**: ✅ 実装済み

---

## 📝 コミット・レビュースキル

### commit-review

**目的**: コミット前のコードレビュー観点とConventional Commits形式を自動適用

**機能**:
- コード品質チェック: 命名、SRP、DRY
- セキュリティチェック: 機密情報、脆弱性
- パフォーマンスチェック: ループ、メモリリーク
- 保守性チェック: 型定義、エラーハンドリング
- Conventional Commits: 統一的コミットメッセージ形式

**トリガー**:
- 「コミット」「commit」「変更をレビュー」
- 「コード品質をチェック」「セキュリティ確認」
- git diff/git statusの結果を見るとき

**ステータス**: ✅ 実装済み

---

## 🛠️ コード生成・自動化スキル

### code-generation

**目的**: Hygen コード生成ツールの対話的ガイド

**機能**:
- gen:usecase: UseCase + テスト + DI登録
- gen:entity: Entity + EntityId + テスト
- gen:repo: Repository Interface + Prisma実装 + テスト + DI登録
- gen:action: Server Action + テスト
- gen:vo: Value Object + テスト

**トリガー**:
- 「コード生成」「UseCase作成」「Entity作成」「Repository追加」
- 「gen:usecase実行」「Hygen使いたい」

**ステータス**: ✅ 実装済み

### claude-config-creator

**目的**: Claude Codeの.claude設定（commands, skills, agents, hooks）を作成・管理

**機能**:
- Command作成: カスタムCLIコマンド定義
- Skill作成: 自動適用される専門スキル定義
- Agent作成: 並列実行・専門タスクエージェント定義
- Hook作成: ファイル保存・コミット時の自動処理定義

**トリガー**:
- 「コマンドを作りたい」「/xxxを作って」
- 「スキルを作成」「自動で適用されるようにしたい」
- 「エージェントを作りたい」「専門家として動いてほしい」「並列で実行したい」
- 「フック/hookを設定」「ファイル保存時に自動で」「イベント駆動で」
- 「Claude Codeをカスタマイズ」「自動化したい」「設定を作って」
- 「.claudeディレクトリを設定」

**ステータス**: ✅ 実装済み

---

## 🔧 ユーティリティスキル

### drawio-export

**目的**: draw.io ファイルを画像にエクスポート

**機能**:
- .drawio → PNG/SVG変換
- CI/CD統合

**トリガー**:
- 「drawioを画像に変換」「エクスポート」

**ステータス**: ✅ 実装済み

### commit（スマートコミット）

**目的**: Smart Commit Command（自動レビュー + Conventional Commits）

**機能**:
- 自動レビュー: commit-review スキルを内部実行
- 自動コミット: 問題なければ自動コミット
- 統一フォーマット: Conventional Commits形式

**トリガー**:
- 「コミットして」「変更を保存」

**ステータス**: ✅ 実装済み（コマンド形式）

---

## 🎓 スキル選択ガイド

### 実装タスクのスキル選択フロー

```
実装タスク
    ↓
新規作成？
    ├─ YES → code-generation
    │         ├─ UseCase → pnpm gen:usecase
    │         ├─ Entity → pnpm gen:entity
    │         ├─ Repository → pnpm gen:repo
    │         ├─ Server Action → pnpm gen:action
    │         └─ Value Object → pnpm gen:vo
    │
    └─ NO → 既存コード編集
              ↓
        どのレイヤー？
              ├─ Domain → best-practices (or domain-impl 計画中)
              ├─ Application → best-practices (or application-impl 計画中)
              ├─ Infrastructure → infrastructure-impl
              ├─ Presentation → best-practices (or presentation-impl 計画中)
              └─ Frontend → frontend-patterns
```

### テストタスクのスキル選択

```
テストタスク
    ↓
ユニットテスト？
    ├─ YES → test-patterns
    │         ├─ UseCase → vitest-mock-extended + Result型
    │         ├─ Repository → Prismaモック
    │         └─ Server Action → FormDataモック
    │
    └─ NO → E2Eテスト
              └─ _DOCS/guides/e2e-testing-guide.md 参照
```

### その他タスクのスキル選択

```
その他タスク
    ↓
    ├─ コミット → commit-review (or commit コマンド)
    ├─ 設定作成 → claude-config-creator
    ├─ 規約確認 → coding-standards
    ├─ 迷った時 → skill-navigator
    └─ 全体把握 → best-practices
```

---

## 📊 スキル成熟度マトリクス

| スキル | ステータス | カバー範囲 | 優先度 |
|-------|-----------|----------|--------|
| skill-navigator | ✅ 実装済み | 全体ナビゲーション | 🔥 High |
| best-practices | ✅ 実装済み | 全レイヤー実装指針 | 🔥 High |
| test-patterns | ✅ 実装済み | 全レイヤーテスト | 🔥 High |
| commit-review | ✅ 実装済み | コミット品質 | 🔥 High |
| code-generation | ✅ 実装済み | 新規ファイル生成 | ⭐ Medium |
| coding-standards | ✅ 実装済み | コーディング規約 | ⭐ Medium |
| infrastructure-impl | ✅ 実装済み | Infrastructure層 | ⭐ Medium |
| frontend-patterns | ✅ 実装済み | Frontend実装 | ⭐ Medium |
| claude-config-creator | ✅ 実装済み | .claude設定 | ⭐ Medium |
| drawio-export | ✅ 実装済み | 図表エクスポート | 💡 Low |
| commit | ✅ 実装済み | スマートコミット | 💡 Low |
| application-impl | 🚧 計画中 | Application層特化 | 🔮 Future |
| domain-impl | 🚧 計画中 | Domain層特化 | 🔮 Future |
| presentation-impl | 🚧 計画中 | Presentation層特化 | 🔮 Future |

---

## 🔗 関連リソース

- **[CLAUDE.md](../../../CLAUDE.md)** - プロジェクト全体の指示
- **[_DOCS/](_DOCS/)** - 詳細ドキュメント
- **[Layer Decision Tree](./layer-decision-tree.md)** - レイヤー判定フローチャート

---

**📚 適切なスキルを選択し、効率的な開発を実現しましょう！**
