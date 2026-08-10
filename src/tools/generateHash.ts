import { z } from 'zod';

// １つ目のパラメータ
const value = process.argv[2];

/**
 * Argon2 Algorithm 数値定数（isolatedModules 制約のため数値で指定）
 * 2 = Argon2id
 */
const ARGON2_ALGORITHM_ID = 2;

async function main() {
  if (value === undefined) {
    console.error('Usage: generateHash <value>');
    process.exit(1);
  }
  console.log(value);
  // `@node-rs/argon2` は native binding。この tsx script は Next.js の bundling
  // 経路には乗らないが、 HashService と import 戦略を揃えるため dynamic import
  // に統一する（詳細: .claude/skills/password-hashing-import-strategy/SKILL.md）。
  const { hash } = await import('@node-rs/argon2');
  const hashedValue = await hash(value, {
    memoryCost: z
      .number()
      .int()
      .positive()
      .parse(Number(process.env.ARGON2_MEMORY_COST ?? 19456)),
    timeCost: 2,
    parallelism: 1,
    algorithm: ARGON2_ALGORITHM_ID,
  });
  console.log(hashedValue);
}

void main();
