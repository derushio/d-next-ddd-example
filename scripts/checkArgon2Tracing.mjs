#!/usr/bin/env node
/**
 * argon2 native binding が `next build` 出力の trace / standalone bundle に
 * 正しく同梱されているかを検証する。
 *
 * ## なぜこの検証が必要か
 *
 * `HashService` は @node-rs/argon2 の native binding (`.node`) を dynamic
 * import する。 サーバーレスデプロイでは @vercel/nft が build 時に
 * `.next/**\/*.nft.json` を吐き、 Vercel Functions / Docker standalone bundle
 * に含めるファイル一覧を決定する。 `optionalDependencies` 経由の
 * platform-specific package (`@node-rs/argon2-linux-x64-gnu` 等) は
 * nft の追跡から漏れやすく、 next.config.ts の
 *   - serverExternalPackages
 *   - outputFileTracingIncludes
 * を「2 点セット」で正しく設定できていなければ runtime で
 * `Failed to load native binding` (500) が発生する。
 *
 * Turbopack standalone build には `serverExternalPackages` を
 * `.next/standalone/node_modules/` に含めないリグレッションが
 * 過去に何度か上がっている (vercel/next.js issues #88844, #74816 系)。
 * この script は build 直後にトレース出力を静的検査し、 リグレッションが
 * 起きたら CI で即失敗させることを目的とする。
 *
 * ## 検証内容
 *
 * 1. `.next/` 配下の `*.nft.json` を再帰的に列挙
 * 2. その `files[]` に @node-rs/argon2 系の native binding
 *    (`argon2-<platform>/*.node`) を含む trace が 1 つ以上あることを確認
 * 3. Linux ホストで build した場合は `linux-x64-gnu` の同梱を追加で強制
 *    (これが本命 deploy target なので、 outputFileTracingIncludes の
 *     glob が resolved されたことを直接確認する)
 * 4. あれば ✓ で exit 0、 無ければ ✗ で exit 1 (原因ヒント付き)
 *
 * ## 使い方
 *
 *   pnpm build
 *   node scripts/checkArgon2Tracing.mjs
 *   # または `pnpm check:argon2-tracing`
 *
 * 詳細ドキュメント: .claude/skills/password-hashing-import-strategy/SKILL.md
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const buildDir = join(projectRoot, '.next');

// Vercel Fluid Compute / 一般的な Linux LTS デプロイの本命は linux-x64-gnu。
// このスクリプトが Linux 上で実行されているとき (= CI 想定) は
// linux-x64-gnu が trace に含まれることを強制する。 それ以外の環境では
// 「何らかの argon2-<platform>/*.node が trace されている」ことのみ検証する。
const REQUIRED_ON_LINUX_HOST = '@node-rs/argon2-linux-x64-gnu';

// 「argon2-<何か>-<何か>/*.node」に一致する path fragment 判定用。
// nft は相対パス表記で "../../node_modules/@node-rs/argon2-<platform>/*.node"
// または pnpm 実体パス
//   "../../node_modules/.pnpm/@node-rs+argon2-<platform>@<ver>/node_modules/@node-rs/argon2-<platform>/*.node"
// の 2 パターンで書き出す。
const ARGON2_NATIVE_PATH = /@node-rs[+/]argon2-[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)?[@/].*\.node$/;

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(p));
    } else if (entry.name.endsWith('.nft.json')) {
      results.push(p);
    }
  }
  return results;
}

function main() {
  try {
    statSync(buildDir);
  } catch {
    console.error(`✗ ${relative(projectRoot, buildDir)} が存在しません。`);
    console.error('  先に `pnpm build` を実行してください。');
    process.exit(1);
  }

  const nftFiles = walk(buildDir);
  if (nftFiles.length === 0) {
    console.error(
      `✗ ${relative(projectRoot, buildDir)} 配下に .nft.json が見つかりません。`,
    );
    console.error('  `pnpm build` の trace 出力形式が変わった可能性があります。');
    process.exit(1);
  }

  // (platform-slug: string) -> Set<nftFile>
  const platformsSeen = new Map();

  for (const nftFile of nftFiles) {
    let json;
    try {
      json = JSON.parse(readFileSync(nftFile, 'utf8'));
    } catch {
      continue;
    }
    const files = Array.isArray(json.files) ? json.files : [];
    for (const f of files) {
      if (typeof f !== 'string') continue;
      if (!ARGON2_NATIVE_PATH.test(f)) continue;
      // 抽出: @node-rs/argon2-<platform>-<arch>[-<abi>]
      const m = f.match(/@node-rs[+/](argon2-[a-z0-9-]+?)(?=[@/])/);
      if (!m) continue;
      const slug = `@node-rs/${m[1]}`;
      if (!platformsSeen.has(slug)) platformsSeen.set(slug, new Set());
      platformsSeen.get(slug).add(relative(projectRoot, nftFile));
    }
  }

  const isLinux = platform() === 'linux';
  const host = `${platform()}-${arch()}`;

  if (platformsSeen.size === 0) {
    console.error(
      `✗ @node-rs/argon2 の platform 別 native binding (\`.node\`) が` +
        ` ${relative(projectRoot, buildDir)} 配下のどの .nft.json trace にも含まれていませんでした。`,
    );
    console.error('');
    console.error('  想定されるリグレッション:');
    console.error(
      '    - next.config.ts の `serverExternalPackages` から `@node-rs/argon2` が抜けた',
    );
    console.error(
      '    - next.config.ts の `outputFileTracingIncludes` のパスが lockfile bump で古くなった',
    );
    console.error(
      '    - Turbopack standalone build のリグレッション (vercel/next.js #88844 系)',
    );
    console.error('');
    console.error(
      '  対応: `.claude/skills/password-hashing-import-strategy/SKILL.md` を参照。',
    );
    process.exit(1);
  }

  console.log(`✓ argon2 native binding が build trace に含まれています (host=${host}):`);
  for (const [slug, files] of platformsSeen) {
    console.log(`  - ${slug} (${files.size} trace entry)`);
    for (const f of files) {
      console.log(`      ${f}`);
    }
  }

  if (isLinux && !platformsSeen.has(REQUIRED_ON_LINUX_HOST)) {
    console.error('');
    console.error(
      `✗ Linux host での build にも関わらず ${REQUIRED_ON_LINUX_HOST} が trace に含まれていません。`,
    );
    console.error(
      '  Vercel Fluid Compute (linux-x64 glibc) デプロイ時に runtime 500 になる可能性が高い。',
    );
    console.error(
      '  next.config.ts の `outputFileTracingIncludes` の `.pnpm/@node-rs+argon2-linux-x64-gnu@*/**/*.node` glob を確認してください。',
    );
    process.exit(1);
  }

  process.exit(0);
}

main();
