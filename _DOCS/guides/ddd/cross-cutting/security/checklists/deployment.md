# デプロイ前セキュリティチェックリスト

IPAセキュリティ基準に準拠した本番環境デプロイ前の包括的なチェックリスト。

---

## 概要

本番環境へのデプロイ前に実施すべきセキュリティ検証項目を定義します。各項目はIPAの「安全なウェブサイトの作り方」および「システム監査基準」に基づいています。

---

## 🔐 環境設定

### 環境変数

- [ ] 本番用DATABASE_URLの設定確認（SSL接続必須）
- [ ] TOKEN_SECRETが64文字以上のランダム文字列
- [ ] 開発用シークレット・APIキーの完全削除確認
- [ ] .envファイルが.gitignoreに含まれていることを確認
- [ ] 環境変数の設定漏れがないことを確認
- [ ] AUTH_SECRETが本番用の値に変更されている

**参考:** `_DOCS/reference/environment-variables.md`

```env
# 本番環境での推奨設定
TOKEN_SECRET="your-very-long-random-secure-secret-minimum-64-characters-recommended"
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&sslmode=require"
```

### HTTPS設定

- [ ] SSL/TLS証明書の有効期限確認（自動更新設定推奨）
- [ ] HTTP→HTTPSリダイレクトの動作確認
- [ ] 証明書チェーンの完全性確認
- [ ] TLS 1.2以上のみ許可設定
- [ ] 弱い暗号スイートの無効化

---

## 🛡️ セキュリティヘッダー

### next.config.ts確認

- [ ] Content-Security-Policy設定（本番用に調整）
- [ ] X-Frame-Options: DENY設定
- [ ] X-Content-Type-Options: nosniff設定
- [ ] Referrer-Policy設定
- [ ] Strict-Transport-Security（HSTS）設定
- [ ] X-XSS-Protection削除確認（CSPで代替）
- [ ] Permissions-Policy設定

**推奨設定例:**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",  // 本番では'unsafe-inline'を削除
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
  // 本番環境では画像ホストを制限
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.example.com',
      },
    ],
  },
};
```

**検証方法:**

```bash
# セキュリティヘッダーの確認
curl -I https://your-domain.com | grep -E "(Content-Security|X-Frame|X-Content)"
```

---

## 📦 依存関係

### パッケージ監査

- [ ] `pnpm audit`実行（Critical/High脆弱性ゼロ確認）
- [ ] 脆弱性のあるパッケージの更新または代替策実施
- [ ] devDependenciesが本番ビルドに含まれないことを確認
- [ ] 本番不要パッケージの削除
- [ ] package.jsonのpnpm.overrides設定確認

```bash
# 脆弱性監査
pnpm audit

# 修正可能な脆弱性の自動修正
pnpm audit --fix

# 脆弱性レポートの出力
pnpm audit --json > security-audit.json
```

---

## 📝 ログ・監視

### ログ設定

- [ ] LOG_MASK_PII=trueに設定（個人情報マスキング）
- [ ] パスワード・トークンがログ出力されないことを確認
- [ ] エラースタックトレースに機密情報が含まれないことを確認
- [ ] SecureLogger使用確認（全Infrastructure層）
- [ ] 本番環境のログレベル設定（INFOまたはWARN推奨）
- [ ] console.log削除確認（後述の最終確認セクション参照）

**検証項目:**

```typescript
// ✅ 良い例：SecureLoggerを使用
this.logger.info('User action', { userId: user.id });

// ❌ 悪い例：機密情報をログ出力
console.log('Password:', password);
this.logger.info('Token:', token);
```

### 監視

- [ ] セキュリティイベント監視設定（認証失敗、不正アクセス等）
- [ ] 異常アクセス検知アラート設定
- [ ] エラーレート監視設定
- [ ] Rate Limitヒット数の監視
- [ ] アカウントロックアウト発生の監視
- [ ] データベース接続エラー監視

**推奨監視ツール:**

- Sentry（エラー監視）
- Datadog / CloudWatch（インフラ監視）
- LogRocket（セッション記録）

---

## 🗄️ データベース

### Prisma設定

- [ ] 本番DBマイグレーション適用確認（`pnpm db:migrate:deploy`）
- [ ] マイグレーション履歴の整合性確認
- [ ] 接続プール設定の最適化（connection_limit設定）
- [ ] SSL接続の強制（sslmode=require）
- [ ] 本番DBへのアクセス制限（IPホワイトリスト等）
- [ ] データベース認証情報の暗号化保存
- [ ] バックアップ戦略の確認

**DATABASE_URL設定例:**

```env
# 本番環境（SSL必須）
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&sslmode=require&connection_limit=10&pool_timeout=20"
```

**検証コマンド:**

```bash
# マイグレーション状態確認
pnpm prisma migrate status

