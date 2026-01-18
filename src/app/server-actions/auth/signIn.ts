'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';
// 共通バリデーションスキーマ（DRY原則）
import { signInSchema } from '@/layers/infrastructure/types/zod/authSchema';
import { getClientIp } from '@/utils/getClientIp';

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

    // クライアントIPアドレスを取得（Rate Limiting用）
    const ipAddress = await getClientIp();

    // resolve()でSignInUseCaseを取得してサインイン処理
    const signInUseCase = resolve('SignInUseCase');

    const result = await signInUseCase.execute({
      email,
      password,
      ipAddress,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('サインイン成功', {
        userId: result.data.user.id,
        email: result.data.user.email,
      });

      return {
        success: true,
        user: result.data.user,
      };
    } else {
      logger.warn('サインイン失敗', {
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

    logger.error('サインイン処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
