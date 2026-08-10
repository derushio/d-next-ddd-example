# セキュリティ参考資料・外部リンク集

このドキュメントでは、Webアプリケーション開発における重要なセキュリティ関連の外部リンクをまとめています。定期的に最新情報を確認し、セキュリティ対策の知識をアップデートしてください。

## IPA（情報処理推進機構）

### 安全なウェブサイトの作り方

**URL**: <https://www.ipa.go.jp/security/vuln/websecurity/about.html>

IPAが提供する日本語の包括的なWebセキュリティガイド。実装段階でのセキュリティ対策を具体的に解説しています。

**主要コンテンツ**:

- SQLインジェクション対策
- クロスサイトスクリプティング（XSS）対策
- CSRF対策
- セッション管理の実装方法
- パスワード保存の安全な方法

### 情報セキュリティ10大脅威

**URL**: <https://www.ipa.go.jp/security/10threats/index.html>

毎年更新される最新のセキュリティ脅威ランキング。組織が直面する現実的なリスクを把握できます。

### セキュリティ対策チェックポイント20ヶ条

**URL**: <https://www.ipa.go.jp/security/measures/20security_checks.html>

すぐに実践できる基本的なセキュリティチェックリスト。開発完了時の最終確認に活用できます。

### 脆弱性対策コンテンツリファレンス

**URL**: <https://www.ipa.go.jp/security/vuln/index.html>

脆弱性情報データベースと対策情報のリファレンス。最新の脆弱性情報を入手できます。

## OWASP（Open Web Application Security Project）

### OWASP Top 10 2021

**URL**: <https://owasp.org/Top10/>

Webアプリケーションセキュリティの最も重要な10のリスク。グローバルスタンダードのセキュリティリスク分類です。

**2021年版の主要項目**:

1. A01:2021 - Broken Access Control（アクセス制御の不備）
2. A02:2021 - Cryptographic Failures（暗号化の失敗）
3. A03:2021 - Injection（インジェクション）
4. A04:2021 - Insecure Design（安全でない設計）
5. A05:2021 - Security Misconfiguration（セキュリティ設定ミス）
6. A06:2021 - Vulnerable and Outdated Components（脆弱で古いコンポーネント）
7. A07:2021 - Identification and Authentication Failures（識別と認証の失敗）
8. A08:2021 - Software and Data Integrity Failures（ソフトウェアとデータの整合性の不備）
9. A09:2021 - Security Logging and Monitoring Failures（セキュリティログとモニタリングの失敗）
10. A10:2021 - Server-Side Request Forgery（SSRF）

### OWASP Cheat Sheet Series

**URL**: <https://cheatsheetseries.owasp.org/>

各種セキュリティ対策の実装方法を簡潔にまとめたチートシート集。実装時の即座のリファレンスとして有用です。

**主要チートシート**:

- Authentication Cheat Sheet
- Session Management Cheat Sheet
- SQL Injection Prevention Cheat Sheet
- Cross-Site Scripting (XSS) Prevention Cheat Sheet
- Cross-Site Request Forgery (CSRF) Prevention Cheat Sheet
- Input Validation Cheat Sheet
- Password Storage Cheat Sheet

### OWASP Testing Guide

**URL**: <https://owasp.org/www-project-web-security-testing-guide/>

Webアプリケーションのセキュリティテスト手法を網羅的に解説。ペネトレーションテストの実施方法を学べます。

### OWASP ASVS（Application Security Verification Standard）

**URL**: <https://owasp.org/www-project-application-security-verification-standard/>

アプリケーションセキュリティの検証基準。3つのレベル（L1/L2/L3）で段階的なセキュリティ要件を定義しています。

**活用方法**:

- セキュリティ要件定義のベースライン
- セキュリティレビューのチェックリスト
- 開発プロセスへのセキュリティ組み込み

### OWASP ZAP（Zed Attack Proxy）

**URL**: <https://www.zaproxy.org/>