# 本番デプロイ用マイグレーション適用
pnpm db:migrate:deploy
```

---

## 🔒 認証・認可

### 認証設定

- [ ] AUTH_RATE_LIMIT_ENABLED=trueに設定
- [ ] AUTH_RATE_LIMIT_MAX=5（1分間5回まで）
- [ ] AUTH_LOCKOUT_ENABLED=trueに設定
- [ ] AUTH_LOCKOUT_THRESHOLD=5（5回失敗でロック）
- [ ] AUTH_LOCKOUT_DURATION_MS=900000（15分ロック）
- [ ] セッションタイムアウト設定（SESSION_MAX_AGE_SECONDS）
- [ ] JWT有効期限設定（JWT_MAX_AGE_SECONDS）

### パスワードポリシー

- [ ] PASSWORD_MIN_LENGTH=12以上に設定
- [ ] PASSWORD_CHECK_USER_INFO=trueに設定
- [ ] パスワードハッシュ化の確認（Argon2id, memoryCost:19456, timeCost:2, parallelism:1）
- [ ] パスワードリセット機能のテスト

### proxy.ts（旧middleware.ts）確認

- [ ] 保護ルート（PROTECTED_ROUTES）の設定確認
- [ ] 公開ルート（PUBLIC_ROUTES）の設定確認
- [ ] 認証失敗時のリダイレクト動作確認
- [ ] AUTH_SECRET環境変数の設定確認

**参考:** `src/proxy.ts`

---

## 🧪 セキュリティテスト

### 脆弱性スキャン

- [ ] XSS（クロスサイトスクリプティング）対策の確認
- [ ] SQLインジェクション対策の確認（Prismaは自動対策済み）
- [ ] CSRF対策の確認（Server Actionsは自動対策済み）
- [ ] パストラバーサル脆弱性の確認
- [ ] SSRF（Server-Side Request Forgery）対策の確認

### 入力値検証

- [ ] 全フォーム入力にZodバリデーション実装確認
- [ ] ファイルアップロード機能のバリデーション確認
- [ ] APIエンドポイントの入力値検証確認
- [ ] サニタイゼーション処理の実装確認

### 認証テスト

- [ ] 未認証アクセスのリダイレクト動作確認
- [ ] 不正トークンでのアクセス拒否確認
- [ ] セッション期限切れ時の動作確認
- [ ] Rate Limit動作確認（連続ログイン試行）
- [ ] アカウントロックアウト動作確認

**テストコマンド:**

```bash
# 全テスト実行
pnpm test

# E2Eテスト実行
pnpm test:e2e

# カバレッジ確認
pnpm test:coverage
```

---

## 🚀 ビルド・デプロイ

### ビルド確認

- [ ] `pnpm build`が成功することを確認
- [ ] ビルドエラー・警告の解消
- [ ] TypeScript型エラーゼロ確認（`pnpm type-check`）
- [ ] Biome lintエラーゼロ確認（`pnpm lint`）
- [ ] テスト全件通過確認（`pnpm test`）

```bash
# 品質チェック一括実行
pnpm check
```

### ソースコード確認

- [ ] デバッグコードの削除（console.log, debugger等）
- [ ] コメントアウトされた未使用コードの削除
- [ ] TODOコメントの解消または課題管理への移行
- [ ] ハードコードされた認証情報の削除確認

**検索コマンド:**

```bash
# console.logの検索
grep -r "console.log" src/ --exclude-dir=node_modules

# debuggerの検索
grep -r "debugger" src/ --exclude-dir=node_modules

