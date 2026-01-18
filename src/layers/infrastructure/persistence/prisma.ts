import { Env } from '@/app/server-actions/env/Env';
import { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: Env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
