/**
 * Playwright globalSetup placeholder.
 *
 * テスト起動前に DB seed の補完や fixture 参照の生成などが必要な場合、
 * このファイルに処理を追加する。空実装のままでも `playwright.config.ts` から
 * 無害に参照できるよう残してある。
 *
 * 使用例（プロジェクト固有の seed 参照を生成したい場合）:
 *
 * ```ts
 * import { execSync } from 'node:child_process';
 * import { resolve } from 'node:path';
 *
 * export default async function globalSetup() {
 *   const script = resolve(process.cwd(), 'tests/e2e/fixtures/genSeedRefs.ts');
 *   execSync(`pnpm tsx ${script}`, { stdio: 'inherit' });
 * }
 * ```
 */
export default async function globalSetup(): Promise<void> {
  // 追加処理が必要になればここに記述する。
}
