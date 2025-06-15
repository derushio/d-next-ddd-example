import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

import { describe, expect, it } from 'vitest';

describe('User Entity', () => {
  describe('create', () => {
    it('新規ユーザーを正常に作成できる', () => {
      // Arrange
      const email = new Email('test@example.com');
      const name = 'Test User';
      const passwordHash = 'hashed-password';

      // Act
      const user = User.create(email, name, passwordHash);

      // Assert
      expect(user.getName()).toBe(name);
      expect(user.getEmail()).toBe(email);
      expect(user.getPasswordHash()).toBe(passwordHash);
      expect(user.getCreatedAt()).toBeInstanceOf(Date);
      expect(user.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it('無効な名前でエラーが発生する', () => {
      // Arrange
      const email = new Email('test@example.com');
      const passwordHash = 'hashed-password';

      // Act & Assert
      expect(() => {
        User.create(email, '', passwordHash);
      }).toThrow(DomainError);

      expect(() => {
        User.create(email, '   ', passwordHash);
      }).toThrow(DomainError);
    });
  });

  describe('reconstruct', () => {
    it('既存データから正常に再構築できる', () => {
      // Arrange
      const id = new UserId('test-user-id');
      const email = new Email('test@example.com');
      const name = 'Test User';
      const passwordHash = 'hashed-password';
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-10');

      // Act
      const user = User.reconstruct(
        id,
        email,
        name,
        passwordHash,
        createdAt,
        updatedAt,
      );

      // Assert
      expect(user.getId()).toBe(id);
      expect(user.getName()).toBe(name);
      expect(user.getEmail()).toBe(email);
      expect(user.getPasswordHash()).toBe(passwordHash);
      expect(user.getCreatedAt()).toBe(createdAt);
      expect(user.getUpdatedAt()).toBe(updatedAt);
    });
  });

  describe('updateProfile', () => {
    it('プロフィールを正常に更新できる', async () => {
      // Arrange
      const user = User.create(
        new Email('test@example.com'),
        'Old Name',
        'hashed-password',
      );
      const newEmail = new Email('new@example.com');
      const newName = 'New Name';
      const oldUpdatedAt = user.getUpdatedAt();

      // わずかな時間待機して確実に時刻差を作る
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.updateProfile(newEmail, newName);

      // Assert
      expect(user.getEmail()).toBe(newEmail);
      expect(user.getName()).toBe(newName);
      expect(user.getUpdatedAt()).toBeInstanceOf(Date);
      expect(user.getUpdatedAt().getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    it('無効な名前でエラーが発生する', () => {
      // Arrange
      const user = User.create(
        new Email('test@example.com'),
        'Valid Name',
        'hashed-password',
      );

      // Act & Assert
      expect(() => {
        user.updateProfile(new Email('test@example.com'), '');
      }).toThrow(DomainError);

      expect(() => {
        user.updateProfile(new Email('test@example.com'), '   ');
      }).toThrow(DomainError);
    });

    it('名前が長すぎる場合エラーが発生する', () => {
      // Arrange
      const user = User.create(
        new Email('test@example.com'),
        'Valid Name',
        'hashed-password',
      );
      const tooLongName = 'a'.repeat(101); // 101文字の名前

      // Act & Assert
      expect(() => {
        user.updateProfile(new Email('test@example.com'), tooLongName);
      }).toThrow(DomainError);
    });

    it('同じ値で更新してもupdatedAtは更新される', async () => {
      // Arrange
      const user = User.create(
        new Email('test@example.com'),
        'Test Name',
        'hashed-password',
      );
      const originalUpdatedAt = user.getUpdatedAt();

      // わずかな時間待機して確実に時刻差を作る
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.updateProfile(new Email('test@example.com'), 'Test Name');

      // Assert
      expect(user.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });
});
