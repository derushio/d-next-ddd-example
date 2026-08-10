'use server';

import { revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { createUserInputSchema } from '@/layers/application/usecases/user/CreateUserUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export interface CreateUserData {
  id: string;
  name: string;
  email: string;
}

/**
 * ユーザー作成 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（createUserSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const createUser = withAuth(
  'createUser',
  createUserInputSchema,
  async (input, _userId): Promise<ActionResult<CreateUserData>> => {
    const logger = resolve('Logger');
    const createUserUseCase = resolve('CreateUserUseCase');

    const result = await createUserUseCase.execute(input);

    const actionResult = resultToActionResult(result, logger, 'createUser', {
      mapData: (v) => ({ id: v.id, name: v.name, email: v.email }),
      successMeta: (v) => ({ userId: v.id, email: v.email }),
    });
    if (actionResult.success) {
      revalidateTag('users', 'default');
    }
    return actionResult;
  },
);
