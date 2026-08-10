import { addMilliseconds, isPast, subDays, subMilliseconds } from 'date-fns';
import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type {
  ILoginAttemptService,
  LockoutCheckResult,
  RecordAttemptParams,
} from '@/layers/application/interfaces/ILoginAttemptService';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { env } from '@/lib/env';
import { genCuid2 } from '@/utils/cuid2';

/**
 * デフォルトのログイン試行履歴保持日数
 */
const DEFAULT_RETENTION_DAYS = 90;

/**
 * 自動クリーンアップ実行間隔（1時間）
 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * ログイン試行サービス実装
 *
 * Prismaを使用してログイン試行履歴を管理し、
 * アカウントロックアウト機能を提供します。
 *
 * 設計ポイント:
 * - DBベースで永続化（サーバー再起動でもロック状態維持）
 * - 環境変数で閾値・期間を調整可能
 * - 成功時に失敗カウントをリセット
 * - recordAttempt() 呼び出し時に1時間ごとの自動クリーンアップを実施
 */
@injectable()
export class LoginAttemptService implements ILoginAttemptService {
  /**
   * 最後のクリーンアップ実行時刻（ミリ秒）
   */
  private lastCleanupAt = 0;

  constructor(
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  async recordAttempt(params: RecordAttemptParams): Promise<void> {
    const { email, success, ipAddress, failureReason } = params;

    // ロックアウト機能が無効の場合は記録のみ（監査目的）
    await this.prisma.loginAttempt.create({
      data: {
        id: genCuid2(),
        email: email.toLowerCase(),
        success,
        ipAddress: ipAddress ?? null,
        failureReason: failureReason ?? null,
      },
    });

    if (success) {
      this.logger.debug('ログイン試行記録: 成功', { email });
    } else {
      this.logger.debug('ログイン試行記録: 失敗', {
        email,
        failureReason,
      });
    }

    // 1時間以上経過していれば古いレコードを自動クリーンアップ
    const now = Date.now();
    if (now - this.lastCleanupAt >= CLEANUP_INTERVAL_MS) {
      this.lastCleanupAt = now;
      // 非同期で実行してレスポンスをブロックしない
      void this.cleanup(DEFAULT_RETENTION_DAYS);
    }
  }

  async checkLockout(email: string): Promise<LockoutCheckResult> {
    const normalizedEmail = email.toLowerCase();

    // ロックアウト機能が無効の場合
    if (!env.AUTH_LOCKOUT_ENABLED) {
      return {
        isLocked: false,
        failedAttempts: 0,
        remainingAttempts: env.AUTH_LOCKOUT_THRESHOLD,
      };
    }

    const windowStart = subMilliseconds(
      new Date(),
      env.AUTH_LOCKOUT_DURATION_MS,
    );

    // Race Condition対策: トランザクション内で全クエリを実行
    // これにより、クエリ間に別プロセスが割り込んでも一貫性を保証
    const result = await this.prisma.$transaction(async (tx) => {
      // 最後の成功を取得
      const lastSuccess = await tx.loginAttempt.findFirst({
        where: {
          email: normalizedEmail,
          success: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // lastSuccessに基づく共通のwhereフィルター
      const failureWhere = {
        email: normalizedEmail,
        success: false,
        createdAt: {
          gte: lastSuccess ? lastSuccess.createdAt : windowStart,
        },
      } as const;

      // ウィンドウ内の失敗回数と最後の失敗を並列取得
      const [failedAttempts, lastFailure] = await Promise.all([
        // ウィンドウ内の失敗回数をカウント
        tx.loginAttempt.count({ where: failureWhere }),
        // 最後の失敗を取得（ロック解除時刻の計算用）
        tx.loginAttempt.findFirst({
          where: failureWhere,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return { lastSuccess, failedAttempts, lastFailure };
    });

    const { failedAttempts, lastFailure } = result;
    const isLocked = failedAttempts >= env.AUTH_LOCKOUT_THRESHOLD;
    const remainingAttempts = Math.max(
      0,
      env.AUTH_LOCKOUT_THRESHOLD - failedAttempts,
    );

    // ロック中の場合、最後の失敗からロック期間後に解除
    let lockoutUntil: Date | undefined;
    if (isLocked && lastFailure) {
      lockoutUntil = addMilliseconds(
        lastFailure.createdAt,
        env.AUTH_LOCKOUT_DURATION_MS,
      );

      // ロック期間が過ぎていればロック解除
      if (isPast(lockoutUntil)) {
        return {
          isLocked: false,
          failedAttempts: 0,
          remainingAttempts: env.AUTH_LOCKOUT_THRESHOLD,
        };
      }
    }

    return {
      isLocked,
      failedAttempts,
      lockoutUntil,
      remainingAttempts,
    };
  }

  async resetAttempts(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // 成功記録を挿入することで、以降のカウントをリセット
    await this.prisma.loginAttempt.create({
      data: {
        id: genCuid2(),
        email: normalizedEmail,
        success: true,
        failureReason: 'ADMIN_RESET',
      },
    });

    this.logger.info('ログイン試行履歴リセット', { email: normalizedEmail });
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoffDate = subDays(new Date(), retentionDays);

    const result = await this.prisma.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.info('ログイン試行履歴クリーンアップ完了', {
      deletedCount: result.count,
      retentionDays,
    });

    return result.count;
  }
}
