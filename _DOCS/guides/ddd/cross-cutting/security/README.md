# IPAセキュリティガイドライン対応

本プロジェクトでは、IPA（独立行政法人 情報処理推進機構）が公開する「安全なウェブサイトの作り方」に基づくセキュリティ対策を実装しています。このドキュメントは、開発者がWebアプリケーションのセキュリティリスクを理解し、適切な対策を講じるためのガイドラインを提供します。

## 概要

IPAが定める11種類の脆弱性とOWASP Top 10 2021の対応関係を明確にし、各脆弱性に対する具体的な対策方法、チェックリスト、実装パターンを提供します。Clean Architecture + DDD構造において、セキュリティ対策を各レイヤーに適切に配置することで、保守性と安全性を両立します。

## IPA 11脆弱性とOWASP Top 10 2021の対応表

| IPA 脆弱性分類 | OWASP Top 10 2021 | 重要度 |
|---------------|-------------------|--------|
| SQLインジェクション | A03:2021-Injection | 高 |
| OSコマンドインジェクション | A03:2021-Injection | 高 |
| HTTPヘッダインジェクション | A03:2021-Injection | 中 |
| XSS（クロスサイトスクリプティング） | A03:2021-Injection | 高 |
| CSRF（クロスサイトリクエストフォージェリ） | A01:2021-Broken Access Control | 高 |
| クリックジャッキング | A05:2021-Security Misconfiguration | 中 |
| セッション管理の欠陥 | A07:2021-Identification and Authentication Failures | 高 |
| 認可制御の欠落 | A01:2021-Broken Access Control | 高 |
| ディレクトリトラバーサル | A01:2021-Broken Access Control | 中 |
| バッファオーバーフロー | A06:2021-Vulnerable and Outdated Components | 中 |
| メールヘッダインジェクション | A03:2021-Injection | 中 |

## ディレクトリ構造

```
security/
├── README.md                    # 本ファイル
├── checklists/                  # 実装チェックリスト
│   ├── development.md           # 開発時チェックリスト
│   ├── code-review.md           # コードレビュー時チェックリスト
│   └── deployment.md            # デプロイ前チェックリスト
├── vulnerabilities/             # 脆弱性別ガイド
│   ├── injection/               # インジェクション系
│   │   ├── sql-injection.md
│   │   ├── os-command-injection.md
│   │   └── mail-header-injection.md
│   ├── access-control/          # アクセス制御系
│   │   ├── authorization.md
│   │   ├── directory-traversal.md
│   │   └── session-management.md
│   ├── web-attacks/             # Webアプリケーション攻撃
│   │   ├── csrf.md
│   │   ├── clickjacking.md
│   │   ├── http-header-injection.md
│   │   ├── session-management.md
│   │   └── xss.md
│   └── system/                  # システムレベル
│       └── buffer-overflow.md
└── references/                  # 参考資料
    ├── ipa-owasp-mapping.md     # IPA/OWASP/CWE対応表
    └── external-links.md        # 外部リンク集
```

## クイックスタート

### 実装フェーズ別チェックリスト

開発の各段階で確認すべきセキュリティチェックリストを提供しています。

- [開発時チェックリスト](./checklists/development.md) - コーディング時に確認すべき項目
- [コードレビュー時チェックリスト](./checklists/code-review.md) - レビュー時に確認すべき項目
- [デプロイ前チェックリスト](./checklists/deployment.md) - 本番環境リリース前の最終確認項目

### 脆弱性分類別ガイド

#### インジェクション系脆弱性（A03:2021-Injection）

- [SQLインジェクション](./vulnerabilities/injection/sql-injection.md)
  - Prisma ORM使用時の安全な実装パターン
  - プレースホルダー利用とバリデーション

- [OSコマンドインジェクション](./vulnerabilities/injection/os-command-injection.md)
  - 外部コマンド実行時の対策
  - サニタイゼーション実装

- [HTTPヘッダインジェクション](./vulnerabilities/injection/http-header-injection.md)
  - Next.js 16 proxy.ts での対策
  - レスポンスヘッダー設定時の注意点

- [XSS（クロスサイトスクリプティング）](./vulnerabilities/injection/xss.md)
  - React 19の自動エスケープ機能
  - dangerouslySetInnerHTML使用時の対策
  - DOMPurifyによるサニタイゼーション

