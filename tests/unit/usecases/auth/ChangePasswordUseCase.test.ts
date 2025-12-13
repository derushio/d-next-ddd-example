import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { ChangePasswordUseCase } from '@/layers/application/usecases/auth/ChangePasswordUseCase';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

describe('ChangePasswordUseCase', () => {
  let changePasswordUseCase: ChangePasswordUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  // テスト環境の自動セットアップ
  setupTestEnvironment();

  beforeEach(() => {
    // 🚀 自動モック生成（vitest-mock-extended）
    mockUserRepository = createAutoMockUserRepository();
    mockUserDomainService = createAutoMockUserDomainService();
    mockHashService = createAutoMockHashService();
    mockLogger = createAutoMockLogger();

    // DIコンテナにモックを登録
    container.registerInstance(
      INJECTION_TOKENS.UserRepository,
      mockUserRepository,
    );
    container.registerInstance(
      INJECTION_TOKENS.UserDomainService,
      mockUserDomainService,
    );
    container.registerInstance(INJECTION_TOKENS.HashService, mockHashService);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    // UseCaseインスタンスをDIコンテナから取得
    changePasswordUseCase = container.resolve(ChangePasswordUseCase);
  });

  describe('execute', () => {
    const validInput = {
      userId: 'user-123',
      currentPassword: 'current123',
      newPassword: 'newpassword123',
    };

    it('should successfully change password', async () => {
      // Arrange
      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );

      // モックの設定
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockHashService.compareHash
        .mockResolvedValueOnce(true) // 現在のパスワード検証
        .mockResolvedValueOnce(false); // 新パスワードが現在と異なる確認
      mockHashService.generateHash.mockResolvedValue('hashed_new_password');
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await changePasswordUseCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          message: 'パスワードを変更しました',
        });
      }

      // モック呼び出しの確認
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        expect.any(UserId),
      );
      expect(mockHashService.compareHash).toHaveBeenCalledTimes(2);
      expect(mockHashService.generateHash).toHaveBeenCalledWith(
        validInput.newPassword,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'パスワード変更処理開始',
        { userId: validInput.userId },
      );
      expect(mockLogger.info).toHaveBeenCalledWith('パスワード変更成功', {
        userId: validInput.userId,
      });
    });

    it('should return failure when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await changePasswordUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        expect.any(UserId),
      );
      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when current password is empty', async () => {
      // Arrange
      const emptyCurrentPasswordInput = {
        ...validInput,
        currentPassword: '',
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await changePasswordUseCase.execute(
        emptyCurrentPasswordInput,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('現在のパスワードを入力してください');
        expect(result.error.code).toBe('EMPTY_CURRENT_PASSWORD');
      }

      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when new password is empty', async () => {
      // Arrange
      const emptyNewPasswordInput = {
        ...validInput,
        newPassword: '',
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await changePasswordUseCase.execute(emptyNewPasswordInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('新しいパスワードを入力してください');
        expect(result.error.code).toBe('EMPTY_NEW_PASSWORD');
      }

      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when new password is too short', async () => {
      // Arrange
      const shortPasswordInput = {
        ...validInput,
        newPassword: '1234567', // 7文字
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await changePasswordUseCase.execute(shortPasswordInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '新しいパスワードは8文字以上で入力してください',
        );
        expect(result.error.code).toBe('INVALID_PASSWORD_LENGTH');
      }

      expect(mockHashService.compareHash).not.toHaveBeenCalled();
    });

    it('should return failure when current password is incorrect', async () => {
      // Arrange
      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockHashService.compareHash.mockResolvedValue(false); // 現在のパスワード不正

      // Act
      const result = await changePasswordUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '現在のパスワードが正しくありません',
        );
        expect(result.error.code).toBe('INVALID_CURRENT_PASSWORD');
      }

      expect(mockHashService.compareHash).toHaveBeenCalledTimes(1);
      expect(mockHashService.generateHash).not.toHaveBeenCalled();
    });

    it('should return failure when new password is same as current', async () => {
      // Arrange
      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockHashService.compareHash
        .mockResolvedValueOnce(true) // 現在のパスワード検証OK
        .mockResolvedValueOnce(true); // 新パスワードが現在と同じ

      // Act
      const result = await changePasswordUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          '新しいパスワードは現在のパスワードと異なる必要があります',
        );
        expect(result.error.code).toBe('SAME_PASSWORD');
      }

      expect(mockHashService.compareHash).toHaveBeenCalledTimes(2);
      expect(mockHashService.generateHash).not.toHaveBeenCalled();
    });

    it('should return failure when user not found with valid userId format', async () => {
      // Arrange
      const nonExistentUserInput = {
        ...validInput,
        userId: 'valid-cuid-but-user-not-exists',
      };

      // UserIdのバリデーションが通るが、ユーザーが見つからない場合のテスト
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await changePasswordUseCase.execute(nonExistentUserInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーが見つかりません');
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        expect.any(UserId),
      );
    });

    it('should return failure when repository throws error', async () => {
      // Arrange
      const mockUser = User.create(
        new Email('john@example.com'),
        'John Doe',
        'hashed_current_password',
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockHashService.compareHash
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockHashService.generateHash.mockResolvedValue('hashed_new_password');
      
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.update.mockRejectedValue(repositoryError);

      // Act
      const result = await changePasswordUseCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('パスワード変更に失敗しました');
        expect(result.error.code).toBe('PASSWORD_CHANGE_FAILED');
      }

      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser);
    });
  });
});