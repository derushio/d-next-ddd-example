import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { userIdSchema } from '@/layers/application/schemas/commonFieldSchemas';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserId } from '@/layers/domain/value-objects/UserId';

export const deleteUserInputSchema = z.object({
  userId: userIdSchema,
});

export type DeleteUserRequest = z.infer<typeof deleteUserInputSchema>;

export interface DeleteUserResponse {
  deletedUserId: string;
  deletedAt: Date;
}

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  execute(
    request: DeleteUserRequest,
  ): ResultAsync<DeleteUserResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(this.logger, 'ユーザー削除失敗', 'USER_DELETE_FAILED'),
    );
  }

  private async _execute(
    request: DeleteUserRequest,
  ): Promise<DeleteUserResponse> {
    this.logger.info('ユーザー削除開始', { userId: request.userId });

    // 認証チェック
    const authResult = await this.getCurrentUserUseCase.requireAuthentication();
    if (authResult.isErr()) {
      this.logger.warn('ユーザー削除失敗: 未認証', {
        targetUserId: request.userId,
      });
      throw authResult.error;
    }

    validateInput(
      deleteUserInputSchema,
      { userId: request.userId },
      'INVALID_USER_ID',
    );

    const currentUser = authResult.value;

    // 認可チェック（自分自身のアカウントのみ削除可能）
    if (currentUser.id !== request.userId) {
      this.logger.warn('ユーザー削除失敗: 権限不足', {
        currentUserId: currentUser.id,
        targetUserId: request.userId,
      });
      throw new AppUseCaseError('他のユーザーは削除できません', 'FORBIDDEN');
    }

    const userId = new UserId(request.userId);

    // ユーザー存在確認
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      this.logger.warn('ユーザー削除失敗: ユーザーが見つかりません', {
        userId: request.userId,
      });
      throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }

    // ログ出力（削除前の情報記録）
    this.logger.info('ユーザー削除実行前情報', {
      userId: existingUser.id.value,
      email: existingUser.email.value,
      name: existingUser.name,
      createdAt: existingUser.createdAt,
    });

    // ユーザー削除実行
    await this.userRepository.delete(userId);

    const deletedAt = new Date();

    this.logger.info('ユーザー削除完了', {
      userId: existingUser.id.value,
      email: existingUser.email.value,
      deletedAt,
    });

    return {
      deletedUserId: existingUser.id.value,
      deletedAt,
    };
  }
}
