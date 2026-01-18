# 環境変数リファレンス 🔧

プロジェクトで使用する環境変数の完全なリファレンスガイド

---

## 📖 このドキュメントについて

### 🎯 目的

- **設定理解**: 各環境変数の役割と影響範囲の把握
- **セキュリティ**: セキュリティ関連設定の適切な構成
- **トラブルシューティング**: 設定起因の問題解決

### 🔗 関連ドキュメント

- **[セットアップ](../guides/setup.md)** - 初期環境構築
- **[セキュリティ実装](../guides/ddd/cross-cutting/security.md)** - セキュリティ設計
- **[コマンドリファレンス](commands.md)** - 開発コマンド

---

## 🚀 クイックスタート

### 基本セットアップ

```bash
# .env.localファイルを作成
cp .env.example .env.local

# 必須項目を編集
vim .env.local
```

### 必須環境変数

```env
# 🔑 必須設定
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
TOKEN_SECRET="your-secure-random-string-minimum-32-characters"
```

---

## 📋 環境変数一覧

### 🗄️ データベース設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL接続文字列 |

```env
# 開発環境
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/d_next_dev?schema=public"

# 本番環境（例: Supabase）
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

---

### 🌐 アプリケーション設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `NEXT_PUBLIC_BASE_URL` | - | `http://localhost:3000` | アプリケーションのベースURL |

```env
# 開発環境
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# 本番環境
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
```

---

### 🔐 トークン・認証設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `TOKEN_SECRET` | ✅ | - | JWT署名用シークレット（32文字以上推奨） |
| `TOKEN_SALT_ROUNDS` | - | `10` | bcryptハッシュのソルトラウンド数 |
| `TOKEN_MAX_AGE_MINUTES` | - | `60` | アクセストークン有効期限（分） |
| `TOKEN_UPDATE_AGE_MINUTES` | - | `30` | トークン更新までの時間（分） |

```env
# トークン設定
TOKEN_SECRET="your-super-secure-secret-key-minimum-32-chars"
TOKEN_SALT_ROUNDS=12          # 本番は12以上推奨
TOKEN_MAX_AGE_MINUTES=60      # 1時間
TOKEN_UPDATE_AGE_MINUTES=30   # 30分でリフレッシュ
```

**セキュリティ推奨事項:**

- `TOKEN_SECRET`: 最低32文字、ランダムな文字列を使用
- `TOKEN_SALT_ROUNDS`: 開発時10、本番12以上

---

### ⏱️ セッション設定

| 変数名 | 必須 | デフォルト | 有効範囲 | 説明 |
|--------|------|------------|----------|------|
| `SESSION_MAX_AGE_SECONDS` | - | `2592000` (30日) | 300〜31536000 | セッション有効期限（秒） |
| `JWT_MAX_AGE_SECONDS` | - | `2592000` (30日) | 300〜31536000 | JWT有効期限（秒） |

```env
# セッション設定
SESSION_MAX_AGE_SECONDS=2592000   # 30日
JWT_MAX_AGE_SECONDS=2592000       # 30日
```

**有効範囲:**

- 最小: 300秒（5分）
- 最大: 31536000秒（1年）

---

### 🛡️ Rate Limiting設定

認証エンドポイントへの過剰なリクエストを防止するための設定。

| 変数名 | 必須 | デフォルト | 有効範囲 | 説明 |
|--------|------|------------|----------|------|
| `AUTH_RATE_LIMIT_ENABLED` | - | `true` | `true`/`false` | Rate Limiting有効化 |
| `AUTH_RATE_LIMIT_MAX` | - | `5` | 1〜1000 | ウィンドウ内の最大リクエスト数 |
| `AUTH_RATE_LIMIT_WINDOW_MS` | - | `60000` | 1000〜3600000 | ウィンドウサイズ（ミリ秒） |

```env
# Rate Limiting設定（デフォルト: 1分間に5回まで）
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=60000
```

**実装詳細:**