無料のWebアプリケーション脆弱性スキャナー。自動スキャンと手動テストの両方に対応しています。

## CWE（Common Weakness Enumeration）

### MITRE CWE公式サイト

**URL**: <https://cwe.mitre.org/>

ソフトウェアの脆弱性の種類を体系的に分類したリスト。技術的な詳細と対策方法を提供しています。

**主要カテゴリー**:

- CWE-20: Improper Input Validation（不適切な入力検証）
- CWE-79: Cross-site Scripting（クロスサイトスクリプティング）
- CWE-89: SQL Injection（SQLインジェクション）
- CWE-200: Exposure of Sensitive Information（機密情報の露出）
- CWE-352: Cross-Site Request Forgery（CSRF）
- CWE-502: Deserialization of Untrusted Data（信頼できないデータのデシリアライズ）

### CWE Top 25

**URL**: <https://cwe.mitre.org/top25/>

最も危険で一般的なソフトウェアの脆弱性トップ25。優先的に対策すべき脆弱性を特定できます。

## Next.js 固有セキュリティ

### Next.js セキュリティドキュメント

**URL**: <https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security>

Next.js公式のセキュリティガイド。Server Actionsやミドルウェアのセキュアな実装方法を解説しています。

**主要トピック**:

- Server Actionsのセキュリティ
- Authentication and Authorization
- Environment Variables
- Content Security Policy (CSP)
- XSS Protection
- CSRF Protection

### Next.js 16 のセキュリティ強化

**URL**: <https://nextjs.org/blog/next-16>

Next.js 16で追加されたセキュリティ機能（Turbopack、proxy.ts等）の情報を含みます。

**注意事項**:

- `middleware.ts`が`proxy.ts`にリネームされました
- Server Componentsのデフォルト化によるセキュリティ向上
- 新しいキャッシュ戦略

## React 固有セキュリティ

### React セキュリティベストプラクティス

**URL**: <https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html>

React公式ドキュメントのセキュリティ関連セクション。

**主要トピック**:

- XSS対策（dangerouslySetInnerHTMLの使用制限）
- URL sanitization
- ユーザー入力のエスケープ
- セキュアなイベントハンドラー実装

### React 19 セキュリティアップデート

**URL**: <https://react.dev/blog/2024/12/05/react-19>

React 19の新機能とセキュリティ改善について。

## Prisma 固有セキュリティ

### Prisma セキュリティガイド

**URL**: <https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#sql-injection>

Prisma ORMのセキュアな使用方法。

**主要トピック**:

- SQLインジェクション対策
- Parameterized Queries
- Raw Queryの安全な使用方法
- データベース接続のセキュリティ

### Prisma 7 セキュリティ機能

**URL**: <https://www.prisma.io/docs/orm/overview/releases>

Prisma 7の最新セキュリティ機能と改善点。

## その他ツール・リソース

### npm audit

**URL**: <https://docs.npmjs.com/cli/v10/commands/npm-audit>

依存パッケージの既知の脆弱性をスキャンするnpm公式ツール。

**使用方法**:

```bash
npm audit                  # 脆弱性レポート表示
npm audit fix              # 自動修正可能な脆弱性を修正
npm audit fix --force      # メジャーバージョンアップを含む修正
```

### Snyk

**URL**: <https://snyk.io/>

商用の包括的セキュリティプラットフォーム。無料プランでも基本的な脆弱性スキャンが可能です。

**主要機能**:

- 依存関係の脆弱性スキャン
- コンテナイメージのスキャン
- Infrastructure as Code（IaC）のスキャン
- 自動修正PR作成
- CI/CD統合

**統合方法**:

```bash
# Snyk CLIインストール
npm install -g snyk

# プロジェクトスキャン
snyk test

# 自動修正
snyk fix
```

### SonarQube

**URL**: <https://www.sonarqube.org/>

