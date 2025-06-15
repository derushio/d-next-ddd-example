import { seedTestUser } from '@/layers/infrastructure/persistence/prisma/seeds/seedTestUser';

export async function seed() {
  await seedTestUser();
}

void seed();
