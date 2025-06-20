import { Env } from '@/app/server-actions/env/Env';
import { upperzero } from '@/layers/infrastructure/types/zod/utils';

import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function genHash(text: string) {
  return await bcrypt.hash(
    text,
    upperzero(z.number()).parse(Number(Env.TOKEN_SALT_ROUNDS)),
  );
}
