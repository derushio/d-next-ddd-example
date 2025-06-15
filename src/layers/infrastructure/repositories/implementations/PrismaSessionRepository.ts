import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import type { ISessionRepository, CreateSessionDTO, SessionFindCondition, UserSessionWithUser } from '@/layers/domain/repositories/ISessionRepository';

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
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient
  ) {}

  /**
   * 新しいセッションを作成する
   * 
   * @param data - ユーザID、アクセストークンハッシュ、期限などを含むセッションデータ
   * @returns 作成されたセッション（関連するUserデータを含む）
   */
  async create(data: CreateSessionDTO): Promise<UserSessionWithUser> {
    return await this.prisma.userSession.create({
      data,
      include: {
        User: true, // セッションに関連するユーザ情報も含めて返却
      },
    });
  }

  /**
   * 指定条件でセッションを検索する
   * 
   * @param condition - ユーザIDとセッションIDでの検索条件
   * @returns 見つかったセッション（最新のアクセストークン期限順）、またはnull
   */
  async findFirst(condition: SessionFindCondition): Promise<UserSessionWithUser | null> {
    return await this.prisma.userSession.findFirst({
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
  }
} 
