import 'reflect-metadata';

import { resolve } from '@/layers/infrastructure/di/resolver';
// Prisma Client
import { prisma } from '@/layers/infrastructure/persistence/prisma';

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';

// Validation Schema
const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

/**
 * NextAuth.js設定
 *
 * DDD/Clean Architecture準拠:
 * - CredentialsProviderがSignInUseCaseを呼び出し
 * - NextAuthはInfrastructure層でSignInUseCaseを使用
 * - 認証ロジックはDomain/Application層に委譲
 */
export const authOptions: NextAuthOptions = {
  // Prisma Adapter使用
  adapter: PrismaAdapter(prisma),

  // セッション戦略
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  // JWT設定
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  // 認証プロバイダー設定
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your-email@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        try {
          console.log('🔧 NextAuth認証処理開始 (DDD準拠)', {
            email: credentials?.email,
          });

          // バリデーション
          const validatedFields = signInSchema.safeParse(credentials);
          if (!validatedFields.success) {
            console.log(
              '⚠️ NextAuth バリデーションエラー',
              validatedFields.error,
            );
            return null;
          }

          const { email, password } = validatedFields.data;

          // DDD準拠: SignInUseCaseを呼び出し
          const signInUseCase = resolve('SignInUseCase');
          const result = await signInUseCase.execute({
            email,
            password,
          });

          console.log('✅ NextAuth SignInUseCase成功', {
            userId: result.user.id,
          });

          // NextAuth用のユーザー情報を返却
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
          };
        } catch (error) {
          console.error('❌ NextAuth認証処理エラー', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      },
    }),
  ],

  // ページ設定
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/error',
  },

  // コールバック設定
  callbacks: {
    async jwt({ token, user }) {
      // 初回サインイン時にユーザー情報をトークンに追加
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      // セッションにユーザーIDを追加
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },

    async signIn({ user, account }) {
      console.log('✅ NextAuth サインイン成功', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
      });
      return true;
    },
  },

  // イベント設定
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('📝 NextAuth サインインイベント', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser,
      });
    },

    async signOut({ token }) {
      console.log('📝 NextAuth サインアウトイベント', {
        userId: token?.id,
      });
    },
  },

  // デバッグ設定（開発環境のみ）
  debug: process.env.NODE_ENV === 'development',
};

/**
 * サーバーサイドでセッション情報を取得するためのヘルパー関数
 */
export async function getAuth(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

export type AuthType = Awaited<ReturnType<typeof getAuth>>;
