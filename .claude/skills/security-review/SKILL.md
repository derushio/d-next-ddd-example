---
name: security-review
description: |
  IPAセキュリティ基準に基づくコードレビュー観点を自動適用するスキル。
  入力値検証、認証・認可、インジェクション対策、セキュアな通信等のチェックリストを提供。
  トークン生成ルール（randomHex32/crypto.randomUUID のみ許可、Date.now プレフィックス禁止）、
  IPv6 バリデーション（net.isIP() 必須）、DB_URL アサーション、
  isRegistered(token, true) バブル要件も提供。

  トリガー例:
  - 「セキュリティレビュー」「脆弱性チェック」「IPA基準でチェック」
  - 認証・認可関連コード変更時
  - proxy.ts、Server Actions のセキュリティ関連変更時
  - 「トークン生成」「randomHex32」「crypto.randomUUID」「Math.random」
  - 「IPv6」「net.isIP」「isRegistered」「DATABASE_URL」
  ※ Auth.js v5固有の認証実装パターン（getToken, requireAuthentication等）→ nextauth-v5-patterns スキルを参照
---

# Security Review Skill

このスキルは、IPA「安全なウェブサイトの作り方」およびOWASP Top 10 2021に基づくセキュリティレビュー観点を提供します。

---

## 概要

### IPAセキュリティ基準

IPA（独立行政法人 情報処理推進機構）が公開する「安全なウェブサイトの作り方」第7版に基づき、11種類の主要な脆弱性への対策を提供します。

### レビュー実施タイミング

- コミット前のセルフチェック
- Pull Request作成時
- 認証・認可関連コード変更時
- データベース操作コード変更時
- Server Actions実装時
- proxy.ts変更時

---

## 1. 対象コードのリスク分類

### Critical（最重要）

即座に修正が必要。セキュリティインシデントの直接的原因となる。

**対象**: 認証・認可ロジック、パスワード処理、決済処理、個人情報取得

**ファイル**: `src/layers/application/use-cases/auth/`, `src/proxy.ts`

### High（高）

深刻な脆弱性につながる可能性。優先的に修正。

**対象**: ユーザー入力処理、DBアクセス、外部API連携、ファイルアップロード

**ファイル**: `src/app/server-actions/`, `src/layers/infrastructure/`

### Medium（中）

ベストプラクティス違反。次回リリースまでに修正。

**対象**: ログ出力、エラーハンドリング、セキュリティヘッダー、Rate Limiting

**ファイル**: `src/layers/infrastructure/logger/`, `next.config.ts`

### Low（低）

軽微な改善提案。時間があれば修正。

**対象**: 静的コンテンツ、UI状態管理、CSS

---

## 2. 優先度HIGHチェックリスト（IPA 8項目）

### 2.1 入力値の検証

- [ ] FormData全入力値を検証（Server Actions）
- [ ] Value Objectでバリデーション実施（Domain層）
- [ ] クエリ・パスパラメータ検証
- [ ] バリデーションエラーはResult型で返却

**検出コマンド**:
```bash
git diff --staged | grep -E "formData\.get|searchParams|params\."
git diff --staged src/layers/domain/value-objects/
```

### 2.2 SQLインジェクション防止

- [ ] Prisma標準API使用
- [ ] `$queryRaw`使用時は必ずパラメータバインド
- [ ] LIKE検索でワイルドカードエスケープ
- [ ] 文字列連結でSQL構築禁止

**検出コマンド**:
```bash
git diff --staged | grep -E '\$queryRaw|\$executeRaw'
git diff --staged | grep -E "SELECT.*\$\{|INSERT.*\$\{"
```

### 2.3 XSS防止

- [ ] React JSX自動エスケープ活用
- [ ] `dangerouslySetInnerHTML`使用時は必ずサニタイズ
- [ ] DOMPurify使用時は許可タグ最小限
- [ ] ユーザー入力URLの`javascript:`スキーム除外

**検出コマンド**:
```bash
git diff --staged | grep -E 'dangerouslySetInnerHTML'
git diff --staged | grep -E 'DOMPurify|sanitize'
```

### 2.4 CSRF防止

- [ ] Next.js Server Actions使用（自動CSRF保護）
- [ ] `'use server'`宣言記述
- [ ] 機密操作には追加CSRFトークン検証
- [ ] GET以外のメソッドで状態変更

**検出コマンド**:
```bash
git diff --staged src/app/server-actions/ | grep -E "'use server'"
```

### 2.5 認証チェック

