import { z } from 'zod';
import { PASSWORD_POLICY } from '@/layers/domain/constants/passwordPolicy';

/**
 * Application層パスワードバリデーション定数
 *
 * NIST 800-63B準拠の値は Domain 層の PASSWORD_POLICY で一元管理。
 * 後方互換性のため再エクスポートする。
 */
export const APP_PASSWORD_MIN_LENGTH = PASSWORD_POLICY.MIN_LENGTH;
export const APP_PASSWORD_MAX_LENGTH = PASSWORD_POLICY.MAX_LENGTH;

/**
 * Application層パスワードスキーマ
 *
 * UseCase内のハードコードバリデーション（password.length < 8 等）の代替。
 * 呼び出し側は safeParse() で使用する:
 *
 * ```ts
 * const result = newPasswordSchema.safeParse(newPassword);
 * if (!result.success) {
 *   return err({ message: result.error.issues[0].message, code: 'INVALID_PASSWORD' });
 * }
 * ```
 */
export const newPasswordSchema = z
  .string()
  .min(
    APP_PASSWORD_MIN_LENGTH,
    `新しいパスワードは${APP_PASSWORD_MIN_LENGTH}文字以上で入力してください`,
  )
  .max(
    APP_PASSWORD_MAX_LENGTH,
    `パスワードは${APP_PASSWORD_MAX_LENGTH}文字以内で入力してください`,
  );
