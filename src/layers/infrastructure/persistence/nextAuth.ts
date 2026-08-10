import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { resolve } from '@/di/resolver';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
// 共通バリデーションスキーマ（DRY原則）
import { signInSchema } from '@/layers/infrastructure/types/zod/authSchema';
import { env } from '@/lib/env';
import { applyMasking, maskEmail } from '@/utils/logMasking';
import { toErrorMeta } from '@/utils/toErrorMeta';

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
  if (env.LOG_MASK_PII) {
    return applyMasking(data) as T;
  }
  return data;
}

/**
 * Auth.js v5 設定
 *
 * DDD/Clean Architecture準拠:
 * - CredentialsProviderがSignInUseCaseを呼び出し
 * - NextAuthはInfrastructure層でSignInUseCaseを使用
 * - 認証ロジックはDomain/Application層に委譲
 *
 * JWT戦略 + CredentialsProviderのみのため、PrismaAdapterは不使用
 * （PrismaスキーマにNextAuth標準テーブルが存在しない）
 */
export const {
  handlers,
  auth,
  signIn: authSignIn,
  signOut: authSignOut,
} = NextAuth({
  // セッション戦略（環境変数で設定可能）
  session: {
    strategy: 'jwt',
    maxAge: env.SESSION_MAX_AGE_SECONDS,
  },

  // 認証プロバイダー設定
  providers: [
    Credentials({
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
            prepareAuthLogData({
              email:
                typeof credentials === 'object' && credentials !== null
                  ? (credentials as Record<string, unknown>).email
                  : undefined,
            }),
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

          if (!result.isOk()) {
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
            userId: result.value.user.id,
          });

          // NextAuth用のユーザー情報を返却
          return {
            id: result.value.user.id,
            email: result.value.user.email,
            name: result.value.user.name,
          };
        } catch (error) {
          logger.error('NextAuth認証処理エラー', {
            ...toErrorMeta(error),
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
        if (user.id != null) token.id = user.id;
        token.email = user.email ?? null;
        token.name = user.name ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      // セッションにユーザーIDを追加
      if (token && session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : '';
        session.user.email = typeof token.email === 'string' ? token.email : '';
        session.user.name = typeof token.name === 'string' ? token.name : '';
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

    async signOut(message) {
      const logger = getAuthLogger();
      logger.debug('NextAuth サインアウトイベント', {
        // v5ではsignOutイベントの引数がtoken直接ではなくmessageオブジェクト
        token: 'token' in message ? message.token : undefined,
      });
    },
  },

  // プロキシ環境でのホスト信頼設定
  trustHost: true,

  // デバッグ設定: 既定 OFF。AUTH_DEBUG=1 を明示した場合のみ有効化。
  // dev で常時 debug:true にすると Auth.js がリクエスト毎に冗長ログ + 内部 listener 経路を踏み、
  // long-running な dev サーバーで CPU/メモリの単調増加(creep)を加速させるため。
  debug: process.env.AUTH_DEBUG === '1',
});

/**
 * サーバーサイドでセッション情報を取得するためのヘルパー関数
 * 後方互換性のため維持（AuthSessionService等から呼ばれる）
 */
export async function getAuth() {
  return auth();
}

export type AuthType = Awaited<ReturnType<typeof getAuth>>;
