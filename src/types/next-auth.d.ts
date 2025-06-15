import { User as PrismaUser } from '@/layers/infrastructure/persistence/prisma/generated';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  declare type NextAuthUser = Partial<
    Omit<PrismaUser, 'id' | 'passwordHash'> & {
      sub: string;
      id: string;

      sessionId?: string;
      accessToken?: string;
      accessTokenExpireAt?: Date;
      resetToken?: string;
      resetTokenExpireAt?: Date;
    }
  >;

  interface Session {
    user?: NextAuthUser & DefaultSession['user'];
  }
  interface User extends NextAuthUser {
    sub?: string;
  }
}

declare module 'next-auth/jwt' {
  // "jwt"コールバックのtokenパラメータに任意のプロパティを追加します。
  export interface JWT extends Record<string, unknown>, DefaultJWT {
    sessionId?: string;
    accessToken?: string;
    accessTokenExpireAt?: Date;
    resetToken?: string;
    resetTokenExpireAt?: Date;
  }
}
