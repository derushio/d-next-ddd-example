import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

export interface SignOutRequest {
  userId: string;
}

export interface SignOutResponse {
  success: true;
  message: string;
}

@injectable()
export class SignOutUseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async execute({ userId }: SignOutRequest): Promise<SignOutResponse> {
    this.logger.info('サインアウト処理開始', { userId });

    // セッション無効化（実際のセッション管理が実装された場合に拡張）
    // ここではサンプルとして基本的なサインアウト処理のみ
    
    this.logger.info('サインアウト成功', { userId });
    
    return {
      success: true,
      message: 'サインアウトしました',
    };
  }
} 
