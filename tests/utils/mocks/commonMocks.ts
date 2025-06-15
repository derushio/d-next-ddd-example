import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

import { vi } from 'vitest';

/**
 * 共通のモック関数定義（複雑な構造のため手動モック維持）
 *
 * 注意: このファイルは段階的に削除予定
 * - PrismaClientのみ残存（型が複雑すぎるため）
 * - getAuth関数モック（関数のため自動モック化不可）
 * - 他のモックはautoMocks.tsに移行済み
 */

// PrismaClient Mock
export const createMockPrismaClient = () =>
  ({
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }) as any;

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

/**
 * getAuth関数のモジュールモック設定ヘルパー
 * テストファイルで使用する前に呼び出す
 */
export const setupGetAuthMock = () => {
  // モジュールモックを設定
  vi.mock('@/layers/infrastructure/persistence/nextAuth', () => ({
    getAuth: vi.fn(),
  }));
};
