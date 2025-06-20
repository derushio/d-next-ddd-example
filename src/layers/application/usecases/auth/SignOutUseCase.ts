import { Result, success } from '@/layers/application/types/Result';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { inject, injectable } from 'tsyringe';

export interface SignOutRequest {
  userId: string;
}

export interface SignOutResponse {
  message: string;
}

@injectable()
export class SignOutUseCase {
  constructor(@inject(INJECTION_TOKENS.Logger) private logger: ILogger) {}

  async execute({ userId }: SignOutRequest): Promise<Result<SignOutResponse>> {
    this.logger.info('サインアウト処理開始', { userId });

    // セッション無効化（実際のセッション管理が実装された場合に拡張）
    // 将来的にはSessionRepositoryやTokenServiceを使用してセッションを無効化
    // 現在はサンプルとして基本的なサインアウト処理のみ

    this.logger.info('サインアウト成功', { userId });

    return success({
      message: 'サインアウトしました',
    });
  }
}
