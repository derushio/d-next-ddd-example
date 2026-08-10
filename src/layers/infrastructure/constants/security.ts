import { PASSWORD_POLICY } from '@/layers/domain/constants/passwordPolicy';

/**
 * セキュリティ関連の定数定義
 *
 * このファイルには認証・セキュリティに関する定数を集約します。
 * セキュリティベストプラクティスに基づいた値を使用しています。
 */

/**
 * タイミング攻撃対策用ダミーハッシュ
 *
 * ユーザーが存在しない場合でもargon2id検証を実行し、
 * レスポンス時間を均一化するために使用します。
 *
 * 背景:
 * - ユーザー存在時: DB検索 + argon2id検証（〜100ms）
 * - ユーザー不在時: DB検索のみ（〜5ms）
 * この時間差から攻撃者がメールアドレスの存在有無を推測できる
 * （タイミング攻撃 / ユーザー列挙攻撃）
 *
 * 対策:
 * ユーザーが存在しない場合でもこのダミーハッシュに対して
 * argon2id検証を実行することで、レスポンス時間を均一化
 *
 * NOTE: このハッシュは実際の照合には使用されない無効なハッシュです
 * "dummy_password_for_timing_safe" をargon2idでハッシュ化したもの
 */
export const TIMING_SAFE_DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$dummysaltfortimingsafecheck00000$dummyhashfortimingsafecheckhashval';

/**
 * セキュリティ関連のデフォルト設定値
 *
 * これらの値は環境変数で上書き可能です。
 * 本番環境では適切な値に調整してください。
 */
export const SECURITY_DEFAULTS = {
  /** Rate Limiting: 認証試行回数上限（デフォルト: 5回） */
  AUTH_RATE_LIMIT_MAX: 5,

  /** Rate Limiting: ウィンドウサイズ（デフォルト: 1分） */
  AUTH_RATE_LIMIT_WINDOW_MS: 60 * 1000,

  /** アカウントロックアウト: 閾値（デフォルト: 5回失敗） */
  AUTH_LOCKOUT_THRESHOLD: 5,

  /** アカウントロックアウト: ロック期間（デフォルト: 15分） */
  AUTH_LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  /** セッション有効期限（デフォルト: 30日） */
  SESSION_MAX_AGE_SECONDS: 30 * 24 * 60 * 60,

  /** JWT有効期限（デフォルト: 30日） */
  JWT_MAX_AGE_SECONDS: 30 * 24 * 60 * 60,

  /** パスワード最小長 */
  PASSWORD_MIN_LENGTH: PASSWORD_POLICY.MIN_LENGTH,

  /** パスワード最大長 */
  PASSWORD_MAX_LENGTH: PASSWORD_POLICY.MAX_LENGTH,
} as const satisfies Record<string, number>;
