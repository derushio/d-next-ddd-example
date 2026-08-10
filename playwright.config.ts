import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORTLESS_PORT = 1355;

// portless 名解決: worktree 半壊状態でも config 読込自体は通す。失敗時は null。
// baseURL 構築側で改めて fail-fast させる（沈黙フォールバック禁止）。
function resolvePortlessName(): string | null {
  try {
    const out = execFileSync('node', ['scripts/resolveProjectBase.mjs', '--portless-name'], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const portlessName = resolvePortlessName();

// portless self-signed CA trust (webServer health check + Node.js fetch)
const portlessCa = join(homedir(), '.portless', 'ca.pem');
if (!process.env.NODE_EXTRA_CA_CERTS && existsSync(portlessCa)) {
  process.env.NODE_EXTRA_CA_CERTS = portlessCa;
}

// baseURL 解決ポリシー:
// 1. NEXT_PUBLIC_BASE_URL があれば最優先で採用
// 2. CI で env 未設定 → 即エラー（沈黙して localhost:3000 に向かう事故を防止）
// 3. ローカルで portless 名解決失敗 → 即エラー（worktree 状態を直すよう促す）
// 4. それ以外 → portless HTTPS URL を構築
function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.CI) {
    throw new Error(
      'E2E baseURL: CI 環境では NEXT_PUBLIC_BASE_URL を必ず設定すること。'
        + ' 沈黙して localhost:3000 にフォールバックする経路は無効化されている。',
    );
  }
  if (!portlessName) {
    throw new Error(
      'E2E baseURL: portless 名の解決に失敗。'
        + ' NEXT_PUBLIC_BASE_URL を設定するか、scripts/resolveProjectBase.mjs が動作する状態にすること。',
    );
  }
  return `https://${portlessName}.localhost:${PORTLESS_PORT}`;
}

const baseURL = resolveBaseUrl();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/e2e/fixtures/globalSetup.ts'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 4 } : {}),
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: process.env['CI'] ? 'pnpm build && pnpm start' : 'pnpm dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
