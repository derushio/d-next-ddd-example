/**
 * 暗号学的に安全な32バイトのランダムHex文字列を生成
 * Web Crypto API を使用（Edge Runtime互換）
 */
export function randomHex32(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
