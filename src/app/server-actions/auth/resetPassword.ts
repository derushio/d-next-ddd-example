'use server';

import 'reflect-metadata';

import { resolve } from '@/layers/infrastructure/di/resolver';
import { z } from 'zod';

// バリデーションスキーマ
const resetPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

/**
 * パスワードリセット Server Action
 *
 * UseCase パターン対応:
 * - ResetPasswordUseCaseでビジネスロジック実行
 * - バリデーション統合
 * - ログ出力も統合
 *
 * @param formData - フォームデータ
 */
export async function resetPassword(formData: FormData) {
  try {
    const logger = resolve('Logger');

    logger.info('パスワードリセット処理開始', {
      action: 'resetPassword',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = resetPasswordSchema.safeParse({
      email: formData.get('email'),
    });

    if (!validatedFields.success) {
      logger.warn('パスワードリセット: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email } = validatedFields.data;

    // ResetPasswordUseCaseでビジネスロジック実行
    const resetPasswordUseCase = resolve('ResetPasswordUseCase');

    const result = await resetPasswordUseCase.execute({ email });

    logger.info('パスワードリセット成功', { email });

    return {
      success: true,
      message: result.message,
      // 実際の実装ではresetTokenは返さない（メールに含める）
    };
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('パスワードリセットエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error:
        error instanceof Error
          ? error.message
          : 'パスワードリセットに失敗しました',
    };
  }
}
