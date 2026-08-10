import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type { User as PrismaUser } from '@/layers/infrastructure/persistence/prisma/generated';

/**
 * Prisma の User データを Domain の User Entity に変換する共通マッパー
 *
 * DRY原則:
 * - PrismaUserRepository / PrismaSessionRepository の両方で使われる
 *   User Entity マッピングロジックを一元管理
 *
 * 使用例:
 * ```ts
 * import { toUserEntity } from '@/layers/infrastructure/repositories/utils/entityMappers';
 *
 * const userEntity = toUserEntity(prismaUser);
 * ```
 */
export function toUserEntity(data: PrismaUser): User {
  return User.reconstruct(
    new UserId(data.id),
    new Email(data.email),
    data.name,
    data.passwordHash,
    data.createdAt,
    data.updatedAt,
  );
}
