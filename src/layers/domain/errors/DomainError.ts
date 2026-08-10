export class DomainError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.context = context;

    // V8エンジン（Node.js/Chromium）でのみ利用可能なスタックトレース最適化
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }
}
