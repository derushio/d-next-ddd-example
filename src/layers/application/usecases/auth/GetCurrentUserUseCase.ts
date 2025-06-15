import 'reflect-metadata';

import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { ILogger } from '@/layers/infrastructure/services/Logger';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';

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
    private readonly logger: ILogger
  ) {}

  /**
   * 現在認証されているユーザー情報を取得
   * 
   * @returns 認証済みユーザー情報（未認証の場合はnull）
   */
  async execute(): Promise<{
    id: string;
    email: string;
    name: string;
  } | null> {
    try {
      this.logger.info('現在のユーザー情報取得開始', {
        action: 'getCurrentUser',
        timestamp: new Date().toISOString(),
      });

      // Infrastructure層のgetAuthを使用（将来的にはRepositoryパターンで抽象化可能）
      const auth = await getAuth();

      if (!auth || !auth.user || !auth.user.id || !auth.user.email || !auth.user.name) {
        this.logger.info('ユーザー未認証または必要な情報が不足', {
          action: 'getCurrentUser',
          result: 'unauthenticated',
        });
        return null;
      }

      const userInfo = {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      };

      this.logger.info('ユーザー情報取得成功', {
        action: 'getCurrentUser',
        userId: userInfo.id,
        email: userInfo.email,
      });

      return userInfo;
    } catch (error) {
      this.logger.error('ユーザー情報取得エラー', {
        action: 'getCurrentUser',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // エラーが発生した場合も未認証として扱う
      return null;
    }
  }

  /**
   * 認証状態チェック（認証が必要な機能での前処理）
   * 
   * @throws {Error} 未認証の場合エラーをスロー
   */
  async requireAuthentication(): Promise<{
    id: string;
    email: string;
    name: string;
  }> {
    const user = await this.execute();

    if (!user) {
      this.logger.warn('認証が必要な処理で未認証ユーザーがアクセス', {
        action: 'requireAuthentication',
        timestamp: new Date().toISOString(),
      });
      throw new Error('認証が必要です');
    }

    return user;
  }
} 
