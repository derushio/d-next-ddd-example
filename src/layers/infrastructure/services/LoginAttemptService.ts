import 'reflect-metadata';

import { Env } from '@/app/server-actions/env/Env';
import { INJECTION_TOKENS } from '@/di/tokens';
import type {
  ILoginAttemptService,
  LockoutCheckResult,
  RecordAttemptParams,
} from '@/layers/application/interfaces/ILoginAttemptService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

import { inject, injectable } from 'tsyringe';

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
 */
@injectable()
export class LoginAttemptService implements ILoginAttemptService {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async recordAttempt(params: RecordAttemptParams): Promise<void> {
    const { email, success, ipAddress, failureReason } = params;

    // ロックアウト機能が無効の場合は記録のみ（監査目的）
    await this.prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success,
        ipAddress,
        failureReason,
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
  }

  async checkLockout(email: string): Promise<LockoutCheckResult> {
    const normalizedEmail = email.toLowerCase();

    // ロックアウト機能が無効の場合
    if (!Env.AUTH_LOCKOUT_ENABLED) {
      return {
        isLocked: false,
        failedAttempts: 0,
        remainingAttempts: Env.AUTH_LOCKOUT_THRESHOLD,
      };
    }

    const windowStart = new Date(Date.now() - Env.AUTH_LOCKOUT_DURATION_MS);

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

      // ウィンドウ内の失敗回数をカウント
      const failedAttempts = await tx.loginAttempt.count({
        where: {
          email: normalizedEmail,
          success: false,
          createdAt: {
            gte: lastSuccess ? lastSuccess.createdAt : windowStart,
          },
        },
      });

      // 最後の失敗を取得（ロック解除時刻の計算用）
      const lastFailure = await tx.loginAttempt.findFirst({
        where: {
          email: normalizedEmail,
          success: false,
          createdAt: {
            gte: lastSuccess ? lastSuccess.createdAt : windowStart,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return { lastSuccess, failedAttempts, lastFailure };
    });

    const { failedAttempts, lastFailure } = result;
    const isLocked = failedAttempts >= Env.AUTH_LOCKOUT_THRESHOLD;
    const remainingAttempts = Math.max(
      0,
      Env.AUTH_LOCKOUT_THRESHOLD - failedAttempts,
    );

    // ロック中の場合、最後の失敗からロック期間後に解除
    let lockoutUntil: Date | undefined;
    if (isLocked && lastFailure) {
      lockoutUntil = new Date(
        lastFailure.createdAt.getTime() + Env.AUTH_LOCKOUT_DURATION_MS,
      );

      // ロック期間が過ぎていればロック解除
      if (lockoutUntil <= new Date()) {
        return {
          isLocked: false,
          failedAttempts: 0,
          remainingAttempts: Env.AUTH_LOCKOUT_THRESHOLD,
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
        email: normalizedEmail,
        success: true,
        failureReason: 'ADMIN_RESET',
      },
    });

    this.logger.info('ログイン試行履歴リセット', { email: normalizedEmail });
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

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
