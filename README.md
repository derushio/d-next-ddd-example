# 🌟 Next.js Clean Architecture Template

**Clean Architecture + DDD + TypeScript** による実用的なNext.jsテンプレートプロジェクト

現代的なフロントエンド開発のベストプラクティスを集約し、スケーラブルで保守性の高いWebアプリケーション開発を実現します。

---

## ✨ 特徴

### 🏗️ アーキテクチャ

- **Clean Architecture** - レイヤー分離による高い保守性
- **Domain-Driven Design (DDD)** - ビジネスロジックの明確化
- **TSyringe** - 型安全なDependency Injection
- **Repository Pattern** - データアクセスの抽象化

### 🎨 フロントエンド

- **Next.js 15 (App Router)** - 最新のReact Server Components
- **React 19** - 最新のReact機能を活用
- **TailwindCSS v4** - モダンなスタイリング記法
- **Flowbite-React** - 高品質UIコンポーネント

### 🧪 品質保証

- **Vitest** - 高速で軽量なテストフレームワーク
- **vitest-mock-extended** - TypeScript完全対応の自動モック
- **Playwright** - 堅牢なE2Eテスト
- **ESLint/Prettier** - コード品質とフォーマットの統一

### 🔧 開発体験

- **TypeScript 5.x** - 厳格な型安全性
- **pnpm** - 高速パッケージマネージャー
- **Prisma** - 型安全なORM
- **NextAuth.js** - 簡単で安全な認証システム

---

## 🚀 クイックスタート

```bash
# 1. 依存関係インストール
pnpm install

# 2. 環境設定
cp .env.example .env
# .env.local を編集して必要な環境変数を設定

# 3. データベースセットアップ
make dev
pnpm db:migrate:dev
pnpm db:seed

# 4. 開発サーバー起動
pnpm dev
```

**<http://localhost:3000>** でアプリケーションが起動します 🎉

---

## 📁 プロジェクト構造

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── api/                 # API Routes
│
├── layers/                   # Clean Architecture レイヤー
│   ├── application/         # Application Layer (Use Cases)
│   ├── domain/              # Domain Layer (Business Logic)
│   └── infrastructure/      # Infrastructure Layer (Data Access)
│
├── components/              # Reactコンポーネント
│   ├── atom/               # 基本コンポーネント
│   ├── navigation/         # ナビゲーション
│   └── ui/                 # UIコンポーネント
│
├── data-accesses/          # データアクセス層
│   ├── queries/            # データ取得
│   ├── mutations/          # データ変更
│   └── infra/              # インフラストラクチャ
│
└── types/                  # 型定義
    ├── api/               # API型定義
    ├── domain/            # ドメイン型定義
    └── infrastructure/    # インフラ型定義
```

---

## 🛠️ 主要コマンド

### 開発

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
pnpm type-check   # TypeScript型チェック
```

### テスト

```bash
pnpm test         # 全テスト実行
pnpm test:unit    # ユニットテストのみ
pnpm test:e2e     # E2Eテストのみ
pnpm test:watch   # ウォッチモード
pnpm test:coverage # カバレッジ付きテスト
```

### コード品質

```bash
pnpm lint         # ESLint実行
pnpm format       # Prettier実行
pnpm audit        # セキュリティ監査
```

### データベース

```bash
pnpm prisma studio           # Prisma Studio起動
pnpm prisma migrate dev      # 開発用マイグレーション
pnpm prisma migrate deploy   # 本番マイグレーション
pnpm prisma db seed          # シードデータ投入
```

---

## 📋 技術スタック

| カテゴリー | 技術 | バージョン | 用途 |
|------------|------|------------|------|
| **Framework** | Next.js | 15.x | フロントエンドフレームワーク |
| **Language** | TypeScript | 5.x | 型安全性 |
| **UI Library** | React | 19.x | UIライブラリ |
| **Styling** | TailwindCSS | 4.x | スタイリング |
| **UI Components** | Flowbite-React | Latest | UIコンポーネント |
| **Database** | PostgreSQL | Latest | メインデータベース |
| **ORM** | Prisma | Latest | データベースアクセス |
| **Authentication** | NextAuth.js | Latest | 認証システム |
| **DI Container** | TSyringe | Latest | 依存性注入 |
| **Testing** | Vitest | Latest | ユニットテスト |
| **E2E Testing** | Playwright | Latest | E2Eテスト |
| **Package Manager** | pnpm | Latest | パッケージ管理 |

---

## 🏛️ アーキテクチャ概要

本プロジェクトは**Clean Architecture**と**Domain-Driven Design (DDD)**を採用し、以下の4層構造で設計されています：

### 🎨 Presentation Layer

- Next.js Pages/Components
- Server Actions
- API Routes

### 📋 Application Layer  

- Use Cases（ユースケース）
- アプリケーションフローの制御

### 🧠 Domain Layer

- Domain Services（ドメインサービス）
- Domain Entities（ドメインエンティティ）
- ビジネスルール・検証ロジック

### 🗄️ Infrastructure Layer

- Repository実装
- External Services連携
- データベースアクセス

### 依存関係の流れ

```
Presentation → Application → Domain ← Infrastructure
```

上位レイヤーは下位レイヤーに依存し、InfrastructureレイヤーはDomainレイヤーのインターフェースに依存します（依存関係逆転の原則）。

---

## 💉 Dependency Injection

**TSyringe**による型安全なDIコンテナを採用しています。

