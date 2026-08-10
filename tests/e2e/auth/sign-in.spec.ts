import { expect, TEST_CREDENTIALS, test } from '../fixtures';

/**
 * サインイン機能 E2E テスト
 *
 * Page Object Model (SignInPage) + test.extend() Fixtures を使用。
 * - セレクタは SignInPage に集中管理
 * - 認証済み状態は authenticatedPage Fixture で再利用
 * - waitForTimeout による固定待機は使用しない（状態ベース待機を使用）
 */

test.describe('サインインページ表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('フォーム要素が正しく表示される', async ({ signInPage }) => {
    await signInPage.goto();

    // タイトル確認
    await expect(signInPage.page).toHaveTitle(/Sign In/);

    // フォーム要素の表示確認
    await signInPage.expectFormVisible();

    // ラベルの確認
    await signInPage.expectLabels(['メールアドレス', 'パスワード']);

    // メールプレースホルダーの確認
    await signInPage.expectEmailPlaceholder('user@example.com');
  });

  test('ページアクセス時に重大なコンソールエラーが発生しない', async ({
    signInPage,
  }) => {
    const criticalErrors: string[] = [];

    signInPage.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Next.js / NextAuth 特有の重大エラーのみ検出
        if (
          text.includes('JWT_SESSION_ERROR') ||
          text.includes('NEXTAUTH_SECRET') ||
          text.includes('decryption operation failed') ||
          text.includes('Error:') ||
          text.includes('TypeError:') ||
          text.includes('ReferenceError:')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    const pageErrors: Error[] = [];
    signInPage.page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    const serverErrors: string[] = [];
    signInPage.page.on('response', (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()}: ${response.url()}`);
      }
    });

    await signInPage.goto();

    // サインインフォームが表示されるまで待機（固定時間待機の代替）
    await signInPage.waitForEmailInputVisible();
    await signInPage.waitForPasswordInputVisible();

    // 重大なエラーがないことを確認
    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });

  test('複数回のページリロードで重大なエラーが発生しない', async ({
    signInPage,
  }) => {
    const criticalErrors: string[] = [];

    signInPage.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('JWT_SESSION_ERROR') ||
          text.includes('NEXTAUTH_SECRET') ||
          text.includes('decryption operation failed')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    // 3回連続でページにアクセス
    for (let i = 0; i < 3; i++) {
      await signInPage.goto();
      // フォームが表示されるまで待機（固定時間待機の代替）
      await signInPage.waitForEmailInputVisible();
    }

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('サインイン認証', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('正しい認証情報でサインインが成功する', async ({ signInPage, page }) => {
    await signInPage.goto();
    await signInPage.fillAndSubmit(
      TEST_CREDENTIALS.email,
      TEST_CREDENTIALS.password,
    );

    // リダイレクト待機（状態ベース）
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');

    // 認証Cookieが設定されていることを確認（Auth.js v5 は `authjs.` プレフィックス、互換で `next-auth.` も許可）
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(
      (cookie) =>
        cookie.name.includes('authjs') || cookie.name.includes('next-auth'),
    );
    expect(authCookies.length).toBeGreaterThan(0);

    // セッション情報があることを確認
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session?.user).toBeDefined();
    expect(session.user.email).toBe(TEST_CREDENTIALS.email);
  });

  test('間違った認証情報でサインインが失敗する', async ({
    signInPage,
    page,
  }) => {
    await signInPage.goto();
    await signInPage.fillAndSubmit('invalid@example.com', 'wrongpassword');

    // エラーアラートが表示されるまで待機（固定時間待機の代替）
    await signInPage.expectError(
      'メールアドレスまたはパスワードが正しくありません',
    );

    // サインインページに留まっていることを確認
    await signInPage.expectStillOnSignInPage();

    // セッションが作成されていないことを確認（Auth.js v5 は未認証時 null を返す）
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session?.user).toBeUndefined();
  });

  test('メールアドレス形式バリデーション（HTML5）', async ({ signInPage }) => {
    await signInPage.goto();
    await signInPage.fillEmail('invalid-email');
    await signInPage.fillPassword(TEST_CREDENTIALS.password);
    await signInPage.clickSubmit();

    // HTML5 ネイティブバリデーションが働いていることを確認
    const validationMessage = await signInPage.getEmailValidationMessage();
    expect(validationMessage).toBeTruthy();
  });

  test('空フォーム送信でクライアントバリデーションが働く', async ({
    signInPage,
  }) => {
    await signInPage.goto();
    await signInPage.clickSubmit();

    // react-hook-form によるクライアントバリデーションが完了するまで待機
    // エラーメッセージ要素の表示を待機（固定時間待機の代替）
    await signInPage.expectClientValidationError();

    // サインインページに留まっていることを確認
    await signInPage.expectStillOnSignInPage();
  });
});

test.describe('サインイン後のセッション', () => {
  test('サインイン成功後のセッション状態確認', async ({
    authenticatedPage: page,
  }) => {
    // authenticatedPage Fixture によりサインイン済みの状態でテスト開始

    // セッションAPIでセッション情報を確認
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();

    expect(session.user).toBeDefined();
    expect(session.user.email).toBe(TEST_CREDENTIALS.email);
  });

  test('サインイン後も別ページへ遷移してセッションが維持される', async ({
    authenticatedPage: page,
  }) => {
    // authenticatedPage Fixture によりサインイン済みの状態でテスト開始

    // セッションAPIでセッション情報を確認
    await page.goto('/api/auth/session');
    const sessionText = await page.textContent('pre');
    const session = JSON.parse(sessionText ?? '{}');

    expect(session.user).toBeDefined();
    expect(session.user.email).toBe(TEST_CREDENTIALS.email);
  });

  test('ログアウト後にセッションが無効になる', async ({
    authenticatedPage: page,
  }) => {
    // authenticatedPage Fixture によりサインイン済みの状態でテスト開始

    // ログアウトページに移動
    await page.goto('/api/auth/signout');

    // ログアウト確認ボタンがある場合はクリック
    const signoutButton = page.locator('form button[type="submit"]');
    if (await signoutButton.isVisible()) {
      await signoutButton.click();
    }

    // ログアウト後のリダイレクトを待機（状態ベース）
    await page.waitForURL('/auth/sign-in', { timeout: 5000 });

    // セッションAPIでセッションが無効になったことを確認（Auth.js v5 は null を返す）
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session?.user).toBeUndefined();
  });
});
