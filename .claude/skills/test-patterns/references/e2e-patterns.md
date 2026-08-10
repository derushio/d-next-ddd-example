# E2Eテストパターン詳細リファレンス

このドキュメントでは、Playwrightを使用したE2Eテストの詳細な実装パターンを説明します。

---

## 📋 目次

- [基本構造](#基本構造)
- [認証フローテスト](#認証フローテスト)
- [フォーム操作テスト](#フォーム操作テスト)
- [ページオブジェクトパターン](#ページオブジェクトパターン)
- [待機・同期処理](#待機同期処理)
- [Playwright設定](#playwright設定)
- [デバッグ・トラブルシューティング](#デバッグトラブルシューティング)

---

## 基本構造

### Arrange-Act-Assert パターン

```typescript
// tests/e2e/example.spec.ts
import { expect, test } from '@playwright/test';

test.describe('機能名', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: 各テスト前の共通処理
    await page.goto('/');
  });

  test('正常系: 期待される動作', async ({ page }) => {
    // Arrange - テスト準備
    await page.fill('[data-testid="input"]', 'テストデータ');

    // Act - 操作実行
    await page.click('[data-testid="submit-button"]');

    // Assert - 結果確認
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    await expect(page.locator('[data-testid="result"]')).toContainText('成功');
  });

  test('異常系: エラーハンドリング', async ({ page }) => {
    // 不正なデータでテスト
    await page.fill('[data-testid="input"]', '');
    await page.click('[data-testid="submit-button"]');

    // エラーメッセージの確認
    await expect(page.locator('[data-testid="error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error"]')).toContainText('入力が必要です');
  });
});
```

---

## 認証フローテスト

### サインイン → ダッシュボード → ログアウトの完全フロー

```typescript
// tests/e2e/auth/sign-in.spec.ts
import { expect, test } from '@playwright/test';

test.describe('認証フロー', () => {
  test('サインイン → ダッシュボード → ログアウト', async ({ page }) => {
    // 🔑 サインインページに移動
    await page.goto('/auth/sign-in');

    // 📝 認証情報入力
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');

    // 🚀 サインイン実行
    await page.click('[data-testid="sign-in-button"]');

    // ✅ ダッシュボードリダイレクト確認
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // 🔓 ログアウト実行
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // ✅ サインインページリダイレクト確認
    await expect(page).toHaveURL('/auth/sign-in');
    await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible();
  });

  test('無効な認証情報でエラー表示', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // ❌ 無効な認証情報
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="sign-in-button"]');

    // ⚠️ エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('認証に失敗しました');
  });
});
```

---

## フォーム操作テスト

### ユーザー作成フォームの例

```typescript
// tests/e2e/user/create-user.spec.ts
import { expect, test } from '@playwright/test';

test.describe('ユーザー作成フォーム', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済み状態でユーザー作成ページに移動
    await page.goto('/auth/sign-in');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="sign-in-button"]');
    await page.goto('/users/create');
  });

  test('正常系: ユーザー作成成功', async ({ page }) => {
    // 📝 ユーザー情報入力
    await page.fill('[data-testid="user-name"]', '新規ユーザー');
    await page.fill('[data-testid="user-email"]', 'newuser@example.com');
    await page.fill('[data-testid="user-password"]', 'securepassword');

    // 🚀 送信実行
    await page.click('[data-testid="create-user-button"]');

    // ✅ 成功メッセージ確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('ユーザーを作成しました');

    // 📋 ユーザー一覧ページにリダイレクト
    await expect(page).toHaveURL('/users');
    await expect(page.locator('[data-testid="user-list"]')).toContainText('新規ユーザー');
  });

  test('異常系: バリデーションエラー', async ({ page }) => {
    // ❌ 必須フィールドを空のまま送信
    await page.click('[data-testid="create-user-button"]');

    // ⚠️ バリデーションエラー確認
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toContainText('名前は必須です');

    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('メールアドレスは必須です');
  });
});
```

---

## ページオブジェクトパターン

### 再利用可能なページクラス

```typescript
// tests/e2e/pages/SignInPage.ts
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SignInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  async signIn(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="sign-in-button"]');
  }

  async expectSignInError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
  }

  async expectSignInSuccess() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### テストでの使用

```typescript
// tests/e2e/auth/sign-in-with-po.spec.ts
import { expect, test } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

test.describe('サインイン（ページオブジェクト使用）', () => {
  test('有効な認証情報でサインインできる', async ({ page }) => {
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.signIn('test@example.com', 'password123');
    await signInPage.expectSignInSuccess();
  });

  test('無効な認証情報でエラーが表示される', async ({ page }) => {
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.signIn('invalid@example.com', 'wrongpassword');
    await signInPage.expectSignInError('認証に失敗しました');
  });
});
```

---

## 待機・同期処理

### ✅ 推奨: 状態ベースの待機

```typescript
// 要素の表示/非表示を待機
await expect(page.locator('[data-testid="loading"]')).toBeHidden();
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ネットワーク完了を待機
await page.waitForLoadState('networkidle');

// 特定の要素が存在するまで待機
await page.waitForSelector('[data-testid="content"]');

// URL変更を待機
await page.waitForURL('/dashboard');
```

### ⚠️ 許容される waitForTimeout のケース

| ケース | 理由 | 推奨時間 |
| --- | --- | --- |
| **アニメーション完了待ち** | CSSトランジション等で検知可能な状態変化がない場合 | 300-500ms |
| **デバウンス処理待ち** | 入力後のデバウンス処理が完了するまでの待機 | デバウンス時間 + 100ms |
| **外部サービス反映待ち** | APIレスポンス後、UIに反映されるまでの非同期処理 | 100-300ms |
| **レースコンディション回避** | 複数の非同期処理の競合を避ける最終手段 | 50-100ms |

```typescript
// ✅ 許容: アニメーション完了待ち（状態変化を検知できない場合）
await page.click('[data-testid="expand-button"]');
await page.waitForTimeout(300); // CSS transition: 0.3s の完了待ち
await expect(page.locator('[data-testid="expanded-content"]')).toBeVisible();

// ✅ 許容: デバウンス処理待ち
await page.fill('[data-testid="search-input"]', 'test query');
await page.waitForTimeout(350); // 300ms debounce + 50ms buffer
await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
```

### ❌ 非推奨: 根拠のない固定時間待機

```typescript
// ❌ 避ける: 長時間の固定待機
await page.waitForTimeout(5000); // 根本原因を調査すべき
```

---

## Playwright設定

### 基本設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,

  // 🎨 複数レポーター設定
  reporter: [
    ['html', { open: 'never' }], // HTMLレポート生成
    ['list'], // コンソールリスト表示
    ['json', { outputFile: 'test-results/results.json' }], // JSON結果出力
  ],

  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,

    // 🎬 視覚的確認のための設定
    trace: 'on', // 全テストでトレース記録
    video: 'retain-on-failure', // 失敗時にビデオ保存
    screenshot: 'only-on-failure', // 失敗時にスクリーンショット

    // 🐌 開発時はスローモーション（500ms間隔）
    launchOptions: {
      slowMo: process.env.CI ? 0 : 500,
    },
  },

  // 🌐 マルチブラウザテスト
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

  // 🚀 開発サーバー自動起動
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 並列実行の最適化

```typescript
export default defineConfig({
  fullyParallel: true,
  workers: 4, // CI/ローカル共通で4並列
  retries: process.env.CI ? 2 : 0, // CI環境では2回リトライ
});
```

---

## デバッグ・トラブルシューティング

### デバッグコマンド

```bash
# UI Mode（最も推奨）
pnpm test:e2e:ui

# デバッグモード（ステップ実行）
pnpm test:e2e:debug

# ブラウザ表示モード
pnpm test:e2e:headed

# トレース付き実行
pnpm test:e2e:trace

# HTMLレポート表示
pnpm test:e2e:report
```

### よくある問題と解決法

#### 1. テストが不安定（フレーキー）

```typescript
// ✅ 解決法: 適切な待機処理
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ✅ 解決法: retry設定
test.describe.configure({ retries: 2 });
```

#### 2. セレクタが見つからない

```bash
# UI Modeでピッカーを使用してセレクタ確認
pnpm test:e2e:ui
```

#### 3. パフォーマンス問題

```typescript
// ✅ 解決法: 不要なリソース読み込みブロック
await page.route('**/*.{png,jpg,jpeg}', (route) => route.abort());
```

### UI Mode の活用

1. **📁 テストファイル選択**: 左側のファイルツリーから編集したいテストを選択
2. **🎬 実行確認**: 現在のテストを実行して動作確認
3. **🔧 コード編集**: エディタでテストコードを編集
4. **🔄 即座再実行**: 変更後すぐに再実行して確認
5. **🎭 ピッカー使用**: 新しいセレクタを画面上で視覚的に選択

---

## データ準備とクリーンアップ

```typescript
test.describe('データ依存テスト', () => {
  test.beforeEach(async ({ page }) => {
    // テストデータセットアップ
    await page.goto('/admin/test-data-setup');
    await page.click('[data-testid="create-test-data"]');
  });

  test.afterEach(async ({ page }) => {
    // テストデータクリーンアップ
    await page.goto('/admin/test-data-cleanup');
    await page.click('[data-testid="cleanup-test-data"]');
  });

  test('データ操作テスト', async ({ page }) => {
    // テストコード
  });
});
```

---

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Playwright UI Mode](https://playwright.dev/docs/test-ui-mode)
- [E2Eテスト実践ガイド](_DOCS/guides/e2e-testing-guide.md)

---

**詳細な実装例は `_DOCS/guides/e2e-testing-guide.md` も参照してください。**
