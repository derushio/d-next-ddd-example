/**
 * パスワードポリシー定数
 *
 * NIST 800-63B準拠の値を Domain 層で一元管理する。
 * Application 層・Infrastructure 層はこのファイルを参照すること。
 */
export const PASSWORD_POLICY = {
  /** パスワード最小長（NIST 800-63B準拠: 8文字以上） */
  MIN_LENGTH: 8,

  /** パスワード最大長（NIST 800-63B準拠: 最大64文字以上を推奨、実装上限128文字） */
  MAX_LENGTH: 128,
} as const satisfies { MIN_LENGTH: number; MAX_LENGTH: number };
