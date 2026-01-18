import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  isFailure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

import { inject, injectable } from 'tsyringe';

export interface UpdateUserRequest {
  userId: string;
  email?: string;
  name?: string;
}

export interface UpdateUserResponse {
  id: string;
  email: string;
  name: string;
  updatedAt: Date;
}

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private readonly userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  async execute(
    request: UpdateUserRequest,
  ): Promise<Result<UpdateUserResponse>> {
    this.logger.info('ユーザー更新開始', {
      userId: request.userId,
      updateFields: {
        email: !!request.email,
        name: !!request.name,
      },
    });

    try {
      // 認証チェック
      const authResult =
        await this.getCurrentUserUseCase.requireAuthentication();
      if (isFailure(authResult)) {
        this.logger.warn('ユーザー更新失敗: 未認証', {
          targetUserId: request.userId,
        });
        return authResult;
      }

      const currentUser = authResult.data;

      // 認可チェック（自分自身のアカウントのみ更新可能）
      if (currentUser.id !== request.userId) {
        this.logger.warn('ユーザー更新失敗: 権限不足', {
          currentUserId: currentUser.id,
          targetUserId: request.userId,
        });
        return failure('他のユーザーの情報は更新できません', 'FORBIDDEN');
      }

      // ユーザーID検証
      const userId = new UserId(request.userId);

      // 既存ユーザー取得
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        this.logger.warn('ユーザー更新失敗: ユーザーが見つかりません', {
          userId: request.userId,
        });
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      // 更新データ準備
      const newEmail = request.email
        ? new Email(request.email)
        : existingUser.email;
      const newName =
        request.name !== undefined ? request.name : existingUser.name;

      // ドメインサービスでの重複チェック（メールアドレスが変更される場合）
      if (request.email && request.email !== existingUser.email.value) {
        const isDuplicate =
          await this.userDomainService.isEmailDuplicate(newEmail);
        if (isDuplicate) {
          this.logger.warn('ユーザー更新失敗: メールアドレス重複', {
            userId: request.userId,
            email: request.email,
          });
          return failure(
            'このメールアドレスは既に使用されています',
            'EMAIL_DUPLICATE',
          );
        }
      }

      // プロフィール更新（ドメインロジック）
      const updatedUser = existingUser.updateProfile(newEmail, newName);

      // 永続化
      await this.userRepository.update(updatedUser);

      this.logger.info('ユーザー更新完了', {
        userId: updatedUser.id.value,
        email: updatedUser.email.value,
      });

      return success({
        id: updatedUser.id.value,
        email: updatedUser.email.value,
        name: updatedUser.name,
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      this.logger.error('ユーザー更新中に予期しないエラーが発生', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // 予期しないエラー
      return failure('ユーザー更新に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
