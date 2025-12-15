import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { injectable } from 'tsyringe';

/**
 * 機密情報マスク設定
 */
interface SensitiveDataMaskConfig {
  emailMask: string;
  passwordMask: string;
  tokenMask: string;
  customPatterns: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
}

// Re-export for backward compatibility
export type { ILogger } from '@/layers/application/interfaces/ILogger';

@injectable()
export class Logger implements ILogger {
  private readonly maskConfig: SensitiveDataMaskConfig = {
    emailMask: '***@***.***',
    passwordMask: '***',
    tokenMask: '***',
    customPatterns: [
      // SSN, クレジットカード番号等の追加パターンを定義可能
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' },
      {
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        replacement: '****-****-****-****',
      },
    ],
  };

  /**
   * 機密情報フィールド名のリスト
   */
  private readonly sensitiveFields = new Set([
    'password',
    'passwordHash',
    'newPassword',
    'currentPassword',
    'oldPassword',
    'token',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'apiKey',
    'secret',
    'privateKey',
    'credential',
    'auth',
    'authorization',
  ]);

  info(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = this.maskSensitiveData(meta);
    const logEntry = this.createStructuredLog('INFO', message, maskedMeta);
    console.info(JSON.stringify(logEntry));
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = this.maskSensitiveData(meta);
    const logEntry = this.createStructuredLog('WARN', message, maskedMeta);
    console.warn(JSON.stringify(logEntry));
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = this.maskSensitiveData(meta);
    const logEntry = this.createStructuredLog('ERROR', message, maskedMeta);
    console.error(JSON.stringify(logEntry));
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    const maskedMeta = this.maskSensitiveData(meta);
    const logEntry = this.createStructuredLog('DEBUG', message, maskedMeta);
    console.debug(JSON.stringify(logEntry));
  }

  /**
   * 構造化ログエントリの作成
   */
  private createStructuredLog(
    level: string,
    message: string,
    meta: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'd-next-ddd-example',
      environment: process.env.NODE_ENV || 'development',
      traceId: this.generateTraceId(),
      ...meta,
    };
  }

  /**
   * 機密情報のマスク処理
   */
  private maskSensitiveData(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const masked = { ...data };

    for (const [key, value] of Object.entries(masked)) {
      const lowerKey = key.toLowerCase();

      // フィールド名ベースのマスク（完全一致 + 部分一致）
      if (
        this.sensitiveFields.has(lowerKey) ||
        this.containsSensitiveKeyword(lowerKey)
      ) {
        masked[key] = this.maskConfig.passwordMask;
        continue;
      }

      // Email特定マスク
      if (lowerKey.includes('email') && typeof value === 'string') {
        masked[key] = this.maskEmail(value);
        continue;
      }

      // 文字列値の内容ベースマスク
      if (typeof value === 'string') {
        masked[key] = this.maskStringContent(value);
        continue;
      }

      // ネストされたオブジェクトの再帰処理
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        masked[key] = this.maskSensitiveData(value as Record<string, unknown>);
      }
    }

    return masked;
  }

  /**
   * メールアドレスのマスク処理
   */
  private maskEmail(email: string): string {
    const emailRegex = /^([^@]+)@([^.]+)\.(.+)$/;
    const match = email.match(emailRegex);

    if (match) {
      const [, localPart, domain, tld] = match;
      const maskedLocal =
        localPart.length > 2
          ? localPart[0] +
            '*'.repeat(localPart.length - 2) +
            localPart[localPart.length - 1]
          : '***';
      const maskedDomain =
        domain.length > 2
          ? domain[0] +
            '*'.repeat(domain.length - 2) +
            domain[domain.length - 1]
          : '***';
      return `${maskedLocal}@${maskedDomain}.${tld}`;
    }

    return this.maskConfig.emailMask;
  }

  /**
   * 文字列内容のパターンベースマスク
   */
  private maskStringContent(text: string): string {
    let maskedText = text;

    // カスタムパターンの適用
    for (const { pattern, replacement } of this.maskConfig.customPatterns) {
      maskedText = maskedText.replace(pattern, replacement);
    }

    // 一般的なトークンパターンのマスク
    const tokenPatterns = [
      /Bearer\s+[A-Za-z0-9._-]+/gi,
      /token[:=]\s*[A-Za-z0-9._-]+/gi,
      /key[:=]\s*[A-Za-z0-9._-]+/gi,
    ];

    for (const pattern of tokenPatterns) {
      maskedText = maskedText.replace(pattern, (match) => {
        const prefix = match.split(/[A-Za-z0-9._-]/)[0];
        return prefix + this.maskConfig.tokenMask;
      });
    }

    return maskedText;
  }

  /**
   * 機密情報キーワードの部分一致チェック
   */
  private containsSensitiveKeyword(key: string): boolean {
    const sensitiveKeywords = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'credential',
    ];

    return sensitiveKeywords.some((keyword) => key.includes(keyword));
  }

  /**
   * トレースIDの生成（簡易実装）
   */
  private generateTraceId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