- **アルゴリズム**: Sliding Window Log
- **ストレージ**: インメモリ（サーバー再起動でリセット）
- **対象**: 認証関連エンドポイント（サインイン、サインアップ等）

**環境別推奨設定:**

```env
# 開発環境（緩い制限）
AUTH_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=60000

# 本番環境（厳しい制限）
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=60000
```

---

### 🔒 アカウントロックアウト設定

ブルートフォース攻撃を防止するためのアカウントロック機能。

| 変数名 | 必須 | デフォルト | 有効範囲 | 説明 |
|--------|------|------------|----------|------|
| `AUTH_LOCKOUT_ENABLED` | - | `true` | `true`/`false` | ロックアウト機能有効化 |
| `AUTH_LOCKOUT_THRESHOLD` | - | `5` | 1〜100 | ロックまでの失敗回数 |
| `AUTH_LOCKOUT_DURATION_MS` | - | `900000` | 60000〜86400000 | ロック期間（ミリ秒） |

```env
# ロックアウト設定（デフォルト: 5回失敗で15分ロック）
AUTH_LOCKOUT_ENABLED=true
AUTH_LOCKOUT_THRESHOLD=5
AUTH_LOCKOUT_DURATION_MS=900000
```

**実装詳細:**

- **ストレージ**: データベース（永続化）
- **リセット条件**: 成功ログインで失敗カウントリセット
- **自動解除**: ロック期間経過後に自動解除

**環境別推奨設定:**

```env
# 開発環境（テスト用に緩く）
AUTH_LOCKOUT_THRESHOLD=100
AUTH_LOCKOUT_DURATION_MS=60000    # 1分

# 本番環境（セキュリティ重視）
AUTH_LOCKOUT_THRESHOLD=5
AUTH_LOCKOUT_DURATION_MS=900000   # 15分
```

---

### 🔑 パスワードポリシー設定

パスワードの強度要件を設定。

| 変数名 | 必須 | デフォルト | 有効範囲 | 説明 |
|--------|------|------------|----------|------|
| `PASSWORD_MIN_LENGTH` | - | `8` | 1〜1000 | パスワード最小長 |
| `PASSWORD_MAX_LENGTH` | - | `128` | 1〜1000 | パスワード最大長 |
| `PASSWORD_CHECK_USER_INFO` | - | `true` | `true`/`false` | ユーザー情報との照合チェック |

```env
# パスワードポリシー
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_CHECK_USER_INFO=true
```

**`PASSWORD_CHECK_USER_INFO`について:**

- `true`: パスワードにユーザー名やメールアドレスが含まれていないかチェック
- `false`: チェックを無効化

---

### 📝 ログ設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `LOG_MASK_PII` | - | `true` | 個人情報のマスキング有効化 |

```env
# ログ設定
LOG_MASK_PII=true
```

**マスキング対象:**

- メールアドレス
- パスワード（ハッシュ含む）
- トークン
- IPアドレス

---

## 🎯 環境別設定例

### 開発環境 (.env.local)

```env
# ===========================================
# 開発環境設定
# ===========================================

# アプリケーション
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# データベース（Docker Compose）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/d_next_dev?schema=public"

# トークン（開発用の簡易設定）
TOKEN_SECRET="dev-secret-key-for-local-development-only"
TOKEN_SALT_ROUNDS=10
TOKEN_MAX_AGE_MINUTES=60
TOKEN_UPDATE_AGE_MINUTES=30

# セッション
SESSION_MAX_AGE_SECONDS=2592000
JWT_MAX_AGE_SECONDS=2592000

# セキュリティ（開発用に緩く）
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=60000

AUTH_LOCKOUT_ENABLED=true
AUTH_LOCKOUT_THRESHOLD=100
AUTH_LOCKOUT_DURATION_MS=60000

# パスワード
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_CHECK_USER_INFO=true

# ログ
LOG_MASK_PII=false
```

### 本番環境