### 基本的な使い方

```typescript
import { resolve } from '@/layers/infrastructure/di/resolver';

// Server Actions での使用例
export async function createUser(formData: FormData) {
  const createUserUseCase = resolve('CreateUserUseCase');
  const logger = resolve('Logger');
  
  try {
    const result = await createUserUseCase.execute({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
    
    logger.info('ユーザー作成成功', { userId: result.id });
    return { success: true, data: result };
  } catch (error) {
    logger.error('ユーザー作成失敗', { error });
    return { success: false, error: 'ユーザー作成に失敗しました' };
  }
}
```

---

## 🧪 テスト戦略

### テストピラミッド

```
       🌐 E2E Tests
      認証・重要フロー
    
    📋 Integration Tests
   UseCase・Repository統合
  
🧪 Unit Tests
ビジネスロジック・単体機能
```

### 自動モック生成

**vitest-mock-extended**による型安全な自動モック生成を採用：

```typescript
import { mock, MockProxy } from 'vitest-mock-extended';

describe('CreateUserUseCase', () => {
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    // 1行でinterfaceの全メソッドが自動生成✨
    mockUserRepository = mock<IUserRepository>();
    
    // 型安全にモック設定
    mockUserRepository.save.mockResolvedValue(undefined);
    mockUserRepository.findById.mockResolvedValue(user);
  });
});
```

---

## 🔐 認証・セキュリティ

### NextAuth.js統合

- **セッション管理** - 安全なセッション処理
- **CSRF対策** - クロスサイトリクエストフォージェリ対策
- **パスワードハッシュ化** - bcryptによる安全なハッシュ化
- **入力値検証** - Zodによる厳格なバリデーション

### セキュリティベストプラクティス

- HTTPSの強制
- セキュリティヘッダーの設定
- Rate Limiting
- SQL Injection対策
- XSS対策

---

## 📈 パフォーマンス最適化

### Next.js最適化

- **Server Components優先** - クライアントサイドJavaScript削減
- **Dynamic Imports** - 必要に応じた動的読み込み
- **Image Optimization** - next/imageによる自動最適化
- **Bundle Analysis** - バンドルサイズの監視

### TailwindCSS v4最適化

```css
/* 新記法による効率的なスタイリング */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors;
}

/* bg-opacity ではなく新記法を使用 */
.backdrop {
  @apply bg-black/50 backdrop-blur-sm;
}
```

---

## 🌍 環境設定

### 必須環境変数

```bash
# データベース
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# アプリケーション
NODE_ENV="development"
```

### 開発環境セットアップ

1. `.env.example`を`.env.local`にコピー
2. 必要な環境変数を設定
3. PostgreSQLデータベースを準備
4. `pnpm prisma migrate dev`でスキーマ適用
5. `pnpm prisma db seed`でサンプルデータ投入

---

## 📚 ドキュメント

詳細なドキュメントは`_DOCS/`フォルダに格納されています：

### 📋 基本ドキュメント

- [プロジェクト構造](./_DOCS/project-structure.md) - ディレクトリ構成とファイル配置
- [開発ガイド](./_DOCS/development-guide.md) - セットアップと開発フロー
- [アーキテクチャ概要](./_DOCS/architecture-overview.md) - システム設計と技術選択

### 🔧 技術ドキュメント

- [依存性注入](./_DOCS/dependency-injection.md) - DIコンテナの設計・実装
- [テスト戦略](./_DOCS/testing-strategy.md) - テスト方針と実装パターン
- [デプロイガイド](./_DOCS/deployment-guide.md) - 本番環境への展開手順

### 📖 実装ガイド

- [フロントエンドベストプラクティス](./_DOCS/guides/frontend-best-practices.md)
- [コーディング規約](./_DOCS/guides/coding-standards.md)
- [Next.js統合パターン](./_DOCS/guides/nextjs-integration-patterns.md)

### 🔍 トラブルシューティング

- [テストモック設定](./_DOCS/troubleshootings/vitest-mock-extended-setup.md)
- [Prismaモック](./_DOCS/troubleshootings/prisma-mock-setup.md)
- [バリデーションエラー](./_DOCS/troubleshootings/email-validation-issues.md)

---

## 🤝 コントリビューション

### 開発フロー

1. **Issue作成** - 機能要求・バグ報告
2. **ブランチ作成** - `feature/機能名` または `fix/バグ名`
3. **実装** - コーディング規約に従って実装
4. **テスト** - ユニットテスト・E2Eテストの作成・実行
5. **プルリクエスト** - レビュー依頼
6. **マージ** - レビュー後にmainブランチへマージ

### コーディング規約

- **TypeScript** - 厳格な型安全性を維持
- **ESLint/Prettier** - 自動フォーマット・ルール遵守
- **コミットメッセージ** - Conventional Commits準拠
- **テストカバレッジ** - 90%以上を目標

---

## 📄 ライセンス

MIT License

---

## 🙋‍♂️ サポート

### 🔗 リンク

- [Issues](https://github.com/your-repo/issues) - バグ報告・機能要求
- [Discussions](https://github.com/your-repo/discussions) - 質問・相談
- [Wiki](https://github.com/your-repo/wiki) - 追加ドキュメント

### 💡 ヘルプが必要な場合

1. **_DOCSフォルダ** の該当ドキュメントを確認
2. **トラブルシューティング** セクションを参照
3. **GitHub Issues** で質問を投稿
4. **Discussions** でコミュニティに相談
