import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
import { IUserRepository, UserSearchCriteria } from '@/layers/domain/repositories/IUserRepository';
import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient
  ) {}

  async findById(id: UserId, transaction?: unknown): Promise<User | null> {
    const client = (transaction as PrismaClient) || this.prisma;
    const userData = await client.user.findUnique({
      where: { id: id.toString() }
    });

    return userData ? this.toDomainObject(userData) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { email: email.toString() }
    });

    return userData ? this.toDomainObject(userData) : null;
  }

  async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (criteria.searchQuery) {
      where.OR = [
        { name: { contains: criteria.searchQuery, mode: 'insensitive' } },
        { email: { contains: criteria.searchQuery, mode: 'insensitive' } }
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
      orderBy: { [criteria.sortBy || 'createdAt']: criteria.sortOrder || 'desc' },
      skip: criteria.page ? (criteria.page - 1) * (criteria.limit || 10) : 0,
      take: criteria.limit || 10
    });

    return users.map(this.toDomainObject);
  }

  async save(user: User, transaction?: unknown): Promise<void> {
    const client = (transaction as PrismaClient) || this.prisma;
    const data = this.toPersistenceObject(user);

    await client.user.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        email: data.email,
        updatedAt: data.updatedAt
      },
      create: data
    });
  }

  async update(user: User, transaction?: unknown): Promise<void> {
    const client = (transaction as PrismaClient) || this.prisma;
    const data = this.toPersistenceObject(user);

    await client.user.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        updatedAt: data.updatedAt
      }
    });
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id: id.toString() }
    });
  }

  async count(searchQuery?: string): Promise<number> {
    const where: Prisma.UserWhereInput = {};

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }

    return await this.prisma.user.count({ where });
  }

  // ドメインオブジェクト変換（Infrastructure層の責務）
  private toDomainObject(data: any): User {
    return User.reconstruct(
      new UserId(data.id),
      new Email(data.email),
      data.name,
      data.passwordHash,
      data.createdAt,
      data.updatedAt
    );
  }

  // 永続化オブジェクト変換（Infrastructure層の責務）
  private toPersistenceObject(user: User) {
    return {
      id: user.getId().toString(),
      email: user.getEmail().toString(),
      name: user.getName(),
      passwordHash: user.getPasswordHash(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt()
    };
  }
} 
