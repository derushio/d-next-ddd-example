/**
 * electron用mainスクリプト
 */

const fs = require('fs');
const path = require('path');
const { BrowserWindow, app } = require('electron');
const { nextStart } = require('next/dist/cli/next-start');

async function createWindow() {
  try {
    try {
      // 開発中かビルド済みかを判別する
      await fs.promises.stat('./.gitignore');
    } catch {
      process.chdir(path.dirname(app.getPath('exe')));
    }
  } catch (e) {
    console.error(e);
  }

  process.env.DATABASE_URL = `file:${path.resolve(app.getPath('userData'), 'db', 'db.db')}`;

  void nextStart({
    port: 3000,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  await win.loadURL('http://localhost:3000/splash');
}

void app.whenReady().then(async () => {
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
