# コード生成ツール実装計画書

## 概要

このドキュメントは、d-next-resources プロジェクトにコード生成ツール（スキャフォールディング）を導入するための包括的な実装計画書です。

## プロジェクト背景

### 現状の課題

Clean Architecture + DDD のプロジェクトでは、新機能追加時に以下のファイルを手動で作成する必要があります：

1. **Domain層**: Entity, Value Object, Repository Interface
2. **Infrastructure層**: Repository実装
3. **Application層**: UseCase
4. **Presentation層**: Server Action
5. **DI設定**: tokens.ts, container登録
6. **テスト**: 各層のテストファイル

これらは決まったパターンに従うため、自動生成が効果的です。

### 期待される効果

| 指標 | 現状 | 導入後 |
|------|------|--------|
| UseCase追加時間 | 30-45分 | 5分以下 |
| コード一貫性 | 人依存 | 100%保証 |
| 学習コスト | 高い | テンプレートで理解 |
| DI登録漏れ | 発生しうる | 自動で防止 |

## 選定ツール

**Hygen** を採用

### 選定理由

1. **プロジェクトローカルテンプレート**: `_templates/` がGit管理され、PRでレビュー可能
2. **EJSテンプレート**: TypeScriptとの親和性が高い
3. **inject機能**: 既存ファイル（tokens.ts, container）への自動追記
4. **軽量・高速**: npm週間136K DL、セットアップ5分
5. **シンプル**: 学習コストが低い

### 代替案との比較

| 観点 | Hygen | Plop |
|------|-------|------|
| テンプレート形式 | EJS | Handlebars |
| 設定ファイル | テンプレート内 | plopfile.js |
| inject機能 | ✅ 標準 | ✅ append action |
| TS対応 | ✅ | ✅ plopfile.ts |
| 学習コスト | 低 | 低 |
| npm DL/週 | 137K | 573K |

Plop の方が採用数は多いが、Hygen はテンプレートのローカル管理が優れており、このプロジェクトの Clean Architecture との相性が良い。

## ドキュメント構成

| ファイル | 内容 |
|----------|------|
| 00-overview.md | 本ファイル（概要） |
| 01-analysis.md | プロジェクト分析結果 |
| 02-tool-selection.md | ツール選定詳細比較 |
| 03-architecture.md | テンプレートアーキテクチャ |
| 04-templates.md | 各テンプレートの仕様 |
| 05-implementation-steps.md | 段階的実装手順 |
| 06-testing.md | テスト・検証計画 |

## 実装フェーズ

```
Phase 1: 基盤構築（1-2時間）
├── Hygen インストール
├── ディレクトリ構造作成
└── 基本設定

Phase 2: コアテンプレート（2-3時間）
├── UseCase テンプレート
├── Entity テンプレート
└── Repository テンプレート

Phase 3: 拡張テンプレート（1-2時間）
├── Server Action テンプレート
├── Component テンプレート
└── DI自動登録

Phase 4: ドキュメント・仕上げ（1時間）
├── 使用方法ドキュメント
├── package.json スクリプト追加
└── チーム共有
```

## 参考リンク

- [Hygen 公式](https://github.com/jondot/hygen)
- [Hygen ドキュメント](https://www.hygen.io/)
- [npm-compare: Hygen vs Plop](https://npm-compare.com/hygen,plop,yeoman-generator)
