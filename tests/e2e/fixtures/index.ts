import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

/**
 * E2Eテスト用 Fixtures
 *
 * test.extend() を使って認証済み状態などの共通セットアップを
 * 再利用可能な Fixture として定義する。
 *
 * 使い方:
 *   import { test, expect } from '../fixtures';
 *   // → test に signInPage, authenticatedPage が追加される
 */

/** デバッグ用シード認証情報（CLAUDE.md の Debug Credentials と同一） */
export const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test@1234!',
} as const;

type E2EFixtures = {
  /** サインインページの Page Object */
  signInPage: SignInPage;
  /** シード済みデバッグユーザーでサインイン済みの page */
  authenticatedPage: Page;
};

export const test = base.extend<E2EFixtures>({
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  authenticatedPage: async ({ page }, use) => {
    // シード済みのデバッグユーザーでサインインしてセッションを確立する
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.signIn(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await use(page);
    // teardown: セッションをクリアして次のテストに影響を与えない
    await page.context().clearCookies();
  },
});

export { expect } from '@playwright/test';
