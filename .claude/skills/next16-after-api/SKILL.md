---
name: next16-after-api
description: |
  Next.js 16 の after() API（next/server）によるレスポンス後処理パターンを提供するスキル。
  ロギング、アナリティクス、キャッシュ無効化等のレスポンスをブロックしない非同期処理を扱う。

  トリガー例:
  - Server Action/Route Handler でロギング・アナリティクス実装時
  - 「after」「レスポンス後」「非ブロッキング」
  - import { after } from 'next/server' を記述時
  - Server Component で副作用（ログ、通知等）を書こうとしたとき
---

# Next.js 16 after() API スキル

`after()` はレスポンス送信後にコールバックを実行する Next.js 16 の API。
レスポンスをブロックせずにロギング・アナリティクス等の副作用を処理できる。

---

## 1. 基本パターン

```typescript
import { after } from 'next/server';

// Server Component での使用
export default function Layout({ children }: { children: React.ReactNode }) {
  after(() => {
    // レスポンス送信後に実行される
    logger.info('Layout rendered');
  });
  return <>{children}</>;
}
```

---

## 2. 使用可能な場所

| コンテキスト | 使用可否 | cookies()/headers() |
|-------------|---------|-------------------|
| Server Components | ✅ | ❌ 使用不可 |
| Server Actions (Server Functions) | ✅ | ✅ 使用可 |
| Route Handlers | ✅ | ✅ 使用可 |
| proxy.ts (Middleware) | ✅ | N/A |

**重要**: Server Components 内の `after()` では `cookies()` / `headers()` が使えない。
これは React のレンダリングライフサイクルの制約による。

---

## 3. Server Action での使用パターン

```typescript
'use server';

import { after } from 'next/server';
import { cookies } from 'next/headers';
import { resolve } from '@/di/resolver';

export async function createUser(input: CreateUserInput): Promise<ActionResult<UserData>> {
  const logger = resolve('Logger');
  const useCase = resolve('CreateUserUseCase');

  const result = await useCase.execute(input);

  // レスポンス後にロギング（レスポンス時間に影響しない）
  after(async () => {
    const sessionCookie = (await cookies()).get('session-id')?.value;
    if (result.isOk()) {
      logger.info('ユーザー作成成功（after）', {
        userId: result.value.id,
        session: sessionCookie,
      });
    } else {
      logger.warn('ユーザー作成失敗（after）', {
        error: result.error.message,
        code: result.error.code,
      });
    }
  });

  // レスポンスは即座に返る
  return result.match(
    (value) => ({ success: true as const, data: value }),
    (error) => ({ success: false as const, error: error.message, code: error.code }),
  );
}
```

---

## 4. after() を使うべき場面 vs インラインロギング

### after() が適切な場面

- **外部サービスへのログ送信**（Datadog, Sentry, BigQuery 等）: ネットワーク遅延がレスポンスに影響
- **重いアナリティクス処理**: 集計、メトリクス計算
- **キャッシュ無効化/再構築**: revalidateTag/revalidatePath の後処理
- **通知送信**: メール、Slack webhook 等
- **監査ログの永続化**: DB書き込みを伴うログ

### インラインロギング（pino）が適切な場面

- **インメモリロガー（pino）への書き込み**: 数マイクロ秒で完了するため after() のオーバーヘッドの方が大きい
- **デバッグログ**: 開発中の一時的なログ
- **エラーハンドリングと密結合したログ**: エラー情報がスコープ内にある場合

```typescript
// ✅ インラインが適切: pino は高速なため after() 不要
logger.info('ユーザー一覧取得成功', { userCount: users.length });

// ✅ after() が適切: 外部サービスへの送信
after(async () => {
  await analyticsService.track('user_created', { userId });
  await auditLogService.persist({ action: 'CREATE_USER', userId });
});
```

---

## 5. 特性と注意事項

- `after()` は Dynamic API ではない — 静的ページでも使用可能（ビルド時 or revalidation 時に実行）
- レスポンスが失敗（エラー、`notFound()`、`redirect()`）しても `after()` は実行される
- `after()` 内で `React.cache()` を使えば関数のデデュプリケーションが可能
- `after()` はネスト可能（`after()` 内で `after()` を呼べる）
- プラットフォームの `maxDuration` 設定がタイムアウト上限

---

## チェックリスト

- [ ] 外部サービスへのログ/通知送信を Server Action 内で行う場合、`after()` でラップしているか？
- [ ] pino 等の高速インメモリロガーには `after()` を使っていないか？（不要なオーバーヘッド）
- [ ] Server Component の `after()` 内で `cookies()` / `headers()` を使っていないか？
- [ ] `after()` 内のエラーハンドリングが適切か？（レスポンスには影響しないが、未処理例外はログに残る）

---

## 関連スキル

- `pino-logging` — pino ロガーの使い方（インラインロギング向け）
- `presentation-impl` — Server Action の実装パターン
- `react-cache-dedup` — React.cache() によるデデュプリケーション
