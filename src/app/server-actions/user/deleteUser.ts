'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// バリデーションスキーマ
const deleteUserSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDが必要です'),
});

export type DeleteUserParams = z.infer<typeof deleteUserSchema>;

/**
 * ユーザー削除 Server Action
 *
 * UseCase パターン対応:
 * - resolve()でDeleteUserUseCaseを取得してユーザー削除処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param params - 削除パラメータ（ユーザーID）
 */
export async function deleteUser(params: DeleteUserParams) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('ユーザー削除処理開始', {
      action: 'deleteUser',
      userId: params.userId,
      timestamp: new Date().toISOString(),
    });

    // パラメータの検証
    const validatedParams = deleteUserSchema.safeParse(params);

    if (!validatedParams.success) {
      logger.warn('ユーザー削除: バリデーションエラー', {
        errors: validatedParams.error.flatten().fieldErrors,
      });
      return {
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        errors: validatedParams.error.flatten().fieldErrors,
      };
    }

    const { userId } = validatedParams.data;

    // resolve()でDeleteUserUseCaseを取得してユーザー削除
    const deleteUserUseCase = resolve('DeleteUserUseCase');

    const result = await deleteUserUseCase.execute({
      userId,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー削除成功', {
        deletedUserId: result.data.deletedUserId,
        deletedAt: result.data.deletedAt,
      });

      // キャッシュの再検証
      revalidatePath('/users');
      revalidatePath(`/users/${userId}`);
      revalidatePath(`/users/${userId}/edit`);

      return {
        success: true,
        deletedUser: {
          deletedUserId: result.data.deletedUserId,
          deletedAt: result.data.deletedAt,
        },
      };
    } else {
      logger.warn('ユーザー削除失敗', {
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

    logger.error('ユーザー削除処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
