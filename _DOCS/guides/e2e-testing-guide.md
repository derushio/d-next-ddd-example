# E2Eテスト実践ガイド 🎬

このガイドでは、Playwrightを使用したE2Eテストの実践的な実装と、グラフィカルな表示モードの活用方法について説明します。

---

## 🚀 E2Eテストの実行方法

### 基本的な実行コマンド

```bash
# 基本のE2Eテスト実行
pnpm test:e2e

# 全テスト（Unit + E2E）実行
pnpm test
```

### 🎯 グラフィカル表示モード（推奨）

#### 1. UI Mode - 最も推奨される開発手法

```bash
# PlaywrightのUI Modeでテスト開発・実行
pnpm test:e2e:ui
```

**UI Modeの特徴：**

- 🎬 **リアルタイム実行**: テスト実行中のブラウザ画面をリアルタイム確認
- 📋 **テスト選択**: 実行したいテストファイル・ケースを視覚的に選択
- 🔍 **ピッカー機能**: DOMセレクタを画面上で視覚的に選択
- ⏯️ **実行制御**: 一時停止・ステップ実行・再実行が可能
- 📊 **結果確認**: 成功・失敗・エラー内容の詳細確認
- 🐛 **デバッグ支援**: コードとブラウザ両方での同期デバッグ

#### 2. HTMLレポート - 実行後の詳細分析

```bash
# テスト実行後にHTMLレポート表示
pnpm test:e2e:report
```

**HTMLレポートの内容：**

- 📈 **実行サマリー**: テスト成功率・実行時間・カバレッジ情報
- 🖼️ **スクリーンショット**: 各ステップでの画面キャプチャ
- 🎬 **ビデオ再生**: 失敗したテストの実行過程動画
- 🔍 **トレースビューア**: DOM操作・ネットワーク・コンソールの詳細ログ
- 📱 **マルチブラウザ対応**: Chrome・Firefox・Safari別の結果表示

#### 3. デバッグモード - 問題解決支援

```bash
# ステップバイステップでデバッグ実行
pnpm test:e2e:debug

# ブラウザウィンドウを表示してテスト実行
pnpm test:e2e:headed

# 詳細トレース付きでテスト実行
pnpm test:e2e:trace
```

---

## ⚙️ Playwright設定の詳細

### プロジェクト設定

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
  baseURL: 'http://localhost:3000',

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

### 出力ファイルとディレクトリ

```
playwright-report/     # HTMLレポート
├── index.html        # メインレポート
├── trace/            # トレースファイル
├── videos/           # 失敗時ビデオ
└── screenshots/      # 失敗時スクリーンショット

test-results/         # 実行結果
├── results.json      # JSON形式結果
└── .last-run.json   # 最後の実行情報
```

---

## 📝 E2Eテストの書き方

### 基本的なテスト構造

```typescript
// tests/e2e/example.spec.ts
import { expect, test } from '@playwright/test';

test.describe('機能名', () => {
 test.beforeEach(async ({ page }) => {
  // 各テスト前の共通処理
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
  await expect(page.locator('[data-testid="error"]')).toContainText(
   '入力が必要です',
  );
 });
});
```

### 認証フローテスト例

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
  await expect(page.locator('[data-testid="error-message"]')).toContainText(
   '認証に失敗しました',
  );
 });
});
```

### フォーム操作テスト例

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
  await expect(page.locator('[data-testid="success-message"]')).toContainText(
   'ユーザーを作成しました',
  );

  // 📋 ユーザー一覧ページにリダイレクト
  await expect(page).toHaveURL('/users');
  await expect(page.locator('[data-testid="user-list"]')).toContainText(
   '新規ユーザー',
  );
 });

 test('異常系: バリデーションエラー', async ({ page }) => {
  // ❌ 必須フィールドを空のまま送信
  await page.click('[data-testid="create-user-button"]');

  // ⚠️ バリデーションエラー確認
  await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="name-error"]')).toContainText(
   '名前は必須です',
  );

  await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="email-error"]')).toContainText(
   'メールアドレスは必須です',
  );
 });
});
```

---

## 🎯 UI Mode での開発フロー

### 1. UI Mode 起動

```bash
pnpm test:e2e:ui
```

ブラウザでPlaywrightのUIが開きます。

### 2. テスト作成・編集フロー

1. **📁 テストファイル選択**: 左側のファイルツリーから編集したいテストを選択
2. **🎬 実行確認**: 現在のテストを実行して動作確認
3. **🔧 コード編集**: エディタでテストコードを編集
4. **🔄 即座再実行**: 変更後すぐに再実行して確認
5. **🎭 ピッカー使用**: 新しいセレクタを画面上で視覚的に選択

### 3. ピッカー機能の活用

UI Mode内でピッカーボタンをクリック → ブラウザ画面上の要素をクリック → 自動でセレクタが生成されます。

```typescript
// ピッカーで生成されたセレクタ例
await page.click('text="ログイン"');
await page.fill('input[name="email"]', 'test@example.com');
await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
```

### 4. ステップ実行とデバッグ

