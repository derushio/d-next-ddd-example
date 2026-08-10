import { mockDeep } from 'vitest-mock-extended';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

/**
 * 共通のモック関数定義
 *
 * PrismaClient は vitest-mock-extended の mockDeep で自動生成。
 * 全てのモデル・メソッドが型安全な MockProxy として利用可能になる。
 */

// PrismaClient Mock
export const createMockPrismaClient = () => mockDeep<PrismaClient>();

// NextAuth getAuth function mock helpers
/**
 * getAuth関数のモック設定ヘルパー
 *
 * 注意: 関数のモックは vitest-mock-extended で自動化できないため手動実装
 */
export const createGetAuthMockHelpers = () => {
  return {
    // 認証済みユーザーを返すモックデータ
    getAuthenticatedUserData: (
      user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    ) => ({ user }),

    // 未認証状態を返すモックデータ
    getUnauthenticatedData: () => null,

    // 不完全なユーザー情報を返すモックデータ
    getIncompleteUserData: (
      partialUser: any = { email: 'test@example.com' },
    ) => ({ user: partialUser }),

    // エラー用
    getErrorInstance: (message = '認証エラー') => new Error(message),
  };
};
