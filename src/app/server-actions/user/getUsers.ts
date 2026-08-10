'use server';

import type { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { getUsersInputSchema } from '@/layers/application/usecases/user/GetUsersUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export type GetUsersParams = z.infer<typeof getUsersInputSchema>;

export interface GetUsersData {
  users: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * ユーザー一覧取得 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（getUsersSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const getUsers = withAuth(
  'getUsers',
  getUsersInputSchema,
  async (input, _userId): Promise<ActionResult<GetUsersData>> => {
    const logger = resolve('Logger');
    const getUsersUseCase = resolve('GetUsersUseCase');

    const result = await getUsersUseCase.execute(input);

    return resultToActionResult(result, logger, 'getUsers', {
      successMeta: (v) => ({
        userCount: v.users.length,
        totalCount: v.totalCount,
        currentPage: v.currentPage,
        totalPages: v.totalPages,
      }),
    });
  },
);
