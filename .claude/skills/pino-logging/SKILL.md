---
name: pino-logging
description: |
  pinoロガーの使い方と構造化ログパターンを提供するスキル。
  ILoggerインターフェース経由でのDI注入パターン、
  pino-pretty開発設定、console.log直接使用の禁止ルールを含む。

  トリガー例:
  - Logger, pino, console.log, console.error, ロギング, ログ
  - src/layers/infrastructure/services/Logger.ts 編集時
globs:
  - "src/layers/**/*.ts"
---

# pino-logging スキル

## ルール

### pinoをILogger経由で使用

ロギングは `ILogger` インターフェース経由でDI注入する。直接 `pino()` を呼び出すことは禁止。

```typescript
// ✅ 正しいパターン: ILogger経由でDI注入
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';

@injectable()
export class SomeUseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  async execute(): Promise<void> {
    this.logger.info('ユーザー作成成功', { userId: '123', action: 'create' });
    this.logger.error('ユーザー作成失敗', { err: new Error('失敗'), userId: '123' });
  }
}

// ❌ 禁止: pino直接使用
import pino from 'pino';
const logger = pino();
logger.info('何か');
```

### 構造化ログパターン

pinoは `(mergeObject, message)` の引数順序を取る。

```typescript
// ✅ 推奨パターン（ILogger: message が第1引数、meta が第2引数）
this.logger.info('ユーザー作成成功', { userId, action });
this.logger.warn('レート制限に達した', { userId, reason: 'rate_limit' });
this.logger.error('ユーザー作成失敗', { err: error, userId });
this.logger.debug('リクエスト受信', { requestBody });

// ❌ 非推奨: 文字列連結（構造化されない）
this.logger.info(`ユーザー ${userId} が作成された`);
```

### エラーオブジェクトのログ

pinoはErrorオブジェクトを `err` キーで渡すと自動的にシリアライズする。

```typescript
// ✅ 推奨
this.logger.error('処理中にエラーが発生しました', { err: error });

// ✅ コンテキスト情報も付与
this.logger.error('決済処理失敗', { err: error, userId, action: 'payment' });
```

### console.logの扱い

**既存コードの `console.log/error` は絶対に削除しない**（CLAUDE.mdのデバッグログ削除禁止ルール）。

新規コードでは `ILogger` 経由のみを使用すること。

```typescript
// ✅ 新規コード: ILogger使用
this.logger.info('メッセージ', { key: 'value' });

// ⚠️ 既存コードのconsole.log: 削除禁止（そのまま残す）
console.log('既存のデバッグログ');  // 触らない
```

---

## pino設定（Logger.ts）

`src/layers/infrastructure/services/Logger.ts` で一元管理される。

### 環境別設定

| 環境 | 出力形式 | 備考 |
|------|----------|------|
| 開発（`NODE_ENV !== 'production'`） | pino-pretty（カラー付き） | 可読性優先 |
| 本番（`NODE_ENV === 'production'`） | JSONフォーマット | 構造化ログ |

### ログレベル制御

環境変数 `LOG_LEVEL` で動的に制御（デフォルト: `info`）。

```
LOG_LEVEL=debug  # デバッグログを含む全出力
LOG_LEVEL=info   # info以上（デフォルト）
LOG_LEVEL=warn   # warn/errorのみ
LOG_LEVEL=error  # エラーのみ
```

### 機密情報マスク

Logger実装は自動的に以下をマスクする:
- `password`, `token`, `secret`, `key`, `auth`, `credential` を含むフィールド
- メールアドレス（部分マスク: `t***t@e*****e.com`）
- BearerトークンやAPIキーの文字列パターン

---

## ILoggerインターフェース

```typescript
// src/layers/application/interfaces/ILogger.ts
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
```

> **NOTE**: ILoggerの引数順序は `(message, meta)` であり、pino内部の `(mergeObject, message)` とは逆になっている。
> Logger.ts実装内でpinoに渡す際に順序を変換しているため、呼び出し側は `(message, meta)` で使うこと。

---

## DI登録

Loggerはシングルトンとして登録済み。追加設定不要。

```typescript
// src/di/containers/infrastructure.container.ts (既存設定)
safeRegister(INJECTION_TOKENS.Logger, Logger);
```

新しいサービスでロガーを使う場合はコンストラクターでinjectするだけ:

```typescript
constructor(
  @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
) {}
```
