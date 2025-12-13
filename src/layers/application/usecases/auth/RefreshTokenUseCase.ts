import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';

import { inject, injectable } from 'tsyringe';

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
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute({
    refreshToken,
  }: RefreshTokenRequest): Promise<Result<RefreshTokenResponse>> {
    this.logger.info('リフレッシュトークン処理開始', { refreshToken: '***' });

    try {
      // トークンの検証（実際のJWT実装では署名検証等を行う）
      if (!refreshToken || refreshToken.trim() === '') {
        this.logger.warn('リフレッシュトークンエラー: トークンが空');
        return failure(
          'リフレッシュトークンが無効です',
          'INVALID_REFRESH_TOKEN',
        );
      }

      // サンプル実装：実際にはJWTの検証、有効期限チェック、ユーザー存在確認を行う
      // ここでは簡易的なトークン生成のみ
      const newAccessToken = `access_${Date.now()}_${Math.random()}`;
      const newRefreshToken = `refresh_${Date.now()}_${Math.random()}`;
      const expiresIn = 3600; // 1時間

      this.logger.info('リフレッシュトークン成功');

      return success({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      });
    } catch (error) {
      this.logger.error('リフレッシュトークン処理中に予期しないエラーが発生', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return failure(
        'リフレッシュトークンの処理に失敗しました',
        'REFRESH_TOKEN_FAILED',
      );
    }
  }
}
