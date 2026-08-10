'use server';

import type { z } from 'zod';
import { resolve } from '@/di/resolver';
import { resetPasswordInputSchema } from '@/layers/application/usecases/auth/ResetPasswordUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { toErrorMeta } from '@/utils/toErrorMeta';

export interface ResetPasswordData {
  message: string;
}

/**
 * パスワードリセット Server Action
 *
 * 注意: パスワードリセットは未認証ユーザーが呼ぶため
 * withAuth() は使用せず、手動で処理を実装します。
 *
 * @param input - メールアドレス入力
 */
export async function resetPassword(
  input: z.infer<typeof resetPasswordInputSchema>,
): Promise<ActionResult<ResetPasswordData>> {
  const logger = resolve('Logger');
  try {
    logger.info('resetPassword started');

    // バリデーション
    const validated = resetPasswordInputSchema.safeParse(input);
    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      logger.warn('resetPassword: バリデーションエラー', { fieldErrors });
      return {
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors,
      };
    }

    const { email } = validated.data;

    // ResetPasswordUseCaseでビジネスロジック実行
    const resetPasswordUseCase = resolve('ResetPasswordUseCase');

    const result = await resetPasswordUseCase.execute({ email });

    return resultToActionResult(result, logger, 'パスワードリセット', {
      mapData: (value) => ({ message: value.message }),
      successMeta: () => ({ email }),
    });
  } catch (error) {
    const meta = toErrorMeta(error);
    logger.error('resetPassword failed', meta);
    return { success: false, error: meta.error, code: 'SYSTEM_ERROR' };
  }
}
