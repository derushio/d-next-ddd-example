'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isFailure, isSuccess } from '@/layers/application/types/Result';

import { z } from 'zod';

// バリデーションスキーマ
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

/**
 * パスワード変更 Server Action
 *
 * NextAuth + UseCase パターン対応:
 * - 認証済みユーザーのみ実行可能
 * - ChangePasswordUseCaseでビジネスロジック実行
 * - バリデーション統合
 * - ログ出力も統合
 *
 * @param formData - フォームデータ
 */
export async function changePassword(formData: FormData) {
  try {
    const logger = resolve('Logger');

    logger.info('パスワード変更処理開始', {
      action: 'changePassword',
      timestamp: new Date().toISOString(),
    });

    // 認証チェック（DDD/Clean Architecture パターン）
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const authResult = await getCurrentUserUseCase.requireAuthentication();

    if (isFailure(authResult)) {
      logger.warn('パスワード変更: 認証失敗', {
        error: authResult.error.message,
        code: authResult.error.code,
      });
      return {
        error: authResult.error.message,
        code: authResult.error.code,
      };
    }

    const user = authResult.data;
    logger.info('認証済みユーザーによるパスワード変更', {
      userId: user.id,
    });

    // フォームデータの検証
    const validatedFields = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });

    if (!validatedFields.success) {
      logger.warn('パスワード変更: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
        userId: user.id,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { currentPassword, newPassword } = validatedFields.data;

    // ChangePasswordUseCaseでビジネスロジック実行
    const changePasswordUseCase = resolve('ChangePasswordUseCase');

    const result = await changePasswordUseCase.execute({
      userId: user.id,
      currentPassword,
      newPassword,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('パスワード変更成功', { userId: user.id });

      return {
        success: true,
        message: result.data.message,
      };
    } else {
      logger.warn('パスワード変更失敗', {
        userId: user.id,
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

    logger.error('パスワード変更処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