- [メールヘッダインジェクション](./vulnerabilities/injection/mail-header-injection.md)
  - メール送信時のヘッダー検証
  - nodemailer使用時のベストプラクティス

#### アクセス制御系脆弱性（A01:2021-Broken Access Control）

- [CSRF（クロスサイトリクエストフォージェリ）](./vulnerabilities/web-attacks/csrf.md)
  - Next.js Server Actionsのトークン検証
  - SameSite Cookie属性の設定

- [認可制御の欠落](./vulnerabilities/access-control/authorization.md)
  - UseCase層での権限チェック実装
  - RBAC（ロールベースアクセス制御）パターン

- [ディレクトリトラバーサル](./vulnerabilities/access-control/directory-traversal.md)
  - ファイルパス操作時の検証
  - パスノーマライゼーション

#### Webアプリケーション攻撃

- [クリックジャッキング](./vulnerabilities/web-attacks/clickjacking.md)
  - X-Frame-Options, CSP設定
  - Next.js 16での実装方法

- [セッション管理の欠陥](./vulnerabilities/web-attacks/session-management.md)
  - Secure, HttpOnly, SameSite属性の設定
  - セッション固定攻撃対策
  - セッションタイムアウト実装

#### システムレベル脆弱性

- [バッファオーバーフロー](./vulnerabilities/system/buffer-overflow.md)
  - Node.js環境における対策
  - 依存パッケージの更新管理

## 参考資料

- [IPA/OWASP/CWE対応表](./references/ipa-owasp-mapping.md) - IPA脆弱性とOWASP/CWEの対応関係
- [外部リンク集](./references/external-links.md) - 参考外部リソース一覧

## 実装時の基本原則

### 1. 多層防御（Defense in Depth）

単一の対策に依存せず、複数のレイヤーで防御を実施します。

- **Domain層**: Value Objectでのバリデーション
- **Application層**: UseCaseでの認可チェック
- **Infrastructure層**: Repository実装でのエスケープ処理
- **Presentation層**: Server Actionでの入力検証

### 2. デフォルト拒否（Default Deny）

明示的に許可されていない操作は全て拒否します。

```typescript
// 良い例: ホワイトリスト方式
const allowedRoles = ['admin', 'editor'];
if (!allowedRoles.includes(user.role)) {
  return err({ message: '権限がありません' });
}

// 悪い例: ブラックリスト方式
if (user.role === 'guest') {
  return err({ message: '権限がありません' });
}
```

### 3. 最小権限の原則（Principle of Least Privilege）

必要最小限の権限のみを付与します。

- データベース接続は読み取り専用/書き込み専用を分離
- APIキーは機能ごとに発行
- ユーザーロールは細分化

### 4. 入力検証と出力エスケープ

全ての外部入力を信頼せず、検証とサニタイゼーションを実施します。

```typescript
// 入力検証: Domain層Value Object
class Email {
  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('無効なメールアドレス');
    }
  }
}

// 出力エスケープ: Presentation層
// React 19は自動エスケープを提供
<div>{user.name}</div>
```

## セキュリティレビュープロセス

### コードレビュー時のチェックポイント

1. **外部入力の検証**: 全ての入力にバリデーションが実装されているか
2. **認証・認可**: 適切な権限チェックが実施されているか
3. **機密情報の取り扱い**: パスワード、APIキーがハードコードされていないか
4. **エラーハンドリング**: エラーメッセージから内部情報が漏洩していないか
5. **ログ出力**: 機密情報がログに記録されていないか

### 自動化ツール

```bash
# 静的解析
pnpm check           # Biome linter

# 依存関係の脆弱性チェック
pnpm audit           # npm audit

# テスト実行
pnpm test            # Vitest単体テスト
pnpm test:e2e        # Playwright E2Eテスト
```

## 関連ドキュメント

- [Clean Architectureガイド](../../concepts/clean-architecture.md)
- [DDD実装パターン](../../concepts/domain-driven-design.md)
- [テストパターン](../../../../testing/strategy.md)
- [エラーハンドリング](../error-handling.md)

## 更新履歴

本ドキュメントは、IPAガイドライン、OWASP Top 10、および業界のベストプラクティスの更新に応じて定期的に見直されます。
見直しはテンプレ配布リポジトリ側で行われ、各プロジェクトへは `sup-next` の再実行で配布されます。
