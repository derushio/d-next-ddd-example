import fs from 'fs';

async function main() {
  const packageJsonPath = './package.json';

  // Read and parse the existing package.json file
  const packageJson = JSON.parse(
    await fs.promises.readFile(packageJsonPath, 'utf-8'),
  );

  // Update the main entry point
  packageJson.main = './main.js';

  // Add or update scripts
  packageJson.scripts = {
    ...packageJson.scripts, // Preserve existing scripts
    build: 'pnpm run-p db:migrate:dev next:build',
    'build:linux': 'pnpm electron-builder --linux --dir -c electron-build.yaml',
    'build:win':
      'pnpm electron-builder --win --universal --dir -c electron-build.yaml',
    'package:linux':
      'pnpm run-s db:migrate:dev db:seed db:generate build build:linux',
    'package:win':
      'pnpm run-s db:migrate:dev db:seed db:generate build build:win',
  };

  // Add or update the build configuration
  packageJson.build = {};

  packageJson.prisma = {};

  // Write the updated package.json back to the file
  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2), // Pretty-print with 2-space indentation
  );

  console.log('package.json updated successfully!');
}

// Execute the main function
void main();
