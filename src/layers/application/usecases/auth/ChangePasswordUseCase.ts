import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import { newPasswordSchema } from '@/layers/application/utils/passwordValidation';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';
import {
  fieldErrorCodeMap,
  validateInput,
} from '@/layers/application/utils/validateInput';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserId } from '@/layers/domain/value-objects/UserId';

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: newPasswordSchema,
});

export type ChangePasswordRequest = z.infer<
  typeof changePasswordInputSchema
> & {
  userId: string;
};

export interface ChangePasswordResponse {
  message: string;
}

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService)
    private readonly hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  execute(
    request: ChangePasswordRequest,
  ): ResultAsync<ChangePasswordResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(
        this.logger,
        'パスワード変更処理中に予期しないエラーが発生',
        'PASSWORD_CHANGE_FAILED',
      ),
    );
  }

  private async _execute(
    request: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const { userId, currentPassword, newPassword } = request;
    this.logger.info('パスワード変更処理開始', { userId });

    validateInput(
      changePasswordInputSchema,
      { currentPassword, newPassword },
      fieldErrorCodeMap({
        currentPassword: 'EMPTY_CURRENT_PASSWORD',
        newPassword: 'INVALID_PASSWORD',
      }),
    );

    // ユーザーID検証とユーザー存在確認
    const userIdVO = new UserId(userId);
    const user = await this.userRepository.findById(userIdVO);

    if (!user) {
      this.logger.warn('パスワード変更失敗: ユーザーが見つかりません', {
        userId,
      });
      throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
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
      throw new AppUseCaseError(
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
      throw new AppUseCaseError(
        '新しいパスワードは現在のパスワードと異なる必要があります',
        'SAME_PASSWORD',
      );
    }

    // 新しいパスワードハッシュ化
    const newPasswordHash = await this.hashService.generateHash(newPassword);

    // Userエンティティでパスワード更新（ドメインロジック・immutableパターン）
    const updatedUser = user.changePassword(newPasswordHash);

    // Repository経由で永続化
    await this.userRepository.update(updatedUser);

    this.logger.info('パスワード変更成功', { userId });

    return {
      message: 'パスワードを変更しました',
    };
  }
}
