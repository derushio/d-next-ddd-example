/**
 * ログマスキングユーティリティ
 *
 * 本番環境でのPII（個人識別情報）漏洩リスクを軽減するため、
 * センシティブなデータをマスキングして出力します。
 */

/**
 * メールアドレスをマスキング
 *
 * @example
 * maskEmail('user@example.com') // 'use***@example.com'
 * maskEmail('ab@example.com')   // 'ab***@example.com'
 * maskEmail(undefined)          // '[empty]'
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '[empty]';

  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    // @がない場合は先頭3文字のみ表示
    return `${email.slice(0, 3)}***`;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // ローカル部分の先頭3文字（または全体が3文字以下なら全体）を表示
  const visiblePart = local.slice(0, Math.min(3, local.length));
  return `${visiblePart}***@${domain}`;
}

/**
 * マスキング処理の最大再帰深度
 *
 * スタックオーバーフロー防止のため、これより深いネストは
 * '[DEPTH_EXCEEDED]' としてマスキングされます。
 */
const MAX_MASKING_DEPTH = 10;

/**
 * 機密情報フィールド名のセット（完全一致・大文字小文字無視）
 *
 * Logger の applyMasking で使用する。
 */
export const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'currentpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'apikey',
  'secret',
  'privatekey',
  'credential',
  'auth',
  'authorization',
]);

const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
] as const;

/**
 * 機密情報キーワードの部分一致チェック
 */
export function containsSensitiveKeyword(key: string): boolean {
  return SENSITIVE_KEYWORDS.some((keyword) => key.includes(keyword));
}

// ─── applyMasking 内部実装 ────────────────────────────────────────────────────

/**
 * applyMasking の再帰的な内部実装。
 * MAX_MASKING_DEPTH による深度制限と循環参照検出を行う。
 */
function applyMaskingInternal(
  data: Record<string, unknown>,
  seen: WeakSet<object>,
  currentDepth: number,
): unknown {
  // 深度制限チェック
  if (currentDepth >= MAX_MASKING_DEPTH) {
    return { '[DEPTH_EXCEEDED]': true };
  }

  if (seen.has(data)) {
    return '[Circular]';
  }
  seen.add(data);

  const masked = { ...data };

  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();

    // フィールド名ベースのマスク（完全一致 + 部分一致）
    if (SENSITIVE_FIELDS.has(lowerKey) || containsSensitiveKeyword(lowerKey)) {
      masked[key] = '***';
      continue;
    }

    // Email専用マスク
    if (lowerKey.includes('email') && typeof value === 'string') {
      masked[key] = maskEmail(value);
      continue;
    }

    // 文字列値の内容ベースマスク
    if (typeof value === 'string') {
      masked[key] = maskStringPatterns(value);
      continue;
    }

    // ネストされたオブジェクトの再帰処理
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = applyMaskingInternal(
        value as Record<string, unknown>,
        seen,
        currentDepth + 1,
      );
    }
  }

  return masked;
}

/**
 * 機密情報のマスク処理
 *
 * フィールド名ベース・email専用・文字列パターンの3段階でマスキングを実施する。
 * email マスクは maskEmail を使用。
 * 文字列パターンマスクは maskStringPatterns を使用。
 *
 * セキュリティ対策:
 * - 最大深度制限（スタックオーバーフロー防止）
 * - 循環参照検出（無限ループ防止）
 *
 * @param data マスキング対象のオブジェクト
 */
export function applyMasking<T extends Record<string, unknown>>(data: T): T {
  return applyMaskingInternal(
    data as Record<string, unknown>,
    new WeakSet(),
    0,
  ) as T;
}

/**
 * 文字列内容のパターンベースマスク
 *
 * SSN、クレジットカード番号、認証トークンなど構造的な機密情報を検出してマスキングする。
 * applyMasking から使用される。
 *
 * @param text マスキング対象の文字列
 */
export function maskStringPatterns(text: string): string {
  let maskedText = text;

  // SSN、クレジットカード番号等の構造パターン
  const structuredPatterns: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' },
    {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      replacement: '****-****-****-****',
    },
  ];

  for (const { pattern, replacement } of structuredPatterns) {
    maskedText = maskedText.replace(pattern, replacement);
  }

  // 一般的なトークンパターンのマスク
  const tokenPatterns = [
    /Bearer\s+[A-Za-z0-9._-]+/gi,
    /token[:=]\s*[A-Za-z0-9._-]+/gi,
    /key[:=]\s*[A-Za-z0-9._-]+/gi,
  ];

  for (const pattern of tokenPatterns) {
    maskedText = maskedText.replace(pattern, (match) => {
      const prefix = match.split(/[A-Za-z0-9._-]/)[0];
      return `${prefix}***`;
    });
  }

  return maskedText;
}
