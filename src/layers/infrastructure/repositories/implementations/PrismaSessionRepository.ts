import { INJECTION_TOKENS } from '@/di/tokens';
import { User } from '@/layers/domain/entities/User';
import { UserSession } from '@/layers/domain/entities/UserSession';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type {
  ISessionRepository,
  SessionFindCondition,
  UserSessionWithUser,
} from '@/layers/domain/repositories/ISessionRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { SessionId } from '@/layers/domain/value-objects/SessionId';
import { UserId } from '@/layers/domain/value-objects/UserId';
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
 * - UserSession Entity と User Entity を使用したDDDパターン
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
   * @param session - UserSession Entity（IDはCUID2で自動生成済み）
   * @returns 作成されたセッション（関連するUserデータを含む）
   */
  async create(session: UserSession): Promise<UserSessionWithUser> {
    this.logger.info('セッション作成開始', {
      userId: session.userId.value,
      sessionId: session.id.value,
      hasAccessToken: !!session.accessTokenHash,
    });

    try {
      const createdSession = await this.prisma.userSession.create({
        data: {
          id: session.id.value,
          userId: session.userId.value,
          accessTokenHash: session.accessTokenHash,
          accessTokenExpireAt: session.accessTokenExpireAt,
          resetTokenHash: session.resetTokenHash,
          resetTokenExpireAt: session.resetTokenExpireAt,
        },
        include: {
          User: true, // セッションに関連するユーザ情報も含めて返却
        },
      });

      this.logger.info('セッション作成成功', {
        sessionId: createdSession.id,
        userId: createdSession.userId,
      });

      // Prismaの結果をDomain Entityに変換
      return this.toDomainModel(createdSession);
    } catch (error) {
      this.logger.error('セッション作成に失敗', {
        userId: session.userId.value,
        sessionId: session.id.value,
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
   * @param condition - ユーザIDとセッションIDでの検索条件（Value Object）
   * @returns 見つかったセッション（最新のアクセストークン期限順）、またはnull
   */
  async findFirst(
    condition: SessionFindCondition,
  ): Promise<UserSessionWithUser | null> {
    this.logger.info('セッション検索開始', {
      userId: condition.userId.value,
      sessionId: condition.id.value,
    });

    try {
      const session = await this.prisma.userSession.findFirst({
        where: {
          userId: condition.userId.value,
          id: condition.id.value,
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

        // Prismaの結果をDomain Entityに変換
        return this.toDomainModel(session);
      } else {
        this.logger.info('セッションが見つかりません', {
          userId: condition.userId.value,
          sessionId: condition.id.value,
        });
      }

      return null;
    } catch (error) {
      this.logger.error('セッション検索に失敗', {
        userId: condition.userId.value,
        sessionId: condition.id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // セッション検索でエラーが発生した場合はnullを返す（セッション無効として扱う）
      return null;
    }
  }

  /**
   * PrismaのセッションデータをDomain Entityに変換
   */
  private toDomainModel(prismaSession: {
    id: string;
    userId: string;
    accessTokenHash: string;
    accessTokenExpireAt: Date;
    resetTokenHash: string;
    resetTokenExpireAt: Date;
    createdAt: Date;
    updatedAt: Date;
    User: {
      id: string;
      email: string;
      name: string;
      passwordHash: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }): UserSessionWithUser {
    const sessionEntity = UserSession.reconstruct(
      new SessionId(prismaSession.id),
      new UserId(prismaSession.userId),
      prismaSession.accessTokenHash,
      prismaSession.accessTokenExpireAt,
      prismaSession.resetTokenHash,
      prismaSession.resetTokenExpireAt,
      prismaSession.createdAt,
      prismaSession.updatedAt,
    );

    const userEntity = User.reconstruct(
      new UserId(prismaSession.User.id),
      new Email(prismaSession.User.email),
      prismaSession.User.name,
      prismaSession.User.passwordHash,
      prismaSession.User.createdAt,
      prismaSession.User.updatedAt,
    );

    return {
      session: sessionEntity,
      user: userEntity,
    };
  }
}
