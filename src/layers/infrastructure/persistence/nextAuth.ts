import 'reflect-metadata';

import { Env } from '@/app/server-actions/env/Env';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { isSuccess } from '@/layers/application/types/Result';
// Prisma Client
import { prisma } from '@/layers/infrastructure/persistence/prisma';
// 共通バリデーションスキーマ（DRY原則）
import { signInSchema } from '@/layers/infrastructure/types/zod/authSchema';
import { maskEmail, prepareLogData } from '@/utils/logMasking';

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * ログ出力用ヘルパー
 * DIコンテナからLoggerを取得し、環境に応じたマスキングを適用
 */
function getAuthLogger(): ILogger {
  return resolve('Logger');
}

/**
 * ログデータの準備（マスキング適用）
 */
function prepareAuthLogData<T extends Record<string, unknown>>(data: T): T {
  return prepareLogData(data, Env.LOG_MASK_PII);
}

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

  // セッション戦略（環境変数で設定可能）
  session: {
    strategy: 'jwt',
    maxAge: Env.SESSION_MAX_AGE_SECONDS,
  },

  // JWT設定（環境変数で設定可能）
  jwt: {
    maxAge: Env.JWT_MAX_AGE_SECONDS,
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
        const logger = getAuthLogger();

        try {
          // 開発環境のみ詳細ログ出力、本番環境ではマスキング済み
          logger.debug(
            'NextAuth認証処理開始',
            prepareAuthLogData({ email: credentials?.email }),
          );

          // バリデーション
          const validatedFields = signInSchema.safeParse(credentials);
          if (!validatedFields.success) {
            logger.warn('NextAuth バリデーションエラー', {
              errors: validatedFields.error.issues.map(
                (issue) => issue.message,
              ),
            });
            return null;
          }

          const { email, password } = validatedFields.data;

          // DDD準拠: SignInUseCaseを呼び出し
          const signInUseCase = resolve('SignInUseCase');
          const result = await signInUseCase.execute({
            email,
            password,
          });

          if (!isSuccess(result)) {
            // 本番環境ではメールアドレスをマスキング
            logger.warn(
              'NextAuth SignInUseCase失敗',
              prepareAuthLogData({
                email: maskEmail(email),
                code: result.error.code,
              }),
            );
            return null;
          }

          logger.info('NextAuth SignInUseCase成功', {
            userId: result.data.user.id,
          });

          // NextAuth用のユーザー情報を返却
          return {
            id: result.data.user.id,
            email: result.data.user.email,
            name: result.data.user.name,
          };
        } catch (error) {
          logger.error('NextAuth認証処理エラー', {
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
      const logger = getAuthLogger();
      logger.info(
        'NextAuth サインイン成功',
        prepareAuthLogData({
          userId: user.id,
          email: user.email,
          provider: account?.provider,
        }),
      );
      return true;
    },
  },

  // イベント設定
  events: {
    async signIn({ user, account, isNewUser }) {
      const logger = getAuthLogger();
      logger.debug(
        'NextAuth サインインイベント',
        prepareAuthLogData({
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          isNewUser,
        }),
      );
    },

    async signOut({ token }) {
      const logger = getAuthLogger();
      logger.debug('NextAuth サインアウトイベント', {
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
