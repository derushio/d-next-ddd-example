import { failure, Result, success } from '@/layers/application/types/Result';
import type { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

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
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(
    request: GetUserByIdRequest,
  ): Promise<Result<GetUserByIdResponse>> {
    this.logger.info('ユーザー個別取得開始', { userId: request.userId });

    try {
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
        id: user.getId().toString(),
        name: user.getName(),
        email: user.getEmail().toString(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
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
