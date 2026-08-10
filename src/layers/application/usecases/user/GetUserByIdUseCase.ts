import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { toUserResponseDTO } from '@/layers/application/mappers/UserMapper';
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

export const getUserByIdInputSchema = z.object({
  userId: userIdSchema,
});

export type GetUserByIdRequest = z.infer<typeof getUserByIdInputSchema>;

export interface GetUserByIdResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  execute(
    request: GetUserByIdRequest,
  ): ResultAsync<GetUserByIdResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(this.logger, 'ユーザー個別取得失敗', 'USER_FETCH_FAILED'),
    );
  }

  private async _execute(
    request: GetUserByIdRequest,
  ): Promise<GetUserByIdResponse> {
    this.logger.info('ユーザー個別取得開始', { userId: request.userId });

    // 認証チェック
    const authResult = await this.getCurrentUserUseCase.requireAuthentication();
    if (authResult.isErr()) {
      this.logger.warn('ユーザー個別取得失敗: 未認証', {
        targetUserId: request.userId,
      });
      throw authResult.error;
    }

    validateInput(
      getUserByIdInputSchema,
      { userId: request.userId },
      'INVALID_USER_ID',
    );

    const currentUser = authResult.value;

    // 認可チェック（自分自身の情報のみ取得可能）
    if (currentUser.id !== request.userId) {
      this.logger.warn('ユーザー個別取得失敗: 権限不足', {
        currentUserId: currentUser.id,
        targetUserId: request.userId,
      });
      throw new AppUseCaseError(
        '他のユーザーの情報は取得できません',
        'FORBIDDEN',
      );
    }

    const userId = new UserId(request.userId);

    // ユーザー取得
    const user = await this.userRepository.findById(userId);

    if (!user) {
      this.logger.warn('ユーザー個別取得失敗: ユーザーが見つかりません', {
        userId: request.userId,
      });
      throw new AppUseCaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }

    // レスポンス変換
    const response: GetUserByIdResponse = toUserResponseDTO(user);

    this.logger.info('ユーザー個別取得完了', {
      userId: response.id,
      email: response.email,
      name: response.name,
    });

    return response;
  }
}
