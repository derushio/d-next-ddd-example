import { INJECTION_TOKENS } from '@/di/tokens';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type {
  CreateSessionDTO,
  ISessionRepository,
  SessionFindCondition,
  UserSessionWithUser,
} from '@/layers/domain/repositories/ISessionRepository';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { inject, injectable } from 'tsyringe';

/**
 * Prismaを使用したSessionRepositoryの実装
 *
 * Phase 3対応:
 * - userSession テーブルの CRUD 操作を DI化
 * - NextAuth.js での直接 Prisma 呼び出しを置換
 * - セッション管理のビジネスロジックを集約
 */
@injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  /**
   * 新しいセッションを作成する
   *
   * @param data - ユーザID、アクセストークンハッシュ、期限などを含むセッションデータ
   * @returns 作成されたセッション（関連するUserデータを含む）
   */
  async create(data: CreateSessionDTO): Promise<UserSessionWithUser> {
    this.logger.info('セッション作成開始', {
      userId: data.userId,
      hasAccessToken: !!data.accessTokenHash,
    });

    try {
      const session = await this.prisma.userSession.create({
        data,
        include: {
          User: true, // セッションに関連するユーザ情報も含めて返却
        },
      });

      this.logger.info('セッション作成成功', {
        sessionId: session.id,
        userId: session.userId,
      });

      return session;
    } catch (error) {
      this.logger.error('セッション作成に失敗', {
        userId: data.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Prismaエラーを適切なドメインエラーに変換
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          throw new DomainError(
            'セッションの重複作成エラー',
            'SESSION_DUPLICATE',
          );
        }
        if (error.message.includes('Foreign key constraint')) {
          throw new DomainError('存在しないユーザーです', 'USER_NOT_FOUND');
        }
      }

      throw new DomainError(
        'セッションの作成に失敗しました',
        'SESSION_CREATION_FAILED',
      );
    }
  }

  /**
   * 指定条件でセッションを検索する
   *
   * @param condition - ユーザIDとセッションIDでの検索条件
   * @returns 見つかったセッション（最新のアクセストークン期限順）、またはnull
   */
  async findFirst(
    condition: SessionFindCondition,
  ): Promise<UserSessionWithUser | null> {
    this.logger.info('セッション検索開始', {
      userId: condition.userId,
      sessionId: condition.id,
    });

    try {
      const session = await this.prisma.userSession.findFirst({
        where: {
          userId: condition.userId,
          id: condition.id,
        },
        orderBy: {
          accessTokenExpireAt: 'desc', // 最新のセッションを優先
        },
        include: {
          User: true, // 関連するユーザ情報も含める
        },
      });

      if (session) {
        this.logger.info('セッション検索成功', {
          sessionId: session.id,
          userId: session.userId,
          isExpired: session.accessTokenExpireAt < new Date(),
        });
      } else {
        this.logger.info('セッションが見つかりません', {
          userId: condition.userId,
          sessionId: condition.id,
        });
      }

      return session;
    } catch (error) {
      this.logger.error('セッション検索に失敗', {
        userId: condition.userId,
        sessionId: condition.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // セッション検索でエラーが発生した場合はnullを返す（セッション無効として扱う）
      return null;
    }
  }
}
