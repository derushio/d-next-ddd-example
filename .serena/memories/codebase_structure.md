# コードベース構造

## 📁 プロジェクト全体構造

```
/
├── src/                      # ソースコード
├── tests/                    # テストファイル
├── _DOCS/                    # ドキュメント（包括的・テンプレート配布物のため読み取り専用）
├── prisma/                   # データベーススキーマ
├── public/                   # 静的ファイル
├── docker/                   # Docker設定
├── k8s/                      # Kubernetes設定
├── scripts/                  # ビルド・実行スクリプト
├── _templates/               # Hygenテンプレート
└── .serena/                  # Serena MCP設定
```

## 🏗️ src/ ディレクトリ構造（Clean Architecture）

```
src/
├── app/                      # Next.js App Router
│   ├── fonts/               # フォントファイル
│   ├── api/                 # API Routes
│   ├── auth/                # 認証ページ
│   ├── users/               # ユーザー管理ページ
│   ├── server-actions/      # Server Actions
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── globals.css          # グローバルCSS
│
├── layers/                   # Clean Architecture レイヤー
│   ├── presentation/        # 未使用（Next.js app/ で代替）
│   ├── application/         # Application Layer
│   │   ├── services/        # Application Services
│   │   ├── usecases/        # Use Cases（ビジネスフロー）
│   │   └── types/           # 共通型定義（Result型等）
│   ├── domain/              # Domain Layer
│   │   ├── entities/        # Entity（ビジネスルール）
│   │   ├── value-objects/   # Value Object
│   │   ├── repositories/    # Repository Interface
│   │   ├── services/        # Domain Service
│   │   └── errors/          # ドメインエラー
│   └── infrastructure/      # Infrastructure Layer
│       ├── di/              # 依存性注入設定
│       ├── repositories/    # Repository実装
│       ├── services/        # Infrastructure Service
│       ├── persistence/     # データ永続化
│       └── types/           # Infrastructure型定義
│
├── components/              # React Components
│   ├── features/           # 機能別コンポーネント
│   ├── common/             # 共通コンポーネント
│   ├── layout/             # レイアウトコンポーネント
│   ├── ui/                 # 基本UIコンポーネント（shadcn/ui）
│   └── providers/          # Provider系コンポーネント
│
├── hooks/                   # Custom Hooks
├── utils/                   # ユーティリティ関数
├── lib/                     # ライブラリ設定
├── di/                      # DIコンテナ設定
├── types/                   # 型定義
├── tools/                   # 開発ツール
└── proxy.ts                 # Next.js 16 Proxy（旧middleware.ts）
```

## 🧪 tests/ ディレクトリ構造

```
tests/
├── unit/                    # ユニットテスト
│   ├── di/                  # DI関連テスト
│   ├── services/            # サービステスト
│   └── layers/              # レイヤー別テスト
├── e2e/                     # E2Eテスト（Playwright）
├── utils/                   # テストユーティリティ
│   ├── helpers/             # テストヘルパー
│   └── mocks/               # モックファイル
├── setup.ts                 # テストセットアップ
└── vitest-global.d.ts       # Vitest型定義
```

## 📚 \_DOCS/ ドキュメント構造

**\_DOCS/ は不可侵領域（読み取り専用）。** 参照のみ可能で、編集・追加・削除は禁止。

```
_DOCS/
├── guides/                  # 実装ガイド
│   ├── ddd/                 # DDD関連ガイド
│   ├── development/         # 開発フロー
│   ├── standards/           # コーディング規約
│   ├── implementation/      # 実装パターン
│   └── beginners/           # 初心者向けガイド
├── architecture/            # アーキテクチャ
├── testing/                 # テスト戦略
├── troubleshooting/         # トラブルシューティング
└── reference/               # リファレンス
```

## 🔑 重要なファイル

- **CLAUDE.md**: プロジェクト概要・コマンド・ルール
- **package.json**: 依存関係・スクリプト定義
- **tsconfig.json**: TypeScript設定
- **biome.json**: Biome設定（Lint/Format）
- **vitest.config.ts**: テスト設定
- **next.config.ts**: Next.js設定
- **playwright.config.ts**: E2Eテスト設定

## 📦 依存関係の方向

```
Presentation → Application → Domain ← Infrastructure
     ↓              ↓                        ↑
Components    Use Cases              Repositories
Server Actions   DTOs                Services
     ↓              ↓                        ↑
     └──────── Result型 ←─────────────────────┘
```

## 🎯 アーキテクチャの特徴

- **レイヤー分離**: 各層の責務を明確に分離
- **依存関係逆転**: InterfaceによるDomain層の独立性確保
- **Result型統一**: 全UseCaseでのエラーハンドリング統一
- **DI活用**: TSyringeによる疎結合な設計
- **型安全性**: TypeScript strict modeでの厳密な型チェック
