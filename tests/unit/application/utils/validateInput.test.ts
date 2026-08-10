import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';

describe('validateInput', () => {
  describe('パース成功ケース', () => {
    it('Zodスキーマのパースが成功した場合、パース済みデータを返す', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const data = { name: 'John', age: 30 };

      // Act
      const result = validateInput(schema, data);

      // Assert
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('スキーマに .default() がある場合、デフォルト値が適用されたデータを返す', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        role: z.string().default('user'),
      });
      const data = { name: 'Jane' };

      // Act
      const result = validateInput(schema, data);

      // Assert
      expect(result).toEqual({ name: 'Jane', role: 'user' });
    });
  });

  describe('パース失敗ケース', () => {
    it('パースが失敗した場合、デフォルトコード VALIDATION_ERROR で AppUseCaseError をthrowする', () => {
      // Arrange
      const schema = z.object({
        email: z.email('有効なメールアドレスを入力してください'),
      });
      const data = { email: 'invalid-email' };

      // Act & Assert
      expect(() => validateInput(schema, data)).toThrow(AppUseCaseError);
      expect(() => validateInput(schema, data)).toThrow(
        '有効なメールアドレスを入力してください',
      );

      try {
        validateInput(schema, data);
      } catch (error) {
        expect(error).toBeInstanceOf(AppUseCaseError);
        if (error instanceof AppUseCaseError) {
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.message).toBe('有効なメールアドレスを入力してください');
        }
      }
    });

    it('カスタム静的コードを渡した場合、そのコードで AppUseCaseError をthrowする', () => {
      // Arrange
      const schema = z.object({
        token: z.string().min(1, 'トークンは必須です'),
      });
      const data = { token: '' };

      // Act & Assert
      try {
        validateInput(schema, data, 'INVALID_TOKEN');
      } catch (error) {
        expect(error).toBeInstanceOf(AppUseCaseError);
        if (error instanceof AppUseCaseError) {
          expect(error.code).toBe('INVALID_TOKEN');
          expect(error.message).toBe('トークンは必須です');
        }
      }
    });

    it('カスタムコードマッパー関数を渡した場合、関数の戻り値がコードになる', () => {
      // Arrange
      const schema = z.object({
        email: z.email('有効なメールアドレスを入力してください'),
        password: z.string().min(1, 'パスワードは必須です'),
      });
      const data = { email: 'invalid', password: '' };
      const codeMapper = (error: z.ZodError) => {
        const field = error.issues[0]?.path[0];
        return field === 'password' ? 'EMPTY_PASSWORD' : 'EMPTY_EMAIL';
      };

      // Act & Assert
      try {
        validateInput(schema, data, codeMapper);
      } catch (error) {
        expect(error).toBeInstanceOf(AppUseCaseError);
        if (error instanceof AppUseCaseError) {
          // emailフィールドのエラーが最初に出るため EMPTY_EMAIL
          expect(error.code).toBe('EMPTY_EMAIL');
        }
      }
    });

    it('コードマッパー関数でpasswordフィールドエラーを検出した場合、EMPTY_PASSWORDを返す', () => {
      // Arrange
      const schema = z.object({
        email: z.email('有効なメールアドレスを入力してください'),
        password: z.string().min(1, 'パスワードは必須です'),
      });
      const data = { email: 'valid@example.com', password: '' };
      const codeMapper = (error: z.ZodError) => {
        const field = error.issues[0]?.path[0];
        return field === 'password' ? 'EMPTY_PASSWORD' : 'EMPTY_EMAIL';
      };

      // Act & Assert
      try {
        validateInput(schema, data, codeMapper);
      } catch (error) {
        expect(error).toBeInstanceOf(AppUseCaseError);
        if (error instanceof AppUseCaseError) {
          expect(error.code).toBe('EMPTY_PASSWORD');
          expect(error.message).toBe('パスワードは必須です');
        }
      }
    });
  });
});
