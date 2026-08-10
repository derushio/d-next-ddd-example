'use server';

import type { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { getUserByIdInputSchema } from '@/layers/application/usecases/user/GetUserByIdUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export type GetUserByIdParams = z.infer<typeof getUserByIdInputSchema>;

export interface GetUserByIdData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザー個別取得 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（getUserByIdSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const getUserById = withAuth(
  'getUserById',
  getUserByIdInputSchema,
  async (input, _userId): Promise<ActionResult<GetUserByIdData>> => {
    const logger = resolve('Logger');
    const getUserByIdUseCase = resolve('GetUserByIdUseCase');

    const result = await getUserByIdUseCase.execute({ userId: input.userId });

    return resultToActionResult(result, logger, 'getUserById', {
      successMeta: (v) => ({ userId: v.id, email: v.email, name: v.name }),
      failureMeta: { userId: input.userId },
    });
  },
);
