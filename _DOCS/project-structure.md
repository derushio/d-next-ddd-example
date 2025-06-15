# プロジェクト構造 🏗️

このドキュメントでは、プロジェクトの基本構造、技術スタック、ファイル配置について説明します。

---

## 技術スタック

### Frontend Framework

- **Next.js 15** (App Router) - フロントエンドフレームワーク
- **React 19** - UIライブラリ  
- **TypeScript 5.x** - 型安全性

### UI/Styling

- **Flowbite-React** - UIコンポーネントライブラリ
- **TailwindCSS v4** - スタイリング

### Backend/Database

- **Next.js API Routes** - API エンドポイント
- **NextAuth.js** - 認証・セッション管理
- **Prisma** - ORM・データベース管理
- **PostgreSQL** - メインデータベース

### Architecture/DI

- **TSyringe** - Dependency Injection
- **Clean Architecture** - レイヤー分離
- **DDD** - Domain-Driven Design

### Testing

- **Vitest** - ユニットテスト
- **Playwright** - E2Eテスト
- **Testing Library** - Reactコンポーネントテスト

### Development Tools

- **pnpm** - パッケージマネージャ
- **ESLint/Prettier** - コード品質・フォーマット

---

## ディレクトリ構造

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # ホームページ
│   ├── globals.css              # グローバルスタイル
│   └── api/                     # API Routes
│
├── components/                   # Reactコンポーネント
│   ├── atom/                    # Atomicコンポーネント
│   ├── navigation/              # ナビゲーション関連
│   └── ui/                      # UIコンポーネント
│
├── layers/                      # Clean Architecture レイヤー
│   ├── infrastructure/          # Infrastructure Layer
│   │   ├── persistence/         # データ永続化
│   │   ├── di/                  # Dependency Injection
│   │   ├── services/            # インフラサービス
│   │   ├── repositories/        # リポジトリ実装
│   │   └── types/               # インフラ型定義
│   ├── domain/                  # Domain Layer
│   │   ├── entities/            # ドメインエンティティ
│   │   ├── errors/              # ドメインエラー
│   │   ├── repositories/        # リポジトリインターフェース
│   │   ├── services/            # ドメインサービス
│   │   └── value-objects/       # 値オブジェクト
│   └── application/             # Application Layer
│       ├── services/            # アプリケーションサービス
│       └── usecases/            # ユースケース
│
├── data-accesses/              # データアクセス層
│   ├── infra/                  # インフラストラクチャ
│   ├── mutations/              # データ変更処理
│   └── queries/                # データ取得処理
│
└── types/                      # 型定義
    ├── api/                    # API型定義
    ├── domain/                 # ドメイン型定義
    └── infrastructure/         # インフラ型定義
```

---

## 重要なエントリポイント

### Next.js関連

- `src/app/layout.tsx` - 全ページ共通のルートレイアウト
- `src/app/page.tsx` - ルートページ
- `src/app/globals.css` - グローバルスタイル

### アーキテクチャ関連

- `src/layers/infrastructure/di/container.ts` - DIコンテナ設定
- `src/data-accesses/infra/DatabaseFactory.ts` - データベース接続管理

### 認証関連  

- `src/data-accesses/infra/nextAuth.ts` - NextAuth.js設定

参考実装:

- [DIコンテナ](../../src/layers/infrastructure/di/container.ts)
- [DatabaseFactory](../../src/data-accesses/infra/DatabaseFactory.ts)
- [NextAuth設定](../../src/data-accesses/infra/nextAuth.ts)

---

## 開発ルール

### コンポーネント記述法

- "use client" が必要な場合のみクライアントコンポーネント化
- 可能な限り "use server" でサーバーコンポーネントを使用
- "use server" は `export async function`、"use client" は `export function`
- ページコンポーネントは `export default` 必須

### スタイリング

- TailwindCSS v4 使用
- Flowbite-React コンポーネントを活用
- `bg-opacity` ではなく `bg-black/50` 形式を使用
- クリック可能要素には `cursor-pointer` を適用

### 依存関係管理

- パッケージマネージャは **pnpm** を使用
- DIコンテナ経由でのサービス取得を推奨
