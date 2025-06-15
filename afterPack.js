/**
 * electron-builder用afterPackスクリプト
 */

const fs = require('fs-extra');

async function afterPack(context) {
  const { appOutDir } = context;
  await fs.copy('node_modules', `${appOutDir}/node_modules`);
  await fs.copy('prisma', `${appOutDir}/prisma`);
  await fs.copy('.next', `${appOutDir}/.next`);
  await fs.copy('.env', `${appOutDir}/.env`);
  await fs.copy('public', `${appOutDir}/public`);

  // const outDir = `${appOutDir}/resources/app.asar.unpacked`;
  // 最近はこちららしい
  const outDir = `${appOutDir}/resources/app`;
  // await fs.copy('node_modules', `${outDir}/node_modules`);
}

module.exports = afterPack;
