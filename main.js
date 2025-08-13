/**
 * electron用mainスクリプト
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { BrowserWindow, app } = require('electron');
const { nextStart } = require('next/dist/cli/next-start');

let serverStarted = false;

async function startNextServer() {
  if (serverStarted) return;

  try {
    console.log('Starting Next.js server...');
    await nextStart({
      port: 3000,
      dev: false,
      dir: process.cwd(),
    });
    serverStarted = true;
    console.log('Next.js server started successfully');
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
    throw error;
  }
}

async function waitForServer(port = 3000, maxRetries = 30, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 5000,
          },
          (res) => {
            if (res.statusCode < 400) {
              console.log('Server is ready');
              resolve(true);
            } else {
              reject(
                new Error(`Server responded with status ${res.statusCode}`),
              );
            }
          },
        );

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      });

      return true;
    } catch (error) {
      console.log(
        `Waiting for server... (${i + 1}/${maxRetries}): ${error.message}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error('Server did not start within the expected time');
}

async function createWindow() {
  try {
    try {
      // 開発中かビルド済みかを判別する
      await fs.promises.stat('./.gitignore');
    } catch {
      process.chdir(path.dirname(app.getPath('exe')));
    }
  } catch (e) {
    console.error('Failed to change directory:', e);
  }

  // データベースパスの設定
  const dbPath = path.resolve(app.getPath('userData'), 'db', 'db.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('Database path:', dbPath);

  try {
    // Next.jsサーバーを起動
    await startNextServer();

    // サーバーの起動を待機
    await waitForServer(3000);

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 開発者ツールを開く（デバッグ用）
    win.webContents.openDevTools();

    await win.loadURL('http://localhost:3000/');
    console.log('Window loaded successfully');
  } catch (error) {
    console.error('Failed to create window:', error);

    // エラーページを表示
    const errorWin = new BrowserWindow({
      width: 600,
      height: 400,
    });

    const errorHtml = `
      <html>
        <body>
          <h1>アプリケーションの起動に失敗しました</h1>
          <p>エラー: ${error.message}</p>
          <p>詳細はコンソールを確認してください。</p>
        </body>
      </html>
    `;

    errorWin.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`,
    );
  }
}

void app.whenReady().then(async () => {
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  console.log('Application is quitting...');
});