- [ ] `requireAuthentication()`呼び出し（Server Component / Server Action）
- [ ] セッション無い場合はリダイレクトまたはエラー
- [ ] Server Actionsでもセッションチェック
- [ ] proxy.tsで保護ルート定義・JWTトークン検証

**検出コマンド**:
```bash
git diff --staged | grep -E '\bauth\(\)'
git diff --staged src/proxy.ts
```

### 2.6 認可チェック

- [ ] リソースアクセス前に権限チェック（UseCase層）
- [ ] 水平権限チェック（同権限レベルの他人リソース拒否）
- [ ] 垂直権限チェック（上位権限が必要な操作拒否）
- [ ] デフォルト拒否（明示的許可のみ受け入れ）

**検出コマンド**:
```bash
git diff --staged src/layers/application/use-cases/ | grep -E "canEdit|canDelete|hasPermission"
```

### 2.7 セッション管理

- [ ] 暗号論的に安全な乱数でセッションID生成
- [ ] ログイン成功時にセッションID再生成（固定化対策）
- [ ] タイムアウト設定（アイドル・絶対）
- [ ] ログアウト時にセッション破棄
- [ ] `Math.random()` をセキュリティコンテキストで使用していないか（**禁止**: 暗号論的に安全ではない）

**Math.random() 禁止ルール**:

```bash
# セキュリティコンテキストでの Math.random() 使用を検出
grep -rn 'Math\.random' src/layers/application/ src/layers/infrastructure/
```

```typescript
// ❌ 禁止: Math.random() はセキュリティ用途に使用不可
const token = Math.random().toString(36).slice(2);

// ✅ 推奨パターン: randomHex32()（Edge Runtime互換、プロジェクト標準）
import { randomHex32 } from '@/utils/randomHex';
const token = randomHex32(); // 256bit のランダム hex 文字列

// ✅ 許可パターン: crypto.randomUUID()（UUID v4形式が必要な場合）
const sessionId = crypto.randomUUID();
```

トークン生成（パスワードリセット・メール認証等）は必ず `randomHex32()` または `crypto.randomUUID()` を使用すること。
`import { randomBytes } from 'crypto'` / `import { randomBytes } from 'node:crypto'` は Node.js 専用であり **Edge Runtime 非互換** のため使用禁止。詳細はセクション 4-2 を参照。

### 2.8 エラーハンドリング

- [ ] スタックトレースをクライアントに返さない
- [ ] 技術的詳細を含まない汎用エラーメッセージ
- [ ] ユーザー存在有無を特定できないメッセージ
- [ ] エラー詳細はサーバーログのみ出力

**検出コマンド**:
```bash
git diff --staged | grep -E "catch|error\.stack|error\.message"
```

---

## 3. 優先度MEDIUMチェックリスト（6項目）

### 3.1 HTTPS必須化

- [ ] 本番環境で全通信HTTPS
- [ ] HTTP→HTTPS自動リダイレクト
- [ ] HSTSヘッダー設定

### 3.2 セキュリティヘッダー

- [ ] `X-Frame-Options: DENY`（クリックジャッキング対策）
- [ ] `X-Content-Type-Options: nosniff`（MIMEスニッフィング対策）
- [ ] `Strict-Transport-Security`（HSTS）
- [ ] `Content-Security-Policy`（CSP）
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

**検出コマンド**:
```bash
git diff --staged next.config.ts | grep -E "headers|X-Frame-Options|CSP"
```

### 3.3 ログセキュリティ

- [ ] 機密情報（パスワード、トークン、APIキー）をログに出力しない
- [ ] `SecureLogger`使用してマスキング
- [ ] ログレベル適切に設定

**検出コマンド**:
```bash
git diff --staged | grep -E "console\.(log|debug)"
git diff --staged | grep -E "password|token|apiKey|secret"
```

### 3.4 依存パッケージ監査

- [ ] `pnpm audit`で脆弱性チェック
- [ ] Critical/High脆弱性は即座に修正
- [ ] 定期的に依存パッケージ更新

### 3.5 環境変数管理

- [ ] 機密情報を環境変数で管理
- [ ] `.env`ファイルを`.gitignore`に含む
- [ ] `.env.example.dev`のみコミット
- [ ] `env`オブジェクト（`@t3-oss/env-nextjs`）経由でアクセス（`import { env } from '@/lib/env'`）
- [ ] `process.env`の直接アクセス禁止（`src/lib/env.ts` の `runtimeEnv` 内を除く）
- [ ] ビルド時バリデーション有効（`next.config.ts` で `import './src/lib/env'`）

