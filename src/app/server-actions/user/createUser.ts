'use server';

import 'reflect-metadata';

import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { resolve } from '@/layers/infrastructure/di/resolver';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// バリデーションスキーマ
const createUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

/**
 * ユーザー作成 Server Action
 *
 * UseCase パターン対応:
 * - resolve()でCreateUserUseCaseを取得してユーザー作成処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param formData - フォームデータ
 */
export async function createUser(formData: FormData) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('ユーザー作成処理開始', {
      action: 'createUser',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = createUserSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!validatedFields.success) {
      logger.warn('ユーザー作成: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, email, password } = validatedFields.data;

    // resolve()でCreateUserUseCaseを取得してユーザー作成
    const createUserUseCase = resolve('CreateUserUseCase');

    const result = await createUserUseCase.execute({
      name,
      email,
      password,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー作成成功', {
        userId: result.data.id,
        email: result.data.email,
      });

      // キャッシュの再検証
      revalidatePath('/users');

      return {
        success: true,
        user: {
          id: result.data.id,
          name: result.data.name,
          email: result.data.email,
        },
      };
    } else {
      logger.warn('ユーザー作成失敗', {
        error: result.error.message,
        code: result.error.code,
      });

      return {
        error: result.error.message,
        code: result.error.code,
      };
    }
  } catch (error) {
    // 予期しないエラー（UseCaseで処理されなかった例外）
    const logger = resolve('Logger');

    logger.error('ユーザー作成処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
