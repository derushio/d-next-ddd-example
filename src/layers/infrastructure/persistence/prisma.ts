import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL 環境変数が設定されていません。.env ファイルを確認してください。',
    );
  }
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

/**
 * PrismaClientのlazy singleton。
 * モジュールインポート時ではなく、最初にアクセスされた時点でインスタンスを生成する。
 * これにより、テスト環境でDIコンテナ経由でインポートされた場合でも
 * DATABASE_URLが不要なテストではエラーが発生しない。
 */
export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

/**
 * getPrismaClient() への後方互換 Proxy export。
 * 直接フィールドアクセス（prisma.user.findMany 等）を lazy に委譲する。
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
