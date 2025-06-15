import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

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
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService) private userDomainService: IUserDomainService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async execute({ email }: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    this.logger.info('パスワードリセット処理開始', { email });

    try {
      // メールアドレスのバリデーション
      this.userDomainService.validateEmail(email);
    } catch (error) {
      this.logger.warn('パスワードリセット失敗: バリデーションエラー', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('有効なメールアドレスを入力してください');
    }

    // ユーザー検索
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // セキュリティ上、ユーザーが存在しない場合も成功として扱う
      this.logger.warn('パスワードリセット: ユーザーが見つかりません', { email });
      // ただし、実際にはメールは送信しない
    }

    // リセットトークン生成（実際の実装では暗号化された安全なトークンを生成）
    const resetToken = `reset_${Date.now()}_${Math.random()}`;
    
    // 実際の実装では:
    // 1. リセットトークンをDBに保存（有効期限付き）
    // 2. ユーザーにパスワードリセットメールを送信
    
    this.logger.info('パスワードリセット処理完了', { email, userId: user?.id });
    
    return {
      success: true,
      message: 'パスワードリセットメールを送信しました',
      resetToken, // 実際の実装では返さない（メールに含める）
    };
  }
} 
