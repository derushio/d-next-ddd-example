import type { IConfigService } from '@/layers/infrastructure/services/ConfigService';
import { HashService } from '@/layers/infrastructure/services/HashService';
import { container } from '@/di/container';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';

import { createMockConfigService } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';

describe('HashService', () => {
  let hashService: HashService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    // テスト間でコンテナをクリア
    container.clearInstances();

    // ConfigServiceは複雑な構造のため手動モックを使用
    mockConfigService = createMockConfigService();

    // HashServiceを直接インスタンス化してテストする
    hashService = new HashService(mockConfigService);
  });

  describe('generateHash', () => {
    it('should generate hash successfully', async () => {
      // Arrange
      const plainText = 'password123';

      // Act
      const result = await hashService.generateHash(plainText);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).not.toBe(plainText);
      expect(result.length).toBeGreaterThan(0);
      expect(mockConfigService.getConfig).toHaveBeenCalledWith();
    });

    it('should generate different hashes for same input', async () => {
      // Arrange
      const plainText = 'password123';

      // Act
      const hash1 = await hashService.generateHash(plainText);
      const hash2 = await hashService.generateHash(plainText);

      // Assert
      expect(hash1).not.toBe(hash2);
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });

    it('should handle empty string', async () => {
      // Act
      const result = await hashService.generateHash('');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle special characters', async () => {
      // Arrange
      const specialText = '!@#$%^&*()_+{}|:"<>?[]\\;\',./ 漢字';

      // Act
      const result = await hashService.generateHash(specialText);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).not.toBe(specialText);
    });

    it('should handle very long strings', async () => {
      // Arrange
      const longText = 'a'.repeat(1000);

      // Act
      const result = await hashService.generateHash(longText);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should use saltRounds from config', async () => {
      // Arrange
      const customConfig = {
        token: {
          saltRounds: 15,
          secret: 'test-secret',
          maxAgeMinutes: 60,
          updateAgeMinutes: 30,
        },
        database: {
          url: 'test-db-url',
        },
        app: {
          baseUrl: 'http://localhost:3000',
          isDevelopment: true,
          nodeEnv: 'test',
        },
      };
      const mockConfigWithCustomSalt = createMockConfigService(customConfig);

      // 一時的にDIコンテナにカスタムモックを登録
      container.registerInstance(
        INJECTION_TOKENS.ConfigService,
        mockConfigWithCustomSalt,
      );
      const customHashService = resolve('HashService');

      // Act
      const result = await customHashService.generateHash('test');

      // Assert
      expect(result).toBeDefined();
      expect(mockConfigWithCustomSalt.getConfig).toHaveBeenCalledWith();
    });
  });

  describe('compareHash', () => {
    it('should return true for matching hash', async () => {
      // Arrange
      const plainText = 'password123';
      const hash = await hashService.generateHash(plainText);

      // Act
      const result = await hashService.compareHash(plainText, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-matching hash', async () => {
      // Arrange
      const plainText = 'password123';
      const wrongText = 'wrongpassword';
      const hash = await hashService.generateHash(plainText);

      // Act
      const result = await hashService.compareHash(wrongText, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for empty plain text', async () => {
      // Arrange
      const hash = await hashService.generateHash('password123');

      // Act
      const result = await hashService.compareHash('', hash);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      // Arrange
      const plainText = 'password123';
      const invalidHash = 'invalid_hash_format';

      // Act
      const result = await hashService.compareHash(plainText, invalidHash);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      // Arrange
      const specialText = '!@#$%^&*()_+{}|:"<>?[]\\;\',./ 漢字';
      const hash = await hashService.generateHash(specialText);

      // Act
      const result = await hashService.compareHash(specialText, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('should be case sensitive', async () => {
      // Arrange
      const plainText = 'Password123';
      const hash = await hashService.generateHash(plainText);

      // Act
      const result = await hashService.compareHash('password123', hash);

      // Assert
      expect(result).toBe(false);
    });
  });
});
