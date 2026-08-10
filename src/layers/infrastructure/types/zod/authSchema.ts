import { z } from 'zod';
import {
  newPasswordSchema,
  APP_PASSWORD_MAX_LENGTH as PASSWORD_MAX_LENGTH,
  APP_PASSWORD_MIN_LENGTH as PASSWORD_MIN_LENGTH,
} from '@/layers/application/utils/passwordValidation';
import { EMAIL_VALIDATION_RULES } from '@/layers/domain/value-objects/Email';

/**
 * 認証関連の共通バリデーションスキーマ
 *
 * DRY原則:
 * - NextAuth.js と Server Actions で同一のバリデーションルールを共有
 * - バリデーションルールの一元管理により、不整合を防止
 *
 * 使用箇所:
 * - src/layers/infrastructure/persistence/nextAuth.ts
 * - src/app/server-actions/auth/signIn.ts
 * - src/components/features/auth/SignInFormClient.tsx（クライアント側参照用）
 *
 * セキュリティ考慮:
 * - パスワード最小長: NIST 800-63B準拠（8文字以上）
 * - パスワード最大長: 128文字
 */

/**
 * パスワードの最小文字数（後方互換のために再エクスポート）
 */
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH };

/**
 * 基本パスワードスキーマ（Application層の newPasswordSchema から参照）
 * Infrastructure → Application の依存は Clean Architecture 上許可されている
 */
export const passwordSchema = newPasswordSchema;

/**
 * 共通メールアドレスバリデーションスキーマ
 *
 * Email VO（src/layers/domain/value-objects/Email.ts）の EMAIL_VALIDATION_RULES を参照:
 * - FORMAT_REGEX による形式チェック（Email VO と同一の正規表現）
 * - double-dot チェック（Email VO の validateEmail と同一ルール）
 * - 254文字以内（EMAIL_VALIDATION_RULES.MAX_LENGTH）
 * - 禁止文字（EMAIL_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX）不可
 *
 * Email VO が Single Source of Truth であり、ルール変更は Email.ts のみで対応する。
 */
export const emailSchema = z
  .string()
  .regex(
    EMAIL_VALIDATION_RULES.FORMAT_REGEX,
    'メールアドレスの形式が正しくありません',
  )
  .max(
    EMAIL_VALIDATION_RULES.MAX_LENGTH,
    `メールアドレスは${EMAIL_VALIDATION_RULES.MAX_LENGTH}文字以内である必要があります`,
  )
  .check((ctx) => {
    if (ctx.value.includes('..')) {
      ctx.issues.push({
        code: 'custom',
        message: 'メールアドレスの形式が正しくありません',
        input: ctx.value,
      });
    }
    if (EMAIL_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX.test(ctx.value)) {
      ctx.issues.push({
        code: 'custom',
        message: 'メールアドレスに使用できない文字が含まれています',
        input: ctx.value,
      });
    }
  });

/**
 * emailSchema の型定義
 */
export type EmailInput = z.infer<typeof emailSchema>;

/**
 * サインイン用バリデーションスキーマ
 *
 * - email: 有効なメールアドレス形式
 * - password: 8文字以上、128文字以内
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * signInSchema の型定義
 */
export type SignInInput = z.infer<typeof signInSchema>;

/**
 * ユーザー登録用バリデーションスキーマ
 *
 * - name: 1文字以上（空白のみは不可）
 * - email: 有効なメールアドレス形式
 * - password: 8文字以上、128文字以内
 */
export const signUpSchema = z.object({
  name: z.string().min(1, '名前を入力してください').trim(),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * signUpSchema の型定義
 */
export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * パスワード変更用バリデーションスキーマ
 *
 * - currentPassword: 現在のパスワード（8文字以上、128文字以内）
 * - newPassword: 新しいパスワード（8文字以上、128文字以内）
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

/**
 * changePasswordSchema の型定義
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
