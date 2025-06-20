# 🚀 Next.js 15 + Clean Architecture + DDD テンプレート

**モダンWebアプリケーション開発のための包括的テンプレートプロジェクト**

このテンプレートは、**Next.js 15**、**Clean Architecture**、**Domain-Driven Design (DDD)** を組み合わせた、エンタープライズレベルのWebアプリケーション開発環境を提供します。型安全性、保守性、テスタビリティを重視した現代的なアーキテクチャで、スケーラブルなアプリケーションを構築できます。

## ✨ 主な特徴

### 🎯 アーキテクチャ

- **🏗️ Clean Architecture** - 4層分離による関心の分離と依存関係の逆転
- **🧠 Domain-Driven Design** - ビジネスロジックの中心設計とドメインモデル
- **🔄 Result型パターン** - 例外を使わない型安全なエラーハンドリング
- **💉 依存性注入** - TSyringeによる疎結合とテスタビリティ向上
- **📋 Server Actions優先** - パフォーマンス最適化とクライアント最小化

### ⚡ 最新技術スタック

- **Frontend**: Next.js 15 + Turbopack + React 19
- **Styling**: TailwindCSS v4 + Aurora Gradient System
- **UI Components**: shadcn/ui統合 (Enhanced Components)
- **Database**: Prisma + SQLite（PostgreSQL対応済み）
- **Testing**: Vitest + vitest-mock-extended + Playwright
- **Auth**: NextAuth.js v4
- **Type Safety**: TypeScript 5.x + Zod

### 🎨 モダンUI/UX

- **🌟 Aurora Gradient System** - 2024年デザイントレンドのグラデーション
- **🌙 完全ダークモード対応** - 自動切り替えシステム
- **♿ アクセシビリティ** - WCAG準拠のコンポーネント設計
- **📱 レスポンシブ設計** - モバイルファースト
- **🧩 Enhanced Components** - shadcn/ui + 既存システム統合

### 🧪 テスト戦略

- **94%+ カバレッジ目標** - Application Layer重点テスト
- **🤖 自動モック生成** - vitest-mock-extendedによる効率化
- **🎭 E2Eテスト** - Playwrightによる包括的シナリオテスト
- **⚡ 高速実行** - 並列テスト実行による開発効率向上

## 🏁 クイックスタート

### 必要な環境

- **Node.js**: 18.0.0 以上
- **pnpm**: 8.0.0 以上（推奨）

### インストール

```bash
# プロジェクトをクローン
git clone [your-repository-url]
cd d-next-ddd-example

# 依存関係をインストール
pnpm install

# データベースをセットアップ
pnpm db:generate

# 開発サーバーを起動
pnpm dev
```

