import { isIP } from 'node:net';
import { headers } from 'next/headers';

/**
 * クライアントIPアドレス取得ユーティリティ
 *
 * Server Actions/API Routes/Server Componentsで使用可能。
 * プロキシ/ロードバランサー環境を考慮した抽出を行う。
 *
 * 優先順位:
 * 1. x-forwarded-for (一般的なプロキシヘッダー、最初のIPを使用)
 * 2. x-real-ip (Nginx等で設定されるヘッダー)
 * 3. cf-connecting-ip (Cloudflare)
 * 4. x-client-ip (Azure等)
 *
 * セキュリティ注意:
 * - これらのヘッダーはクライアントが偽装可能
 * - Rate Limitingには有効だが、セキュリティ上の信頼性は限定的
 * - 重要な認可決定には使用しないこと
 *
 * @returns クライアントIPアドレス、取得できない場合は undefined
 */
export async function getClientIp(): Promise<string | undefined> {
  try {
    const headersList = await headers();

    // X-Forwarded-For: 複数のプロキシを経由した場合、カンマ区切りで列挙される
    // 最初のIPがオリジナルクライアント
    const xForwardedFor = headersList.get('x-forwarded-for');
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',').map((ip) => ip.trim());
      const clientIp = ips[0];
      if (clientIp && isValidIp(clientIp)) {
        return clientIp;
      }
    }

    // X-Real-IP: 単一のIPアドレス
    const xRealIp = headersList.get('x-real-ip');
    if (xRealIp && isValidIp(xRealIp)) {
      return xRealIp;
    }

    // Cloudflare: CF-Connecting-IP
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    if (cfConnectingIp && isValidIp(cfConnectingIp)) {
      return cfConnectingIp;
    }

    // Azure等: X-Client-IP
    const xClientIp = headersList.get('x-client-ip');
    if (xClientIp && isValidIp(xClientIp)) {
      return xClientIp;
    }

    return undefined;
  } catch {
    // headers()が利用できない環境（ビルド時等）
    return undefined;
  }
}

/**
 * IPアドレス形式バリデーション
 * node:net の isIP() を使用して IPv4/IPv6 を正確に判定
 * isIP() は 0=無効, 4=IPv4, 6=IPv6 を返す
 */
function isValidIp(ip: string): boolean {
  return isIP(ip) !== 0;
}
