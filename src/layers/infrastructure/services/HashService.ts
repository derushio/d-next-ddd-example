import type { Options } from '@node-rs/argon2';
import { injectable } from 'tsyringe';
import type { IHashService } from '@/layers/domain/interfaces/IHashService';
import { TIMING_SAFE_DUMMY_HASH } from '@/layers/infrastructure/constants/security';

// Re-export for backward compatibility
export type { IHashService } from '@/layers/domain/interfaces/IHashService';

/**
 * `@node-rs/argon2` の遅延ロード
 *
 * ## なぜ top-level import ではなく dynamic import か
 *
 * `HashService` は DI コンテナに `@injectable()` として登録され、
 * `resolve()` の初期化グラフ経由で事実上ほぼ全 Server Action / SSR route の
 * bundle 評価時にモジュールが評価される。 top-level で
 * `import { hash } from '@node-rs/argon2'` すると、その評価が走った時点で
 * platform 別の native binding (`.node`) が require される。
 *
 * サーバーレス実行環境 (`@vercel/nft` でトレースされた Function bundle) では
 * `optionalDependencies` 経由の native binary が漏れやすく、
 * runtime に `Failed to load native binding` が発火する。 hash / verify を
 * 呼び出していない route (認証以外の全 route) までもが 500 に落ちる。
 *
 * ## 修正方針: 遅延ロード
 *
 * `generateHash()` / `compareHash()` が実際に呼ばれた瞬間だけ `import()` する。
 * これにより:
 *   1. 認証以外の route では native binding が touched されず 500 に落ちない
 *   2. 認証 route では初回呼び出しで正しくトレース済みの `.node` が読まれる
 *   3. mock ベースの unit test では argon2 がロードされず起動が速い
 *
 * dynamic import の結果は module-scope で 1 度だけキャッシュされ、
 * 2 回目以降の呼び出しに追加コストは無い。
 *
 * 詳細: `.claude/skills/password-hashing-import-strategy/SKILL.md`
 */
type Argon2Module = typeof import('@node-rs/argon2');

/**
 * `@node-rs/argon2` の native binding ロードに失敗したことを示す専用エラー。
 *
 * サーバーレスデプロイの trace 漏れや platform-specific package の不在
 * (例: linux-x64-gnu prebuild 欠落) を、 verify() が返す false や hash 形式
 * エラーと区別可能にする。
 *
 * ## Fail loud ポリシー
 *
 * argon2 module のロード失敗を握り潰して `compareHash` が false を返すと、
 * 全ユーザーの認証が「パスワード不一致」として静かに崩れ、 監視系は
 * 「認証失敗率が上がった」としか観測できない。 呼び出し側 UseCase の
 * ResultAsync.fromPromise でこの例外を捕捉させ、 AppError('SYSTEM_ERROR')
 * として上に伝播させることで、 ログに argon2 module unavailable として
 * 明示的に記録される。
 *
 * pure-JS フォールバック (bcryptjs 等) の暗黙導入は禁止 (供給網面積の
 * 純増、 かつ event-loop ブロッキングによる副作用が大きい)。
 * 詳細: `.claude/skills/password-hashing-import-strategy/SKILL.md`
 */
export class Argon2ModuleUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      '@node-rs/argon2 native binding failed to load; server cannot hash or verify passwords',
      { cause },
    );
    this.name = 'Argon2ModuleUnavailableError';
  }
}

let argon2ModulePromise: Promise<Argon2Module> | null = null;
function loadArgon2(): Promise<Argon2Module> {
  if (argon2ModulePromise === null) {
    argon2ModulePromise = import('@node-rs/argon2').catch((cause) => {
      // ロード失敗を module-scope でキャッシュしない。 native binding が
      // ハートフルリロードや hot swap で復活したケースで次回リトライを許す。
      argon2ModulePromise = null;
      throw new Argon2ModuleUnavailableError(cause);
    });
  }
  return argon2ModulePromise;
}

/**
 * Argon2 Algorithm 数値定数
 *
 * `@node-rs/argon2` の `Algorithm` は `const enum` のため
 * verbatimModuleSyntax / isolatedModules 配下では import 不可。
 * 数値リテラル定数で代替する。
 * 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
 */
const ARGON2_ALGORITHM_ID = 2;

/**
 * Argon2id設定（OWASP 2026推奨最小値）
 *
 * - memoryCost: 19456 KiB = 19 MiB
 * - timeCost: 2 iterations
 * - parallelism: 1
 * - algorithm: Argon2id（推奨。Argon2iよりGPUブルートフォース耐性が高い）
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: ARGON2_ALGORITHM_ID,
} as const satisfies Options;

@injectable()
export class HashService implements IHashService {
  async generateHash(text: string): Promise<string> {
    const { hash } = await loadArgon2();
    return await hash(text, ARGON2_OPTIONS);
  }

  async compareHash(text: string, hashedText: string): Promise<boolean> {
    // Fail loud: module のロード失敗 (native binding 不在) はここで
    // Argon2ModuleUnavailableError として throw させ、 caller に伝播させる。
    // ロード成功後の verify() が投げる例外は 「保存された hash の形式不正」
    // なので false に落として認証失敗として扱う (安全側)。
    const { verify } = await loadArgon2();
    try {
      return await verify(hashedText, text, ARGON2_OPTIONS);
    } catch {
      // 保存された hash string が壊れている / 別アルゴリズムの残骸等。
      // ここで throw すると「アカウント列挙攻撃者にヒントを与える」ため false。
      return false;
    }
  }

  getTimingSafeDummyHash(): string {
    return TIMING_SAFE_DUMMY_HASH;
  }
}
