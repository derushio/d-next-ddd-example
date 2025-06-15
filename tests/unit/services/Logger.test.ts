import { Logger } from '@/layers/infrastructure/services/Logger';

import { createAutoMockConsole } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  describe('info', () => {
    it('should log info message with string', () => {
      // Arrange
      const message = 'This is an info message';

      // Act
      logger.info(message);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(message, {});
    });

    it('should log info message with string and object', () => {
      // Arrange
      const message = 'User SignIn';
      const meta = { userId: '123', email: 'test@example.com' };

      // Act
      logger.info(message, meta);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(message, meta);
    });

    it('should handle empty message', () => {
      // Act
      logger.info('');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith('', {});
    });

    it('should handle undefined meta', () => {
      // Arrange
      const message = 'Test message';

      // Act
      logger.info(message, undefined);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(message, {});
    });
  });

  describe('error', () => {
    it('should log error message with string', () => {
      // Arrange
      const message = 'This is an error message';

      // Act
      logger.error(message);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(message, {});
    });

    it('should log error message with string and object', () => {
      // Arrange
      const message = 'Database connection failed';
      const meta = { errorCode: 500, database: 'postgres' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(message, meta);
    });

    it('should handle Error object as meta', () => {
      // Arrange
      const message = 'Unexpected error occurred';
      const error = new Error('Something went wrong');

      // Act
      logger.error(message, { error });

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(message, { error });
    });
  });

  describe('warn', () => {
    it('should log warning message with string', () => {
      // Arrange
      const message = 'This is a warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(message, {});
    });

    it('should log warning message with string and object', () => {
      // Arrange
      const message = 'Deprecated API usage';
      const meta = { apiVersion: 'v1', deprecatedSince: '2024-01-01' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('debug', () => {
    it('should log debug message with string', () => {
      // Arrange
      const message = 'This is a debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith(message, {});
    });

    it('should log debug message with string and object', () => {
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
      expect(mockConsole.debug).toHaveBeenCalledWith(message, meta);
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
      expect(mockConsole.info).toHaveBeenCalledWith(message, complexMeta);
    });

    it('should handle different data types in meta', () => {
      const testCases = [
        { description: 'number object', meta: { value: 123 } },
        { description: 'boolean object', meta: { enabled: true } },
        { description: 'null value', meta: { data: null } },
        { description: 'array object', meta: { items: [1, 2, 3] } },
        { description: 'Date object', meta: { timestamp: new Date() } },
        { description: 'nested object', meta: { config: { theme: 'dark' } } },
      ];

      testCases.forEach(({ description, meta }) => {
        const message = `Testing ${description}`;

        logger.info(message, meta);

        expect(mockConsole.info).toHaveBeenCalledWith(message, meta);

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
      expect(mockConsole.info).toHaveBeenCalledWith(longMessage, {});
    });

    it('should handle special characters in message', () => {
      // Arrange
      const specialMessage =
        '🎉 Special chars: ñ, ü, ç, ß, 漢字, العربية, русский';

      // Act
      logger.info(specialMessage);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(specialMessage, {});
    });

    it('should handle circular reference objects', () => {
      // Arrange
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Act & Assert - Should not throw an error
      expect(() => {
        logger.info('Circular reference test', circularObj);
      }).not.toThrow();

      expect(mockConsole.info).toHaveBeenCalledWith(
        'Circular reference test',
        circularObj,
      );
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
      expect(mockConsole.info).toHaveBeenCalledWith('First message', {});
      expect(mockConsole.error).toHaveBeenCalledWith('Error message', {});
      expect(mockConsole.warn).toHaveBeenCalledWith('Warning message', {});
      expect(mockConsole.debug).toHaveBeenCalledWith('Debug message', {});

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });
  });
});
