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
import { UserId } from '@/layers/domain/value-objects/UserId';

import { inject, injectable } from 'tsyringe';

export interface GetUserByIdRequest {
  userId: string;
}

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

  async execute(
    request: GetUserByIdRequest,
  ): Promise<Result<GetUserByIdResponse>> {
    this.logger.info('ユーザー個別取得開始', { userId: request.userId });

    try {
      // 認証チェック
      const authResult =
        await this.getCurrentUserUseCase.requireAuthentication();
      if (isFailure(authResult)) {
        this.logger.warn('ユーザー個別取得失敗: 未認証', {
          targetUserId: request.userId,
        });
        return authResult;
      }

      const currentUser = authResult.data;

      // 認可チェック（自分自身の情報のみ取得可能）
      if (currentUser.id !== request.userId) {
        this.logger.warn('ユーザー個別取得失敗: 権限不足', {
          currentUserId: currentUser.id,
          targetUserId: request.userId,
        });
        return failure('他のユーザーの情報は取得できません', 'FORBIDDEN');
      }

      // ユーザーID検証
      if (!request.userId || request.userId.trim() === '') {
        return failure('ユーザーIDが指定されていません', 'INVALID_USER_ID');
      }

      const userId = new UserId(request.userId);

      // ユーザー取得
      const user = await this.userRepository.findById(userId);

      if (!user) {
        this.logger.warn('ユーザー個別取得失敗: ユーザーが見つかりません', {
          userId: request.userId,
        });
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      // レスポンス変換
      const response: GetUserByIdResponse = {
        id: user.id.value,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      this.logger.info('ユーザー個別取得完了', {
        userId: response.id,
        email: response.email,
        name: response.name,
      });

      return success(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ユーザー個別取得失敗', {
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
        return failure(error.message, 'USER_FETCH_FAILED');
      }

      return failure('ユーザーの取得に失敗しました', 'USER_FETCH_FAILED');
    }
  }
}