**検出コマンド**:
```bash
git diff --staged | grep -E '(password|secret|apiKey)' | grep -v 'process\.env'
# process.env の直接アクセス検出（src/lib/env.ts を除く）
git diff --staged | grep 'process\.env\.' | grep -v 'src/lib/env.ts'
```

### 3.6 ファイルアップロード検証

- [ ] MIMEタイプ検証
- [ ] ファイルサイズ制限
- [ ] 拡張子ホワイトリスト
- [ ] UUIDでファイル名生成（ユーザー入力使わない）
- [ ] アップロード先ディレクトリ検証

---

## 4. Clean Architecture固有セキュリティ確認

### Domain層

- [ ] Value Objectでの入力検証（Email, Password等）
- [ ] Entityの不変性保証（専用メソッド経由の変更のみ）
- [ ] ビジネスルールとしての権限チェック
- [ ] 定数時間比較（`crypto.timingSafeEqual`使用）

### Application層

- [ ] Result型での統一的エラーハンドリング
- [ ] 認証チェック（currentUserIdの検証）
- [ ] 認可チェック（権限確認）
- [ ] Rate Limiting（IRateLimitService使用）
- [ ] ログイン試行制限（ILoginAttemptService使用）

### Infrastructure層

- [ ] パラメータ化クエリ（Prisma使用）
- [ ] 接続文字列の環境変数管理
- [ ] APIキーの環境変数管理
- [ ] タイムアウト設定（外部API呼び出し）
- [ ] セキュアログ（機密情報マスキング）

### Presentation層

- [ ] Server Actions使用（CSRF保護）
- [ ] 認証チェック（`requireAuthentication()` 使用）
- [ ] 入力サニタイズ（FormData処理前）
- [ ] 汎用エラーメッセージ（技術的詳細含まない）
- [ ] セキュリティヘッダー設定

---

## 4-2. トークン生成ルール

**セキュリティコンテキストでのトークン生成は `randomHex32()` または `crypto.randomUUID()` のみ使用すること。**
予測可能なプレフィックス・タイムスタンプ・`Math.random()` は絶対禁止。

### 禁止パターン

```typescript
// ❌ 禁止: Date.now() プレフィックス（予測可能）
const token = `reset_${Date.now()}_${Math.random().toString(36)}`;

// ❌ 禁止: Math.random()（暗号論的に安全でない）
const token = Math.random().toString(36).slice(2);

// ❌ 禁止: 固定プレフィックス + ランダム（プレフィックスの部分が予測可能）
const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
```

### 許可パターン

```typescript
// ✅ 推奨: randomHex32()（Edge Runtime互換、プロジェクト標準）
import { randomHex32 } from '@/utils/randomHex';
const token = randomHex32(); // 256bit のランダム hex 文字列

// ✅ 許可: crypto.randomUUID()（UUID v4形式が必要な場合）
const sessionId = crypto.randomUUID(); // 標準 Web Crypto API（Edge Runtime互換）
```

> **注意**: `import { randomBytes } from 'node:crypto'` / `import { randomBytes } from 'crypto'` は
> **Node.js 専用**であり **Edge Runtime（proxy.ts 等）では動作しない**。使用禁止。

### 検出コマンド

```bash
# Date.now() をトークン生成に使用している箇所を検出
grep -rn 'Date\.now()' src/ | grep -E 'token|session|reset|verify'

# Math.random() をセキュリティコンテキストで使用している箇所を検出
grep -rn 'Math\.random' src/layers/application/ src/layers/infrastructure/
```

---

## 4-3. IPv6 バリデーション

**IPアドレスのバリデーションには `net.isIP()` を使用すること。**
カスタム正規表現による IPv6 バリデーションは誤った実装になりやすく禁止。

```typescript
// ❌ 禁止: カスタム正規表現（IPv6の完全なパターンを正規表現で表現するのは困難）
const isValidIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip); // IPv4のみ、不完全
const isValidIpv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip); // 省略形非対応

// ✅ 正しい: net.isIP() を使用（IPv4/IPv6 両対応）
import net from 'node:net';

const isValidIp = net.isIP(ip) !== 0;          // 0=無効, 4=IPv4, 6=IPv6
const isValidIpv4 = net.isIPv4(ip);            // IPv4のみ検証
const isValidIpv6 = net.isIPv6(ip);            // IPv6のみ検証
const version = net.isIP(ip);                  // 4 or 6 or 0
```

