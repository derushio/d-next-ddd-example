import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';

import { describe, expect, it } from 'vitest';

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('有効なメールアドレスで正常に作成できる', () => {
      // Arrange & Act
      const email = new Email('test@example.com');

      // Assert
      expect(email.value).toBe('test@example.com');
    });

    it('各種有効なメールアドレス形式で作成できる', () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.com',
        'user+tag@domain.com',
        'user123@domain123.com',
        'user@sub.domain.com',
        'a@b.co',
      ];

      validEmails.forEach((emailStr) => {
        expect(() => new Email(emailStr)).not.toThrow();
      });
    });

    it('空のメールアドレスでDomainError（EMAIL_REQUIRED）が発生する', () => {
      expect(() => new Email('')).toThrow(DomainError);
      expect(() => new Email('')).toThrow('メールアドレスは必須です');

      try {
        new Email('');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('EMAIL_REQUIRED');
      }
    });

    it('無効な形式のメールアドレスでDomainError（EMAIL_INVALID_FORMAT）が発生する', () => {
      const invalidFormats = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'user@',
        '@domain.com',
        'user space@domain.com',
        'user@domain',
        'user@@domain.com',
        'user@domain..com',
      ];

      invalidFormats.forEach((emailStr) => {
        try {
          new Email(emailStr);
          fail(`Expected DomainError for: ${emailStr}`);
        } catch (error) {
          expect(error).toBeInstanceOf(DomainError);
          expect((error as DomainError).code).toBe('EMAIL_INVALID_FORMAT');
          expect((error as DomainError).message).toBe(
            'メールアドレスの形式が正しくありません',
          );
        }
      });
    });

    it('長すぎるメールアドレスでDomainError（EMAIL_TOO_LONG）が発生する', () => {
      const longEmail = `${'a'.repeat(250)}@example.com`; // 254文字を超える

      try {
        new Email(longEmail);
        fail('Expected DomainError for too long email');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('EMAIL_TOO_LONG');
        expect((error as DomainError).message).toBe(
          'メールアドレスが長すぎます（254文字以内である必要があります）',
        );
      }
    });

    it('禁止文字を含むメールアドレスでDomainError（EMAIL_INVALID_CHARACTERS）が発生する', () => {
      const forbiddenCharEmails = [
        'user<script>@example.com',
        'user>test@example.com',
        'user"test@example.com',
        "user'test@example.com",
        'user&test@example.com',
      ];

      forbiddenCharEmails.forEach((emailStr) => {
        try {
          new Email(emailStr);
          fail(`Expected DomainError for forbidden char email: ${emailStr}`);
        } catch (error) {
          expect(error).toBeInstanceOf(DomainError);
          expect((error as DomainError).code).toBe('EMAIL_INVALID_CHARACTERS');
          expect((error as DomainError).message).toBe(
            'メールアドレスに使用できない文字が含まれています',
          );
        }
      });
    });
  });

  describe('getDomain', () => {
    it('ドメイン部分を正しく取得できる', () => {
      // Arrange
      const email = new Email('user@example.com');

      // Act
      const domain = email.getDomain();

      // Assert
      expect(domain).toBe('example.com');
    });

    it('サブドメインも含めて取得できる', () => {
      // Arrange
      const email = new Email('user@mail.google.com');

      // Act
      const domain = email.getDomain();

      // Assert
      expect(domain).toBe('mail.google.com');
    });
  });

  describe('getLocalPart', () => {
    it('ローカル部分を正しく取得できる', () => {
      // Arrange
      const email = new Email('user.name+tag@example.com');

      // Act
      const localPart = email.getLocalPart();

      // Assert
      expect(localPart).toBe('user.name+tag');
    });
  });

  describe('isFromDomain', () => {
    it('指定されたドメインからのメールか判定できる', () => {
      // Arrange
      const email = new Email('user@example.com');

      // Act & Assert
      expect(email.isFromDomain('example.com')).toBe(true);
      expect(email.isFromDomain('other.com')).toBe(false);
    });

    it('大文字小文字を区別せずに判定する', () => {
      // Arrange
      const email = new Email('user@Example.COM');

      // Act & Assert
      expect(email.isFromDomain('example.com')).toBe(true);
      expect(email.isFromDomain('EXAMPLE.COM')).toBe(true);
    });
  });

  describe('equals', () => {
    it('同じメールアドレスで等価判定できる', () => {
      // Arrange
      const email1 = new Email('test@example.com');
      const email2 = new Email('test@example.com');

      // Act & Assert
      expect(email1.equals(email2)).toBe(true);
    });

    it('異なるメールアドレスで非等価判定できる', () => {
      // Arrange
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');

      // Act & Assert
      expect(email1.equals(email2)).toBe(false);
    });

    it('大文字小文字を区別せずに等価判定する', () => {
      // Arrange
      const email1 = new Email('Test@Example.COM');
      const email2 = new Email('test@example.com');

      // Act & Assert
      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('文字列表現を正しく返す', () => {
      // Arrange
      const emailStr = 'test@example.com';
      const email = new Email(emailStr);

      // Act
      const result = email.toString();

      // Assert
      expect(result).toBe(emailStr);
    });

    it('正規化された文字列表現を返す', () => {
      // Arrange
      const email = new Email('Test@Example.COM');

      // Act
      const result = email.toString();

      // Assert
      expect(result).toBe('test@example.com');
    });
  });
});
