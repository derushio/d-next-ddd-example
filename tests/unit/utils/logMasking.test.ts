import { describe, expect, it } from 'vitest';
import {
  maskEmail,
  maskSensitiveData,
  prepareLogData,
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

  describe('maskSensitiveData', () => {
    it('should mask email field', () => {
      const data = { email: 'test@example.com', name: 'John' };
      const masked = maskSensitiveData(data);
      expect(masked.email).toBe('tes***@example.com');
      expect(masked.name).toBe('John');
    });

    it('should mask password field with [REDACTED]', () => {
      const data = { password: 'secret123' };
      const masked = maskSensitiveData(data);
      expect(masked.password).toBe('[REDACTED]');
    });

    it('should mask token, secret, apiKey fields', () => {
      const data = { token: 'abc', secret: 'xyz', apiKey: '123' };
      const masked = maskSensitiveData(data);
      expect(masked.token).toBe('[REDACTED]');
      expect(masked.secret).toBe('[REDACTED]');
      expect(masked.apiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'nested@example.com',
          profile: {
            name: 'John',
          },
        },
      };
      const masked = maskSensitiveData(data);
      expect((masked.user as { email: string }).email).toBe(
        'nes***@example.com',
      );
      expect((masked.user as { profile: { name: string } }).profile.name).toBe(
        'John',
      );
    });

    it('should handle custom sensitive keys', () => {
      const data = { customField: 'sensitive' };
      const masked = maskSensitiveData(data, ['customField']);
      expect(masked.customField).toBe('[REDACTED]');
    });

    describe('depth limit protection', () => {
      it('should handle deeply nested objects with depth limit', () => {
        // Create deeply nested object (more than MAX_MASKING_DEPTH=10)
        type DeepNested = { level?: DeepNested; depth: number };
        const createDeep = (depth: number): DeepNested => {
          if (depth === 0) return { depth: 0 };
          return { level: createDeep(depth - 1), depth };
        };

        const deepData = createDeep(15);
        const masked = maskSensitiveData(
          deepData as unknown as Record<string, unknown>,
        );

        // Should not throw, should handle gracefully
        expect(masked).toBeDefined();

        // Verify depth exceeded marker exists somewhere in the structure
        const findDepthExceeded = (obj: unknown): boolean => {
          if (obj === null || typeof obj !== 'object') return false;
          if ('[DEPTH_EXCEEDED]' in (obj as Record<string, unknown>))
            return true;
          for (const value of Object.values(obj as Record<string, unknown>)) {
            if (findDepthExceeded(value)) return true;
          }
          return false;
        };

        expect(findDepthExceeded(masked)).toBe(true);
      });

      it('should not trigger depth limit for shallow objects', () => {
        const shallowData = {
          level1: {
            level2: {
              level3: {
                email: 'test@example.com',
              },
            },
          },
        };

        const masked = maskSensitiveData(shallowData);

        // Should mask email correctly
        expect(
          (
            masked.level1 as {
              level2: { level3: { email: string } };
            }
          ).level2.level3.email,
        ).toBe('tes***@example.com');
      });
    });

    describe('circular reference protection', () => {
      it('should handle circular references gracefully', () => {
        // Create object with circular reference
        type Circular = { self?: Circular; name: string };
        const circularData: Circular = { name: 'test' };
        circularData.self = circularData;

        // Should not throw, should handle gracefully
        const masked = maskSensitiveData(
          circularData as unknown as Record<string, unknown>,
        );
        expect(masked).toBeDefined();
        expect(masked.name).toBe('test');

        // The circular reference should be marked
        expect(
          (masked.self as Record<string, unknown>)['[CIRCULAR_REFERENCE]'],
        ).toBe(true);
      });

      it('should handle indirect circular references', () => {
        // A -> B -> C -> A
        type Node = { ref?: Node; email?: string };
        const a: Node = { email: 'alice@example.com' };
        const b: Node = { email: 'bob@example.com' };
        const c: Node = { email: 'carol@example.com' };
        a.ref = b;
        b.ref = c;
        c.ref = a;

        const masked = maskSensitiveData(
          a as unknown as Record<string, unknown>,
        );
        expect(masked).toBeDefined();
        // 'alice' -> 'ali***'
        expect(masked.email).toBe('ali***@example.com');
      });
    });
  });

  describe('prepareLogData', () => {
    it('should mask data when shouldMask is true', () => {
      const data = { email: 'test@example.com' };
      const prepared = prepareLogData(data, true);
      expect(prepared.email).toBe('tes***@example.com');
    });

    it('should not mask data when shouldMask is false', () => {
      const data = { email: 'test@example.com' };
      const prepared = prepareLogData(data, false);
      expect(prepared.email).toBe('test@example.com');
    });
  });
});
