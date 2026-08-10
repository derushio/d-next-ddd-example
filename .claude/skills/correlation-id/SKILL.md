---
name: correlation-id
description: |
  リクエスト相関ID（x-request-id）によるリクエストトレーシングパターンを提供するスキル。
  proxy.ts でのID生成、ILogger.createChild() による子ロガー生成、
  withAuth での requestId 伝播パターンを扱う。

  トリガー例:
  - 「correlation ID」「request ID」「x-request-id」「リクエスト追跡」
  - 「トレーシング」「ログ相関」「requestId」
  - proxy.ts 編集時
  - Logger 設定変更時
---

# Correlation ID Skill

リクエスト相関 ID（`x-request-id`）を使って、1リクエスト内の全ログを追跡可能にするパターンを解説します。

---

## 1. アーキテクチャ概要

```
リクエスト受信
    ↓
proxy.ts (Edge Runtime)
  └─ crypto.randomUUID() でIDを生成
  └─ x-request-id ヘッダーをセット
    ↓
Server Action (Node.js Runtime)
  └─ withAuth() が headers() から requestId を取得
  └─ baseLogger.createChild({ requestId }) で子ロガーを生成
    ↓
UseCase / Service
  └─ 子ロガー経由のすべてのログに requestId が自動付与
    ↓
ログ出力（pino）
  └─ { requestId: "uuid", level: "info", msg: "..." }
```

---

## 2. proxy.ts — ID 生成

```typescript
// src/proxy.ts

/**
 * リクエスト相関ID（ログトレーシング用）
 */
export const HEADER_REQUEST_ID = 'x-request-id';

export async function proxy(req: NextRequest) {
  // ...認証チェック...

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(HEADER_URL, req.url);
  requestHeaders.set(HEADER_PATH, pathname);
  requestHeaders.set(HEADER_SEARCH, url.search);

  // リクエスト相関ID生成
  // NOTE: crypto.randomUUID() は Edge Runtime で使用可能（Web Crypto API）
  requestHeaders.set(HEADER_REQUEST_ID, crypto.randomUUID());

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
```

### 使用する UUID 生成関数

| 環境 | 関数 | 理由 |
|------|------|------|
| Edge Runtime (proxy.ts) | `crypto.randomUUID()` | Web Crypto API。Node.js crypto は使用不可 |
| Node.js (Server Action等) | `crypto.randomUUID()` | Node.js 19+ で globalThis.crypto が利用可能 |

---

## 3. ILogger.createChild() — 子ロガー生成

### インターフェース定義

```typescript
// src/layers/application/interfaces/ILogger.ts
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * バインディングを付与した子ロガーを生成
   * リクエストスコープのログに requestId 等を付与するために使用
   */
  createChild(bindings: Record<string, unknown>): ILogger;
}
```

### Logger 実装（pino.child() ベース）

```typescript
// src/layers/infrastructure/services/Logger.ts
@injectable()
export class Logger implements ILogger {
  private readonly pinoLogger: pino.Logger;

  constructor(pinoInstance?: pino.Logger) {
    this.pinoLogger = pinoInstance ?? createPinoLogger();
  }

  createChild(bindings: Record<string, unknown>): ILogger {
    // pino.child() がバインディングを全ログに自動付与する
    return new Logger(this.pinoLogger.child(bindings));
  }
}
```

子ロガーから出力されるすべてのログに `bindings` の内容が自動的に付与される:

```json
{ "requestId": "a1b2c3d4-...", "level": "info", "msg": "ユーザー作成開始", "name": "Alice" }
{ "requestId": "a1b2c3d4-...", "level": "info", "msg": "ユーザー作成完了", "userId": "xyz" }
```

---

## 4. withAuth — requestId 伝播パターン

