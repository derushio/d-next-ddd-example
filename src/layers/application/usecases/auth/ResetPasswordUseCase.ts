import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  success: true;
  message: string;
  resetToken: string; // 実際の実装では暗号化されたトークンを返す
}

@injectable()
export class ResetPasswordUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private userDomainService: IUserDomainService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute({
    email,
  }: ResetPasswordRequest): Promise<Result<ResetPasswordResponse>> {
    this.logger.info('パスワードリセット処理開始', { email });

    try {
      // メールアドレスのバリデーション
      this.userDomainService.validateEmail(email);
    } catch (error) {
      this.logger.warn('パスワードリセット失敗: バリデーションエラー', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return failure(
        '有効なメールアドレスを入力してください',
        'INVALID_EMAIL_FORMAT',
      );
    }

    try {
      // ユーザー検索
      const user = await this.userRepository.findByEmail(new Email(email));
      if (!user) {
        // セキュリティ上、ユーザーが存在しない場合も成功として扱う
        this.logger.warn('パスワードリセット: ユーザーが見つかりません', {
          email,
        });
        // ただし、実際にはメールは送信しない
      }

      // リセットトークン生成（実際の実装では暗号化された安全なトークンを生成）
      const resetToken = `reset_${Date.now()}_${Math.random()}`;

      // 実際の実装では:
      // 1. リセットトークンをDBに保存（有効期限付き）
      // 2. ユーザーにパスワードリセットメールを送信

      this.logger.info('パスワードリセット処理完了', {
        email,
        userId: user?.id.value,
      });

      return success({
        success: true,
        message: 'パスワードリセットメールを送信しました',
        resetToken, // 実際の実装では返さない（メールに含める）
      });
    } catch (error) {
      this.logger.error('パスワードリセット処理中に予期しないエラーが発生', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure(
        'パスワードリセットの処理に失敗しました',
        'RESET_PASSWORD_FAILED',
      );
    }
  }
}
