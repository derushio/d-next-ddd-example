import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';
import {
  fieldErrorCodeMap,
  validateInput,
} from '@/layers/application/utils/validateInput';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { formatJaDateTime } from '@/utils/dfUtils';

const signInInputSchema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type SignInRequest = z.infer<typeof signInInputSchema> & {
  ipAddress?: string;
};

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
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService)
    private readonly hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.LoginAttemptService)
    private readonly loginAttemptService: ILoginAttemptService,
    @inject(INJECTION_TOKENS.RateLimitService)
    private readonly rateLimitService: IRateLimitService,
  ) {}

  execute(request: SignInRequest): ResultAsync<SignInResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(
        this.logger,
        'サインイン処理中に予期しないエラーが発生',
        'UNEXPECTED_ERROR',
      ),
    );
  }

  private async _execute(request: SignInRequest): Promise<SignInResponse> {
    const { email, password, ipAddress } = request;
    this.logger.info('サインイン試行開始', { email });

    validateInput(
      signInInputSchema,
      { email, password },
      fieldErrorCodeMap({ password: 'EMPTY_PASSWORD', email: 'EMPTY_EMAIL' }),
    );

    // Email Value Objectを作成（バリデーション込み）
    const emailVO = new Email(email);

    // Rate Limitチェック（IPアドレスベース）
    // アカウントロックアウトより先に実行し、DoS攻撃を防止
    if (ipAddress) {
      const rateLimitResult = await this.rateLimitService.checkLimit(ipAddress);
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

        throw new AppUseCaseError(
          `リクエスト数が上限に達しました。${retryAfterSeconds}秒後に再試行してください。`,
          'RATE_LIMIT_EXCEEDED',
          { retryAfterMs: rateLimitResult.retryAfterMs },
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
        ? `アカウントがロックされています。${formatJaDateTime(lockoutStatus.lockoutUntil)}以降に再試行してください。`
        : 'アカウントがロックされています。しばらくしてから再試行してください。';

      throw new AppUseCaseError(lockoutMessage, 'ACCOUNT_LOCKED');
    }

    // ユーザー検索
    const user = await this.userRepository.findByEmail(emailVO);
    if (!user) {
      // タイミング攻撃対策: ユーザーが存在しない場合でもargon2id検証を実行
      // これによりレスポンス時間を均一化し、ユーザー存在有無の推測を防止
      await this.hashService.compareHash(
        password,
        this.hashService.getTimingSafeDummyHash(),
      );

      this.logger.warn('サインイン失敗: ユーザーが見つかりません', {
        email,
      });

      await this.loginAttemptService.recordAttempt({
        email,
        success: false,
        ipAddress,
        failureReason: 'USER_NOT_FOUND',
      });

      throw new AppUseCaseError(
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
        throw new AppUseCaseError(
          `メールアドレスまたはパスワードが正しくありません。残り${updatedLockoutStatus.remainingAttempts}回の試行でアカウントがロックされます。`,
          'INVALID_CREDENTIALS',
        );
      }

      throw new AppUseCaseError(
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

    return {
      user: {
        id: user.id.value,
        name: user.name,
        email: user.email.value,
      },
    };
  }
}
