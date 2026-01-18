import 'reflect-metadata';

import { Env } from '@/app/server-actions/env/Env';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type {
  IRateLimitService,
  RateLimitCheckResult,
} from '@/layers/application/interfaces/IRateLimitService';

import { inject, injectable } from 'tsyringe';

/**
 * インメモリ Sliding Window Rate Limitサービス
 *
 * Sliding Window Log アルゴリズムを使用した実装:
 * - 各リクエストのタイムスタンプを配列で保持
 * - ウィンドウ期間内のリクエスト数をカウント
 * - 古いエントリは自動的に除外
 *
 * 設計ポイント:
 * - テンプレートプロジェクト向けのシンプルな実装
 * - サーバー再起動でリセットされる（本番ではRedis等を推奨）
 * - メモリ使用量を抑えるため定期的なクリーンアップを推奨
 *
 * 本番環境での拡張ポイント:
 * - Redis/Memcachedへの置き換え
 * - 分散環境での同期
 * - より高度なアルゴリズム（Token Bucket等）への変更
 */
@injectable()
export class RateLimitService implements IRateLimitService {
  /**
   * キー別のリクエストタイムスタンプ記録
   * Map<識別キー, タイムスタンプ配列>
   */
  private readonly requests = new Map<string, number[]>();

  constructor(@inject(INJECTION_TOKENS.Logger) private logger: ILogger) {}

  async checkLimit(key: string): Promise<RateLimitCheckResult> {
    // Rate Limit機能が無効の場合
    if (!Env.AUTH_RATE_LIMIT_ENABLED) {
      return {
        allowed: true,
        current: 0,
        limit: Env.AUTH_RATE_LIMIT_MAX,
        remaining: Env.AUTH_RATE_LIMIT_MAX,
      };
    }

    const now = Date.now();
    const windowStart = now - Env.AUTH_RATE_LIMIT_WINDOW_MS;

    // 既存のリクエスト記録を取得し、ウィンドウ内のものだけフィルタ
    const existingRequests = this.requests.get(key) ?? [];
    const windowRequests = existingRequests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // 現在のリクエスト数
    const currentCount = windowRequests.length;
    const limit = Env.AUTH_RATE_LIMIT_MAX;

    // 制限超過チェック
    if (currentCount >= limit) {
      // 最も古いリクエストからの経過時間を計算
      const oldestRequest = Math.min(...windowRequests);
      const retryAfterMs = oldestRequest + Env.AUTH_RATE_LIMIT_WINDOW_MS - now;

      this.logger.debug('Rate Limit超過', {
        key,
        currentCount,
        limit,
        retryAfterMs,
      });

      return {
        allowed: false,
        current: currentCount,
        limit,
        retryAfterMs: Math.max(0, retryAfterMs),
        remaining: 0,
      };
    }

    // リクエストを記録
    windowRequests.push(now);
    this.requests.set(key, windowRequests);

    this.logger.debug('Rate Limitチェック: 許可', {
      key,
      currentCount: currentCount + 1,
      limit,
      remaining: limit - currentCount - 1,
    });

    return {
      allowed: true,
      current: currentCount + 1,
      limit,
      remaining: limit - currentCount - 1,
    };
  }

  async resetLimit(key: string): Promise<void> {
    this.requests.delete(key);
    this.logger.debug('Rate Limitリセット', { key });
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const windowStart = now - Env.AUTH_RATE_LIMIT_WINDOW_MS;
    let cleanedKeys = 0;
    let cleanedEntries = 0;

    for (const [key, timestamps] of this.requests.entries()) {
      // ウィンドウ内のリクエストだけ残す
      const validRequests = timestamps.filter(
        (timestamp) => timestamp > windowStart,
      );

      if (validRequests.length === 0) {
        // 有効なリクエストがなければエントリ削除
        this.requests.delete(key);
        cleanedKeys++;
      } else if (validRequests.length < timestamps.length) {
        // 古いエントリを除去
        cleanedEntries += timestamps.length - validRequests.length;
        this.requests.set(key, validRequests);
      }
    }

    if (cleanedKeys > 0 || cleanedEntries > 0) {
      this.logger.info('Rate Limitクリーンアップ完了', {
        cleanedKeys,
        cleanedEntries,
        remainingKeys: this.requests.size,
      });
    }
  }
}
