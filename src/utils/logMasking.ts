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
 * センシティブなフィールドをマスキング
 *
 * 指定されたキーに対応する値を再帰的にマスキングします。
 *
 * セキュリティ対策:
 * - 最大深度制限（スタックオーバーフロー防止）
 * - 循環参照検出（無限ループ防止）
 *
 * @param data マスキング対象のオブジェクト
 * @param sensitiveKeys マスキングするキー名の配列
 * @param currentDepth 現在の再帰深度（内部使用）
 * @param visited 訪問済みオブジェクト追跡用（内部使用、循環参照検出）
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  data: T,
  sensitiveKeys: string[] = ['email', 'password', 'token', 'secret', 'apikey'],
  currentDepth = 0,
  visited: WeakSet<object> = new WeakSet(),
): T {
  // 深度制限チェック
  if (currentDepth >= MAX_MASKING_DEPTH) {
    return { '[DEPTH_EXCEEDED]': true } as unknown as T;
  }

  // 循環参照チェック
  if (visited.has(data)) {
    return { '[CIRCULAR_REFERENCE]': true } as unknown as T;
  }
  visited.add(data);

  const masked = { ...data };

  // case-insensitive比較のため、sensitiveKeysも小文字化
  const lowerSensitiveKeys = sensitiveKeys.map((k) => k.toLowerCase());

  for (const key of Object.keys(masked)) {
    const value = masked[key];

    if (lowerSensitiveKeys.includes(key.toLowerCase())) {
      if (key.toLowerCase() === 'email' && typeof value === 'string') {
        (masked as Record<string, unknown>)[key] = maskEmail(value);
      } else if (typeof value === 'string') {
        // その他のセンシティブ項目は'[REDACTED]'で置換
        (masked as Record<string, unknown>)[key] = '[REDACTED]';
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // ネストされたオブジェクトを再帰的に処理
      (masked as Record<string, unknown>)[key] = maskSensitiveData(
        value as Record<string, unknown>,
        sensitiveKeys,
        currentDepth + 1,
        visited,
      );
    }
  }

  return masked;
}

/**
 * 環境に応じてログデータをマスキング
 *
 * LOG_MASK_PII=true の場合、または本番環境の場合にマスキングを適用
 *
 * @param data ログ出力するデータ
 * @param shouldMask 強制的にマスキングするかどうか
 */
export function prepareLogData<T extends Record<string, unknown>>(
  data: T,
  shouldMask: boolean,
): T {
  if (shouldMask) {
    return maskSensitiveData(data);
  }
  return data;
}
