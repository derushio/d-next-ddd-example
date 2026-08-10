import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import { randomHex32 } from '@/utils/randomHex';

export const refreshTokenInputSchema = z.object({
  refreshToken: z
    .string({ error: 'リフレッシュトークンが無効です' })
    .trim()
    .min(1, 'リフレッシュトークンが無効です'),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenInputSchema>;

export interface RefreshTokenResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@injectable()
export class RefreshTokenUseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  execute({
    refreshToken,
  }: RefreshTokenRequest): ResultAsync<RefreshTokenResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute({ refreshToken }),
      mapToAppError(
        this.logger,
        'リフレッシュトークン処理中に予期しないエラーが発生',
        'REFRESH_TOKEN_FAILED',
      ),
    );
  }

  private async _execute({
    refreshToken,
  }: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    this.logger.info('リフレッシュトークン処理開始', { refreshToken: '***' });

    // トークンの検証（実際のJWT実装では署名検証等を行う）
    validateInput(
      refreshTokenInputSchema,
      { refreshToken },
      'INVALID_REFRESH_TOKEN',
    );

    // サンプル実装：実際にはJWTの検証、有効期限チェック、ユーザー存在確認を行う
    // ここでは簡易的なトークン生成のみ
    const newAccessToken = `access_${randomHex32()}`;
    const newRefreshToken = `refresh_${randomHex32()}`;
    const expiresIn = 3600; // 1時間（3600秒）

    this.logger.info('リフレッシュトークン成功');

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  }
}
