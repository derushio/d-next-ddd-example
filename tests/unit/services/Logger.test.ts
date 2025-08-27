import { Logger } from '@/layers/infrastructure/services/Logger';

import { createAutoMockConsole } from '@tests/utils/mocks/autoMocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Logger', () => {
  let logger: Logger;
  let mockConsole: ReturnType<typeof createAutoMockConsole>;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    // 🚀 自動モック生成（vitest-mock-extended）
    mockConsole = createAutoMockConsole();

    // グローバルconsoleをモック
    Object.defineProperty(global, 'console', {
      value: {
        ...console,
        ...mockConsole,
      },
      writable: true,
    });

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
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog).toMatchObject({
        level: 'INFO',
        message,
        service: 'd-next-ddd-example',
        environment: expect.any(String),
        timestamp: expect.any(String),
        traceId: expect.any(String),
      });
    });

    it('should mask sensitive data in meta', () => {
      // Arrange
      const message = 'User SignIn';
      const meta = { 
        userId: '123', 
        email: 'test@example.com',
        password: 'secret123',
        token: 'bearer-token-value'
      };

      // Act
      logger.info(message, meta);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.userId).toBe('123'); // 非機密情報はそのまま
      expect(parsedLog.email).toBe('t**t@e*****e.com'); // メールアドレスはマスク
      expect(parsedLog.password).toBe('***'); // パスワードは完全マスク
      expect(parsedLog.token).toBe('***'); // トークンは完全マスク
    });

    it('should handle empty message', () => {
      // Act
      logger.info('');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      expect(parsedLog.message).toBe('');
    });

    it('should handle undefined meta', () => {
      // Arrange
      const message = 'Test message';

      // Act
      logger.info(message, undefined);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      expect(parsedLog.message).toBe(message);
    });
  });

  describe('error', () => {
    it('should log structured error message', () => {
      // Arrange
      const message = 'This is an error message';

      // Act
      logger.error(message);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.error.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog).toMatchObject({
        level: 'ERROR',
        message,
        service: 'd-next-ddd-example',
      });
    });

    it('should log structured error with meta', () => {
      // Arrange
      const message = 'Database connection failed';
      const meta = { errorCode: 500, database: 'postgres' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.error.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.level).toBe('ERROR');
      expect(parsedLog.message).toBe(message);
      expect(parsedLog.errorCode).toBe(500);
      expect(parsedLog.database).toBe('postgres');
    });

    it('should handle Error object as meta', () => {
      // Arrange
      const message = 'Unexpected error occurred';
      const error = new Error('Something went wrong');

      // Act
      logger.error(message, { error });

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.error.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.level).toBe('ERROR');
      expect(parsedLog.message).toBe(message);
      expect(parsedLog).toHaveProperty('error');
    });
  });

  describe('warn', () => {
    it('should log structured warning message', () => {
      // Arrange
      const message = 'This is a warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.warn.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog).toMatchObject({
        level: 'WARN',
        message,
        service: 'd-next-ddd-example',
      });
    });

    it('should log structured warning with meta', () => {
      // Arrange
      const message = 'Deprecated API usage';
      const meta = { apiVersion: 'v1', deprecatedSince: '2024-01-01' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.warn.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.level).toBe('WARN');
      expect(parsedLog.message).toBe(message);
      expect(parsedLog.apiVersion).toBe('v1');
      expect(parsedLog.deprecatedSince).toBe('2024-01-01');
    });
  });

  describe('debug', () => {
    it('should log structured debug message', () => {
      // Arrange
      const message = 'This is a debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.debug.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog).toMatchObject({
        level: 'DEBUG',
        message,
        service: 'd-next-ddd-example',
      });
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
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      const loggedOutput = mockConsole.debug.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.level).toBe('DEBUG');
      expect(parsedLog.message).toBe(message);
      expect(parsedLog.query).toBe('SELECT * FROM users');
      expect(parsedLog.executionTime).toBe(150);
      expect(parsedLog.params).toEqual({ limit: 10, offset: 0 });
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
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const logOutput = mockConsole.info.mock.calls[0][0];
      expect(typeof logOutput).toBe('string');
      
      const logEntry = JSON.parse(logOutput);
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe(message);
      expect(logEntry.user).toEqual(complexMeta.user);
      expect(logEntry.array).toEqual(complexMeta.array);
      expect(logEntry.service).toBe('d-next-ddd-example');
      expect(logEntry.environment).toBe('test');
    });

    it('should handle different data types in meta', () => {
      const testCases = [
        { description: 'number object', meta: { value: 123 } },
        { description: 'boolean object', meta: { enabled: true } },
        { description: 'null value', meta: { data: null } },
        { description: 'array object', meta: { items: [1, 2, 3] } },
        { description: 'Date object', meta: { timestamp: new Date().toISOString() } },
        { description: 'nested object', meta: { config: { theme: 'dark' } } },
      ];

      testCases.forEach(({ description, meta }) => {
        const message = `Testing ${description}`;

        logger.info(message, meta);

        expect(mockConsole.info).toHaveBeenCalledTimes(1);
        const logOutput = mockConsole.info.mock.calls[0][0];
        expect(typeof logOutput).toBe('string');
        
        const logEntry = JSON.parse(logOutput);
        expect(logEntry.level).toBe('INFO');
        expect(logEntry.message).toBe(message);
        
        // Check that meta properties are included in the log entry
        Object.entries(meta).forEach(([key, value]) => {
          expect(logEntry[key]).toEqual(value);
        });

        // Clear mocks for next iteration
        vi.clearAllMocks();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'a'.repeat(1000);

      // Act
      logger.info(longMessage);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const logOutput = mockConsole.info.mock.calls[0][0];
      expect(typeof logOutput).toBe('string');
      
      const logEntry = JSON.parse(logOutput);
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe(longMessage);
      expect(logEntry.service).toBe('d-next-ddd-example');
      expect(logEntry.environment).toBe('test');
    });

    it('should handle special characters in message', () => {
      // Arrange
      const specialMessage =
        '🎉 Special chars: ñ, ü, ç, ß, 漢字, العربية, русский';

      // Act
      logger.info(specialMessage);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const logOutput = mockConsole.info.mock.calls[0][0];
      expect(typeof logOutput).toBe('string');
      
      const logEntry = JSON.parse(logOutput);
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe(specialMessage);
      expect(logEntry.service).toBe('d-next-ddd-example');
      expect(logEntry.environment).toBe('test');
    });

    it('should handle circular reference objects', () => {
      // Arrange
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Act & Assert - Should throw an error due to circular reference
      expect(() => {
        logger.info('Circular reference test', circularObj);
      }).toThrow(/Converting circular structure to JSON|Maximum call stack size exceeded/);
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
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('sensitive data masking', () => {
    it('should mask email addresses', () => {
      // Arrange
      const testCases = [
        { input: 'user@example.com', expected: 'u**r@e*****e.com' },
        { input: 'test.email+tag@domain.co.jp', expected: 't************g@d****n.co.jp' },
        { input: 'a@b.com', expected: '***@***.com' }, // 短いケース
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        logger.info('Test email masking', { email: input });

        // Assert
        const loggedOutput = mockConsole.info.mock.calls[mockConsole.info.mock.calls.length - 1][0];
        const parsedLog = JSON.parse(loggedOutput);
        expect(parsedLog.email).toBe(expected);
      });
    });

    it('should mask password fields', () => {
      // Arrange
      const sensitiveFields = [
        'password',
        'passwordHash',
        'newPassword',
        'currentPassword',
        'oldPassword',
      ];

      sensitiveFields.forEach(field => {
        // Act
        const meta = { [field]: 'secret-value-123' };
        logger.info('Password field test', meta);

        // Assert
        const loggedOutput = mockConsole.info.mock.calls[mockConsole.info.mock.calls.length - 1][0];
        const parsedLog = JSON.parse(loggedOutput);
        expect(parsedLog[field]).toBe('***');
      });
    });

    it('should mask token fields', () => {
      // Arrange
      const tokenFields = [
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
      ];

      tokenFields.forEach(field => {
        // Act
        const meta = { [field]: 'secret-token-value' };
        logger.info('Token field test', meta);

        // Assert
        const loggedOutput = mockConsole.info.mock.calls[mockConsole.info.mock.calls.length - 1][0];
        const parsedLog = JSON.parse(loggedOutput);
        expect(parsedLog[field]).toBe('***');
      });
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
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.user.id).toBe('123'); // 非機密情報はそのまま
      expect(parsedLog.user.email).toBe('u**r@e*****e.com'); // メールマスク
      expect(parsedLog.user.profile.name).toBe('Test User'); // 非機密情報はそのまま
      expect(parsedLog.user.profile.password).toBe('***'); // パスワードマスク
      expect(parsedLog.user.profile.settings.token).toBe('***'); // トークンマスク
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
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.authHeader).toBe('***');
      expect(parsedLog.description).toBe('Authorization: ***');
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
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      // すべての非機密データが保持されていることを確認
      expect(parsedLog.userId).toBe('123');
      expect(parsedLog.userName).toBe('testuser');
      expect(parsedLog.action).toBe('login');
      expect(parsedLog.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(parsedLog.success).toBe(true);
      expect(parsedLog.metadata.browser).toBe('Chrome');
      expect(parsedLog.metadata.ip).toBe('192.168.1.1');
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
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog.ssn).toBe('***-**-****');
      expect(parsedLog.creditCard).toBe('****-****-****-****');
      expect(parsedLog.description).toBe('User SSN: ***-**-****, Card: ****-****-****-****');
    });
  });

  describe('structured logging', () => {
    it('should include required fields in log output', () => {
      // Act
      logger.info('Test message', { customField: 'value' });

      // Assert
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      
      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('level', 'INFO');
      expect(parsedLog).toHaveProperty('message', 'Test message');
      expect(parsedLog).toHaveProperty('service', 'd-next-ddd-example');
      expect(parsedLog).toHaveProperty('environment');
      expect(parsedLog).toHaveProperty('traceId');
      expect(parsedLog).toHaveProperty('customField', 'value');
    });

    it('should generate unique trace IDs', () => {
      // Act
      logger.info('First message');
      logger.info('Second message');

      // Assert
      const firstLog = JSON.parse(mockConsole.info.mock.calls[0][0]);
      const secondLog = JSON.parse(mockConsole.info.mock.calls[1][0]);
      
      expect(firstLog.traceId).not.toBe(secondLog.traceId);
      expect(firstLog.traceId).toMatch(/^[a-z0-9]+$/);
      expect(secondLog.traceId).toMatch(/^[a-z0-9]+$/);
    });

    it('should include environment from NODE_ENV', () => {
      // Arrange
      vi.stubEnv('NODE_ENV', 'production');

      // Act
      logger.info('Environment test');

      // Assert
      const loggedOutput = mockConsole.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedOutput);
      expect(parsedLog.environment).toBe('production');

      // Cleanup is handled automatically by vi.unstubAllEnvs()
    });
  });
});