```typescript
// 実践例: Value Object でのバリデーション
import net from 'node:net';
import { ok, err } from '@/layers/application/types/Result';

class IPAddress {
  static create(value: string) {
    if (net.isIP(value) === 0) {
      return err({ message: '有効なIPアドレスではありません', code: 'INVALID_IP' });
    }
    return ok(new IPAddress(value));
  }
}
```

---

## 4-4. DB_URL アサーション

**DATABASE_URL は本番環境で適切に設定されていることをアプリ起動時にアサーションすること。**
空文字・undefined・開発用のデフォルト値のまま本番デプロイされないよう検証が必要。

```typescript
// ✅ 正しい: env.ts でバリデーション（@t3-oss/env-nextjs）
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // DATABASE_URL が空でないことを強制
    DATABASE_URL: z.string().min(1).url(),
    // ...
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
});
// ビルド時・起動時に自動バリデーションされる

// ❌ 禁止: process.env.DATABASE_URL を直接使用（バリデーションなし）
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }, // undefinedの可能性
});
```

### レビューチェックポイント

- [ ] `env.ts`（`@t3-oss/env-nextjs`）で `DATABASE_URL` を `z.string().min(1).url()` でバリデーションしているか
- [ ] `next.config.ts` で `import './src/lib/env'` によるビルド時バリデーションが有効か
- [ ] Prisma の `datasourceUrl` が `env.DATABASE_URL` 経由になっているか（`process.env` 直接参照禁止）

---

## 4-5. DI コンテナ: isRegistered(token, true) バブル要件

**TSyringe の DI コンテナでトークンが登録されているか確認する際は `isRegistered(token, true)` の第2引数 `true`（親コンテナへのバブル）を必ず指定すること。**

```typescript
// ❌ 禁止: 第2引数なし（子コンテナのみ確認、親コンテナに登録されているトークンを見落とす）
if (!container.isRegistered(TOKEN.UserRepository)) {
  throw new Error('UserRepository is not registered');
}

// ✅ 正しい: 第2引数 true でバブル（親コンテナも確認）
if (!container.isRegistered(TOKEN.UserRepository, true)) {
  throw new Error('UserRepository is not registered');
}
```

**第2引数を省略した場合のリスク**:
- 子コンテナ（テスト用スコープコンテナ等）では `false` が返るが、実際には親コンテナに登録されている
- 誤った「未登録」判定による意図しないエラーが発生する
- 特にテスト環境でのスコープコンテナ使用時に問題になりやすい

### 検出コマンド

```bash
# isRegistered の第2引数が true でないものを検出
grep -rn 'isRegistered(' src/ | grep -v 'true)'
```

---

## 5. セキュリティ検出コマンド

### 危険なパターン検出

```bash
# ハードコードされた機密情報
git diff --staged | grep -E '(password|secret|apiKey)' | grep -v 'process\.env'

# 生SQL使用
git diff --staged | grep -E '(\$queryRaw|\$executeRaw)'

# dangerouslySetInnerHTML使用
git diff --staged | grep -E 'dangerouslySetInnerHTML'

# console.log残存
git diff --staged | grep -E 'console\.(log|debug)'
```

### セキュリティ関連ファイル確認

```bash
# proxy.ts変更
git diff --staged src/proxy.ts

# 環境変数ファイル
git diff --staged .env .env.local .env.example

# next.config.ts変更
git diff --staged next.config.ts

# 認証関連UseCase
git diff --staged src/layers/application/use-cases/auth/

# Value Object（入力検証）
git diff --staged src/layers/domain/value-objects/
```

---

## 6. レビュー結果報告形式

```markdown
## セキュリティレビュー結果

**レビュー日**: YYYY-MM-DD
**対象PR/Commit**: #123 / abc123
**リスクレベル**: Critical / High / Medium / Low

### チェック結果サマリー

- 必須項目（HIGH）: X/8 合格
- 推奨項目（MEDIUM）: X/6 合格
- 指摘事項: X件
- ブロッカー: X件

### リスク分類

- Critical: X件
- High: X件
- Medium: X件
- Low: X件

### 指摘事項

#### [Critical] ファイルパス:行番号

**カテゴリ**: 認証・認可 / SQLインジェクション / XSS / CSRF / セッション管理

**問題**: 具体的な問題の説明

**影響**: セキュリティ問題が引き起こす可能性のある影響

**推奨対策**:
\`\`\`typescript
// 修正例のコード
\`\`\`

**参考**: IPA項目番号 / ドキュメントリンク
```

