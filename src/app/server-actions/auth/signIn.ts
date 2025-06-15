'use server';

import 'reflect-metadata';

import { resolve } from '@/layers/infrastructure/di/resolver';
import { z } from 'zod';

// バリデーションスキーマ
const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

/**
 * サインイン Server Action
 *
 * UseCase パターン対応:
 * - resolve()でSignInUseCaseを取得してサインイン処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param formData - フォームデータ
 */
export async function signIn(formData: FormData) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('サインイン処理開始', {
      action: 'signIn',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = signInSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!validatedFields.success) {
      logger.warn('サインイン: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validatedFields.data;

    // resolve()でSignInUseCaseを取得してサインイン処理
    const signInUseCase = resolve('SignInUseCase');

    const result = await signInUseCase.execute({
      email,
      password,
    });

    logger.info('サインイン成功', {
      userId: result.user.id,
      email: result.user.email,
    });

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    // resolve()でLoggerを取得してエラーログ出力
    const logger = resolve('Logger');

    logger.error('サインインエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'サインインに失敗しました',
    };
  }
}
