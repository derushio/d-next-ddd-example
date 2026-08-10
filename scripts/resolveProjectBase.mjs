#!/usr/bin/env node
/**
 * PROJECT_BASE 算出の一元化モジュール。
 *
 * 算出式: `<pkg-name>-<main-repo-dir-name>`
 *   - pkg-name: package.json の name
 *   - main-repo-dir-name: git worktree list --porcelain の第 1 行（= メインリポジトリ）の basename
 *
 * Makefile と next.config.ts 双方から参照される唯一のソース。ハードコードフォールバックは持たない。
 *
 * 用途:
 *   - CLI: `node scripts/resolveProjectBase.mjs` → stdout に 1 行で出力
 *   - ESM import: `import { resolveProjectBase } from './scripts/resolveProjectBase.mjs'`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * package.json の name フィールドを取得する。
 * @returns {string}
 */
function readPackageName() {
  const pkgPath = resolve(process.cwd(), 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to read ${pkgPath}: ${e.message}`);
  }
  if (!pkg.name || typeof pkg.name !== 'string' || !pkg.name.trim()) {
    throw new Error(`package.json "name" is empty or missing at ${pkgPath}`);
  }
  return pkg.name.trim();
}

/**
 * メインリポジトリのディレクトリ basename を取得する。
 * worktree 内からでも同じ値になる（= git 上の main worktree を参照）。
 * git 外で実行された場合は cwd basename にフォールバック。
 * @returns {string}
 */
function resolveMainRepoDirName() {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const firstLine = out.split('\n', 1)[0];
    const m = firstLine.match(/^worktree (.+)$/);
    if (m) return basename(m[1]);
  } catch {
    // git 未導入 or non-repo: fallthrough
  }
  return basename(process.cwd());
}

/**
 * PROJECT_BASE を算出する。
 * @returns {string} `<pkg-name>-<main-repo-dir-name>`
 */
export function resolveProjectBase() {
  return `${readPackageName()}-${resolveMainRepoDirName()}`;
}

/**
 * 現ブランチの worktree ID を取得する（`worktree-` プレフィックスは除く）。
 * main ブランチは `main` を返す。
 * @returns {string}
 */
function resolveWorktreeId() {
  try {
    const b = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return b.replace(/^worktree-/, '') || 'main';
  } catch {
    return 'main';
  }
}

/**
 * portless の explicit name モードで渡す完全サブドメイン文字列を返す。
 * main ブランチ: `<PROJECT_BASE>`
 * worktree: `worktree-<id>.<PROJECT_BASE>`
 *
 * portless の `run` モードは `<branch>.<auto-project>.localhost` を自動生成するが、
 * `<auto-project>` はカレントディレクトリ basename 依存で PROJECT_BASE と一致しないため、
 * explicit name を与えて URL を一元化する。
 * @returns {string}
 */
export function resolvePortlessName() {
  const pb = resolveProjectBase();
  const wt = resolveWorktreeId();
  return wt === 'main' ? pb : `worktree-${wt}.${pb}`;
}

// CLI entrypoint（node 経由で直接呼ばれたときのみ stdout 出力）
const invokedAsCli =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedAsCli) {
  try {
    const mode = process.argv[2];
    const value =
      mode === '--portless-name' ? resolvePortlessName() : resolveProjectBase();
    process.stdout.write(`${value}\n`);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
