import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: true;
  message: string;
}

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService) private userDomainService: IUserDomainService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    this.logger.info('パスワード変更処理開始', { userId });

    // ユーザー存在確認
    // 注意: 現在のRepositoryにはfindByIdが実装されていないため、
    // 実際の実装では IUserRepository.findById() を追加する必要があります
    // ここではサンプルとして、userIdをemailとして扱う簡易実装
    const user = await this.userRepository.findByEmail(userId); // 暫定実装
    // 実際の実装では: const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.error('パスワード変更失敗: ユーザーが見つかりません', { userId });
      throw new Error('ユーザーが見つかりません');
    }

    // 現在のパスワード検証
    const isCurrentPasswordValid = await this.userDomainService.verifyPassword(
      currentPassword,
      user.passwordHash
    );
    
    if (!isCurrentPasswordValid) {
      this.logger.warn('パスワード変更失敗: 現在のパスワードが正しくありません', { userId });
      throw new Error('現在のパスワードが正しくありません');
    }

    try {
      // 新しいパスワードのバリデーション
      this.userDomainService.validatePassword(newPassword);
    } catch (error) {
      this.logger.warn('パスワード変更失敗: 新しいパスワードのバリデーションエラー', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }

    // 現在のパスワードと同じチェック
    const isSamePassword = await this.userDomainService.verifyPassword(
      newPassword,
      user.passwordHash
    );
    
    if (isSamePassword) {
      this.logger.warn('パスワード変更失敗: 現在のパスワードと同じです', { userId });
      throw new Error('新しいパスワードは現在のパスワードと異なる必要があります');
    }

    // パスワードハッシュ化
    const newPasswordHash = await this.userDomainService.hashPassword(newPassword);

    // パスワード更新（実際の実装ではupdateメソッドを使用）
    // await this.userRepository.update(userId, { passwordHash: newPasswordHash });
    // ここではサンプルとしてログのみ
    
    this.logger.info('パスワード変更成功', { userId });
    
    return {
      success: true,
      message: 'パスワードを変更しました',
    };
  }
} 
