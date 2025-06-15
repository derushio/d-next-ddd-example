import fs from 'fs';

async function main() {
  const packageJsonPath = './package.json';

  // Read and parse the package.json file
  const packageJson = JSON.parse(
    await fs.promises.readFile(packageJsonPath, 'utf-8'),
  );

  // Update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    dev: 'pnpm run-p next:dev db:generate:watch db:studio',
    build: 'pnpm run-s db:generate next:build',
    start: 'pnpm next:start',
    lint: 'pnpm next:lint',
    format: 'pnpm prettier -w package.json src',
    'next:dev': 'next dev --turbopack',
    'next:build': 'next build',
    'next:start': 'next start',
    'next:lint': 'next lint',
    'db:generate': 'pnpm prisma generate --sql',
    'db:generate:watch': 'pnpm prisma generate --sql --watch',
    'db:format': 'pnpm prisma format',
    'db:push': 'pnpm prisma db push',
    'db:migrate:dev': 'pnpm prisma migrate dev',
    'db:migrate:deploy': 'pnpm prisma migrate deploy',
    'db:seed': 'pnpm prisma db seed',
    'db:studio': 'pnpm prisma studio --browser google-chrome-stable',
    'hash:generate': 'pnpm dotenvx run -- pnpm tsx ./src/tools/generateHash.ts',
    postinstall: 'flowbite-react patch',
  };

  // Update prisma configuration
  packageJson.prisma = {
    seed: 'pnpm tsx ./src/data-accesses/infra/prisma/seeds/index.ts',
  };

  // Write the updated package.json back to the file
  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2), // Pretty-print with 2-space indentation
  );

  console.log('package.json updated successfully!');
}

void main();
