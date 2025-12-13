import { INJECTION_TOKENS } from '@/di/tokens';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import {
  IUserRepository,
  UserSearchCriteria,
} from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type {
  Prisma,
  PrismaClient,
  User as PrismaUser,
} from '@/layers/infrastructure/persistence/prisma/generated';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async findById(id: UserId, transaction?: unknown): Promise<User | null> {
    this.logger.info('ユーザーID検索開始', { userId: id.toString() });

    try {
      const client = (transaction as PrismaClient) || this.prisma;
      const userData = await client.user.findUnique({
        where: { id: id.toString() },
      });

      if (userData) {
        this.logger.info('ユーザーID検索成功', {
          userId: id.toString(),
          email: userData.email,
        });
        return this.toDomainObject(userData);
      } else {
        this.logger.info('ユーザーが見つかりません', { userId: id.toString() });
        return null;
      }
    } catch (error) {
      this.logger.error('ユーザーID検索に失敗', {
        userId: id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 検索エラーの場合はnullを返す（ユーザー不存在として扱う）
      return null;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    this.logger.info('ユーザーEmail検索開始', { email: email.toString() });

    try {
      const userData = await this.prisma.user.findUnique({
        where: { email: email.toString() },
      });

      if (userData) {
        this.logger.info('ユーザーEmail検索成功', {
          email: email.toString(),
          userId: userData.id,
        });
        return this.toDomainObject(userData);
      } else {
        this.logger.info('Emailに一致するユーザーが見つかりません', {
          email: email.toString(),
        });
        return null;
      }
    } catch (error) {
      this.logger.error('ユーザーEmail検索に失敗', {
        email: email.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 検索エラーの場合はnullを返す（ユーザー不存在として扱う）
      return null;
    }
  }

  async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (criteria.searchQuery) {
      where.OR = [
        { name: { contains: criteria.searchQuery, mode: 'insensitive' } },
        { email: { contains: criteria.searchQuery, mode: 'insensitive' } },
      ];
    }

    // experiencePointsフィールドがない場合は、レベルでフィルタ
    if (criteria.minLevel !== undefined) {
      // 仮の実装：レベルフィールドがない場合の対応
      // where.level = { gte: criteria.minLevel };
    }

    if (criteria.isActive !== undefined) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // lastLoginAtフィールドがない場合の対応
      // where.lastLoginAt = criteria.isActive
      //   ? { gte: thirtyDaysAgo }
      //   : { lt: thirtyDaysAgo };
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: {
        [criteria.sortBy || 'createdAt']: criteria.sortOrder || 'desc',
      },
      skip: criteria.page ? (criteria.page - 1) * (criteria.limit || 10) : 0,
      take: criteria.limit || 10,
    });

    return users.map(this.toDomainObject);
  }

  async save(user: User, transaction?: unknown): Promise<void> {
    this.logger.info('ユーザー保存開始', {
      userId: user.id.toString(),
      email: user.email.toString(),
    });

    try {
      const client = (transaction as PrismaClient) || this.prisma;
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
        userId: user.id.toString(),
        email: user.email.toString(),
      });
    } catch (error) {
      this.logger.error('ユーザー保存に失敗', {
        userId: user.id.toString(),
        email: user.email.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Prismaエラーを適切なドメインエラーに変換
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          if (error.message.includes('email')) {
            throw new DomainError(
              'メールアドレスが既に使用されています',
              'EMAIL_DUPLICATE',
            );
          }
        }
      }

      throw new DomainError('ユーザーの保存に失敗しました', 'USER_SAVE_FAILED');
    }
  }

  async update(user: User, transaction?: unknown): Promise<void> {
    this.logger.info('ユーザー更新開始', {
      userId: user.id.toString(),
      email: user.email.toString(),
    });

    try {
      const client = (transaction as PrismaClient) || this.prisma;
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
        userId: user.id.toString(),
        email: user.email.toString(),
      });
    } catch (error) {
      this.logger.error('ユーザー更新に失敗', {
        userId: user.id.toString(),
        email: user.email.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Prismaエラーを適切なドメインエラーに変換
      if (error instanceof Error) {
        if (error.message.includes('Record to update not found')) {
          throw new DomainError(
            '更新対象のユーザーが見つかりません',
            'USER_NOT_FOUND',
          );
        }
        if (error.message.includes('Unique constraint')) {
          if (error.message.includes('email')) {
            throw new DomainError(
              'メールアドレスが既に使用されています',
              'EMAIL_DUPLICATE',
            );
          }
        }
      }

      throw new DomainError(
        'ユーザーの更新に失敗しました',
        'USER_UPDATE_FAILED',
      );
    }
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id: id.toString() },
    });
  }

  async count(searchQuery?: string): Promise<number> {
    const where: Prisma.UserWhereInput = {};

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.user.count({ where });
  }

  // ドメインオブジェクト変換（Infrastructure層の責務）
  private toDomainObject(data: PrismaUser): User {
    return User.reconstruct(
      new UserId(data.id),
      new Email(data.email),
      data.name,
      data.passwordHash,
      data.createdAt,
      data.updatedAt,
    );
  }

  // 永続化オブジェクト変換（Infrastructure層の責務）
  private toPersistenceObject(user: User) {
    return {
      id: user.id.toString(),
      email: user.email.toString(),
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
