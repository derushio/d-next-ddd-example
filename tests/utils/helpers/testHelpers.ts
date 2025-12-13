import { container } from '@/di/container';
import {
  INJECTION_TOKENS,
  type ServiceType,
  type ServiceTypeMap,
} from '@/di/tokens';

import { beforeEach, expect, vi } from 'vitest';

/**
 * 共通のテストヘルパー関数
 */

/**
 * モックの戻り値を設定するヘルパー
 */
export const setupMockReturnValues = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- モックオブジェクトの型は実行時まで不明なためanyが必要
  mocks: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- モック戻り値の型は実行時まで不明なためanyが必要
  values: Record<string, any>,
) => {
  Object.entries(values).forEach(([key, value]) => {
    if (mocks[key]) {
      if (value instanceof Error) {
        mocks[key].mockRejectedValue(value);
      } else if (value instanceof Promise) {
        mocks[key].mockResolvedValue(value);
      } else {
        // HashServiceの非同期メソッド（compareHash, generateHash）は常にPromiseを返す
        // また、PrismaClientの全てのメソッド（create, findUnique, findFirst等）も非同期
        if (
          key === 'compareHash' ||
          key === 'generateHash' ||
          key === 'create' ||
          key === 'findUnique' ||
          key === 'findFirst' ||
          key === 'update' ||
          key === 'delete'
        ) {
          mocks[key].mockResolvedValue(value);
        } else if (
          typeof value === 'boolean' ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          value === null ||
          value === undefined
        ) {
          // 同期的な値（boolean, string, number, null, undefined等）
          mocks[key].mockReturnValue(value);
        } else {
          // その他のオブジェクトや複雑な値はPromiseとして扱う
          mocks[key].mockResolvedValue(value);
        }
      }
    }
  });
};

/**
 * 複数のモックを一度にクリアするヘルパー
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 様々な型のモックオブジェクトを受け取るためanyが必要
export const clearAllMocks = (...mocks: any[]) => {
  mocks.forEach((mock) => {
    if (mock && typeof mock === 'object') {
      Object.values(mock).forEach((fn) => {
        if (typeof fn === 'function' && 'mockClear' in fn) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- モック関数の型チェック回避のためanyが必要
          (fn as any).mockClear();
        }
      });
    }
  });
};

/**
 * テストデータファクトリー
 */
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed_password_123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createTestSession = (overrides = {}) => ({
  id: 'test-session-1',
  userId: 'test-user-1',
  accessTokenHash: 'access_token_hash_123',
  accessTokenExpireAt: new Date('2024-12-31T23:59:59Z'),
  resetTokenHash: 'reset_token_hash_456',
  resetTokenExpireAt: new Date('2024-01-02T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * エラーテストケースのファクトリー
 */
export const createErrorTestCases = () => [
  {
    name: 'database connection error',
    error: new Error('Database connection failed'),
  },
  {
    name: 'timeout error',
    error: new Error('Request timeout'),
  },
  {
    name: 'validation error',
    error: new Error('Validation failed'),
  },
];

/**
 * 期待されるモック呼び出しをアサートするヘルパー
 */
export const expectMockCalledWith = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- モック関数の型は実行時まで不明なためanyが必要
  mockFn: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 引数の型は実行時まで不明なためanyが必要
  expectedArgs: any[],
  callIndex = 0,
) => {
  return expect(mockFn).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
};

/**
 * 期待されるモック呼び出し回数をアサートするヘルパー
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- モック関数の型は実行時まで不明なためanyが必要
export const expectMockCalledTimes = (mockFn: any, times: number) => {
  return expect(mockFn).toHaveBeenCalledTimes(times);
};

/**
 * モックが呼ばれていないことをアサートするヘルパー
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- モック関数の型は実行時まで不明なためanyが必要
export const expectMockNotCalled = (mockFn: any) => {
  return expect(mockFn).not.toHaveBeenCalled();
};

// DIコンテナ用のヘルパー関数

/**
 * テスト環境のセットアップ
 *
 * 各テストの beforeEach で使用することで、テスト間の独立性を確保します。
 *
 * 使用例:
 * ```ts
 * import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
 *
 * describe('MyTest', () => {
 *   setupTestEnvironment();
 *
 *   it('should work', () => {
 *     // テストロジック
 *   });
 * });
 * ```
 */
export function setupTestEnvironment() {
  beforeEach(() => {
    // DIコンテナのリセット
    container.clearInstances();
  });
}
