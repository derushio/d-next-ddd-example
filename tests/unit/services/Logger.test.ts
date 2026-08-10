import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/layers/infrastructure/services/Logger';

// pinoモジュールをモック
const mockPinoLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('pino', () => ({
  default: vi.fn(() => mockPinoLogger),
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    // Loggerインスタンス作成
    logger = new Logger();
  });

  afterEach(() => {
    // 環境変数モックのクリーンアップ
    vi.unstubAllEnvs();
  });

  describe('info', () => {
    it('should log structured info message', () => {
      // Arrange
      const message = 'This is an info message';

      // Act
      logger.info(message);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [meta, calledMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(meta).toEqual({});
    });

    it('should mask sensitive data in meta', () => {
      // Arrange
      const message = 'User SignIn';
      const meta = {
        userId: '123',
        email: 'test@example.com',
        password: 'secret123',
        token: 'bearer-token-value',
      };

      // Act
      logger.info(message, meta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta.userId).toBe('123'); // 非機密情報はそのまま
      expect(maskedMeta.email).toBe('tes***@example.com'); // メールアドレスはマスク（logMasking.ts の maskEmail フォーマット）
      expect(maskedMeta.password).toBe('***'); // パスワードは完全マスク
      expect(maskedMeta.token).toBe('***'); // トークンは完全マスク
    });

    it('should handle empty message', () => {
      // Act
      logger.info('');

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe('');
    });

    it('should handle undefined meta', () => {
      // Arrange
      const message = 'Test message';

      // Act
      logger.info(message, undefined);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
    });
  });

  describe('error', () => {
    it('should log structured error message', () => {
      // Arrange
      const message = 'This is an error message';

      // Act
      logger.error(message);

      // Assert
      expect(mockPinoLogger.error).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.error.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
    });

    it('should log structured error with meta', () => {
      // Arrange
      const message = 'Database connection failed';
      const meta = { errorCode: 500, database: 'postgres' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(mockPinoLogger.error).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.error.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta.errorCode).toBe(500);
      expect(maskedMeta.database).toBe('postgres');
    });

    it('should handle Error object as meta', () => {
      // Arrange
      const message = 'Unexpected error occurred';
      const error = new Error('Something went wrong');

      // Act
      logger.error(message, { error });

      // Assert
      expect(mockPinoLogger.error).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.error.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta).toHaveProperty('error');
    });
  });

  describe('warn', () => {
    it('should log structured warning message', () => {
      // Arrange
      const message = 'This is a warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(mockPinoLogger.warn).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.warn.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
    });

    it('should log structured warning with meta', () => {
      // Arrange
      const message = 'Deprecated API usage';
      const meta = { apiVersion: 'v1', deprecatedSince: '2024-01-01' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(mockPinoLogger.warn).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.warn.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta.apiVersion).toBe('v1');
      expect(maskedMeta.deprecatedSince).toBe('2024-01-01');
    });
  });

  describe('debug', () => {
    it('should log structured debug message', () => {
      // Arrange
      const message = 'This is a debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(mockPinoLogger.debug).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.debug.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
    });

    it('should log structured debug with meta', () => {
      // Arrange
      const message = 'Query execution';
      const meta = {
        query: 'SELECT * FROM users',
        executionTime: 150,
        params: { limit: 10, offset: 0 },
      };

      // Act
      logger.debug(message, meta);

      // Assert
      expect(mockPinoLogger.debug).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.debug.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta.query).toBe('SELECT * FROM users');
      expect(maskedMeta.executionTime).toBe(150);
      expect(maskedMeta.params).toEqual({ limit: 10, offset: 0 });
    });
  });

  describe('message formatting', () => {
    it('should handle complex nested objects', () => {
      // Arrange
      const message = 'Complex object logging';
      const complexMeta = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        timestamp: new Date('2024-01-01T00:00:00Z'),
        array: [1, 2, 3, { nested: 'value' }],
      };

      // Act
      logger.info(message, complexMeta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(message);
      expect(maskedMeta.user).toEqual(complexMeta.user);
      expect(maskedMeta.array).toEqual(complexMeta.array);
    });

    it.each([
      { description: 'number object', meta: { value: 123 } },
      { description: 'boolean object', meta: { enabled: true } },
      { description: 'null value', meta: { data: null } },
      { description: 'array object', meta: { items: [1, 2, 3] } },
      {
        description: 'Date object',
        meta: { timestamp: new Date().toISOString() },
      },
      { description: 'nested object', meta: { config: { theme: 'dark' } } },
    ])(
      'should handle different data types in meta: $description',
      ({ description, meta }) => {
        const message = `Testing ${description}`;

        logger.info(message, meta);

        expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
        const [maskedMeta, calledMessage] =
          mockPinoLogger.info.mock.calls[0] ?? [];
        expect(calledMessage).toBe(message);

        // Check that meta properties are included in the masked meta
        for (const [key, value] of Object.entries(meta)) {
          expect(maskedMeta[key]).toEqual(value);
        }
      },
    );
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'a'.repeat(1000);

      // Act
      logger.info(longMessage);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      // Arrange
      const specialMessage =
        '🎉 Special chars: ñ, ü, ç, ß, 漢字, العربية, русский';

      // Act
      logger.info(specialMessage);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [, calledMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe(specialMessage);
    });

    it('should handle circular reference objects', () => {
      // Arrange
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Act - 循環参照はスタックオーバーフローではなく '[Circular]' として安全に処理される
      logger.info('Circular reference test', circularObj);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(maskedMeta.self).toBe('[Circular]');
    });
  });

  describe('method chaining', () => {
    it('should handle multiple consecutive log calls', () => {
      // Act
      logger.info('First message');
      logger.error('Error message');
      logger.warn('Warning message');
      logger.debug('Debug message');

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      expect(mockPinoLogger.error).toHaveBeenCalledTimes(1);
      expect(mockPinoLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockPinoLogger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('sensitive data masking', () => {
    it.each([
      { input: 'user@example.com', expected: 'use***@example.com' },
      {
        input: 'test.email+tag@domain.co.jp',
        expected: 'tes***@domain.co.jp',
      },
      { input: 'a@b.com', expected: 'a***@b.com' }, // 短いケース
    ])(
      // logMasking.ts の maskEmail フォーマット: 先頭3文字 + *** @ ドメイン全体
      'should mask email addresses: $input → $expected',
      ({ input, expected }) => {
        logger.info('Test email masking', { email: input });

        expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
        const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];
        expect(maskedMeta.email).toBe(expected);
      },
    );

    it.each([
      'password',
      'passwordHash',
      'newPassword',
      'currentPassword',
      'oldPassword',
    ])('should mask password fields: %s', (field) => {
      const meta = { [field]: 'secret-value-123' };
      logger.info('Password field test', meta);

      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(maskedMeta[field]).toBe('***');
    });

    it.each([
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
    ])('should mask token fields: %s', (field) => {
      const meta = { [field]: 'secret-token-value' };
      logger.info('Token field test', meta);

      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];
      expect(maskedMeta[field]).toBe('***');
    });

    it('should mask nested sensitive data', () => {
      // Arrange
      const meta = {
        user: {
          id: '123',
          email: 'user@example.com',
          profile: {
            name: 'Test User',
            password: 'secret123',
            settings: {
              token: 'api-token-value',
            },
          },
        },
      };

      // Act
      logger.info('Nested sensitive data test', meta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];

      expect(maskedMeta.user.id).toBe('123'); // 非機密情報はそのまま
      expect(maskedMeta.user.email).toBe('use***@example.com'); // メールマスク（logMasking.ts の maskEmail フォーマット）
      expect(maskedMeta.user.profile.name).toBe('Test User'); // 非機密情報はそのまま
      expect(maskedMeta.user.profile.password).toBe('***'); // パスワードマスク
      expect(maskedMeta.user.profile.settings.token).toBe('***'); // トークンマスク
    });

    it('should mask bearer tokens in string content', () => {
      // Arrange
      const meta = {
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        description: 'Authorization: Bearer secret-token-123',
      };

      // Act
      logger.info('Bearer token test', meta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];

      expect(maskedMeta.authHeader).toBe('***');
      expect(maskedMeta.description).toBe('Authorization: ***');
    });

    it('should preserve non-sensitive data', () => {
      // Arrange
      const meta = {
        userId: '123',
        userName: 'testuser',
        action: 'login',
        timestamp: '2024-01-01T00:00:00Z',
        success: true,
        metadata: {
          browser: 'Chrome',
          ip: '192.168.1.1',
        },
      };

      // Act
      logger.info('Non-sensitive data test', meta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];

      // すべての非機密データが保持されていることを確認
      expect(maskedMeta.userId).toBe('123');
      expect(maskedMeta.userName).toBe('testuser');
      expect(maskedMeta.action).toBe('login');
      expect(maskedMeta.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(maskedMeta.success).toBe(true);
      expect(maskedMeta.metadata.browser).toBe('Chrome');
      expect(maskedMeta.metadata.ip).toBe('192.168.1.1');
    });

    it('should handle custom patterns (SSN, credit card)', () => {
      // Arrange
      const meta = {
        ssn: '123-45-6789',
        creditCard: '4111 1111 1111 1111',
        description: 'User SSN: 987-65-4321, Card: 5555-5555-5555-4444',
      };

      // Act
      logger.info('Custom pattern test', meta);

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta] = mockPinoLogger.info.mock.calls[0] ?? [];

      expect(maskedMeta.ssn).toBe('***-**-****');
      expect(maskedMeta.creditCard).toBe('****-****-****-****');
      expect(maskedMeta.description).toBe(
        'User SSN: ***-**-****, Card: ****-****-****-****',
      );
    });
  });

  describe('structured logging', () => {
    it('should include required fields in log output', () => {
      // Act
      logger.info('Test message', { customField: 'value' });

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
      const [maskedMeta, calledMessage] =
        mockPinoLogger.info.mock.calls[0] ?? [];
      expect(calledMessage).toBe('Test message');
      expect(maskedMeta.customField).toBe('value');
    });

    it('should handle multiple consecutive info calls', () => {
      // Act
      logger.info('First message');
      logger.info('Second message');

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(2);
      const [, firstMessage] = mockPinoLogger.info.mock.calls[0] ?? [];
      const [, secondMessage] = mockPinoLogger.info.mock.calls[1] ?? [];

      expect(firstMessage).toBe('First message');
      expect(secondMessage).toBe('Second message');
    });

    it('should include environment from NODE_ENV via pino base config', () => {
      // Arrange
      vi.stubEnv('NODE_ENV', 'production');

      // Act — production環境では新たなpinoインスタンスが作られるためLoggerを再生成
      const productionLogger = new Logger();
      productionLogger.info('Environment test');

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledTimes(1);
    });
  });
});
