import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import { SECURITY_DEFAULTS } from '@/layers/infrastructure/constants/security';

/**
 * セキュリティ環境変数のバリデーション定数
 *
 * 不正な値による誤設定を防ぐため、厳密な範囲制限を設定。
 * 例: AUTH_LOCKOUT_THRESHOLD=-1 で全ユーザーロック等を防止
 */
const SECURITY_VALIDATION = {
  /** セッション: 最小5分、最大1年 */
  SESSION_MIN_SECONDS: 300,
  SESSION_MAX_SECONDS: 31536000,
  /** Rate Limit: 最小1回、最大1000回 */
  RATE_LIMIT_MIN: 1,
  RATE_LIMIT_MAX: 1000,
  /** Rate Limitウィンドウ: 最小1秒、最大1時間 */
  RATE_LIMIT_WINDOW_MIN_MS: 1000,
  RATE_LIMIT_WINDOW_MAX_MS: 3600000,
  /** ロックアウト閾値: 最小1回、最大100回 */
  LOCKOUT_THRESHOLD_MIN: 1,
  LOCKOUT_THRESHOLD_MAX: 100,
  /** ロックアウト期間: 最小1分、最大24時間 */
  LOCKOUT_DURATION_MIN_MS: 60000,
  LOCKOUT_DURATION_MAX_MS: 86400000,
  /** パスワード長: 最小1、最大1000 */
  PASSWORD_LENGTH_MIN: 1,
  PASSWORD_LENGTH_MAX: 1000,
} as const;

export const env = createEnv({
  emptyStringAsUndefined: true,
  server: {
    DATABASE_URL: z.string().min(1),

    TOKEN_SECRET: z.string().min(1),
    TOKEN_MAX_AGE_MINUTES: z.pipe(z.coerce.number(), z.number().positive()),
    TOKEN_UPDATE_AGE_MINUTES: z.pipe(z.coerce.number(), z.number().positive()),

    // === 認証セキュリティ設定（有効範囲バリデーション付き） ===

    /** セッション有効期限（秒）- デフォルト: 30日、範囲: 5分〜1年 */
    SESSION_MAX_AGE_SECONDS: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.SESSION_MIN_SECONDS)
          .max(SECURITY_VALIDATION.SESSION_MAX_SECONDS),
      )
      .default(SECURITY_DEFAULTS.SESSION_MAX_AGE_SECONDS),
    /** JWT有効期限（秒）- デフォルト: 30日、範囲: 5分〜1年 */
    JWT_MAX_AGE_SECONDS: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.SESSION_MIN_SECONDS)
          .max(SECURITY_VALIDATION.SESSION_MAX_SECONDS),
      )
      .default(SECURITY_DEFAULTS.JWT_MAX_AGE_SECONDS),

    /** Rate Limiting: 有効/無効 */
    AUTH_RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
    /** Rate Limiting: 認証試行回数上限（範囲: 1〜1000） */
    AUTH_RATE_LIMIT_MAX: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.RATE_LIMIT_MIN)
          .max(SECURITY_VALIDATION.RATE_LIMIT_MAX),
      )
      .default(SECURITY_DEFAULTS.AUTH_RATE_LIMIT_MAX),
    /** Rate Limiting: ウィンドウサイズ（ミリ秒）（範囲: 1秒〜1時間） */
    AUTH_RATE_LIMIT_WINDOW_MS: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.RATE_LIMIT_WINDOW_MIN_MS)
          .max(SECURITY_VALIDATION.RATE_LIMIT_WINDOW_MAX_MS),
      )
      .default(SECURITY_DEFAULTS.AUTH_RATE_LIMIT_WINDOW_MS),

    /** アカウントロックアウト: 有効/無効 */
    AUTH_LOCKOUT_ENABLED: z.coerce.boolean().default(true),
    /** アカウントロックアウト: 閾値（失敗回数）（範囲: 1〜100） */
    AUTH_LOCKOUT_THRESHOLD: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.LOCKOUT_THRESHOLD_MIN)
          .max(SECURITY_VALIDATION.LOCKOUT_THRESHOLD_MAX),
      )
      .default(SECURITY_DEFAULTS.AUTH_LOCKOUT_THRESHOLD),
    /** アカウントロックアウト: ロック期間（ミリ秒）（範囲: 1分〜24時間） */
    AUTH_LOCKOUT_DURATION_MS: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.LOCKOUT_DURATION_MIN_MS)
          .max(SECURITY_VALIDATION.LOCKOUT_DURATION_MAX_MS),
      )
      .default(SECURITY_DEFAULTS.AUTH_LOCKOUT_DURATION_MS),

    /** パスワード: 最小長（範囲: 1〜1000） */
    PASSWORD_MIN_LENGTH: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.PASSWORD_LENGTH_MIN)
          .max(SECURITY_VALIDATION.PASSWORD_LENGTH_MAX),
      )
      .default(SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH),
    /** パスワード: 最大長（範囲: 1〜1000） */
    PASSWORD_MAX_LENGTH: z
      .pipe(
        z.coerce.number(),
        z
          .number()
          .min(SECURITY_VALIDATION.PASSWORD_LENGTH_MIN)
          .max(SECURITY_VALIDATION.PASSWORD_LENGTH_MAX),
      )
      .default(SECURITY_DEFAULTS.PASSWORD_MAX_LENGTH),
    /** パスワード: ユーザー情報との照合チェック */
    PASSWORD_CHECK_USER_INFO: z.coerce.boolean().default(true),

    /** ログ: ログレベル（debug/info/warn/error） */
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /** ログ: PIIマスキング有効化 */
    LOG_MASK_PII: z.coerce.boolean().default(true),

    // Auth.js v5
    AUTH_SECRET: z.string().min(1),
    AUTH_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
    NEXT_PUBLIC_APP_NAME: z.string().default('D-Next Resources'),
  },
  runtimeEnv: {
    // server
    DATABASE_URL: process.env.DATABASE_URL,
    TOKEN_SECRET: process.env.TOKEN_SECRET,
    TOKEN_MAX_AGE_MINUTES: process.env.TOKEN_MAX_AGE_MINUTES,
    TOKEN_UPDATE_AGE_MINUTES: process.env.TOKEN_UPDATE_AGE_MINUTES,
    SESSION_MAX_AGE_SECONDS: process.env.SESSION_MAX_AGE_SECONDS,
    JWT_MAX_AGE_SECONDS: process.env.JWT_MAX_AGE_SECONDS,
    AUTH_RATE_LIMIT_ENABLED: process.env.AUTH_RATE_LIMIT_ENABLED,
    AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_LOCKOUT_ENABLED: process.env.AUTH_LOCKOUT_ENABLED,
    AUTH_LOCKOUT_THRESHOLD: process.env.AUTH_LOCKOUT_THRESHOLD,
    AUTH_LOCKOUT_DURATION_MS: process.env.AUTH_LOCKOUT_DURATION_MS,
    PASSWORD_MIN_LENGTH: process.env.PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH: process.env.PASSWORD_MAX_LENGTH,
    PASSWORD_CHECK_USER_INFO: process.env.PASSWORD_CHECK_USER_INFO,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_MASK_PII: process.env.LOG_MASK_PII,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    // client
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  // テスト・CI環境ではバリデーションをスキップ
  skipValidation: process.env.NODE_ENV === 'test' || !!process.env.CI,
});
