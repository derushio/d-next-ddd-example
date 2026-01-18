# 開発環境セットアップ ⚙️

プロジェクトの開発環境を素早く構築するための包括的ガイド

---

## 🚀 クイックスタート

### 📋 前提条件チェック

```mermaid
graph LR
    subgraph "🔧 必要なツール"
        A[Node.js 20+] --> C[✅ 環境準備完了]
        B[pnpm 8+] --> C
    end

    subgraph "🎯 確認コマンド"
        D[node --version]
        E[pnpm --version]
    end

    style A fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style C fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
```

**環境確認コマンド:**

```bash
# Node.js 18+ (推奨: 20+)
node --version  # 期待値: v20.x.x

# pnpm (推奨パッケージマネージャー)
npm install -g pnpm
pnpm --version  # 期待値: 8.x.x
```

### ⚡ 基本セットアップ (約3分)

```mermaid
graph TB
    subgraph "🚀 セットアップフロー"
        A[1️⃣ 依存関係<br/>インストール] --> B[2️⃣ 環境変数<br/>設定]
        B --> C[3️⃣ データベース<br/>初期化]
        C --> D[4️⃣ 開発サーバー<br/>起動]
        D --> E[✅ セットアップ<br/>完了]
    end

    style A fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style B fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style C fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style D fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style E fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

#### ステップ実行

```bash
# 1️⃣ 依存関係インストール
pnpm install

# 2️⃣ 環境変数設定
cp .env.example .env.local
# .env.local を編集して必要な値を設定

# 3️⃣ データベース初期化
pnpm db:generate
pnpm db:push

# 4️⃣ 開発サーバー起動
pnpm dev
```

### ✅ 成功確認

| 確認項目                 | 期待される結果                       | 対処方法                                             |
| ------------------------ | ------------------------------------ | ---------------------------------------------------- |
| **アプリケーション表示** | <http://localhost:3000> でページ表示 | [トラブルシューティング](#🔍-トラブルシューティング) |
| **コンソールエラー**     | エラーメッセージなし                 | [よくある問題](../troubleshooting/common-issues.md)  |
| **データベース接続**     | Prisma Studio で確認可能             | [DB問題解決](#🗄️-データベース問題)                   |

---

## 📋 詳細セットアップ手順

### 1. 環境変数設定

```bash
# .env.local ファイル設定
NEXTAUTH_SECRET="your-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# データベース設定 (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# オプション: 外部サービス
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT="587"
```

### 2. データベース設定

```mermaid
graph LR
    subgraph "🗄️ Database Setup"
        SCHEMA[Schema Definition]
        GENERATE[Client Generation]
        MIGRATE[Migration]
        SEED[Seed Data]
    end

    SCHEMA --> GENERATE
    GENERATE --> MIGRATE
    MIGRATE --> SEED

    style SCHEMA fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

```bash
# Prismaクライアント生成
pnpm db:generate

# スキーマをデータベースに反映
pnpm db:push

# シードデータ投入 (オプション)
pnpm db:seed

# Prisma Studio起動 (データベース管理GUI)
pnpm db:studio
```

### 3. 開発ツール設定

```mermaid
graph TB
    subgraph "🛠️ Development Tools"
        VSCODE[VS Code]
        EXTENSIONS[拡張機能]
        SETTINGS[設定]
    end

    subgraph "📋 推奨拡張機能"
        TS[TypeScript]
        BIOME[Biome]
        TAILWIND[Tailwind CSS]
        PRISMA_EXT[Prisma]
    end

    VSCODE --> EXTENSIONS
    EXTENSIONS --> SETTINGS

    EXTENSIONS --> TS
    EXTENSIONS --> BIOME
    EXTENSIONS --> TAILWIND
    EXTENSIONS --> PRISMA_EXT
```

**VS Code拡張機能 (推奨):**

- TypeScript and JavaScript Language Features
- Biome (Lint + Format 統合)
- Tailwind CSS IntelliSense
- Prisma

---

## ⚡ 開発コマンド

### 基本コマンド

```bash
# 開発サーバー (Turbopack + DB監視 + Prisma Studio)
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# コード品質チェック
pnpm lint
pnpm format
```

### テストコマンド

```bash
# 全テスト実行 (Unit + E2E)
pnpm test

# ユニットテストのみ
pnpm test:unit

# ウォッチモードでテスト
pnpm test:watch

# E2Eテスト (Playwright)
pnpm test:e2e

# E2Eテスト UI Mode (推奨)
pnpm test:e2e:ui
```

### データベースコマンド

