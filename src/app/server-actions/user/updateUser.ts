'use server';

import { revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { updateUserInputSchema } from '@/layers/application/usecases/user/UpdateUserUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export type UpdateUserParams = z.infer<typeof updateUserInputSchema>;

export interface UpdateUserData {
  id: string;
  name: string;
  email: string;
  updatedAt: Date;
}

/**
 * ユーザー更新 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（updateUserSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const updateUser = withAuth(
  'updateUser',
  updateUserInputSchema,
  async (input, _userId): Promise<ActionResult<UpdateUserData>> => {
    const logger = resolve('Logger');
    const updateUserUseCase = resolve('UpdateUserUseCase');

    const result = await updateUserUseCase.execute(input);

    const actionResult = resultToActionResult(result, logger, 'updateUser', {
      mapData: (v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        updatedAt: v.updatedAt,
      }),
      successMeta: (v) => ({ userId: v.id, email: v.email, name: v.name }),
    });
    if (actionResult.success) {
      revalidateTag('users', 'default');
      revalidateTag(`user-${input.userId}`, 'default');
    }
    return actionResult;
  },
);
