import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  isFailure,
  Result,
  success,
} from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserId } from '@/layers/domain/value-objects/UserId';

import { inject, injectable } from 'tsyringe';

export interface DeleteUserRequest {
  userId: string;
}

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

  async execute(
    request: DeleteUserRequest,
  ): Promise<Result<DeleteUserResponse>> {
    this.logger.info('ユーザー削除開始', { userId: request.userId });

    try {
      // 認証チェック
      const authResult =
        await this.getCurrentUserUseCase.requireAuthentication();
      if (isFailure(authResult)) {
        this.logger.warn('ユーザー削除失敗: 未認証', {
          targetUserId: request.userId,
        });
        return authResult;
      }

      const currentUser = authResult.data;

      // 認可チェック（自分自身のアカウントのみ削除可能）
      if (currentUser.id !== request.userId) {
        this.logger.warn('ユーザー削除失敗: 権限不足', {
          currentUserId: currentUser.id,
          targetUserId: request.userId,
        });
        return failure('他のユーザーは削除できません', 'FORBIDDEN');
      }

      // ユーザーID検証
      if (!request.userId || request.userId.trim() === '') {
        return failure('ユーザーIDが指定されていません', 'INVALID_USER_ID');
      }

      const userId = new UserId(request.userId);

      // ユーザー存在確認
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        this.logger.warn('ユーザー削除失敗: ユーザーが見つかりません', {
          userId: request.userId,
        });
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
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

      return success({
        deletedUserId: existingUser.id.value,
        deletedAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ユーザー削除失敗', {
        userId: request.userId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // DomainErrorの場合は適切なエラーコードで返す
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // その他の予期しないエラー
      if (error instanceof Error) {
        return failure(error.message, 'USER_DELETE_FAILED');
      }

      return failure('ユーザーの削除に失敗しました', 'USER_DELETE_FAILED');
    }
  }
}
