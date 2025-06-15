import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/infrastructure/repositories/interfaces/IUserRepository';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@injectable()
export class RefreshTokenUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async execute({ refreshToken }: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    this.logger.info('リフレッシュトークン処理開始', { refreshToken: '***' });

    // トークンの検証（実際のJWT実装では署名検証等を行う）
    if (!refreshToken || refreshToken.trim() === '') {
      this.logger.warn('リフレッシュトークンエラー: トークンが空');
      throw new Error('リフレッシュトークンが無効です');
    }

    // サンプル実装：実際にはJWTの検証、有効期限チェック、ユーザー存在確認を行う
    // ここでは簡易的なトークン生成のみ
    const newAccessToken = `access_${Date.now()}_${Math.random()}`;
    const newRefreshToken = `refresh_${Date.now()}_${Math.random()}`;
    const expiresIn = 3600; // 1時間

    this.logger.info('リフレッシュトークン成功');
    
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  }
} 
