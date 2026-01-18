'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { z } from 'zod';

// バリデーションスキーマ
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'リフレッシュトークンが必要です'),
});

/**
 * トークンリフレッシュ Server Action
 *
 * UseCase パターン対応:
 * - RefreshTokenUseCaseでビジネスロジック実行
 * - JWT実装と連携（将来的にJWT実装時に拡張）
 * - バリデーション統合
 * - ログ出力も統合
 *
 * @param formData - フォームデータ
 */
export async function refreshToken(formData: FormData) {
  try {
    const logger = resolve('Logger');

    logger.info('トークンリフレッシュ処理開始', {
      action: 'refreshToken',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = refreshTokenSchema.safeParse({
      refreshToken: formData.get('refreshToken'),
    });

    if (!validatedFields.success) {
      logger.warn('トークンリフレッシュ: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { refreshToken: token } = validatedFields.data;

    // RefreshTokenUseCaseでビジネスロジック実行
    const refreshTokenUseCase = resolve('RefreshTokenUseCase');

    const result = await refreshTokenUseCase.execute({
      refreshToken: token,
    });

    if (isSuccess(result)) {
      logger.info('トークンリフレッシュ成功');

      return {
        success: true,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresIn: result.data.expiresIn,
      };
    } else {
      logger.warn('トークンリフレッシュ失敗', {
        error: result.error.message,
        code: result.error.code,
      });
      return {
        errors: {
          _form: [result.error.message],
        },
      };
    }
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('トークンリフレッシュエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error:
        error instanceof Error
          ? error.message
          : 'トークンリフレッシュに失敗しました',
    };
  }
}

/**
 * プログラマティックなトークンリフレッシュ
 * API呼び出し等で使用
 *
 * @param refreshToken - リフレッシュトークン
 */
export async function refreshTokenProgrammatic(refreshToken: string) {
  try {
    const logger = resolve('Logger');

    logger.info('プログラマティックトークンリフレッシュ開始');

    const refreshTokenUseCase = resolve('RefreshTokenUseCase');

    const result = await refreshTokenUseCase.execute({ refreshToken });

    logger.info('プログラマティックトークンリフレッシュ成功');

    return result;
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('プログラマティックトークンリフレッシュエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
