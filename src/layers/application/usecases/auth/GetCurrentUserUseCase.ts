import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { IAuthSessionService } from '@/layers/application/interfaces/IAuthSessionService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import {
  AppUseCaseError,
  mapToAppError,
} from '@/layers/application/utils/useCaseErrorHandler';

export interface GetCurrentUserResponse {
  id: string;
  email: string;
  name: string;
}

/**
 * 現在のユーザー情報取得 UseCase
 *
 * DDD/Clean Architecture パターン:
 * - 認証情報の取得をUseCaseレイヤーでラップ
 * - NextAuthの実装詳細を隠蔽
 * - DIパターンで依存関係を管理
 */
@injectable()
export class GetCurrentUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
    @inject(INJECTION_TOKENS.AuthSessionService)
    private readonly authSessionService: IAuthSessionService,
  ) {}

  /**
   * 現在認証されているユーザー情報を取得
   *
   * @returns 認証済みユーザー情報のResult型
   */
  execute(): ResultAsync<GetCurrentUserResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(),
      mapToAppError(
        this.logger,
        'ユーザー情報取得エラー',
        'USER_INFO_FETCH_ERROR',
      ),
    );
  }

  private async _execute(): Promise<GetCurrentUserResponse> {
    this.logger.info('現在のユーザー情報取得開始', {
      action: 'getCurrentUser',
    });

    // DI経由で認証セッションサービスを使用
    const session = await this.authSessionService.getSession();

    if (!session) {
      this.logger.info('ユーザー未認証または必要な情報が不足', {
        action: 'getCurrentUser',
        result: 'unauthenticated',
      });
      throw new AppUseCaseError('認証が必要です', 'UNAUTHENTICATED');
    }

    const userInfo = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };

    this.logger.info('ユーザー情報取得成功', {
      action: 'getCurrentUser',
      userId: userInfo.id,
      email: userInfo.email,
    });

    return userInfo;
  }

  /**
   * 認証状態チェック（認証が必要な機能での前処理）
   *
   * execute() のラッパーだが、未認証アクセスを warn レベルで監査ログに記録する。
   * 認証ガードが必要な UseCase（GetUserByIdUseCase 等）での前処理として使用すること。
   * 単純な認証確認には execute() を直接使用してよい。
   *
   * @returns 認証済みユーザー情報のResult型
   */
  requireAuthentication(): ResultAsync<GetCurrentUserResponse, AppError> {
    return this.execute().mapErr((error) => {
      // 監査目的: 保護リソースへの未認証アクセスを warn レベルで記録
      this.logger.warn('認証が必要な処理で未認証ユーザーがアクセス', {
        action: 'requireAuthentication',
        error: error.message,
      });
      return error;
    });
  }
}
