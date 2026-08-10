import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

export const resetPasswordInputSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordInputSchema>;

export interface ResetPasswordResponse {
  success: true;
  message: string;
}

@injectable()
export class ResetPasswordUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  execute(
    request: ResetPasswordRequest,
  ): ResultAsync<ResetPasswordResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(
        this.logger,
        'パスワードリセット処理中に予期しないエラーが発生',
        'RESET_PASSWORD_FAILED',
      ),
    );
  }

  private async _execute(
    request: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const { email } = request;
    this.logger.info('パスワードリセット処理開始', { email });

    validateInput(resetPasswordInputSchema, request);

    // メールアドレスのバリデーション（Email VOコンストラクタに委譲）
    const emailVO = new Email(email);

    // ユーザー検索
    const user = await this.userRepository.findByEmail(emailVO);
    if (!user) {
      // セキュリティ上、ユーザーが存在しない場合も成功として扱う
      this.logger.warn('パスワードリセット: ユーザーが見つかりません', {
        email,
      });
      // ただし、実際にはメールは送信しない
    }

    // 実際の実装では:
    // 1. リセットトークン生成（例: `reset_${randomHex32()}`）
    // 2. リセットトークンをDBに保存（有効期限付き）
    // 3. ユーザーにパスワードリセットメールを送信

    // === メール送信の実装例（将来 Resend + React Email 等で実装） ===
    // import { sendEmail } from '@/lib/email';
    // if (user) {
    //   const resetToken = `reset_${randomHex32()}`;
    //   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    //   await sendEmail({
    //     to: user.email.value,
    //     subject: 'パスワードリセット',
    //     template: 'password-reset',
    //     data: {
    //       resetToken,
    //       resetUrl: `${baseUrl}/auth/reset-password?token=${resetToken}`,
    //     },
    //   });
    // }
    // ================================================================

    this.logger.info('パスワードリセット処理完了', {
      email,
      userId: user?.id.value,
    });

    return {
      success: true,
      message: 'パスワードリセットメールを送信しました',
    };
  }
}
