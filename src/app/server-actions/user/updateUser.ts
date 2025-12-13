'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// バリデーションスキーマ
const updateUserSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDが必要です'),
  name: z
    .string()
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください')
    .optional(),
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
});

export type UpdateUserParams = z.infer<typeof updateUserSchema>;

/**
 * ユーザー更新 Server Action
 *
 * UseCase パターン対応:
 * - resolve()でUpdateUserUseCaseを取得してユーザー更新処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param params - 更新パラメータ（FormDataまたは直接パラメータ）
 */
export async function updateUser(params: UpdateUserParams | FormData) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('ユーザー更新処理開始', {
      action: 'updateUser',
      timestamp: new Date().toISOString(),
    });

    // FormDataからのパラメータ抽出
    let updateParams: UpdateUserParams;
    if (params instanceof FormData) {
      const userId = params.get('userId') as string;
      const name = params.get('name') as string;
      const email = params.get('email') as string;

      updateParams = {
        userId,
        ...(name && { name }),
        ...(email && { email }),
      };
    } else {
      updateParams = params;
    }

    // パラメータの検証
    const validatedParams = updateUserSchema.safeParse(updateParams);

    if (!validatedParams.success) {
      logger.warn('ユーザー更新: バリデーションエラー', {
        errors: validatedParams.error.flatten().fieldErrors,
      });
      return {
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        errors: validatedParams.error.flatten().fieldErrors,
      };
    }

    const { userId, name, email } = validatedParams.data;

    // resolve()でUpdateUserUseCaseを取得してユーザー更新
    const updateUserUseCase = resolve('UpdateUserUseCase');

    const result = await updateUserUseCase.execute({
      userId,
      name,
      email,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー更新成功', {
        userId: result.data.id,
        email: result.data.email,
        name: result.data.name,
      });

      // キャッシュの再検証
      revalidatePath('/users');
      revalidatePath(`/users/${userId}`);
      revalidatePath(`/users/${userId}/edit`);

      return {
        success: true,
        user: {
          id: result.data.id,
          name: result.data.name,
          email: result.data.email,
          updatedAt: result.data.updatedAt,
        },
      };
    } else {
      logger.warn('ユーザー更新失敗', {
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

    logger.error('ユーザー更新処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