### リスクレベル定義

| レベル | 説明 | 対応 |
|--------|------|------|
| **Critical** | セキュリティインシデントの直接的原因 | 即座に修正（マージブロック） |
| **High** | 深刻な脆弱性につながる可能性 | 優先的に修正 |
| **Medium** | ベストプラクティス違反 | 次回リリースまでに修正 |
| **Low** | 軽微な改善提案 | 時間があれば修正 |

---

## 7. セキュリティレビュープロセス

### Step 1: リスク分類

変更ファイルのリスクレベルを判定。

```bash
git diff --staged --name-only
```

### Step 2: チェックリスト実行

リスクレベルに応じたチェックリストを実行。

- **Critical**: 優先度HIGHチェックリスト全項目 + CA固有確認
- **High**: 優先度HIGHチェックリスト全項目
- **Medium**: 優先度MEDIUMチェックリスト
- **Low**: 基本チェックのみ

### Step 3: 自動検出コマンド実行

危険なパターンを自動検出。

### Step 4: レビュー結果記録

上記フォーマットで記録。

### Step 5: フィードバックと修正

- Critical/Highの指摘事項は即座に修正
- Medium/Lowの指摘事項は次回リリースまでに対応

---

## 関連リソース

### ドキュメント

- **詳細セキュリティガイド**: `_DOCS/guides/ddd/cross-cutting/security/README.md`
- **開発時チェックリスト**: `_DOCS/guides/ddd/cross-cutting/security/checklists/development.md`
- **コードレビューチェックリスト**: `_DOCS/guides/ddd/cross-cutting/security/checklists/code-review.md`
- **デプロイ前チェックリスト**: `_DOCS/guides/ddd/cross-cutting/security/checklists/deployment.md`

### スキル内リファレンス

- **IPA/OWASPマッピング**: `./references/ipa-owasp-mapping.md`
- **コードパターン集**: `./references/code-patterns.md`
- **IPAチェックリスト**: `./references/ipa-checklist.md`

### 脆弱性別ガイド

- **SQLインジェクション**: `_DOCS/guides/ddd/cross-cutting/security/vulnerabilities/injection/sql-injection.md`
- **XSS**: `_DOCS/guides/ddd/cross-cutting/security/vulnerabilities/injection/xss.md`
- **CSRF**: `_DOCS/guides/ddd/cross-cutting/security/vulnerabilities/web-attacks/csrf.md`
- **クリックジャッキング**: `_DOCS/guides/ddd/cross-cutting/security/vulnerabilities/web-attacks/clickjacking.md`

### 外部リソース

- **IPA「安全なウェブサイトの作り方」**: https://www.ipa.go.jp/security/vuln/websecurity/about.html
- **OWASP Top 10 2021**: https://owasp.org/www-project-top-ten/
- **IPA セキュリティ10大脅威 2025**: https://www.ipa.go.jp/security/10threats/10threats2025.html

---

## まとめ

このスキルを活用して、IPAセキュリティ基準に準拠した安全なコードレビューを実施してください。

**重要**: セキュリティは継続的な取り組みです。定期的にチェックリストを見直し、最新の脆弱性情報を反映してください。

---

## Auth.js v5 認証パターンについて

このスキルはセキュリティ観点の**脆弱性チェック・IPAチェックリスト**を扱います。
Auth.js v5固有のAPIと実装パターンについては以下のスキルを参照してください:

- **nextauth-v5-setup**: Auth.js v5の設定・プロバイダー・セッション戦略・型拡張
- **nextauth-v5-patterns**: proxy.ts認証、requireAuthentication()、ブルートフォース対策

---

## パスワードハッシュについて

このスキルはパスワードハッシュの**セキュリティレビュー観点**を扱います。
Argon2id実装パターン・IHashService・タイミング攻撃対策については以下のスキルを参照してください:

- **password-hashing**: Argon2id（OWASP 2026推奨）実装パターン、bcrypt/bcryptjs禁止ルール、タイミング攻撃対策

### パスワードハッシュレビューチェックリスト

- [ ] `bcrypt` / `bcryptjs` を使用していないか（**禁止**: 代わりに `@node-rs/argon2` を使用）
- [ ] Argon2id設定が OWASP 最小要件を満たしているか（memoryCost≥19456, timeCost≥2）
- [ ] `IHashService` インターフェース経由で DI 注入しているか（直接 import 禁止）
- [ ] ユーザー存在しない場合もダミーハッシュで照合しているか（タイミング攻撃対策）
