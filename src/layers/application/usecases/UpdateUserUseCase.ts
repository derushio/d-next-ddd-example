import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

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
        : existingUser.getEmail();
      const newName =
        request.name !== undefined ? request.name : existingUser.getName();

      // ドメインサービスでの重複チェック（メールアドレスが変更される場合）
      if (
        request.email &&
        request.email !== existingUser.getEmail().toString()
      ) {
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
      existingUser.updateProfile(newEmail, newName);

      // 永続化
      await this.userRepository.update(existingUser);

      this.logger.info('ユーザー更新完了', {
        userId: existingUser.getId().toString(),
        email: existingUser.getEmail().toString(),
      });

      return success({
        id: existingUser.getId().toString(),
        email: existingUser.getEmail().toString(),
        name: existingUser.getName(),
        updatedAt: existingUser.getUpdatedAt(),
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