```env
# ===========================================
# 本番環境設定
# ===========================================

# アプリケーション
NEXT_PUBLIC_BASE_URL="https://your-production-domain.com"

# データベース（本番DB）
DATABASE_URL="postgresql://user:strong-password@production-db:5432/production?schema=public&sslmode=require"

# トークン（強力な設定）
TOKEN_SECRET="your-very-long-random-secure-secret-minimum-64-characters-recommended"
TOKEN_SALT_ROUNDS=12
TOKEN_MAX_AGE_MINUTES=30
TOKEN_UPDATE_AGE_MINUTES=15

# セッション
SESSION_MAX_AGE_SECONDS=86400     # 1日
JWT_MAX_AGE_SECONDS=86400

# セキュリティ（厳格）
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=60000

AUTH_LOCKOUT_ENABLED=true
AUTH_LOCKOUT_THRESHOLD=5
AUTH_LOCKOUT_DURATION_MS=900000   # 15分

# パスワード（厳格）
PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_LENGTH=128
PASSWORD_CHECK_USER_INFO=true

# ログ（PIIマスキング必須）
LOG_MASK_PII=true
```

### テスト環境

```env
# ===========================================
# テスト環境設定
# ===========================================

# テスト用の短い有効期限
TOKEN_MAX_AGE_MINUTES=5
SESSION_MAX_AGE_SECONDS=300

# セキュリティ機能を無効化（テスト高速化）
AUTH_RATE_LIMIT_ENABLED=false
AUTH_LOCKOUT_ENABLED=false

# ログのマスキング無効（デバッグ用）
LOG_MASK_PII=false
```

---

## 🔍 トラブルシューティング

### よくある問題

#### 1. データベース接続エラー

```
Error: P1001: Can't reach database server
```

**解決策:**

```bash
# Docker Composeが起動しているか確認
docker compose ps

# 起動していない場合
make up
```

#### 2. トークンシークレットエラー

```
Error: TOKEN_SECRET is required
```

**解決策:**

```bash
# .env.localにTOKEN_SECRETを設定
echo 'TOKEN_SECRET="your-secure-random-string"' >> .env.local
```

#### 3. セキュリティバリデーションエラー

```
Error: Number must be greater than or equal to 300
```

**原因:** `SESSION_MAX_AGE_SECONDS` が最小値未満

**解決策:**

```env
# 最小5分（300秒）以上に設定
SESSION_MAX_AGE_SECONDS=300
```

### バリデーションルール

環境変数は起動時にZodでバリデーションされます。以下のルールに違反するとエラーになります：

| 変数 | 最小値 | 最大値 |
|------|--------|--------|
| `SESSION_MAX_AGE_SECONDS` | 300 | 31536000 |
| `JWT_MAX_AGE_SECONDS` | 300 | 31536000 |
| `AUTH_RATE_LIMIT_MAX` | 1 | 1000 |
| `AUTH_RATE_LIMIT_WINDOW_MS` | 1000 | 3600000 |
| `AUTH_LOCKOUT_THRESHOLD` | 1 | 100 |
| `AUTH_LOCKOUT_DURATION_MS` | 60000 | 86400000 |
| `PASSWORD_MIN_LENGTH` | 1 | 1000 |
| `PASSWORD_MAX_LENGTH` | 1 | 1000 |

---

## 📚 関連情報

### 実装ファイル

- **環境変数定義**: `src/app/server-actions/env/Env.ts`
- **セキュリティデフォルト**: `src/layers/infrastructure/constants/security.ts`
- **Rate Limitサービス**: `src/layers/infrastructure/services/RateLimitService.ts`
- **ロックアウトサービス**: `src/layers/infrastructure/services/LoginAttemptService.ts`

### 関連ドキュメント

- **[セキュリティ実装ガイド](../guides/ddd/cross-cutting/security.md)** - セキュリティ設計の詳細
- **[ロギング戦略](../guides/ddd/cross-cutting/logging-strategy.md)** - ログ設定の詳細
- **[セットアップガイド](../guides/setup.md)** - 初期環境構築

---

**🔧 適切な環境変数設定で、セキュアで信頼性の高いアプリケーションを構築しましょう！**
