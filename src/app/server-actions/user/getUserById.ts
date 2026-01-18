'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { z } from 'zod';

// バリデーションスキーマ
const getUserByIdSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDが必要です'),
});

export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>;

/**
 * ユーザー個別取得 Server Action
 *
 * UseCase パターン対応:
 * - resolve()でGetUserByIdUseCaseを取得してユーザー個別取得処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param params - 取得パラメータ（ユーザーID）
 */
export async function getUserById(params: GetUserByIdParams) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('ユーザー個別取得処理開始', {
      action: 'getUserById',
      userId: params.userId,
      timestamp: new Date().toISOString(),
    });

    // パラメータの検証
    const validatedParams = getUserByIdSchema.safeParse(params);

    if (!validatedParams.success) {
      logger.warn('ユーザー個別取得: バリデーションエラー', {
        errors: validatedParams.error.flatten().fieldErrors,
      });
      return {
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        errors: validatedParams.error.flatten().fieldErrors,
      };
    }

    const { userId } = validatedParams.data;

    // resolve()でGetUserByIdUseCaseを取得してユーザー取得
    const getUserByIdUseCase = resolve('GetUserByIdUseCase');

    const result = await getUserByIdUseCase.execute({
      userId,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー個別取得成功', {
        userId: result.data.id,
        email: result.data.email,
        name: result.data.name,
      });

      return {
        success: true,
        user: result.data,
      };
    } else {
      logger.warn('ユーザー個別取得失敗', {
        error: result.error.message,
        code: result.error.code,
        userId,
      });

      return {
        error: result.error.message,
        code: result.error.code,
      };
    }
  } catch (error) {
    // 予期しないエラー（UseCaseで処理されなかった例外）
    const logger = resolve('Logger');

    logger.error('ユーザー個別取得処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
