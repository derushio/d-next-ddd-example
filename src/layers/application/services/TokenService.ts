import { INJECTION_TOKENS } from '@/di/tokens';
import type { IConfigService } from '@/layers/application/interfaces/IConfigService';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type {
  CreateSessionDTO,
  ISessionRepository,
  UserSessionWithUser,
} from '@/layers/domain/repositories/ISessionRepository';
import { uuidv4 } from '@/utils/uuidv4';

import { addMinutes } from 'date-fns';
import { inject, injectable } from 'tsyringe';

/**
 * 新規トークンセッション作成結果の型定義
 */
export interface TokenSessionResult {
  accessToken: string;
  accessTokenExpireAt: Date;
  resetToken: string;
  resetTokenExpireAt: Date;
  session: UserSessionWithUser;
}

/**
 * TokenServiceのインターフェース
 * JWT生成・検証とセッショントークン管理を担当
 */
export interface ITokenService {
  /**
   * 新しいトークンセッションを作成する
   * @param userId 対象ユーザID
   * @returns 作成されたトークンとセッション情報
   */
  createNewTokenSession(userId: string): Promise<Result<TokenSessionResult>>;
}

/**
 * Token管理サービス
 *
 * Phase 3対応:
 * - JWT生成・検証の責務を集約
 * - NextAuth.js のトークン管理をDI化
 * - SessionRepository経由でのセッション永続化
 * - 設定値を ConfigService から取得
 */
@injectable()
export class TokenService implements ITokenService {
  constructor(
    @inject(INJECTION_TOKENS.SessionRepository)
    private sessionRepository: ISessionRepository,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.ConfigService)
    private configService: IConfigService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  /**
   * 新しいトークンセッションを作成する
   *
   * アクセストークンとリセットトークンのペアを生成し、
   * ハッシュ化してDBに永続化する。
   *
   * @param userId - セッション作成対象のユーザID
   * @returns 生トークンと永続化されたセッション情報
   */
  async createNewTokenSession(
    userId: string,
  ): Promise<Result<TokenSessionResult>> {
    try {
      // 入力値検証
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        this.logger.warn('トークンセッション作成失敗: 無効なユーザーID', {
          userId,
        });
        return failure('ユーザーIDが無効です', 'INVALID_USER_ID');
      }

      const cfg = this.configService.getConfig();

      // 各種トークンとその有効期限を生成
      const accessToken = uuidv4();
      const accessTokenExpireAt = addMinutes(
        new Date(),
        cfg.token.maxAgeMinutes,
      );
      const resetToken = uuidv4();
      const resetTokenExpireAt = addMinutes(
        new Date(),
        cfg.token.maxAgeMinutes * 10, // リセットトークンは10倍の有効期間
      );

      this.logger.info('新規トークンセッション作成開始', { userId });

      // トークンをハッシュ化してセッション作成用データ準備
      const sessionData: CreateSessionDTO = {
        userId,
        accessTokenHash: await this.hashService.generateHash(accessToken),
        accessTokenExpireAt,
        resetTokenHash: await this.hashService.generateHash(resetToken),
        resetTokenExpireAt,
      };

      // SessionRepository経由でセッションを永続化
      const session = await this.sessionRepository.create(sessionData);

      this.logger.info('新規トークンセッション作成完了', {
        userId,
        sessionId: session.id,
        accessTokenExpireAt,
        resetTokenExpireAt,
      });

      return success({
        accessToken,
        accessTokenExpireAt,
        resetToken,
        resetTokenExpireAt,
        session,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.warn('トークンセッション作成失敗: ドメインエラー', {
          userId,
          errorCode: error.code,
          errorMessage: error.message,
        });
        return failure(error.message, error.code);
      }
      this.logger.error('トークンセッション作成処理でエラー発生', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return failure(
        'トークンセッション作成中にエラーが発生しました',
        'TOKEN_SESSION_CREATION_ERROR',
      );
    }
  }
}
