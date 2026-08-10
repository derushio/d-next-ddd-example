import { fileURLToPath } from 'node:url';
import { resolve } from '@/di/resolver';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

const user = {
  name: 'テストユーザー',
  email: 'test@example.com',
  password: 'Test@1234!',
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

// このファイルが直接実行された場合のみmainを実行（ESM互換）
const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main();
}
