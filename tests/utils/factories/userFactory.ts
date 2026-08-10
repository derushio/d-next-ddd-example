import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

/**
 * User ドメインエンティティ Factory
 *
 * fishery + @faker-js/faker を使用したテスト用ファクトリー。
 * - build(): ドメインエンティティ（User）を生成
 * - buildPrisma(): Prismaが返す生データ形式（plain object）を生成
 *
 * 使用例:
 * ```ts
 * // デフォルト
 * const user = userFactory.build();
 *
 * // 一部を上書き
 * const user = userFactory.build({ name: 'Alice' });
 *
 * // 特定メールアドレスで生成
 * const user = userFactory.build({}, { transient: { emailValue: 'alice@example.com' } });
 * ```
 */

type UserTransientParams = {
  emailValue?: string;
  passwordHash?: string;
};

export const userFactory = Factory.define<User, UserTransientParams>(
  ({ transientParams }) => {
    const emailValue =
      transientParams.emailValue ?? faker.internet.email().toLowerCase();
    const passwordHash =
      transientParams.passwordHash ?? `hashed_${faker.string.alphanumeric(32)}`;

    return User.create(
      new Email(emailValue),
      faker.person.fullName(),
      passwordHash,
    );
  },
);

/**
 * Prismaが返す生データ形式のユーザーオブジェクト Factory
 *
 * Infrastructure層のRepository実装テスト等で使用。
 * User entity ではなく plain object を生成する。
 *
 * 使用例:
 * ```ts
 * const prismaUser = userPrismaDataFactory.build();
 * mockPrismaClient.user.findUnique.mockResolvedValue(prismaUser);
 * ```
 */
type PrismaUserData = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export const userPrismaDataFactory = Factory.define<PrismaUserData>(() => {
  const createdAt = faker.date.past({ years: 1 });
  return {
    id: new UserId(faker.string.alphanumeric({ length: 24, casing: 'lower' }))
      .value,
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    passwordHash: `hashed_${faker.string.alphanumeric(32)}`,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
  };
});