```bash
# Prismaクライアント生成
pnpm db:generate

# スキーマプッシュ
pnpm db:push

# マイグレーション実行
pnpm db:migrate:dev

# Prisma Studio起動
pnpm db:studio

# データベースリセット（Docker含む完全リセット）
make clean && make up
```

---

## 🔧 開発環境最適化

### パフォーマンス設定

```mermaid
graph LR
    subgraph "⚡ 最適化項目"
        TURBO[Turbopack有効]
        MEMORY[メモリ設定]
        CACHE[キャッシュ設定]
    end

    subgraph "🎯 期待効果"
        FAST[高速ビルド]
        SMOOTH[スムーズ開発]
        EFFICIENT[効率的リソース使用]
    end

    TURBO --> FAST
    MEMORY --> SMOOTH
    CACHE --> EFFICIENT
```

**設定例:**

```bash
# .npmrc ファイル設定
auto-install-peers=true
shamefully-hoist=true

# Next.js設定 (next.config.js)
experimental: {
  turbo: {
    // Turbopack最適化設定
  }
}
```

### Git設定

```bash
# Git hooks設定（環境自動判定）
make setup-git-hooks

# コミット前自動チェック
# - pre-commit: Biomeでフォーマット実行 (pnpm format)
# - pre-push: 全品質チェック実行 (pnpm check)
```

---

## 🧪 テスト環境セットアップ

### E2Eテスト環境

```bash
# Playwrightブラウザインストール
pnpm exec playwright install

# テスト実行
pnpm test:e2e

# UI Mode (視覚的テスト開発)
pnpm test:e2e:ui
```

### モック・テストデータ

```mermaid
graph TB
    subgraph "🧪 Test Setup"
        VITEST[Vitest設定]
        MOCK[自動モック設定]
        DATA[テストデータ]
    end

    subgraph "🎯 テスト品質"
        AUTO[自動化]
        RELIABLE[信頼性]
        FAST[高速実行]
    end

    VITEST --> AUTO
    MOCK --> RELIABLE
    DATA --> FAST
```

---

## 🔍 トラブルシューティング

### よくある問題

```mermaid
graph LR
    subgraph "❌ よくある問題"
        NODE[Node.js バージョン]
        PNPM[pnpm インストール]
        ENV[環境変数設定]
        DB[データベース接続]
    end

    subgraph "✅ 解決方法"
        VERSION[バージョン確認]
        REINSTALL[再インストール]
        CONFIG[設定確認]
        RESET[リセット実行]
    end

    NODE --> VERSION
    PNPM --> REINSTALL
    ENV --> CONFIG
    DB --> RESET
```

### 解決手順

1. **Node.js バージョン問題**

   ```bash
   # Node.js 20+ に更新
   nvm install 20
   nvm use 20
   ```

2. **依存関係問題**

   ```bash
   # キャッシュクリア後再インストール
   pnpm store prune
   rm -rf node_modules
   pnpm install
   ```

3. **データベース問題**

   ```bash
   # データベースリセット（Docker含む完全リセット）
   make clean && make up

   # または軽量なリセット
   pnpm db:generate
   pnpm db:push
   ```

4. **開発サーバー問題**

   ```bash
   # ポート確認・プロセス停止
   lsof -ti:3000 | xargs kill -9
   pnpm dev
   ```

---

## 📚 次のステップ

### 学習パス

```mermaid
graph TB
    subgraph "🌱 初心者向け"
        SETUP[環境セットアップ完了]
        FIRST[最初の機能実装]
        BASIC[基本概念理解]
    end

    subgraph "🚀 中級者向け"
        ARCH[アーキテクチャ理解]
        PATTERN[設計パターン習得]
        ADVANCED[高度な実装]
    end

    SETUP --> FIRST
    FIRST --> BASIC
    BASIC --> ARCH
    ARCH --> PATTERN
    PATTERN --> ADVANCED
```

**推奨学習順序:**

1. **[最初の機能実装](development/first-feature.md)** - 実践的チュートリアル
2. **[アーキテクチャ概要](../architecture/overview.md)** - システム全体理解
3. **[開発フロー](development/workflow.md)** - 効率的開発手順
4. **[テスト戦略](../testing/strategy.md)** - 品質保証手法

### 参考資料

- **[コマンドリファレンス](../reference/commands.md)** - 全コマンド一覧
- **[技術スタック](../reference/technologies.md)** - 使用技術詳細
- **[トラブルシューティング](../troubleshooting/common-issues.md)** - 問題解決ガイド

---

**⚙️ これで開発環境のセットアップが完了です！効率的な開発をお楽しみください！**
