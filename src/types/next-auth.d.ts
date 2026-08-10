import type { User as PrismaUser } from '@/layers/infrastructure/persistence/prisma/generated';

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  type NextAuthUser = Partial<
    Omit<PrismaUser, 'id' | 'passwordHash'> & {
      sub: string;
      id: string;
    }
  >;

  interface Session {
    user: NextAuthUser & DefaultSession['user'];
  }
  interface User extends NextAuthUser {
    sub?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
