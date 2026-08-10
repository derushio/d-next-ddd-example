import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import { DEFAULT_PAGE_SIZE } from '@/layers/application/constants/pagination';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type {
  IUserRepository,
  UserSearchCriteria,
} from '@/layers/domain/repositories/IUserRepository';
import type { Email } from '@/layers/domain/value-objects/Email';
import type { UserId } from '@/layers/domain/value-objects/UserId';
import type {
  Prisma,
  PrismaClient,
} from '@/layers/infrastructure/persistence/prisma/generated';
import { toUserEntity } from '@/layers/infrastructure/repositories/utils/entityMappers';
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
import { repositoryOperation } from '@/layers/infrastructure/repositories/utils/repositoryOperation';
import { toErrorMeta } from '@/utils/toErrorMeta';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  /**
   * トランザクションコンテキストからPrismaClientを取得
   * ITransactionは実行時にはPrisma.TransactionClientとして扱われる
   * Clean Architecture: Domain層のITransactionはPrisma型に依存できないためアサーション必須
   */
  private getClient(
    transaction?: ITransaction,
  ): PrismaClient | Prisma.TransactionClient {
    return (transaction as unknown as Prisma.TransactionClient) ?? this.prisma;
  }

  /**
   * searchQuery の WHERE 条件を構築する共通メソッド
   */
  private buildSearchWhere(searchQuery?: string): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findById(id: UserId, transaction?: ITransaction): Promise<User | null> {
    this.logger.info('ユーザーID検索開始', { userId: id.value });

    return repositoryOperation(
      async () => {
        const client = this.getClient(transaction);
        const userData = await client.user.findUnique({
          where: { id: id.value },
        });

        if (userData) {
          this.logger.info('ユーザーID検索成功', {
            userId: id.value,
            email: userData.email,
          });
          return this.toDomainObject(userData);
        } else {
          this.logger.info('ユーザーが見つかりません', { userId: id.value });
          return null;
        }
      },
      this.logger,
      { operation: 'ID検索', entity: 'ユーザー', params: { userId: id.value } },
      'ユーザーの検索に失敗しました',
      'USER_FIND_FAILED',
    );
  }

  async findByEmail(email: Email): Promise<User | null> {
    this.logger.info('ユーザーEmail検索開始', { email: email.value });

    return repositoryOperation(
      async () => {
        const userData = await this.prisma.user.findUnique({
          where: { email: email.value },
        });

        if (userData) {
          this.logger.info('ユーザーEmail検索成功', {
            email: email.value,
            userId: userData.id,
          });
          return this.toDomainObject(userData);
        } else {
          this.logger.info('Emailに一致するユーザーが見つかりません', {
            email: email.value,
          });
          return null;
        }
      },
      this.logger,
      {
        operation: 'Email検索',
        entity: 'ユーザー',
        params: { email: email.value },
      },
      'ユーザーの検索に失敗しました',
      'USER_FIND_FAILED',
    );
  }

  async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
    this.logger.info('ユーザー条件検索開始', { criteria });

    return repositoryOperation(
      async () => {
        const where = this.buildSearchWhere(criteria.searchQuery);

        const users = await this.prisma.user.findMany({
          where,
          orderBy: {
            [criteria.sortBy ?? 'createdAt']: criteria.sortOrder ?? 'desc',
          },
          skip: criteria.page
            ? (criteria.page - 1) * (criteria.limit ?? DEFAULT_PAGE_SIZE)
            : 0,
          take: criteria.limit ?? DEFAULT_PAGE_SIZE,
        });

        this.logger.info('ユーザー条件検索成功', { count: users.length });
        return users.map(this.toDomainObject);
      },
      this.logger,
      { operation: '条件検索', entity: 'ユーザー', params: { criteria } },
      'ユーザーの検索に失敗しました',
      'USER_FIND_FAILED',
    );
  }

  async save(user: User, transaction?: ITransaction): Promise<void> {
    this.logger.info('ユーザー保存開始', {
      userId: user.id.value,
      email: user.email.value,
    });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(user);

      await client.user.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          email: data.email,
          updatedAt: data.updatedAt,
        },
        create: data,
      });

      this.logger.info('ユーザー保存成功', {
        userId: user.id.value,
        email: user.email.value,
      });
    } catch (error) {
      this.logger.error('ユーザー保存に失敗', {
        userId: user.id.value,
        email: user.email.value,
        ...toErrorMeta(error),
      });

      // Prismaエラーを適切なドメインエラーに変換
      mapPrismaError(error, {
        p2002Email: 'メールアドレスが既に使用されています',
      });

      throw new DomainError('ユーザーの保存に失敗しました', 'USER_SAVE_FAILED');
    }
  }

  async update(user: User, transaction?: ITransaction): Promise<void> {
    this.logger.info('ユーザー更新開始', {
      userId: user.id.value,
      email: user.email.value,
    });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(user);

      await client.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          updatedAt: data.updatedAt,
        },
      });

      this.logger.info('ユーザー更新成功', {
        userId: user.id.value,
        email: user.email.value,
      });
    } catch (error) {
      this.logger.error('ユーザー更新に失敗', {
        userId: user.id.value,
        email: user.email.value,
        ...toErrorMeta(error),
      });

      // Prismaエラーを適切なドメインエラーに変換
      mapPrismaError(error, {
        p2002Email: 'メールアドレスが既に使用されています',
        p2025: '更新対象のユーザーが見つかりません',
      });

      throw new DomainError(
        'ユーザーの更新に失敗しました',
        'USER_UPDATE_FAILED',
      );
    }
  }

  async delete(id: UserId): Promise<void> {
    this.logger.info('ユーザー削除開始', { userId: id.value });

    try {
      await this.prisma.user.delete({
        where: { id: id.value },
      });

      this.logger.info('ユーザー削除成功', { userId: id.value });
    } catch (error) {
      this.logger.error('ユーザー削除に失敗', {
        userId: id.value,
        ...toErrorMeta(error),
      });

      // Prismaエラーを適切なドメインエラーに変換
      mapPrismaError(error, {
        p2025: '削除対象のユーザーが見つかりません',
      });

      throw new DomainError(
        'ユーザーの削除に失敗しました',
        'USER_DELETE_FAILED',
      );
    }
  }

  async count(searchQuery?: string): Promise<number> {
    this.logger.info('ユーザー数カウント開始', { searchQuery });

    return repositoryOperation(
      async () => {
        const where = this.buildSearchWhere(searchQuery);

        const total = await this.prisma.user.count({ where });
        this.logger.info('ユーザー数カウント成功', { total });
        return total;
      },
      this.logger,
      { operation: '数カウント', entity: 'ユーザー', params: { searchQuery } },
      'ユーザー数の取得に失敗しました',
      'USER_COUNT_FAILED',
    );
  }

  // ドメインオブジェクト変換（Infrastructure層の責務）
  private toDomainObject = toUserEntity;

  // 永続化オブジェクト変換（Infrastructure層の責務）
  private toPersistenceObject(user: User) {
    return {
      id: user.id.value,
      email: user.email.value,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
