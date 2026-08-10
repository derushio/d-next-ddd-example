import pino from 'pino';
import { injectable } from 'tsyringe';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { applyMasking } from '@/utils/logMasking';

// Re-export for backward compatibility
export type { ILogger } from '@/layers/application/interfaces/ILogger';

/**
 * pinoロガーインスタンスを環境に応じて生成する
 * - 開発環境: pino-pretty でカラー付き可読性の高い出力
 * - 本番環境: デフォルトJSON出力（構造化ログ）
 * - ログレベル: LOG_LEVEL 環境変数で制御（デフォルト: info）
 */
function createPinoLogger() {
  // NOTE: process.env を直接参照している。
  // Logger クラスは DIコンテナ（infrastructureContainer）初期化時に登録される最初期のサービスであり、
  // env.ts（@t3-oss/env-nextjs）のバリデーション実行より先に呼び出される可能性がある。
  // Prisma の DatabaseFactory と同様に、Logger の初期化は env.ts に依存できないため
  // process.env 直接参照が正しい選択。
  // LOG_LEVEL は env.ts でも定義されており（z.enum でバリデーション済み）、
  // 万が一不正な値が入った場合でも ?? 'info' フォールバックで安全に処理される。
  const level = process.env.LOG_LEVEL ?? 'info';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino({
    level,
    base: {
      service: 'd-next-ddd-example',
      environment: process.env.NODE_ENV ?? 'development',
    },
  });
}

/**
 * pino.Logger インスタンスを受け取って ILogger を生成するファクトリ関数。
 * createChild() 内部で使用するため、DI コンテナを経由しない。
 */
function createFromPino(pinoInstance: pino.Logger): ILogger {
  return new LoggerImpl(pinoInstance);
}

class LoggerImpl implements ILogger {
  constructor(private readonly pinoLogger: pino.Logger) {}

  info(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = applyMasking(meta);
    this.pinoLogger.info(maskedMeta, message);
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = applyMasking(meta);
    this.pinoLogger.warn(maskedMeta, message);
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = applyMasking(meta);
    this.pinoLogger.error(maskedMeta, message);
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = applyMasking(meta);
    this.pinoLogger.debug(maskedMeta, message);
  }

  createChild(bindings: Record<string, unknown>): ILogger {
    return createFromPino(this.pinoLogger.child(bindings));
  }
}

@injectable()
export class Logger extends LoggerImpl {
  constructor() {
    super(createPinoLogger());
  }
}
