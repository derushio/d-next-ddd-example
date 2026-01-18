import { SECURITY_DEFAULTS } from '@/layers/infrastructure/constants/security';

import { z } from 'zod';

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
 * - パスワード最大長: bcrypt 72バイト制限を考慮（128文字）
 */

/**
 * パスワードの最小文字数
 * セキュリティ要件に基づき8文字以上を要求（NIST 800-63B準拠）
 */
export const PASSWORD_MIN_LENGTH = SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH;

/**
 * パスワードの最大文字数
 * bcryptは入力を72バイトで切り詰めるため、それを超える長さを許容しても
 * セキュリティ上の効果は限定的。128文字で制限。
 */
export const PASSWORD_MAX_LENGTH = SECURITY_DEFAULTS.PASSWORD_MAX_LENGTH;

/**
 * 基本パスワードスキーマ（再利用可能）
 * 最小長と最大長のバリデーションを適用
 */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください`,
  );

/**
 * サインイン用バリデーションスキーマ
 *
 * - email: 有効なメールアドレス形式
 * - password: 8文字以上、128文字以内
 */
export const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
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
  email: z.string().email('有効なメールアドレスを入力してください'),
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
