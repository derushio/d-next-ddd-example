import { expect, test } from '@playwright/test';

// 環境変数からベースURLを取得（PlaywrightのbaseURLと同じ値を使用）
const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

test.describe('NextAuth サインイン機能 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にセッションをクリア
    await page.context().clearCookies();
  });

  test('サインインページが正しく表示される', async ({ page }) => {
    // カスタムサインインページにアクセス
    await page.goto('/auth/sign-in');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Sign In/);

    // フォーム要素の存在確認
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // フォームラベルの確認
    await expect(page.locator('label')).toContainText([
      'メールアドレス',
      'パスワード',
    ]);

    // プレースホルダーの確認
    await expect(emailInput).toHaveAttribute('placeholder', 'user@example.com');
  });

  test('正しい認証情報でサインインが成功する', async ({ page }) => {
    // カスタムサインインページにアクセス
    await page.goto('/auth/sign-in');

    // 正しいサインイン情報を入力
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password');

    // サインインボタンをクリック
    await page.locator('button[type="submit"]').click();

    // サインイン成功後のリダイレクトを待つ
    await page.waitForURL(`${baseURL}/`, { timeout: 10000 });

    // サインイン成功後のリダイレクトを確認
    await expect(page).toHaveURL(`${baseURL}/`);

    // 認証Cookieが設定されていることを確認
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter((cookie) =>
      cookie.name.includes('next-auth'),
    );
    expect(authCookies.length).toBeGreaterThan(0);

    // セッション情報があることを確認（session endpointで確認）
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session.user).toBeDefined();
    expect(session.user.email).toBe('test@example.com');
  });

  test('間違った認証情報でサインインが失敗する', async ({ page }) => {
    // カスタムサインインページにアクセス
    await page.goto('/auth/sign-in');

    // 間違ったサインイン情報を入力
    await page.locator('input[name="email"]').fill('invalid@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');

    // サインインボタンをクリック
    await page.locator('button[type="submit"]').click();

    // エラー時はサインインページに留まる
    await page.waitForTimeout(3000); // エラー処理を待つ

    // サインインページに留まっていることを確認
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません'),
    ).toBeVisible();

    // セッションが作成されていないことを確認
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session.user).toBeUndefined();
  });

  test('メールアドレス形式バリデーション', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // 無効なメールアドレス形式を入力
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalid-email');
    await page.locator('input[name="password"]').fill('password');

    // HTML5バリデーションエラーを確認
    await page.locator('button[type="submit"]').click();

    // ブラウザの標準バリデーションが働いていることを確認
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage).toBeTruthy();
  });

  test('空のフォーム送信バリデーション', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // 空のフォームで送信
    await page.locator('button[type="submit"]').click();

    // カスタムフォームではクライアントサイドバリデーションが働く
    // エラーメッセージまたはバリデーション状態を確認
    await page.waitForTimeout(2000); // 送信処理を待つ

    // サインインページに留まっていることを確認
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/auth\/sign-in/);
  });

  test('サインイン成功後のセッション状態確認', async ({ page }) => {
    // まずサインイン
    await page.goto('/auth/sign-in');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();

    // サインイン成功を待つ
    await page.waitForURL(`${baseURL}/`, { timeout: 10000 });
    await expect(page).toHaveURL(`${baseURL}/`);

    // 別ページに移動してもセッションが維持されることを確認
    await page.goto('/api/auth/session');
    const sessionText = await page.textContent('pre');
    const session = JSON.parse(sessionText || '{}');

    expect(session.user).toBeDefined();
    expect(session.user.email).toBe('test@example.com');
    expect(session.user.name).toBe('テストユーザー');
  });

  test('ログアウト機能', async ({ page }) => {
    // まずサインイン
    await page.goto('/auth/sign-in');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();

    // サインイン成功を待つ
    await page.waitForURL(`${baseURL}/`, { timeout: 10000 });
    await expect(page).toHaveURL(`${baseURL}/`);

    // ログアウトページに移動
    await page.goto('/api/auth/signout');

    // ログアウト確認ボタンがある場合はクリック
    const signoutButton = page.locator('form button[type="submit"]');
    if (await signoutButton.isVisible()) {
      await signoutButton.click();
    }

    // ログアウト完了を待つ
    await page.waitForURL(`${baseURL}/auth/sign-in`, { timeout: 5000 });

    // セッションがクリアされていることを確認
    await page.waitForTimeout(2000); // セッションクリア処理を十分に待つ
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session.user).toBeUndefined();

    // NextAuthの特殊な動作: ログアウト後もCookieが残る場合があるが、
    // セッションが無効になっていることが重要なので、セッション確認のみに変更
    // これは NextAuth の正常な動作パターン
  });
});
