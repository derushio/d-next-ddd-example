import { cache } from 'react';
import { getUserById } from '@/app/server-actions/user/getUserById';
import { resolve } from '@/di/resolver';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/layers/application/constants/pagination';

/**
 * React.cache() でラップしたクエリ関数。
 * 同一レンダーツリー内で複数回呼ばれても、1回だけ実行される。
 * Server Component 専用。
 */
export const getCachedUserById = cache(async (userId: string) => {
  const useCase = resolve('GetUserByIdUseCase');
  return useCase.execute({ userId });
});

export const getCachedUsers = cache(
  async (params: { page?: number; limit?: number; searchQuery?: string }) => {
    const useCase = resolve('GetUsersUseCase');
    return useCase.execute({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      searchQuery: params.searchQuery,
    });
  },
);

/**
 * 現在のユーザー情報をキャッシュ付きで取得する。
 * Server Component 専用。
 */
export const getCachedCurrentUser = cache(async () => {
  const useCase = resolve('GetCurrentUserUseCase');
  return useCase.execute();
});

/**
 * getUserById Server Action を React.cache() でラップしたクエリ関数。
 * 認証チェック・バリデーション付きで同一レンダーツリー内では1回だけ実行される。
 * Server Component 専用。
 */
export const getCachedUserByIdAction = cache(async (userId: string) => {
  return getUserById({ userId });
});
