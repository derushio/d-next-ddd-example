export class DomainError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.context = context;

    // Error.captureStackTrace(this, DomainError);
  }

  static create(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ): DomainError {
    return new DomainError(message, code, context);
  }
}
