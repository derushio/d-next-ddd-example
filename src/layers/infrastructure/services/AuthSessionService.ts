import type {
  AuthSession,
  IAuthSessionService,
} from '@/layers/application/interfaces/IAuthSessionService';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';

import { injectable } from 'tsyringe';

/**
 * NextAuth.jsベースの認証セッションサービス実装
 *
 * Next.js固有の挙動（静的生成時のDynamic server usageエラー等）は
 * このInfrastructure層で吸収し、Application層には影響させない
 */
@injectable()
export class AuthSessionService implements IAuthSessionService {
  async getSession(): Promise<AuthSession | null> {
    try {
      const session = await getAuth();

      if (!session?.user?.id || !session?.user?.email || !session?.user?.name) {
        return null;
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      };
    } catch (error) {
      // Next.js静的生成時は headers() が使用できないため
      // "Dynamic server usage" エラーが発生する。これは想定内の動作。
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Dynamic server usage')) {
        // 静的生成時は未認証として扱う（正常動作）
        return null;
      }
      // 予期しないエラーは再スロー
      throw error;
    }
  }
}
