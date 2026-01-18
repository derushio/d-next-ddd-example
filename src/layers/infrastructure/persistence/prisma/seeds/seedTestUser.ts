import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

const user = {
  name: 'テストユーザー',
  email: 'test@example.com',
  password: 'password',
};

export async function seedTestUser() {
  console.log(user);

  // DIコンテナからHashServiceを取得してハッシュ化
  const hashService = resolve('HashService');
  const hash = await hashService.generateHash(user.password);

  await prisma.$transaction(async (t) => {
    const userData = {
      id: 'm8kpy32b06shqbw7x5pgtaan',
      name: user.name,
      email: user.email,
      passwordHash: hash,
    } satisfies Prisma.UserCreateInput;

    await t.user.upsert({
      where: {
        id: userData.id,
      },
      create: userData,
      update: userData,
    });
  });
}

// 直接実行された場合のメイン処理
async function main() {
  try {
    console.log('🌱 シードデータの投入を開始します...');
    await seedTestUser();
    console.log('✅ シードデータの投入が完了しました');
  } catch (error) {
    console.error('❌ シードデータの投入に失敗しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// このファイルが直接実行された場合のみmainを実行
if (require.main === module) {
  main();
}