コード品質とセキュリティの静的解析ツール。セキュリティホットスポットを検出します。

**主要機能**:

- セキュリティ脆弱性検出
- コード品質メトリクス
- テクニカルデット分析
- CI/CD統合

### GitHub Security Features

**URL**: <https://docs.github.com/en/code-security>

GitHubが提供するセキュリティ機能。

**主要機能**:

- Dependabot（依存関係の自動更新）
- Security Advisories
- Code Scanning（CodeQL）
- Secret Scanning

### Mozilla Observatory

**URL**: <https://observatory.mozilla.org/>

Webサイトのセキュリティヘッダーとベストプラクティスをテストするツール。

**チェック項目**:

- Content Security Policy（CSP）
- HTTP Strict Transport Security（HSTS）
- X-Content-Type-Options
- X-Frame-Options
- その他セキュリティヘッダー

### SSL Labs SSL Test

**URL**: <https://www.ssllabs.com/ssltest/>

SSL/TLS設定の包括的なテストツール。HTTPS設定の安全性を評価します。

### Have I Been Pwned

**URL**: <https://haveibeenpwned.com/>

データ漏洩の確認サービス。メールアドレスやパスワードが漏洩していないか確認できます。

**API**:

- パスワード漏洩チェックAPI（開発時の検証に活用可能）

### NIST（National Institute of Standards and Technology）

**URL**: <https://www.nist.gov/cybersecurity>

米国国立標準技術研究所が提供するサイバーセキュリティフレームワーク。

**主要リソース**:

- NIST Cybersecurity Framework
- NIST Special Publications（SP 800シリーズ）

## セキュリティニュース・ブログ

### The Hacker News

**URL**: <https://thehackernews.com/>

最新のサイバーセキュリティニュースと脅威情報。

### Krebs on Security

**URL**: <https://krebsonsecurity.com/>

セキュリティジャーナリストBrian Krebsのブログ。詳細な調査レポートを提供しています。

### JPCERT/CC

**URL**: <https://www.jpcert.or.jp/>

日本のコンピュータ緊急対応センター。国内のセキュリティインシデント情報を提供しています。

## コミュニティ・フォーラム

### Stack Overflow - Security Tag

**URL**: <https://stackoverflow.com/questions/tagged/security>

セキュリティ関連の技術的な質問と回答。

### Reddit - r/netsec

**URL**: <https://www.reddit.com/r/netsec/>

ネットワークセキュリティのコミュニティ。最新のセキュリティトピックを議論しています。

## 学習リソース

### PortSwigger Web Security Academy

**URL**: <https://portswigger.net/web-security>

Burp Suiteの開発元が提供する無料のWebセキュリティ学習プラットフォーム。

**主要コンテンツ**:

- インタラクティブなラボ環境
- SQLインジェクション、XSS等の実践的なチュートリアル
- 認定資格取得コース

### HackTheBox

**URL**: <https://www.hackthebox.com/>

実践的なペネトレーションテストのトレーニングプラットフォーム。

### TryHackMe

**URL**: <https://tryhackme.com/>

初心者向けのサイバーセキュリティ学習プラットフォーム。ガイド付きのラーニングパスを提供しています。

## 定期的な確認事項

セキュリティ対策は継続的な取り組みが必要です。以下を定期的に実施してください。

### 毎週

- `npm audit`でパッケージの脆弱性チェック
- セキュリティニュースの確認

### 毎月

- OWASP Top 10の再確認
- 依存関係の更新
- セキュリティテストの実施

### 四半期ごと

- IPAの最新ガイドライン確認
- CWE Top 25の見直し
- セキュリティ監査の実施

### 年次

- フレームワーク・ライブラリのメジャーバージョンアップ
- セキュリティポリシーの見直し
- 全体的なセキュリティレビュー

## 関連ドキュメント

- [セキュリティ概要](../README.md)
- [IPA-OWASP-CWE 対応表](./ipa-owasp-mapping.md)
