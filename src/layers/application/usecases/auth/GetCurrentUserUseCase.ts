import 'reflect-metadata';

import { INJECTION_TOKENS } from '@/di/tokens';
import type { IAuthSessionService } from '@/layers/application/interfaces/IAuthSessionService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';

import { inject, injectable } from 'tsyringe';

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
  async execute(): Promise<Result<GetCurrentUserResponse>> {
    try {
      this.logger.info('現在のユーザー情報取得開始', {
        action: 'getCurrentUser',
        timestamp: new Date().toISOString(),
      });

      // DI経由で認証セッションサービスを使用
      const session = await this.authSessionService.getSession();

      if (!session) {
        this.logger.info('ユーザー未認証または必要な情報が不足', {
          action: 'getCurrentUser',
          result: 'unauthenticated',
        });
        return failure('認証が必要です', 'UNAUTHENTICATED');
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

      return success(userInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('ユーザー情報取得エラー', {
        action: 'getCurrentUser',
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return failure(
        'ユーザー情報の取得に失敗しました',
        'USER_INFO_FETCH_ERROR',
      );
    }
  }

  /**
   * 認証状態チェック（認証が必要な機能での前処理）
   *
   * @returns 認証済みユーザー情報のResult型
   */
  async requireAuthentication(): Promise<Result<GetCurrentUserResponse>> {
    const result = await this.execute();

    if (result.success === false) {
      this.logger.warn('認証が必要な処理で未認証ユーザーがアクセス', {
        action: 'requireAuthentication',
        timestamp: new Date().toISOString(),
        error: result.error.message,
      });
      return result; // 既にfailureなのでそのまま返す
    }

    return result; // 成功の場合もそのまま返す
  }
}