```typescript
// src/app/server-actions/utils/withAuth.ts
import { HEADER_REQUEST_ID } from '@/proxy';

export function withAuth<TInput, TOutput>(
  actionName: string,
  schema: ZodSchema<TInput> | null,
  fn: (validatedInput: TInput, userId: string) => Promise<ActionResult<TOutput>>,
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    const headersList = await headers();

    // x-request-id ヘッダーから requestId を取得
    const requestId = headersList.get(HEADER_REQUEST_ID);

    const baseLogger = resolve('Logger');

    // requestId がある場合は子ロガーを生成（requestId が全ログに自動付与される）
    const logger = requestId
      ? baseLogger.createChild({ requestId })
      : baseLogger;

    try {
      logger.info(`${actionName} started`);
      // ...以降の全ログに requestId が付与される
    } catch (error) {
      logger.error(`${actionName} failed`, meta);
    }
  };
}
```

---

## 5. ログ出力例

同じリクエスト内のログが `requestId` で紐付けられる:

```json
{ "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "level": "info", "msg": "createUser started" }
{ "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "level": "info", "msg": "ユーザー作成開始", "name": "Alice", "email": "alice@example.com" }
{ "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "level": "info", "msg": "ユーザー作成完了", "userId": "user_abc" }
```

エラー発生時も同じ `requestId` で追跡可能:

```json
{ "requestId": "f0e9d8c7-...", "level": "warn", "msg": "サインイン失敗: パスワード不正", "userId": "user_xyz" }
{ "requestId": "f0e9d8c7-...", "level": "error", "msg": "createUser failed", "error": "Unexpected error" }
```

---

## 6. 利用上の注意

### requestId が付与されないケース

以下の場合、子ロガーが生成されず `requestId` はログに付与されない:

- Server Action 外から直接 Logger を呼び出す場合（例: container 初期化時の `console.log`）
- proxy.ts を経由しないアクセス（直接 API ルートを叩く等）

### withAuth を使わない場合

`withAuth` を使用しない Server Action では、手動で requestId を取得・付与する:

```typescript
'use server';

import { headers } from 'next/headers';
import { resolve } from '@/di/resolver';
import { HEADER_REQUEST_ID } from '@/proxy';

export async function myAction(input: MyInput) {
  const headersList = await headers();
  const requestId = headersList.get(HEADER_REQUEST_ID);
  const baseLogger = resolve('Logger');
  const logger = requestId
    ? baseLogger.createChild({ requestId })
    : baseLogger;

  logger.info('myAction started');
  // ...
}
```

---

## 7. 将来の改善: AsyncLocalStorage（Phase 2）

現在の実装では、requestId を `withAuth` の引数として手動で伝播している。
将来的には `AsyncLocalStorage` を使用してコンテキストを自動伝播できる。

```typescript
// Phase 2 実装イメージ（未実装）
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

// Server Action の最外層で設定
export function withRequestContext<T>(requestId: string, fn: () => Promise<T>) {
  return requestContext.run({ requestId }, fn);
}

// UseCase / Repository など深い階層でも自動的に取得可能
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
```

**Phase 2 の対象範囲:**
- Server Action 外（Repository の直接呼び出し等）での requestId 伝播
- Edge Runtime では AsyncLocalStorage が使えないため、proxy.ts は引き続き現状の実装を維持

---

## 8. チェックリスト

`withAuth` または相関IDを扱うコードを実装する際:

- [ ] `withAuth` 内で `createChild({ requestId })` が呼ばれていることを確認した
- [ ] `HEADER_REQUEST_ID` 定数を `@/proxy` から import している（文字列リテラル直書き禁止）
- [ ] `requestId` が `null` の場合のフォールバック（`baseLogger` をそのまま使う）が実装されている
- [ ] proxy.ts が経由される前提（Edge Runtime）では `crypto.randomUUID()` を使用している
- [ ] パスワード・トークンなどの機密情報を `createChild` のバインディングに含めていない

---

## 関連スキル

- `pino-logging` — pino ロガーの設定・ILogger インターフェース・logMasking の詳細
- `security-review` — 機密情報漏洩防止のセキュリティレビュー観点
- `web-crypto-patterns` — Web Crypto API vs node:crypto の使い分けガイド
- `usecase-logging-levels` — UseCase カテゴリ別のログ密度ガイドライン
