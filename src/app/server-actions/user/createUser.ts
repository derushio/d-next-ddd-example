'use server';

import 'reflect-metadata';

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

    const user = await createUserUseCase.execute({
      name,
      email,
      password,
    });

    logger.info('ユーザー作成成功', {
      userId: user.id,
      email: user.email,
    });

    // キャッシュの再検証
    revalidatePath('/users');

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    // resolve()でLoggerを取得してエラーログ出力
    const logger = resolve('Logger');

    logger.error('ユーザー作成エラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'ユーザーの作成に失敗しました',
    };
  }
}
