# 技術スタック詳細 🛠️

プロジェクトで使用する技術スタックの包括的概要

---

## 📖 このドキュメントについて

### 🎯 目的

- **技術選択理由**: 各技術の採用理由と利点
- **バージョン管理**: 使用バージョンと互換性情報
- **学習リソース**: 各技術の学習・参考資料

### 🔗 関連ドキュメント

- **[アーキテクチャ概要](../architecture/overview.md)** - システム全体設計
- **[設計原則](../architecture/principles.md)** - 技術選択の指針
- **[環境セットアップ](../guides/setup.md)** - 環境構築手順

---

## 🚀 コア技術スタック

### フレームワーク・ライブラリ

#### **Next.js 15** 🌟

- **バージョン**: 15.x
- **選択理由**: React Server Components、Turbopack、最新機能
- **主要機能**: SSR/SSG、App Router、Server Actions
- **公式**: <https://nextjs.org/>

#### **React 19** ⚛️

- **バージョン**: 19.x
- **選択理由**: Server Components、Concurrent Features
- **主要機能**: RSC、Suspense、新Hook
- **公式**: <https://react.dev/>

#### **TypeScript 5.x** 📘

- **バージョン**: 5.x
- **選択理由**: 型安全性、開発効率、エラー削減
- **主要機能**: 厳密型チェック、IntelliSense
- **公式**: <https://www.typescriptlang.org/>

---

## 🏗️ アーキテクチャ・パターン

### 設計手法

#### **Clean Architecture** 🏛️

- **概念**: 依存関係逆転、関心の分離
- **実装**: レイヤー分離、インターフェース抽象化
- **利点**: テスタビリティ、保守性、拡張性

#### **Domain Driven Design (DDD)** 👑

- **概念**: ドメイン中心設計、ユビキタス言語
- **実装**: Entity、Value Object、Domain Service
- **利点**: ビジネスロジック保護、複雑性管理

#### **Result型パターン** 🎯

- **概念**: 例外の代わりに型安全なエラーハンドリング
- **実装**: `Result<T>` 型による統一的エラー処理
- **利点**: 型安全性、エラー可視化、処理統一

---

## 🗃️ データベース・ORM

#### **SQLite** 💾

- **用途**: 開発・テスト環境のデータベース
- **選択理由**: セットアップ簡単、軽量、十分な機能
- **本番**: PostgreSQL等への移行容易

#### **Prisma 5.x** 🔧

- **バージョン**: 5.x
- **選択理由**: 型安全、マイグレーション、優秀なDX
- **主要機能**: Schema定義、Client生成、Studio
- **公式**: <https://www.prisma.io/>

---

## 🧪 テスト技術

### テストフレームワーク

#### **Vitest** ⚡

- **用途**: ユニット・統合テスト
- **選択理由**: Vite統合、高速、Jest互換
- **主要機能**: HMR、TypeScript、ESM
- **公式**: <https://vitest.dev/>

#### **vitest-mock-extended** 🎭

- **用途**: 自動モック生成
- **選択理由**: 型安全、自動生成、DX向上
- **主要機能**: MockProxy、完全型対応

#### **Playwright** 🎬

- **用途**: E2Eテスト
- **選択理由**: 高速、信頼性、優秀なツール
- **主要機能**: 複数ブラウザ、UI Mode、Trace Viewer
- **公式**: <https://playwright.dev/>

---

## 🎨 UI・スタイリング

### UIフレームワーク

#### **TailwindCSS v4** 🌈

- **バージョン**: 4.x
- **選択理由**: 高速開発、一貫性、カスタマイズ性
- **主要機能**: ユーティリティファースト、レスポンシブ
- **公式**: <https://tailwindcss.com/>

#### **shadcn/ui** 🧩

- **用途**: UI コンポーネントライブラリ
- **選択理由**: カスタマイズ可能、アクセシブル、モダン
- **統合**: Enhanced Components Bridge System
- **公式**: <https://ui.shadcn.com/>

---

## 💉 依存性注入・管理

#### **TSyringe** 🔄

- **用途**: 依存性注入コンテナ
- **選択理由**: 軽量、TypeScript対応、デコレータ
- **主要機能**: Constructor Injection、Singleton管理
- **GitHub**: <https://github.com/microsoft/tsyringe>

---

## 🔧 開発ツール・Build

### ビルドツール

#### **Turbopack** 🚀

- **用途**: 開発サーバー、ビルド最適化
- **選択理由**: 高速、Next.js統合、Rust製
- **主要機能**: HMR、並列処理、キャッシュ

### 品質管理

#### **ESLint** 📏

- **用途**: コード品質チェック
- **設定**: Next.js推奨設定、カスタムルール
- **統合**: IDE、pre-commit hook

#### **Prettier** ✨

- **用途**: コードフォーマット
- **設定**: プロジェクト標準、統一ルール
- **統合**: ESLint、IDE、自動保存

---

## 📦 パッケージ管理

#### **pnpm** 📁

- **選択理由**: 高速、効率的、monorepo対応
- **主要機能**: ハードリンク、workspace
- **利点**: ディスク容量節約、インストール高速化
- **公式**: <https://pnpm.io/>

---

## 🔒 セキュリティ・認証

### 認証システム（予定）

- **NextAuth.js**: 認証・認可
- **JWT**: トークンベース認証
- **OAuth**: 外部サービス連携

---

## 🚀 パフォーマンス・監視

### 最適化技術

- **Image Optimization**: Next.js Image
- **Code Splitting**: Dynamic Import
- **Bundle Analyzer**: サイズ分析

---

## 📚 学習リソース

### 📖 推奨学習パス

#### **初心者向け**

1. **TypeScript基礎** → 公式チュートリアル
2. **React基礎** → React.dev
3. **Next.js基礎** → Next.js Learn

#### **中級者向け**

1. **Clean Architecture** → 書籍・記事
2. **DDD** → エリック・エヴァンス本
3. **テスト戦略** → Testing Library

#### **上級者向け**

1. **パフォーマンス最適化** → Core Web Vitals
2. **セキュリティ** → OWASP
3. **スケーラビリティ** → アーキテクチャ設計

---

## 🔄 技術更新・メンテナンス

### 更新ポリシー

- **Major Version**: 慎重な検証後
- **Minor Version**: 定期更新（月次）
- **Patch Version**: セキュリティ即座適用

### 依存関係管理

```bash
# 依存関係確認
pnpm outdated

# アップデート実行
pnpm update

# セキュリティ監査
pnpm audit
```

---

**🛠️ モダンで実績ある技術スタックにより、高品質な開発体験を実現！**
