import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

export interface ErrorResult {
  type: 'validation' | 'authentication' | 'internal';
  message: string;
}

export interface IErrorHandler {
  handleError(error: Error, context?: Record<string, unknown>): ErrorResult;
}

@injectable()
export class ErrorHandler implements IErrorHandler {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  handleError(error: Error, context: Record<string, unknown> = {}): ErrorResult {
    // コンストラクター注入されたloggerを使用
    this.logger.error('Unhandled Exception', { error: error.message, stack: error.stack, ...context });

    // アプリケーションエラー種別を判定（暫定）
    if (error.name === 'ValidationError') {
      return { type: 'validation', message: error.message };
    }
    if (error.name === 'AuthenticationError') {
      return { type: 'authentication', message: '認証に失敗しました' };
    }
    return { type: 'internal', message: '内部サーバーエラーが発生しました' };
  }
} 
