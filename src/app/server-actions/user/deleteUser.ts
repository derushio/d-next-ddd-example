'use server';

import { revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { deleteUserInputSchema } from '@/layers/application/usecases/user/DeleteUserUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export type DeleteUserParams = z.infer<typeof deleteUserInputSchema>;

export interface DeleteUserData {
  deletedUserId: string;
  deletedAt: Date;
}

/**
 * ユーザー削除 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（deleteUserSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const deleteUser = withAuth(
  'deleteUser',
  deleteUserInputSchema,
  async (input, _userId): Promise<ActionResult<DeleteUserData>> => {
    const logger = resolve('Logger');
    const deleteUserUseCase = resolve('DeleteUserUseCase');

    const result = await deleteUserUseCase.execute({ userId: input.userId });

    const actionResult = resultToActionResult(result, logger, 'deleteUser', {
      mapData: (v) => ({
        deletedUserId: v.deletedUserId,
        deletedAt: v.deletedAt,
      }),
      successMeta: (v) => ({
        deletedUserId: v.deletedUserId,
        deletedAt: v.deletedAt,
      }),
    });
    if (actionResult.success) {
      revalidateTag('users', 'default');
      revalidateTag(`user-${input.userId}`, 'default');
    }
    return actionResult;
  },
);