- **⏸️ ブレークポイント**: コード行にブレークポイントを設定
- **⏯️ ステップ実行**: 1行ずつ実行して動作確認
- **🔍 状態確認**: 各ステップでのDOM状態・ネットワーク・ログを確認

---

## 📊 HTMLレポートの活用

### レポートの見方

1. **📈 サマリー画面**

   - 全体の成功率・実行時間
   - ブラウザ別・テストファイル別の結果

2. **🔍 詳細画面**

   - 各テストケースの実行ログ
   - 失敗時のスクリーンショット
   - ネットワークログ・コンソールエラー

3. **🎬 トレースビューア**
   - テスト実行の全工程を時系列で確認
   - DOM変更・ユーザー操作・APIコールの詳細

### 失敗時の分析手順

```bash
# 1. 失敗したテストを特定
pnpm test:e2e:report

# 2. HTMLレポートで詳細確認
# - スクリーンショット確認
# - エラーメッセージ分析
# - ネットワークログ確認

# 3. トレースビューアで原因分析
# - 失敗直前の操作確認
# - DOM状態の変化確認
# - タイミング問題の特定

# 4. デバッグモードで詳細調査
pnpm test:e2e:debug
```

---

## 🛠️ 実践的なテスト技法

### 待機・同期処理

```typescript
// ✅ 推奨: 要素の状態を待機
await expect(page.locator('[data-testid="loading"]')).toBeHidden();
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ✅ 推奨: ネットワーク完了を待機
await page.waitForLoadState('networkidle');

// ❌ 非推奨: 固定時間待機
await page.waitForTimeout(5000); // 避ける
```

#### waitForTimeout が許容されるケース

基本的には状態ベースの待機を推奨しますが、以下のケースでは `waitForTimeout` の使用が許容されます：

| ケース | 理由 | 推奨時間 |
| --- | --- | --- |
| **アニメーション完了待ち** | CSSトランジション等で検知可能な状態変化がない場合 | 300-500ms |
| **デバウンス処理待ち** | 入力後のデバウンス処理が完了するまでの待機 | デバウンス時間 + 100ms |
| **外部サービス反映待ち** | APIレスポンス後、UIに反映されるまでの非同期処理 | 100-300ms |
| **レースコンディション回避** | 複数の非同期処理の競合を避ける最終手段 | 最小限（50-100ms） |

```typescript
// ✅ 許容: アニメーション完了待ち（状態変化を検知できない場合）
await page.click('[data-testid="expand-button"]');
await page.waitForTimeout(300); // CSS transition: 0.3s の完了待ち
await expect(page.locator('[data-testid="expanded-content"]')).toBeVisible();

// ✅ 許容: デバウンス処理待ち
await page.fill('[data-testid="search-input"]', 'test query');
await page.waitForTimeout(350); // 300ms debounce + 50ms buffer
await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

// ⚠️ 注意: 長時間の固定待機は避ける
// await page.waitForTimeout(5000); // ❌ 根本原因を調査すべき
```

**ベストプラクティス**: `waitForTimeout` を使用する場合は、コメントで理由を明記してください。

### データ準備とクリーンアップ

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
});
```

### ページオブジェクトパターン

```typescript
// tests/e2e/pages/SignInPage.ts
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
  await expect(
   this.page.locator('[data-testid="error-message"]'),
  ).toContainText(message);
 }
}

// テストでの使用
test('ページオブジェクト使用例', async ({ page }) => {
 const signInPage = new SignInPage(page);

 await signInPage.goto();
 await signInPage.signIn('test@example.com', 'password123');

 await expect(page).toHaveURL('/dashboard');
});
```

---

## 🚀 パフォーマンス最適化

### 並列実行の活用

```typescript
// playwright.config.ts
export default defineConfig({
 fullyParallel: true,
 workers: process.env.CI ? 4 : 2, // CI環境では4並列、ローカルでは2並列
});
```

### テスト分割戦略

```typescript
// 長いテストの分割例
test.describe('ユーザー管理フロー', () => {
 test('ユーザー作成', async ({ page }) => {
  // ユーザー作成のみテスト
 });

 test('ユーザー編集', async ({ page }) => {
  // ユーザー編集のみテスト
 });

 test('ユーザー削除', async ({ page }) => {
  // ユーザー削除のみテスト
 });
});
```

---

## 🔧 トラブルシューティング

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

### デバッグのベストプラクティス

1. **UI Modeの活用**: 視覚的確認で問題を特定
2. **トレースビューア**: 詳細な実行履歴で原因分析
3. **ステップ実行**: 問題発生箇所の特定
4. **スクリーンショット**: 各ステップでの画面状態確認

---

## 📚 参考資料

### 公式ドキュメント

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Playwright UI Mode](https://playwright.dev/docs/test-ui-mode)

### プロジェクト内参考実装

- [認証フローテスト](../../tests/e2e/auth/sign-in.spec.ts)
- [Playwright設定](../../playwright.config.ts)
- [テスト戦略全体](../testing/strategy.md)

---

このガイドを参考に、効率的で信頼性の高いE2Eテストを実装してください。UI Modeを積極的に活用することで、開発効率が大幅に向上します！ 🚀
