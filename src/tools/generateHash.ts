import { upperzero } from '@/layers/infrastructure/types/zod/utils';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// １つ目のパラメータ
const value = process.argv[2];

async function main() {
  console.log(value);
  const hash = await bcrypt.hash(
    value,
    upperzero(z.number()).parse(Number(process.env.SALT_ROUNDS)),
  );
  console.log(hash);
}

void main();
