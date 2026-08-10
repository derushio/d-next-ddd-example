import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { UserSession } from '@/layers/domain/entities/UserSession';
import { SessionId } from '@/layers/domain/value-objects/SessionId';
import { UserId } from '@/layers/domain/value-objects/UserId';

/**
 * UserSession ドメインエンティティ Factory
 *
 * fishery + @faker-js/faker を使用したテスト用ファクトリー。
 * - build(): ドメインエンティティ（UserSession）を生成
 * - buildPrisma(): Prismaが返す生データ形式（plain object）を生成
 *
 * 使用例:
 * ```ts
 * // デフォルト（有効なセッション）
 * const session = userSessionFactory.build();
 *
 * // 特定のuserId を持つセッション
 * const session = userSessionFactory.build({}, { transient: { userIdValue: 'user-id-xxx' } });
 *
 * // 期限切れセッション
 * const session = userSessionFactory.build({}, { transient: { expired: true } });
 * ```
 */

type UserSessionTransientParams = {
  userIdValue?: string;
  accessTokenHash?: string;
  resetTokenHash?: string;
  /** true にすると期限切れのセッションを生成 */
  expired?: boolean;
};

export const userSessionFactory = Factory.define<
  UserSession,
  UserSessionTransientParams
>(({ transientParams }) => {
  const userIdValue =
    transientParams.userIdValue ??
    faker.string.alphanumeric({ length: 24, casing: 'lower' });
  const accessTokenHash =
    transientParams.accessTokenHash ??
    `access_${faker.string.alphanumeric(64)}`;
  const resetTokenHash =
    transientParams.resetTokenHash ?? `reset_${faker.string.alphanumeric(64)}`;

  const expired = transientParams.expired ?? false;

  const accessTokenExpireAt = expired
    ? faker.date.past({ years: 1 }) // 過去の日付（期限切れ）
    : faker.date.future({ years: 1 }); // 未来の日付（有効）

  const resetTokenExpireAt = expired
    ? faker.date.past({ years: 1 })
    : faker.date.future({ years: 1 }); // 未来の日付（有効）

  return UserSession.create(
    new UserId(userIdValue),
    accessTokenHash,
    accessTokenExpireAt,
    resetTokenHash,
    resetTokenExpireAt,
  );
});

/**
 * Prismaが返す生データ形式のセッションオブジェクト Factory
 *
 * Infrastructure層のRepository実装テスト等で使用。
 * UserSession entity ではなく plain object を生成する。
 *
 * 使用例:
 * ```ts
 * const prismaSession = userSessionPrismaDataFactory.build();
 * mockPrismaClient.userSession.findFirst.mockResolvedValue(prismaSession);
 * ```
 */
type PrismaUserSessionData = {
  id: string;
  userId: string;
  accessTokenHash: string;
  accessTokenExpireAt: Date;
  resetTokenHash: string;
  resetTokenExpireAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const userSessionPrismaDataFactory =
  Factory.define<PrismaUserSessionData>(() => {
    const createdAt = faker.date.past({ years: 1 });

    return {
      id: new SessionId(
        faker.string.alphanumeric({ length: 24, casing: 'lower' }),
      ).value,
      userId: faker.string.alphanumeric({ length: 24, casing: 'lower' }),
      accessTokenHash: `access_${faker.string.alphanumeric(64)}`,
      accessTokenExpireAt: faker.date.future({ years: 1 }),
      resetTokenHash: `reset_${faker.string.alphanumeric(64)}`,
      resetTokenExpireAt: faker.date.future({ years: 1 }),
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    };
  });
