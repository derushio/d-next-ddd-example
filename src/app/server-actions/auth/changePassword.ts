'use server';

import { z } from 'zod';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import { changePasswordInputSchema } from '@/layers/application/usecases/auth/ChangePasswordUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

// SA独自: UCスキーマを拡張して confirmPassword フィールドと一致チェックを追加
const changePasswordSchema = changePasswordInputSchema
  .extend({
    confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface ChangePasswordData {
  message: string;
}

/**
 * パスワード変更 Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - バリデーション（changePasswordSchema）
 * - 例外キャッチ・統一エラーレスポンス
 */
export const changePassword = withAuth(
  'changePassword',
  changePasswordSchema,
  async (input, userId): Promise<ActionResult<ChangePasswordData>> => {
    const logger = resolve('Logger');
    const changePasswordUseCase = resolve('ChangePasswordUseCase');

    const result = await changePasswordUseCase.execute({
      userId,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return resultToActionResult(result, logger, 'changePassword', {
      mapData: (v) => ({ message: v.message }),
      successMeta: () => ({ userId }),
    });
  },
);
