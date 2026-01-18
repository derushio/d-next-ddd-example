import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@injectable()
export class SignInUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    _userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
    @inject(INJECTION_TOKENS.LoginAttemptService)
    private loginAttemptService: ILoginAttemptService,
    @inject(INJECTION_TOKENS.RateLimitService)
    private rateLimitService: IRateLimitService,
  ) {}

  async execute({
    email,
    password,
    ipAddress,
  }: SignInRequest & { ipAddress?: string }): Promise<Result<SignInResponse>> {
    this.logger.info('サインイン試行開始', { email });

    try {
      // Email Value Objectを作成（バリデーション込み）
      const emailVO = new Email(email);

      // Rate Limitチェック（IPアドレスベース）
      // アカウントロックアウトより先に実行し、DoS攻撃を防止
      if (ipAddress) {
        const rateLimitResult =
          await this.rateLimitService.checkLimit(ipAddress);
        if (!rateLimitResult.allowed) {
          this.logger.warn('Rate Limit超過: リクエスト拒否', {
            ipAddress,
            current: rateLimitResult.current,
            limit: rateLimitResult.limit,
            retryAfterMs: rateLimitResult.retryAfterMs,
          });

          const retryAfterSeconds = Math.ceil(
            (rateLimitResult.retryAfterMs ?? 60000) / 1000,
          );

          return failure(
            `リクエスト数が上限に達しました。${retryAfterSeconds}秒後に再試行してください。`,
            'RATE_LIMIT_EXCEEDED',
          );
        }
      }

      // アカウントロックアウト状態チェック
      const lockoutStatus = await this.loginAttemptService.checkLockout(email);
      if (lockoutStatus.isLocked) {
        this.logger.warn('サインイン拒否: アカウントロック中', {
          email,
          lockoutUntil: lockoutStatus.lockoutUntil,
          failedAttempts: lockoutStatus.failedAttempts,
        });

        // ロック中でも試行を記録（監査目的）
        await this.loginAttemptService.recordAttempt({
          email,
          success: false,
          ipAddress,
          failureReason: 'ACCOUNT_LOCKED',
        });

        const lockoutMessage = lockoutStatus.lockoutUntil
          ? `アカウントがロックされています。${lockoutStatus.lockoutUntil.toLocaleString('ja-JP')}以降に再試行してください。`
          : 'アカウントがロックされています。しばらくしてから再試行してください。';

        return failure(lockoutMessage, 'ACCOUNT_LOCKED');
      }

      // パスワードの基本バリデーション
      if (!password || password.trim().length === 0) {
        this.logger.warn('サインイン失敗: パスワードが入力されていません', {
          email,
        });

        await this.loginAttemptService.recordAttempt({
          email,
          success: false,
          ipAddress,
          failureReason: 'EMPTY_PASSWORD',
        });

        return failure('パスワードを入力してください', 'EMPTY_PASSWORD');
      }

      // ユーザー検索
      const user = await this.userRepository.findByEmail(emailVO);
      if (!user) {
        // タイミング攻撃対策: ユーザーが存在しない場合でもbcrypt比較を実行
        // これによりレスポンス時間を均一化し、ユーザー存在有無の推測を防止
        await this.hashService.compareHash(
          password,
          this.hashService.getTimingSafeDummyHash(),
        );

        this.logger.warn('サインイン失敗: ユーザーが見つかりません', { email });

        await this.loginAttemptService.recordAttempt({
          email,
          success: false,
          ipAddress,
          failureReason: 'USER_NOT_FOUND',
        });

        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'INVALID_CREDENTIALS',
        );
      }

      // パスワード検証
      const isPasswordValid = await this.hashService.compareHash(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn('サインイン失敗: パスワード不正', {
          userId: user.id.value,
        });

        await this.loginAttemptService.recordAttempt({
          email,
          success: false,
          ipAddress,
          failureReason: 'INVALID_PASSWORD',
        });

        // 残り試行回数を警告として返す
        const updatedLockoutStatus =
          await this.loginAttemptService.checkLockout(email);
        if (updatedLockoutStatus.remainingAttempts > 0) {
          return failure(
            `メールアドレスまたはパスワードが正しくありません。残り${updatedLockoutStatus.remainingAttempts}回の試行でアカウントがロックされます。`,
            'INVALID_CREDENTIALS',
          );
        }

        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'INVALID_CREDENTIALS',
        );
      }

      // ログイン成功を記録（失敗カウントをリセット）
      await this.loginAttemptService.recordAttempt({
        email,
        success: true,
        ipAddress,
      });

      this.logger.info('サインイン成功', { userId: user.id.value });

      return success({
        user: {
          id: user.id.value,
          name: user.name,
          email: user.email.value,
        },
      });
    } catch (error) {
      this.logger.error('サインイン処理中に予期しないエラーが発生', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // DomainErrorの場合は適切なエラーコードで返す
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // その他の予期しないエラー
      return failure(
        'サインイン処理中にエラーが発生しました',
        'UNEXPECTED_ERROR',
      );
    }
  }
}
