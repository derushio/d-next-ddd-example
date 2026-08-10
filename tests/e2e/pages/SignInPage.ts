import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * サインインページの Page Object Model
 *
 * E2Eテストでサインインページの操作をカプセル化する。
 * セレクタをここに集中管理することで、実装変更時の修正箇所を最小化する。
 */
export class SignInPage {
  // セレクタ定数（実装変更時はここのみ修正する）
  private readonly emailInput = 'input[name="email"]';
  private readonly passwordInput = 'input[name="password"]';
  private readonly submitButton = '[data-testid="sign-in-button"]';
  private readonly errorAlert = '[data-testid="sign-in-error"]';

  constructor(readonly page: Page) {}

  /** サインインページへ遷移する */
  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  /** メールアドレスを入力する */
  async fillEmail(email: string) {
    await this.page.fill(this.emailInput, email);
  }

  /** パスワードを入力する */
  async fillPassword(password: string) {
    await this.page.fill(this.passwordInput, password);
  }

  /** サインインボタンをクリックする（waitForURLは呼び出し元で行う） */
  async clickSubmit() {
    await this.page.click(this.submitButton);
  }

  /**
   * メールアドレスとパスワードを入力してサインインボタンをクリックする。
   * リダイレクト待機は含まない（呼び出し元で目的に応じて待機する）。
   */
  async fillAndSubmit(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * サインインを完了させてリダイレクト先URLを待機する。
   * 認証済みFixtureのセットアップなど、成功パスのみ想定する場合に使用する。
   */
  async signIn(email: string, password: string, redirectUrl = '/') {
    await this.fillAndSubmit(email, password);
    await this.page.waitForURL(redirectUrl, { timeout: 10000 });
  }

  // --- アサーション ---

  /** フォーム要素が正しく表示されていることを確認する */
  async expectFormVisible() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.submitButton)).toBeVisible();
  }

  /** エラーアラートが指定テキストで表示されていることを確認する */
  async expectError(text: string) {
    const alert = this.page.locator(this.errorAlert);
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(text);
  }

  /** エラーアラートが表示されていないことを確認する */
  async expectNoError() {
    await expect(this.page.locator(this.errorAlert)).not.toBeVisible();
  }

  /** サインインページに留まっていることを確認する */
  async expectStillOnSignInPage() {
    await expect(this.page).toHaveURL(/\/auth\/sign-in/);
  }

  /** メール入力フィールドが表示されるまで待機する */
  async waitForEmailInputVisible() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /** パスワード入力フィールドが表示されるまで待機する */
  async waitForPasswordInputVisible() {
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
  }

  /** メール入力フィールドの HTML5 バリデーションメッセージを取得する */
  async getEmailValidationMessage(): Promise<string> {
    return this.page
      .locator(this.emailInput)
      .evaluate((el: HTMLInputElement) => el.validationMessage);
  }

  /** クライアントバリデーションエラーが表示されていることを確認する */
  async expectClientValidationError() {
    await expect(this.page.locator('[role="alert"]').first()).toBeVisible({
      timeout: 3000,
    });
  }

  /** メール入力フィールドのプレースホルダーを確認する */
  async expectEmailPlaceholder(placeholder: string) {
    await expect(this.page.locator(this.emailInput)).toHaveAttribute(
      'placeholder',
      placeholder,
    );
  }

  /** フォームラベルが指定テキストを含むことを確認する */
  async expectLabels(texts: string[]) {
    await expect(this.page.locator('label')).toContainText(texts);
  }
}
