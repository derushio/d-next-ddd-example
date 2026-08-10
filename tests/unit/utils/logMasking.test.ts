import { describe, expect, it } from 'vitest';
import {
  applyMasking,
  maskEmail,
  maskStringPatterns,
} from '@/utils/logMasking';

describe('logMasking', () => {
  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('user@example.com')).toBe('use***@example.com');
    });

    it('should handle short local part', () => {
      expect(maskEmail('ab@example.com')).toBe('ab***@example.com');
    });

    it('should handle empty/null/undefined', () => {
      expect(maskEmail(undefined)).toBe('[empty]');
      expect(maskEmail(null)).toBe('[empty]');
      expect(maskEmail('')).toBe('[empty]');
    });

    it('should handle email without @', () => {
      expect(maskEmail('invalid')).toBe('inv***');
    });
  });

  // applyMasking は Logger が実際に使用する関数
  describe('applyMasking', () => {
    it('should mask email fields with maskEmail', () => {
      const data = { email: 'user@example.com', name: 'John' };
      const masked = applyMasking(data);
      expect(masked.email).toBe('use***@example.com');
      expect(masked.name).toBe('John');
    });

    it('should mask password field with ***', () => {
      const data = { password: 'secret123' };
      const masked = applyMasking(data);
      expect(masked.password).toBe('***');
    });

    it('should mask token, accessToken, refreshToken with ***', () => {
      const data = {
        token: 'abc',
        accessToken: 'xyz',
        refreshToken: '123',
      };
      const masked = applyMasking(data);
      expect(masked.token).toBe('***');
      expect(masked.accessToken).toBe('***');
      expect(masked.refreshToken).toBe('***');
    });

    it('should mask secret, apiKey, authorization with ***', () => {
      const data = {
        secret: 'mysecret',
        apiKey: 'mykey',
        authorization: 'Bearer token',
      };
      const masked = applyMasking(data);
      expect(masked.secret).toBe('***');
      expect(masked.apiKey).toBe('***');
      expect(masked.authorization).toBe('***');
    });

    it('should mask fields with sensitive keywords (partial match)', () => {
      const data = { userPassword: 'pass123', authHeader: 'value' };
      const masked = applyMasking(data);
      expect(masked.userPassword).toBe('***');
      expect(masked.authHeader).toBe('***');
    });

    it('should recursively mask nested objects', () => {
      const data = {
        user: {
          email: 'nested@example.com',
          token: 'secret-token',
          profile: { name: 'Alice' },
        },
      };
      const masked = applyMasking(data);
      const user = masked.user as Record<string, unknown>;
      expect(user.email).toBe('nes***@example.com');
      expect(user.token).toBe('***');
      expect((user.profile as Record<string, unknown>).name).toBe('Alice');
    });

    it('should handle circular references', () => {
      type Circular = { self?: Circular; name: string };
      const obj: Circular = { name: 'test' };
      obj.self = obj;

      const masked = applyMasking(obj as unknown as Record<string, unknown>);
      expect(masked).toBeDefined();
      expect(masked.name).toBe('test');
      // 循環参照は '[Circular]' 文字列で置換される
      expect(masked.self).toBe('[Circular]');
    });

    it('should not mask non-sensitive plain string values', () => {
      const data = { message: 'hello world', count: 42 };
      const masked = applyMasking(data);
      expect(masked.message).toBe('hello world');
      expect(masked.count).toBe(42);
    });
  });

  describe('maskStringPatterns', () => {
    it('should mask SSN patterns', () => {
      const text = 'SSN is 123-45-6789';
      expect(maskStringPatterns(text)).toBe('SSN is ***-**-****');
    });

    it('should mask credit card number patterns', () => {
      const text = 'Card: 1234-5678-9012-3456';
      expect(maskStringPatterns(text)).toBe('Card: ****-****-****-****');
    });

    it('should mask Bearer token in strings', () => {
      const text = 'Bearer abc123.def456';
      const masked = maskStringPatterns(text);
      // Bearer パターンにマッチしてトークン部分がマスクされる
      expect(masked).toContain('***');
      expect(masked).not.toBe(text);
    });

    it('should return unchanged text with no sensitive patterns', () => {
      const text = 'just a normal log message';
      expect(maskStringPatterns(text)).toBe('just a normal log message');
    });
  });
});
