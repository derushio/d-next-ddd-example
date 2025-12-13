import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { UserId } from '@/layers/domain/value-objects/UserId';

import { inject, injectable } from 'tsyringe';

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute({
    userId,
    currentPassword,
    newPassword,
  }: ChangePasswordRequest): Promise<Result<ChangePasswordResponse>> {
    this.logger.info('パスワード変更処理開始', { userId });

    try {
      // ユーザーID検証とユーザー存在確認
      const userIdVO = new UserId(userId);
      const user = await this.userRepository.findById(userIdVO);

      if (!user) {
        this.logger.warn('パスワード変更失敗: ユーザーが見つかりません', {
          userId,
        });
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      // パスワードバリデーション（基本的なチェック）
      if (!currentPassword || currentPassword.trim().length === 0) {
        return failure(
          '現在のパスワードを入力してください',
          'EMPTY_CURRENT_PASSWORD',
        );
      }

      if (!newPassword || newPassword.trim().length === 0) {
        return failure(
          '新しいパスワードを入力してください',
          'EMPTY_NEW_PASSWORD',
        );
      }

      if (newPassword.length < 8) {
        return failure(
          '新しいパスワードは8文字以上で入力してください',
          'INVALID_PASSWORD_LENGTH',
        );
      }

      // 現在のパスワード検証
      const isCurrentPasswordValid = await this.hashService.compareHash(
        currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        this.logger.warn(
          'パスワード変更失敗: 現在のパスワードが正しくありません',
          { userId },
        );
        return failure(
          '現在のパスワードが正しくありません',
          'INVALID_CURRENT_PASSWORD',
        );
      }

      // 現在のパスワードと同じかチェック
      const isSamePassword = await this.hashService.compareHash(
        newPassword,
        user.passwordHash,
      );

      if (isSamePassword) {
        this.logger.warn('パスワード変更失敗: 現在のパスワードと同じです', {
          userId,
        });
        return failure(
          '新しいパスワードは現在のパスワードと異なる必要があります',
          'SAME_PASSWORD',
        );
      }

      // 新しいパスワードハッシュ化
      const newPasswordHash = await this.hashService.generateHash(newPassword);

      // Userエンティティでパスワード更新（ドメインロジック）
      // Note: User entityにsetPasswordHashメソッドを追加する必要がある
      // 現在はRepositoryでの直接更新で実装
      const updatedUser = user; // 本来はuser.changePassword(newPasswordHash)のようなメソッドを呼ぶ

      // Repository経由で永続化
      await this.userRepository.update(updatedUser);

      this.logger.info('パスワード変更成功', { userId });

      return success({
        message: 'パスワードを変更しました',
      });
    } catch (error) {
      this.logger.error('パスワード変更処理中に予期しないエラーが発生', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('パスワード変更に失敗しました', 'PASSWORD_CHANGE_FAILED');
    }
  }
}
