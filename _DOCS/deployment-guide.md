# デプロイガイド 🚀

このドキュメントでは、プロダクション環境でのデプロイ手順と設定について説明します。

---

## デプロイ前チェックリスト

### ✅ 必須確認事項
```bash
# 1. 全テスト通過確認
pnpm test

# 2. ビルド確認
pnpm build

# 3. 型チェック
pnpm type-check

# 4. リント・フォーマット
pnpm lint
pnpm format

# 5. セキュリティチェック
pnpm audit
```

### 📊 品質メトリクス目標
| 項目 | 目標値 |
|-----|--------|
| **テストカバレッジ** | 90%+ |
| **TypeScript型安全性** | 100% |
| **Lighthouse Performance** | 90+ |
| **Bundle Size** | < 500KB |

---

## 環境変数設定

### 🔧 必須環境変数
```bash
# データベース
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<32文字以上の強力なランダム文字列>"

# セキュリティ
TOKEN_SALT_ROUNDS="12"
TOKEN_SECRET="<強力なランダム文字列>"

# 本番環境
NODE_ENV="production"
```

### 🔐 セキュリティ強化設定
```bash
# CORS・Rate Limiting
CORS_ORIGIN="https://your-domain.com"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="3600000"

# セッション
SESSION_MAX_AGE="86400"
SESSION_UPDATE_AGE="3600"
```

### 🛠️ 秘密鍵生成
```bash
# NextAuth用秘密鍵
openssl rand -base64 32

# Token用秘密鍵  
openssl rand -base64 64
```

---

## データベース設定

### 🐘 PostgreSQL本番設定
```sql
-- データベース・ユーザー作成
CREATE DATABASE your_app_prod;
CREATE USER your_app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE your_app_prod TO your_app_user;

-- 接続制限・ログ設定
ALTER USER your_app_user CONNECTION LIMIT 50;
ALTER DATABASE your_app_prod SET log_statement = 'all';
```

### 📊 マイグレーション実行
```bash
# 本番マイグレーション
DATABASE_URL="your_production_url" pnpm prisma migrate deploy

# Prisma Client生成
pnpm prisma generate

# シードデータ（初回のみ）
DATABASE_URL="your_production_url" pnpm prisma db seed
```

参考実装: [DatabaseFactory](../../src/data-accesses/infra/DatabaseFactory.ts)

---

## デプロイ手順

### Vercel デプロイ
```bash
# Vercel CLI インストール
npm i -g vercel

# プロジェクトデプロイ
vercel

# 本番デプロイ
vercel --prod
```

### Docker デプロイ
```dockerfile
# Dockerfile例
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 環境変数設定（各プラットフォーム）
- **Vercel**: Vercel Dashboard > Settings > Environment Variables
- **Docker**: `.env.production` ファイルまたはコンテナ環境変数
- **AWS/GCP**: 各プラットフォームの環境変数設定

---

## 認証システム設定

### NextAuth.js 本番設定

参考実装: [NextAuth設定](../../src/data-accesses/infra/nextAuth.ts)

本番環境では以下の設定が重要です：
- セッション戦略の設定
- Cookie設定（Secure, SameSite）
- CSRF対策の有効化
- Rate Limitingの実装

---

## 運用監視

### ログ監視
- アプリケーションログの集約
- エラーログの監視・アラート
- パフォーマンスメトリクスの取得

### ヘルスチェック
```typescript
// /api/health エンドポイント例
export async function GET() {
  try {
    // データベース接続確認
    // 外部サービス確認
    return Response.json({ status: 'ok' });
  } catch (error) {
    return Response.json({ status: 'error' }, { status: 500 });
  }
}
```

### バックアップ戦略
- データベースの定期バックアップ
- 設定ファイルのバージョン管理
- ロールバック手順の準備

---

## パフォーマンス最適化

### Next.js 最適化
- 画像最適化（next/image）
- バンドル分析（@next/bundle-analyzer）
- 静的生成の活用

### データベース最適化
- インデックスの適切な設定
- コネクションプールの調整
- クエリパフォーマンスの監視

---

## セキュリティ対策

### 基本セキュリティ
- HTTPS の強制
- セキュリティヘッダーの設定
- 入力値バリデーション
- SQL インジェクション対策

### アクセス制御
- 認証・認可の実装
- Rate Limiting
- CORS設定
- CSP (Content Security Policy)

---

## トラブルシューティング

### デプロイエラー
1. 環境変数の設定確認
2. データベース接続の確認
3. ビルドログの確認
4. 依存関係の確認

### パフォーマンス問題
1. バンドルサイズの確認
2. データベースクエリの最適化
3. キャッシュ戦略の見直し
4. CDNの活用

### セキュリティ問題
1. 脆弱性スキャンの実行
2. セキュリティヘッダーの確認
3. アクセスログの監視
4. 定期的なセキュリティ更新

---

## 継続的デプロイ

### GitHub Actions例
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
      - name: Build
        run: pnpm build
      - name: Deploy
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

### デプロイ戦略
- **Blue-Green デプロイ**: ダウンタイムなしデプロイ
- **Canary リリース**: 段階的なリリース
- **Feature Flags**: 機能の段階的な有効化

---

## 運用ベストプラクティス

### ✅ 推奨
- 自動化されたデプロイパイプライン
- 包括的な監視・アラート体制
- 定期的なバックアップ
- セキュリティ更新の自動化

### ❌ 避けるべき
- 手動デプロイ
- 本番環境での直接作業
- セキュリティ設定の怠り
- バックアップなしの運用 
