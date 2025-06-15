import { injectable } from 'tsyringe';

/**
 * 共通ログ出力を集約するサービス。
 * 現状は console ラッパだが、後に pino 等へ差し替えることを想定する。
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

@injectable()
export class Logger implements ILogger {
  info(message: string, meta: Record<string, unknown> = {}): void {
    console.info(message, meta);
  }
  warn(message: string, meta: Record<string, unknown> = {}): void {
    console.warn(message, meta);
  }
  error(message: string, meta: Record<string, unknown> = {}): void {
    console.error(message, meta);
  }
  debug(message: string, meta: Record<string, unknown> = {}): void {
    console.debug(message, meta);
  }
} 
