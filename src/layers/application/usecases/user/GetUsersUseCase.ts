import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import type { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type {
  IUserRepository,
  UserSearchCriteria,
} from '@/layers/domain/repositories/IUserRepository';

import { inject, injectable } from 'tsyringe';

export interface GetUsersRequest {
  searchQuery?: string;
  minLevel?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'level';
  sortOrder?: 'asc' | 'desc';
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetUsersResponse {
  users: UserSummary[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(
    request: GetUsersRequest = {},
  ): Promise<Result<GetUsersResponse>> {
    this.logger.info('ユーザー一覧取得開始', { request });

    try {
      // デフォルト値設定
      const page = request.page ?? 1;
      const limit = request.limit ?? 10;
      const sortBy = request.sortBy ?? 'createdAt';
      const sortOrder = request.sortOrder ?? 'desc';

      // バリデーション
      if (page < 1) {
        return failure('ページ番号は1以上である必要があります', 'INVALID_PAGE');
      }

      if (limit < 1 || limit > 100) {
        return failure(
          '取得件数は1から100の間で指定してください',
          'INVALID_LIMIT',
        );
      }

      // 検索条件構築
      const criteria: UserSearchCriteria = {
        searchQuery: request.searchQuery,
        minLevel: request.minLevel,
        isActive: request.isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      // データ取得
      const [users, totalCount] = await Promise.all([
        this.userRepository.findByCriteria(criteria),
        this.userRepository.count(request.searchQuery),
      ]);

      // レスポンス変換
      const userSummaries: UserSummary[] = users.map((user: User) => ({
        id: user.id.value,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // ページネーション計算
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const response: GetUsersResponse = {
        users: userSummaries,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };

      this.logger.info('ユーザー一覧取得完了', {
        userCount: users.length,
        totalCount,
        currentPage: page,
        totalPages,
      });

      return success(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ユーザー一覧取得失敗', {
        request,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // DomainErrorの場合は適切なエラーコードで返す
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // その他の予期しないエラー
      if (error instanceof Error) {
        return failure(error.message, 'USERS_FETCH_FAILED');
      }

      return failure('ユーザー一覧の取得に失敗しました', 'USERS_FETCH_FAILED');
    }
  }
}
