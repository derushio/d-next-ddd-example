import { prisma } from '@/layers/infrastructure/persistence/prisma';
import { createMigrationTable } from '@/layers/infrastructure/persistence/prisma/generated/sql/createMigrationTable';
import { insertFinishedMigration } from '@/layers/infrastructure/persistence/prisma/generated/sql/insertFinishedMigration';
import { queryFinishedMigrations } from '@/layers/infrastructure/persistence/prisma/generated/sql/queryFinishedMigrations';
import { Env } from '@/app/server-actions/env/Env';
import { uuidv4 } from '@/utils/uuidv4';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import touch from 'touch';

const migdir = path.join('prisma', 'migrations');

export async function migrate() {
  const databaseUrl = Env.DATABASE_URL.replace('file:', '');
  await fs.promises.mkdir(path.dirname(databaseUrl), {
    recursive: true,
  });
  await touch(databaseUrl);
  await prisma.$queryRawTyped(createMigrationTable());

  const finishedMigrations = (
    await prisma.$queryRawTyped<{
      migration_name: string;
    }>(queryFinishedMigrations())
  ).map((v) => v.migration_name);

  const migrations = (
    await fs.promises.readdir(migdir, {
      withFileTypes: true,
    })
  )
    .filter((v) => v.isDirectory())
    .filter((v) => !finishedMigrations.includes(path.parse(v.name).name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((v) => v.name);

  for (const migration of migrations) {
    const migrationPath = path.join(migdir, migration, 'migration.sql');
    console.log(migrationPath);
    const fileContent = await fs.promises.readFile(migrationPath, 'utf-8');
    const checksum = crypto
      .createHash('sha256')
      .update(fileContent)
      .digest('hex');

    await prisma.$executeRawUnsafe(fileContent);
    await prisma.$queryRawTyped(
      insertFinishedMigration(
        uuidv4(),
        checksum,
        new Date(),
        migration,
        null,
        null,
        new Date(),
        1,
      ),
    );
  }
}
