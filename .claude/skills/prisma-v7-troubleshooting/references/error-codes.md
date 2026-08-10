# Prisma エラーコード一覧

## クエリエンジンエラー（P2xxx）

| コード | 名称 | 説明 | 対処法 |
|---|---|---|---|
| P2000 | Value too long | カラムの最大長を超える値 | 入力バリデーションを追加 |
| P2001 | Record not found (where) | WHERE条件に一致するレコードなし | 条件を確認、`findFirst` + null チェック |
| P2002 | Unique constraint failed | ユニーク制約違反 | `upsert` を使うかエラーハンドリング |
| P2003 | Foreign key constraint failed | 外部キー制約違反 | 参照先レコードの存在を確認 |
| P2004 | Constraint failed | その他の制約違反 | DB制約を確認 |
| P2005 | Invalid value | フィールドの型に合わない値 | 入力値の型を確認 |
| P2006 | Invalid value (provided) | 提供された値が無効 | バリデーション追加 |
| P2007 | Data validation error | データバリデーション失敗 | スキーマ定義を確認 |
| P2008 | Query parsing failed | クエリの構文エラー | Raw SQLの構文を確認 |
| P2009 | Query validation failed | クエリのバリデーション失敗 | フィールド名・型を確認 |
| P2010 | Raw query failed | Raw SQLの実行失敗 | SQL構文とDB権限を確認 |
| P2011 | Null constraint failed | NOT NULL制約違反 | 必須フィールドの値を設定 |
| P2012 | Missing required value | 必須値の欠落 | 入力データの完全性を確認 |
| P2014 | Relation violation | リレーション制約違反 | リレーション定義を確認 |
| P2015 | Related record not found | 関連レコードが見つからない | リレーションデータの整合性確認 |
| P2016 | Query interpretation error | クエリの解釈エラー | クエリ構造を確認 |
| P2021 | Table not found | テーブルが存在しない | マイグレーション未適用の可能性 |
| P2022 | Column not found | カラムが存在しない | マイグレーション未適用の可能性 |
| P2024 | Timed out | 接続プール枯渇/タイムアウト | Pool の `max` 増加、クエリ最適化 |
| P2025 | Record not found | update/delete対象が存在しない | 事前存在チェックまたは try-catch |
| P2034 | Transaction failed | トランザクション競合 | リトライロジック、楽観的ロック |

## よくあるパターンと対処

### P2002: ユニーク制約違反

```typescript
// ✅ upsert で対処
await prisma.user.upsert({
  where: { email },
  update: { name },
  create: { id, email, name, passwordHash },
});

// ✅ エラーハンドリング
try {
  await prisma.user.create({ data: { ... } });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return err({ message: 'このメールアドレスは既に登録されています', code: 'DUPLICATE_EMAIL' });
    }
  }
  throw error;
}
```

### P2025: レコード未存在

```typescript
// ✅ findUniqueで事前チェック
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  return err({ message: 'ユーザーが見つかりません', code: 'NOT_FOUND' });
}
await prisma.user.update({ where: { id }, data: { ... } });

// ✅ try-catchでハンドリング
try {
  await prisma.user.update({ where: { id }, data: { ... } });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return err({ message: 'ユーザーが見つかりません', code: 'NOT_FOUND' });
  }
  throw error;
}
```

### P2024: タイムアウト

```typescript
// 接続プール設定を見直し
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                         // 増加
  connectionTimeoutMillis: 10000,  // タイムアウト延長
});
```

## v7固有のエラー

| エラーメッセージ | 原因 | 解決策 |
|---|---|---|
| `Using engine type 'client' requires either 'adapter' or 'accelerateUrl'` | Driver Adapter未設定 | `@prisma/adapter-pg` 導入 |
| `Cannot find module '.prisma/client/default'` | prisma-client + Turbopack | `prisma-client-js` に変更 |
| `engine: 'classic' engine doesn't exist` | v7で `engine` プロパティ削除 | prisma.config.ts から削除 |
| `DATABASE_URL not found` | 環境変数自動読み込み廃止 | `import "dotenv/config"` 追加 |
| `url in datasource block is deprecated` | スキーマのurl設定非推奨 | `prisma.config.ts` に移動 |
