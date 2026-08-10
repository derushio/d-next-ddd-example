---
name: test-config-optimization
description: |
  テスト設定の最適化パターンを提供するスキル。
  environmentMatchGlobs による node/jsdom 分離、Playwright の trace/CI 設定、
  registerMockServices()/createDefaultMocks() DIセットアップパターン、
  github-actions reporter 設定を扱う。

  トリガー例:
  - 「vitest設定」「playwright設定」「テスト環境」「CI設定」
  - vitest.config.ts / playwright.config.ts を編集するとき
  - 「beforeEach DIコンテナ」「モック登録」「createMockServices」
  - tests/utils/ 配下のファイルを編集するとき
---

# Test Config Optimization Skill

テスト設定の最適化と DI コンテナセットアップのベストプラクティス。

---

## Vitest: environmentMatchGlobs による node/jsdom 分離

テストの実行環境は `environmentMatchGlobs` でファイルパスに基づいて自動選択する。
全テストを一律 `jsdom` にするのは Node.js のみで動くテスト（UseCase・Repository 等）を遅くする。

```typescript
// vitest.config.ts
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // デフォルトは node（高速）
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**/*'],
    // CI では github-actions reporter + verbose を使用
    reporters: process.env['CI'] ? ['github-actions', 'verbose'] : ['verbose'],
    // jsdom は React コンポーネントテストにのみ適用（パスで分離）
    environmentMatchGlobs: [
      ['tests/unit/components/**', 'jsdom'],
      ['tests/unit/hooks/**', 'jsdom'],
      ['tests/unit/app/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**分離ルール**:

| テスト種別 | 環境 | 理由 |
|-----------|------|------|
| UseCase / Repository / Service | `node` | DOM 不要、高速 |
| React コンポーネント / Hooks | `jsdom` | DOM API が必要 |
| Value Object / Entity | `node` | 純粋な TypeScript |

---

## Playwright: trace/CI 設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || (() => {
  if (process.env.CI) throw new Error('NEXT_PUBLIC_BASE_URL must be set in CI');
  return 'http://localhost:3000';
})();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 4 } : {}),
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    // ✅ 失敗時のみトレースを保持（CIでのデバッグに有効）
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    // ✅ CI では build && start（開発サーバーではなく本番ビルドでテスト）
    command: process.env['CI'] ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**CI での重要設定**:

- `trace: 'retain-on-failure'` — 失敗テストのみトレースを保存（全テストでは容量大）
- `build && start` — 本番ビルドをテストすることで dev サーバーの差異を検出
- `retries: 2` — CI 環境の不安定性に対応

---

## DI コンテナのテストセットアップ: registerMockServices() + createDefaultMocks()

`tests/utils/setup/diSetup.ts` に定義されたヘルパーを使用して、
`beforeEach` のボイラープレートを最小化する。

### 基本パターン

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import { createDefaultMocks, registerMockServices } from '@tests/utils/setup/diSetup';

describe('CreateUserUseCase', () => {
  let mocks: ReturnType<typeof createDefaultMocks<{
    userRepository: true;
    hashService: true;
    logger: true;
  }>>;

  beforeEach(() => {
    // ✅ createDefaultMocks で必要なモックのみ選択生成
    mocks = createDefaultMocks({
      userRepository: true,
      hashService: true,
      logger: true,
    });
    // ✅ registerMockServices が container.clearInstances() を自動呼び出し
    registerMockServices(mocks);
  });

  it('有効な入力でユーザーを作成できる', async () => {
    const useCase = container.resolve(CreateUserUseCase);

    mocks.mockUserRepository.findByEmail.mockResolvedValue(null);
    mocks.mockHashService.hash.mockResolvedValue('hashed_password');

    const result = await useCase.execute({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@1234!',
    });

    expect(result.isOk()).toBe(true);
  });
});
```

### UseCase に追加の依存がある場合: extraTokens

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import { mock } from 'vitest-mock-extended';
import type { IEmailService } from '@/layers/application/interfaces/IEmailService';

beforeEach(() => {
  const mockEmailService = mock<IEmailService>();
  mocks = createDefaultMocks({ userRepository: true, logger: true });

  // ✅ extraTokens で標準外のサービスを追加登録
  registerMockServices(mocks, [
    [INJECTION_TOKENS.EmailService, mockEmailService],
  ]);
});
```

### 禁止パターン: 手動 container 操作

```typescript
// ❌ 禁止: beforeEach ごとに手動で clearInstances + registerInstance
beforeEach(() => {
  container.clearInstances(); // registerMockServices が自動でやる
  mockUserRepository = createMock<IUserRepository>();
  container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  // ...
});
```

---

## github-actions reporter

CI 環境では `github-actions` reporter を使用することで、GitHub Actions のアノテーション（コード行への警告マーカー）が自動生成される。

```typescript
// vitest.config.ts
reporters: process.env['CI'] ? ['github-actions', 'verbose'] : ['verbose'],
```

**効果**:
- PR でテスト失敗時に、該当コード行にアノテーションが表示される
- `verbose` と組み合わせることでローカルと同等の詳細ログも保持

---

## テストファイルの配置規則

```
tests/
├── unit/
│   ├── layers/
│   │   ├── application/        # UseCase tests (node environment)
│   │   ├── domain/             # Entity/VO tests (node environment)
│   │   └── infrastructure/     # Repository tests (node environment)
│   ├── components/             # React component tests (jsdom environment)
│   └── hooks/                  # Custom hooks tests (jsdom environment)
├── e2e/                        # Playwright E2E tests
├── utils/
│   ├── setup/
│   │   └── diSetup.ts          # registerMockServices / createDefaultMocks
│   └── mocks/
│       └── autoMocks.ts        # createAutoMockXxx ファクトリ
└── setup.ts                    # Vitest グローバルセットアップ
```

---

## チェックリスト

### Vitest 設定

- [ ] `environment: 'node'` がデフォルト（全テストを jsdom にしていない）
- [ ] `environmentMatchGlobs` でコンポーネント/hooks テストのみ jsdom を使用
- [ ] CI では `reporters: ['github-actions', 'verbose']` を使用
- [ ] カバレッジ閾値が設定されている（lines/functions/branches/statements: 70）

### Playwright 設定

- [ ] `trace: 'retain-on-failure'` を設定している（`'on'` は容量超過の原因）
- [ ] `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` を設定
- [ ] CI 環境の webServer は `pnpm build && pnpm start` を使用
- [ ] `reuseExistingServer: !process.env.CI` でローカル開発サーバーを再利用

### DI テストセットアップ

- [ ] `createDefaultMocks()` で必要なモックのみ選択生成している
- [ ] `registerMockServices()` を使用して container.clearInstances() を自動化
- [ ] 標準外トークンは `extraTokens` パラメータで追加登録している
- [ ] 手動で `container.clearInstances()` + `container.registerInstance()` を繰り返していない

---

## 関連スキル

- **test-patterns**: UseCase/Repository のユニットテスト全体パターン
- **test-factory-patterns**: テストデータファクトリ（vitest-mock-extended）
- **e2e-principles**: E2E テストの設計原則
