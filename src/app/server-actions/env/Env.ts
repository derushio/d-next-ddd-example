import { upperzero } from '@/layers/infrastructure/types/zod/utils';

import { z } from 'zod';

export const Env = z
  .object({
    NEXT_PUBLIC_BASE_URL: z.string(),
    TOKEN_SALT_ROUNDS: z.number(),
    TOKEN_SECRET: z.string(),
    TOKEN_MAX_AGE_MINUTES: upperzero(z.number()),
    TOKEN_UPDATE_AGE_MINUTES: upperzero(z.number()),
    DATABASE_URL: z.string(),
  })
  .parse({
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    TOKEN_SALT_ROUNDS: Number(process.env.TOKEN_SALT_ROUNDS ?? '10'),
    TOKEN_SECRET: process.env.TOKEN_SECRET ?? '',
    TOKEN_MAX_AGE_MINUTES: Number(process.env.TOKEN_MAX_AGE_MINUTES ?? '60'),
    TOKEN_UPDATE_AGE_MINUTES: Number(
      process.env.TOKEN_UPDATE_AGE_MINUTES ?? '30',
    ),
    DATABASE_URL: process.env.DATABASE_URL ?? '',
  });
