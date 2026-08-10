import { createAutoMockUserRepository } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { User } from '@/layers/domain/entities/User';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';

describe('UserDomainService', () => {
  let userDomainService: UserDomainService;
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();

    // UserDomainServiceを直接インスタンス化してテストする
    userDomainService = new UserDomainService(mockUserRepository);
  });

  describe('validateUserData', () => {
    const validName = 'John Doe';
    const validEmail = 'john@example.com';

    it('should validate valid user data successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert - should not throw
      await expect(
        userDomainService.validateUserData(validName, validEmail),
      ).resolves.toBeUndefined();

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
    });

    describe('name validation', () => {
      it('should throw error for name shorter than 2 characters', async () => {
        // Arrange
        const shortName = 'A';

        // Act & Assert
        await expect(
          userDomainService.validateUserData(shortName, validEmail),
        ).rejects.toThrow('名前は2文字以上である必要があります');
      });

      it('should throw error for name with only spaces', async () => {
        // Arrange
        const spaceName = '   ';

        // Act & Assert
        await expect(
          userDomainService.validateUserData(spaceName, validEmail),
        ).rejects.toThrow('名前は2文字以上である必要があります');
      });

      it('should throw error for name with forbidden characters', async () => {
        // Arrange
        const forbiddenNames = [
          'John<script>',
          'Jane"quote',
          "Bob'apostrophe",
          'Alice&amp',
        ];

        for (const forbiddenName of forbiddenNames) {
          // Act & Assert
          await expect(
            userDomainService.validateUserData(forbiddenName, validEmail),
          ).rejects.toThrow('名前に使用できない文字が含まれています');
        }
      });

      it('should accept name with exactly 100 characters', async () => {
        // Arrange
        const maxLengthName = 'a'.repeat(100);
        mockUserRepository.findByEmail.mockResolvedValue(null);

        // Act & Assert
        await expect(
          userDomainService.validateUserData(maxLengthName, validEmail),
        ).resolves.toBeUndefined();
      });

      it('should accept name with exactly 2 characters', async () => {
        // Arrange
        const minLengthName = 'AB';
        mockUserRepository.findByEmail.mockResolvedValue(null);

        // Act & Assert
        await expect(
          userDomainService.validateUserData(minLengthName, validEmail),
        ).resolves.toBeUndefined();
      });
    });

    describe('email validation', () => {
      it('should throw error for invalid email format', async () => {
        // Act & Assert - Email Value Object でエラーが発生
        await expect(
          userDomainService.validateUserData(validName, 'invalid-email'),
        ).rejects.toThrow('メールアドレスの形式が正しくありません');
      });

      it('should throw error for duplicate email', async () => {
        // Arrange
        const existingUser = User.create(
          new Email(validEmail),
          'Existing User',
          'hashed-password',
        );
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);

        // Act & Assert
        await expect(
          userDomainService.validateUserData(validName, validEmail),
        ).rejects.toThrow('このメールアドレスは既に使用されています');

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
          expect.any(Email),
        );
      });
    });
  });

  describe('validateEmailUpdate', () => {
    const currentUser = User.create(
      new Email('current@example.com'),
      'Current User',
      'hashed-password',
    );

    it('should allow updating to the same email', async () => {
      // Act & Assert - should not throw
      await expect(
        userDomainService.validateEmailUpdate(
          currentUser,
          'current@example.com',
        ),
      ).resolves.toBeUndefined();

      // Repository should not be called for same email
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should allow updating to a new unused email', async () => {
      // Arrange
      const newEmail = 'new@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userDomainService.validateEmailUpdate(currentUser, newEmail),
      ).resolves.toBeUndefined();

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
    });

    it('should throw error for email used by another user', async () => {
      // Arrange
      const newEmail = 'taken@example.com';
      const otherUser = User.create(
        new Email(newEmail),
        'Other User',
        'hashed-password',
      );
      mockUserRepository.findByEmail.mockResolvedValue(otherUser);

      // Act & Assert
      await expect(
        userDomainService.validateEmailUpdate(currentUser, newEmail),
      ).rejects.toThrow('このメールアドレスは既に使用されています');
    });

    it('should allow updating when found user is the same user', async () => {
      // Arrange
      const newEmail = 'new@example.com';
      // 同じユーザーIDを持つユーザーが見つかった場合
      const sameUser = User.reconstruct(
        currentUser.id,
        new Email(newEmail),
        'Current User',
        'hashed-password',
        currentUser.createdAt,
        currentUser.updatedAt,
      );
      mockUserRepository.findByEmail.mockResolvedValue(sameUser);

      // Act & Assert
      await expect(
        userDomainService.validateEmailUpdate(currentUser, newEmail),
      ).resolves.toBeUndefined();
    });

    it('should throw error for invalid email format', async () => {
      // Act & Assert - Email Value Object でエラーが発生
      await expect(
        userDomainService.validateEmailUpdate(currentUser, 'invalid-email'),
      ).rejects.toThrow('メールアドレスの形式が正しくありません');
    });
  });

  describe('isEmailDuplicate', () => {
    it('should return true when email exists', async () => {
      // Arrange
      const email = new Email('existing@example.com');
      const existingUser = User.create(
        email,
        'Existing User',
        'hashed-password',
      );
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await userDomainService.isEmailDuplicate(email);

      // Assert
      expect(result).toBe(true);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should return false when email does not exist', async () => {
      // Arrange
      const email = new Email('new@example.com');
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userDomainService.isEmailDuplicate(email);

      // Assert
      expect(result).toBe(false);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
    });
  });
});
