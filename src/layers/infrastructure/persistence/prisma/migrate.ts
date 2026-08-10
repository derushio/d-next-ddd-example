import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import { createMigrationTable } from '@/layers/infrastructure/persistence/prisma/generated/sql/createMigrationTable';
import { insertFinishedMigration } from '@/layers/infrastructure/persistence/prisma/generated/sql/insertFinishedMigration';
import { queryFinishedMigrations } from '@/layers/infrastructure/persistence/prisma/generated/sql/queryFinishedMigrations';
import { env } from '@/lib/env';

const migdir = path.join('prisma', 'migrations');

export async function migrate() {
  const databaseUrl = env.DATABASE_URL.replace('file:', '');
  await fs.promises.mkdir(path.dirname(databaseUrl), {
    recursive: true,
  });
  const fh = await fs.promises.open(databaseUrl, 'a');
  await fh.close();
  await prisma.$queryRawTyped(createMigrationTable());

  const finishedMigrations = (
    await prisma.$queryRawTyped(queryFinishedMigrations())
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

    // SECURITY: 信頼されたローカルマイグレーションSQLファイルの実行
    // ユーザー入力は一切介在しないため $executeRawUnsafe の使用は安全
    await prisma.$executeRawUnsafe(fileContent);
    await prisma.$queryRawTyped(
      insertFinishedMigration(
        crypto.randomUUID(),
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
