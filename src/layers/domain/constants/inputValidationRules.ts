/**
 * 入力バリデーション共通ルール定数
 *
 * 複数のドメインオブジェクトで共有される入力バリデーションルールを一元管理する。
 * Single Source of Truth として機能し、バリデーションルールの不整合を防ぐ。
 */
export const INPUT_VALIDATION_RULES = {
  /**
   * XSS/インジェクション対策として禁止する文字
   * 対象: <, >, \, ", ', &
   */
  FORBIDDEN_CHARS_REGEX: /[<>\\"'&]/,
} as const;
