'use server';

import type { z } from 'zod';
import { resolve } from '@/di/resolver';
import { refreshTokenInputSchema } from '@/layers/application/usecases/auth/RefreshTokenUseCase';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';
import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { toErrorMeta } from '@/utils/toErrorMeta';

export interface RefreshTokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * トークンリフレッシュ Server Action
 *
 * 注意: トークンリフレッシュは pre-auth（認証セッションなしで呼ばれる）ため
 * withAuth() は使用せず、手動で処理を実装します。
 *
 * @param input - リフレッシュトークン入力
 */
export async function refreshToken(
  input: z.infer<typeof refreshTokenInputSchema>,
): Promise<ActionResult<RefreshTokenData>> {
  const logger = resolve('Logger');
  try {
    logger.info('refreshToken started');

    // バリデーション
    const validated = refreshTokenInputSchema.safeParse(input);
    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      logger.warn('refreshToken: バリデーションエラー', { fieldErrors });
      return {
        success: false,
        error: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        fieldErrors,
      };
    }

    const { refreshToken: token } = validated.data;

    // RefreshTokenUseCaseでビジネスロジック実行
    const refreshTokenUseCase = resolve('RefreshTokenUseCase');

    const result = await refreshTokenUseCase.execute({
      refreshToken: token,
    });

    return resultToActionResult(result, logger, 'トークンリフレッシュ', {
      mapData: (value) => ({
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        expiresIn: value.expiresIn,
      }),
    });
  } catch (error) {
    const meta = toErrorMeta(error);
    logger.error('refreshToken failed', meta);
    return { success: false, error: meta.error, code: 'SYSTEM_ERROR' };
  }
}

/**
 * プログラマティックなトークンリフレッシュ
 * API呼び出し等で使用
 *
 * @param token - リフレッシュトークン
 */
export async function refreshTokenProgrammatic(token: string) {
  const logger = resolve('Logger');
  try {
    logger.info('プログラマティックトークンリフレッシュ開始');

    const refreshTokenUseCase = resolve('RefreshTokenUseCase');

    const result = await refreshTokenUseCase.execute({ refreshToken: token });

    logger.info('プログラマティックトークンリフレッシュ成功');

    return result;
  } catch (error) {
    logger.error(
      'プログラマティックトークンリフレッシュエラー',
      toErrorMeta(error),
    );

    throw error;
  }
}
