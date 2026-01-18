import { config } from '@dotenvx/dotenvx';
import { defineConfig } from 'prisma/config';

// dotenvxで変数展開をサポート
config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'pnpm tsx ./src/layers/infrastructure/persistence/prisma/seeds/seedTestUser.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