開発サーバーが [http://localhost:3000](http://localhost:3000) で起動します。

### 基本的な開発コマンド

```bash
# 開発環境（ホットリロード + DB監視 + Studio）
pnpm dev

# プロダクションビルド
pnpm build

# テスト実行
pnpm test              # 全テスト
pnpm test:unit         # 単体テスト
pnpm test:e2e          # E2Eテスト
pnpm test:coverage     # カバレッジ付きテスト

# コード品質チェック
pnpm lint              # ESLint実行
pnpm type-check        # TypeScript型チェック
pnpm format            # Prettier + Markdownlint

# shadcn/ui コンポーネント追加
pnpm ui:add button     # 例：Buttonコンポーネント追加
```

## 🏛️ アーキテクチャ概要

### レイヤー構成

```
┌─────────────────────────────────────┐
│         🎨 Presentation Layer       │
│    Next.js Pages + Server Actions   │
│         shadcn/ui Components        │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│         📋 Application Layer        │
│     Use Cases + Result型パターン     │
│        ビジネスフロー制御            │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│           🧠 Domain Layer           │
│  Entities + Value Objects + Services │
│        ビジネスルール実装             │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│       🗄️ Infrastructure Layer       │
│   Repositories + External Services  │
│       技術的実装詳細                │
└─────────────────────────────────────┘
```

### Result型パターンの例

```typescript
// 🎯 型安全なエラーハンドリング
async function createUser(data: CreateUserRequest): Promise<Result<CreateUserResponse>> {
  try {
    // バリデーション
    const validation = await userDomainService.validateUser(data);
    if (!validation.isValid) {
      return failure(validation.message, 'VALIDATION_ERROR');
    }

    // ビジネスロジック実行
    const user = await userRepository.create(data);
    
    // 成功レスポンス
    return success({ user });
  } catch (error) {
    // 統一的なエラー変換
    if (error instanceof DomainError) {
      return failure(error.message, error.code);
    }
    return failure('予期しないエラー', 'UNEXPECTED_ERROR');
  }
}

// Server Actionでの使用
if (isSuccess(result)) {
  redirect('/dashboard');
} else {
  // エラー表示
  return { error: result.error.message };
}
```

## 📦 実装済み機能

### 🔐 認証システム

- **サインイン/サインアウト** - NextAuth.js統合
- **パスワード変更** - セキュアなハッシュ化
- **トークンリフレッシュ** - JWT管理
- **パスワードリセット** - メール認証フロー

### 👤 ユーザー管理

- **ユーザー作成/更新** - バリデーション付き
- **プロフィール管理** - Email Value Object使用
- **権限管理** - ロールベースアクセス制御対応

### 🎨 UIコンポーネント

- **Enhanced Components** - shadcn/ui + 独自機能統合
- **Legacy Components** - 段階的移行対応
- **Bridge System** - 統一インポートシステム
- **Aurora Gradients** - 美しいグラデーションシステム

### 🗃️ データ管理

- **Prisma ORM** - 型安全なデータベース操作
- **Repository Pattern** - ドメインとインフラの分離
- **Migration System** - データベーススキーマ管理
- **Seed Data** - テスト用データ生成

## 🧪 テスト戦略

### カバレッジ目標

| レイヤー | 目標カバレッジ | 重要度 |
|---------|---------------|--------|
| **Application Layer** | **94%以上** | ⭐⭐⭐ |
| **Domain Layer** | **90%以上** | ⭐⭐⭐ |
| **Infrastructure Layer** | **85%以上** | ⭐⭐ |
| **Presentation Layer** | **80%以上** | ⭐ |

### 高品質テスト実装

```typescript
// 🤖 自動モック生成による効率的テスト
import { createAutoMockUserRepository } from '@tests/utils/mocks/autoMocks';

describe('SignInUseCase', () => {
  let useCase: SignInUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    // 完全自動のタイプセーフモック
    mockUserRepository = createAutoMockUserRepository();
    
    // DIコンテナ経由でテスト対象を構築
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
    useCase = container.resolve(SignInUseCase);
  });

  it('正常なサインインが成功する', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(testUser);
    
    const result = await useCase.execute(validInput);
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.user.email).toBe(testUser.getEmail().toString());
    }
  });
});
```

## 📚 ドキュメント

### アーキテクチャガイド

- **[アーキテクチャ概要](_DOCS/architecture-overview.md)** - システム全体設計
- **[Clean Architecture解説](_DOCS/guides/ddd/concepts/clean-architecture.md)** - 設計原則
- **[DDD詳細解説](_DOCS/guides/ddd/concepts/domain-driven-design.md)** - ドメイン駆動設計

### 開発ガイド

- **[開発ガイド](_DOCS/development-guide.md)** - 新機能開発手順
- **[依存性注入](_DOCS/dependency-injection.md)** - DI設定とパターン
- **[テスト戦略](_DOCS/testing-strategy.md)** - テスト実装手法

### レイヤー別ガイド

- **[Presentation Layer](_DOCS/guides/ddd/layers/presentation-layer.md)** - UI・Server Actions
- **[Application Layer](_DOCS/guides/ddd/layers/application-layer.md)** - UseCase・DTO
- **[Domain Layer](_DOCS/guides/ddd/layers/domain-layer.md)** - Entity・Value Object
- **[Infrastructure Layer](_DOCS/guides/ddd/layers/infrastructure-layer.md)** - Repository・Services

### 実践ガイド

- **[フロントエンドベストプラクティス](_DOCS/guides/frontend-best-practices.md)**
- **[テーマシステム](_DOCS/guides/theme-system.md)** - shadcn/ui統合
- **[E2Eテストガイド](_DOCS/guides/e2e-testing-guide.md)**

## 🎨 Aurora Gradient System

### 2024年デザイントレンドを取り入れたUI

```css
/* 🌟 Aurora Gradients */
.gradient-aurora {
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%);
}

.gradient-sunset {
  background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%);
}

.gradient-ocean {
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #3b82f6 100%);
}
```

### Enhanced Components統合

```tsx
// shadcn/ui + 既存機能の統合
<Button 
  variant="primary"      // 既存システム
  gradient={true}        // 既存機能：グラデーション
  loading={isLoading}    // 既存機能：ローディング
  size="lg"             // shadcn/ui標準
>
  統合ボタン
</Button>

// shadcn/ui標準variants
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
```

## 🛠️ プロジェクト構造

```
src/
├── app/                          # Next.js App Router
│   ├── auth/                     # 認証ページ
│   ├── server-actions/           # Server Actions
│   └── globals.css               # Aurora Gradient System
├── components/                   # React Components
│   ├── ui-shadcn/               # shadcn/ui Enhanced
│   ├── ui-legacy/               # Legacy Components
│   └── auth/                    # 認証コンポーネント
├── layers/                      # Clean Architecture層
│   ├── domain/                  # Domain Layer
│   │   ├── entities/            # エンティティ
│   │   ├── value-objects/       # Value Object
│   │   └── services/            # Domain Service
│   ├── application/             # Application Layer
│   │   ├── usecases/            # UseCase
│   │   └── types/               # Result型
│   └── infrastructure/          # Infrastructure Layer
│       ├── repositories/        # Repository実装
│       ├── services/            # Infrastructure Service
│       └── di/                  # 依存性注入設定
├── tests/                       # テストファイル
│   ├── unit/                    # 単体テスト
│   ├── e2e/                     # E2Eテスト
│   └── utils/mocks/             # 自動モック
└── _DOCS/                       # 包括的ドキュメント
```

## 🚀 このテンプレートで実現できること

### 🎯 アプリケーション

- **スケーラブルな設計** - Clean ArchitectureによるLayer分離
- **保守性の高いコード** - DDDによるビジネスロジック集約
- **型安全性** - TypeScript + Result型による堅牢性
- **高いテスト品質** - 自動モック + カバレッジ目標

### 💼 チーム開発対応

- **統一されたコーディング規約** - ESLint + Prettier設定済み
- **AI開発支援** - CLAUDE.md による開発効率化
- **継続的品質向上** - GitHub Actions対応

### 🔧 拡張性

- **プラガブルアーキテクチャ** - DIコンテナによる柔軟性
- **データベース切り替え** - Repository Pattern対応
- **UI統合システム** - Bridge Systemによる段階的移行
- **モジュラー設計** - 機能追加の容易性

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

---

## 補足

_DOCSの殆どが開発の過程で適当にAIに書かせたものなので、現状では_DOCS以下のドキュメントは読み物程度の扱いにしてください🙇‍♂️
