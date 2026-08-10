import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { toUserResponseDTO } from '@/layers/application/mappers/UserMapper';
import {
  nameSchema,
  userIdSchema,
} from '@/layers/application/schemas/commonFieldSchemas';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

export const updateUserInputSchema = z.object({
  userId: userIdSchema,
  email: z.email('有効なメールアドレスを入力してください').optional(),
  name: nameSchema.optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserInputSchema>;

export interface UpdateUserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
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

  execute(
    request: UpdateUserRequest,
  ): ResultAsync<UpdateUserResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(
        this.logger,
        'ユーザー更新中に予期しないエラーが発生',
        'UNEXPECTED_ERROR',
      ),
    );
  }

  private async _execute(
    request: UpdateUserRequest,
  ): Promise<UpdateUserResponse> {
    this.logger.info('ユーザー更新開始', {
      userId: request.userId,
      updateFields: {
        email: !!request.email,
        name: !!request.name,
      },
    });

    validateInput(updateUserInputSchema, request);

    // 認証チェック
    const authResult = await this.getCurrentUserUseCase.requireAuthentication();
    if (authResult.isErr()) {
      this.logger.warn('ユーザー更新失敗: 未認証', {
        targetUserId: request.userId,
      });
      throw authResult.error;
    }

    const currentUser = authResult.value;

    // 認可チェック（自分自身のアカウントのみ更新可能）
    if (currentUser.id !== request.userId) {
      this.logger.warn('ユーザー更新失敗: 権限不足', {
        currentUserId: currentUser.id,
        targetUserId: request.userId,
      });
      throw new AppUseCaseError(
        '他のユーザーの情報は更新できません',
        'FORBIDDEN',
      );
    }

    // ユーザーID検証
    const userId = new UserId(request.userId);

    // 既存ユーザー取得
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      this.logger.warn('ユーザー更新失敗: ユーザーが見つかりません', {
        userId: request.userId,
      });
      throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }

    // 更新データ準備
    const newEmail = request.email
      ? new Email(request.email)
      : existingUser.email;
    const newName = request.name ?? existingUser.name;

    // ドメインサービスでの重複チェック（メールアドレスが変更される場合）
    if (request.email && request.email !== existingUser.email.value) {
      const isDuplicate =
        await this.userDomainService.isEmailDuplicate(newEmail);
      if (isDuplicate) {
        this.logger.warn('ユーザー更新失敗: メールアドレス重複', {
          userId: request.userId,
          email: request.email,
        });
        throw new AppUseCaseError(
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

    return toUserResponseDTO(updatedUser);
  }
}
