import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { DomainError } from '@/layers/domain/errors/DomainError';

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
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  handleError(
    error: Error,
    context: Record<string, unknown> = {},
  ): ErrorResult {
    // コンストラクター注入されたloggerを使用
    this.logger.error('Unhandled Exception', {
      error: error.message,
      stack: error.stack,
      ...context,
    });

    // アプリケーションエラー種別を判定
    if (error instanceof DomainError) {
      if (error.code === 'VALIDATION_ERROR') {
        return { type: 'validation', message: error.message };
      }
      if (error.code === 'AUTHENTICATION_ERROR') {
        return { type: 'authentication', message: '認証に失敗しました' };
      }
    }
    return { type: 'internal', message: '内部サーバーエラーが発生しました' };
  }
}
