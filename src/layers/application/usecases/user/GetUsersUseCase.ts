import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/layers/application/constants/pagination';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { toUserResponseDTO } from '@/layers/application/mappers/UserMapper';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import type { User } from '@/layers/domain/entities/User';
import type {
  IUserRepository,
  UserSearchCriteria,
} from '@/layers/domain/repositories/IUserRepository';

export const getUsersInputSchema = z.object({
  searchQuery: z.string().optional(),
  page: z
    .int()
    .min(1, 'ページ番号は1以上である必要があります')
    .optional()
    .default(DEFAULT_PAGE),
  limit: z
    .int()
    .min(1, '取得件数は1以上である必要があります')
    .max(MAX_PAGE_SIZE, '取得件数は100以下にしてください')
    .optional()
    .default(DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GetUsersRequest = z.input<typeof getUsersInputSchema>;

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GetUsersResponse = {
  users: UserSummary[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  execute(
    request: GetUsersRequest = {},
  ): ResultAsync<GetUsersResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(this.logger, 'ユーザー一覧取得失敗', 'USERS_FETCH_FAILED'),
    );
  }

  private async _execute(request: GetUsersRequest): Promise<GetUsersResponse> {
    this.logger.info('ユーザー一覧取得開始', { request });

    const { searchQuery, page, limit, sortBy, sortOrder } = validateInput(
      getUsersInputSchema,
      request,
    );

    // 検索条件構築
    const criteria: UserSearchCriteria = {
      searchQuery,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    // データ取得（Promise.all で並列実行）
    const [users, totalCount] = await Promise.all([
      this.userRepository.findByCriteria(criteria),
      this.userRepository.count(searchQuery),
    ]);

    // レスポンス変換
    const userSummaries = users.map((user: User) => toUserResponseDTO(user));

    // ページネーション計算
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const response = {
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

    return response;
  }
}
