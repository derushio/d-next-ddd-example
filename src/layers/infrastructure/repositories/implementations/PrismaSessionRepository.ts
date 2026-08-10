import { isPast } from 'date-fns';
import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { UserSession } from '@/layers/domain/entities/UserSession';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type {
  ISessionRepository,
  SessionFindCondition,
  UserSessionWithUser,
} from '@/layers/domain/repositories/ISessionRepository';
import { SessionId } from '@/layers/domain/value-objects/SessionId';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type {
  Prisma,
  PrismaClient,
} from '@/layers/infrastructure/persistence/prisma/generated';
import { toUserEntity } from '@/layers/infrastructure/repositories/utils/entityMappers';
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
import { repositoryOperation } from '@/layers/infrastructure/repositories/utils/repositoryOperation';
import { toErrorMeta } from '@/utils/toErrorMeta';

type SessionWithUser = Prisma.UserSessionGetPayload<{
  include: { User: true };
}>;

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
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
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
        ...toErrorMeta(error),
      });

      // Prismaエラーを適切なドメインエラーに変換
      mapPrismaError(error, {
        p2002Custom: () =>
          new DomainError('セッションの重複作成エラー', 'SESSION_DUPLICATE'),
        p2003Custom: () =>
          new DomainError('存在しないユーザーです', 'USER_NOT_FOUND'),
      });

      throw new DomainError(
        'セッションの作成に失敗しました',
        'SESSION_CREATION_FAILED',
      );
    }
  }

  /**
   * IDでセッションを検索する
   *
   * @param condition - セッションIDでの検索条件（Value Object）
   * @returns 見つかったセッション、またはnull
   */
  async findById(
    condition: SessionFindCondition,
  ): Promise<UserSessionWithUser | null> {
    this.logger.info('セッション検索開始', {
      sessionId: condition.id.value,
    });

    return repositoryOperation(
      async () => {
        const session = await this.prisma.userSession.findUnique({
          where: {
            id: condition.id.value,
          },
          include: {
            User: true, // 関連するユーザ情報も含める
          },
        });

        if (session) {
          this.logger.info('セッション検索成功', {
            sessionId: session.id,
            userId: session.userId,
            isExpired: isPast(session.accessTokenExpireAt),
          });

          // Prismaの結果をDomain Entityに変換
          return this.toDomainModel(session);
        } else {
          this.logger.info('セッションが見つかりません', {
            sessionId: condition.id.value,
          });
        }

        return null;
      },
      this.logger,
      {
        operation: '検索',
        entity: 'セッション',
        params: { sessionId: condition.id.value },
      },
      'セッションの検索に失敗しました',
      'SESSION_FIND_FAILED',
    );
  }

  /**
   * PrismaのセッションデータをDomain Entityに変換
   */
  private toDomainModel(prismaSession: SessionWithUser): UserSessionWithUser {
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

    const userEntity = toUserEntity(prismaSession.User);

    return {
      session: sessionEntity,
      user: userEntity,
    };
  }
}