# TODOコメントの検索
grep -r "TODO\|FIXME" src/ --exclude-dir=node_modules
```

### ソースマップ設定

- [ ] 本番環境でのソースマップ公開設定確認
- [ ] エラー追跡用のプライベートソースマップ設定
- [ ] .envファイルがビルドに含まれないことを確認

**next.config.ts設定:**

```typescript
const nextConfig = {
  // 本番環境ではソースマップを非公開に
  productionBrowserSourceMaps: false,
};
```

---

## 🔍 最終確認

### デプロイ前チェック

- [ ] デバッグモード無効化（NODE_ENV=production）
- [ ] 開発用エンドポイントの無効化または削除
- [ ] 全環境変数の本番設定確認
- [ ] データベース接続テスト
- [ ] 外部API接続テスト
- [ ] メール送信機能テスト（該当する場合）

### console.log削除確認

- [ ] src/配下の全console.logを削除またはloggerに置き換え
- [ ] 例外: 開発時のみ実行されるデバッグコード（条件分岐で保護）

**許容される例:**

```typescript
// ✅ 開発環境のみのログ
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ✅ loggerを使用
this.logger.info('Production log', { data });

// ❌ 本番環境で実行されるconsole.log
console.log('User data:', user);  // 削除必須
```

### ドキュメント確認

- [ ] README.mdの更新（デプロイ手順、環境変数等）
- [ ] CHANGELOG.mdの更新
- [ ] API仕様書の更新（該当する場合）
- [ ] 運用マニュアルの作成・更新

---

## 📋 デプロイ後確認

### 動作確認

- [ ] 本番環境での基本動作確認
- [ ] 認証・認可フローの動作確認
- [ ] データベース接続確認
- [ ] メール送信確認（該当する場合）
- [ ] 外部API連携確認

### セキュリティ検証

- [ ] SSL/TLS証明書の有効性確認
- [ ] セキュリティヘッダーの出力確認
- [ ] Rate Limit動作確認
- [ ] エラーページでの情報漏洩確認
- [ ] ログ出力内容の確認（機密情報が含まれていないか）

**検証ツール:**

- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

---

## 🎯 IPA準拠チェックポイント

### 「安全なウェブサイトの作り方」準拠

- [ ] SQLインジェクション対策（Prisma使用）
- [ ] XSS対策（入力値検証・出力エスケープ）
- [ ] CSRF対策（Server Actions使用）
- [ ] HTTPヘッダ・インジェクション対策
- [ ] メールヘッダ・インジェクション対策（該当する場合）
- [ ] パストラバーサル脆弱性対策
- [ ] OSコマンド・インジェクション対策
- [ ] オープンリダイレクト脆弱性対策
- [ ] セッション管理の不備対策
- [ ] 認証・認可の不備対策
- [ ] クリックジャッキング対策（X-Frame-Options）

### 「システム監査基準」準拠

- [ ] アクセス制御の実装確認
- [ ] 監査ログの記録（認証失敗、権限エラー等）
- [ ] 暗号化通信の実装（HTTPS）
- [ ] パスワード管理の適切性（ハッシュ化、ポリシー）
- [ ] バックアップ・リカバリ計画の確認
- [ ] インシデント対応手順の準備

---

## 📚 関連ドキュメント

- [セキュリティ実装ガイド](../security.md) - セキュリティ設計の詳細
- [環境変数リファレンス](../../../../../reference/environment-variables.md) - 環境変数の完全ガイド
- [ロギング戦略](../logging-strategy.md) - セキュアなログ出力
- [エラーハンドリング](../error-handling.md) - セキュアなエラー処理

---

## 補足

### チェックリスト実施タイミング

1. **開発完了時**: 全機能実装後の初回チェック
2. **ステージング環境デプロイ前**: ステージング環境での検証前
3. **本番環境デプロイ前**: 本番リリース直前（最終確認）
4. **定期レビュー**: 四半期ごとのセキュリティレビュー

### 責任者

- セキュリティ担当者: 全項目の確認
- 開発リーダー: コード品質・テストの確認
- インフラ担当者: 環境設定・監視の確認
- プロジェクトマネージャー: 全体進捗・承認

### 承認フロー

1. 開発チーム: チェックリスト完了
2. セキュリティ担当者: セキュリティ検証
3. インフラ担当者: 環境設定検証
4. プロジェクトマネージャー: 最終承認
5. デプロイ実施

---

このチェックリストを活用して、セキュアで信頼性の高い本番環境デプロイを実現してください。
