/**
 * DIコンテナのテストセットアップユーティリティ
 *
 * 各UseCaseテストの `beforeEach` で重複するDIコンテナ登録を共通化する。
 * 既存の `container.registerInstance()` パターンと完全互換。
 *
 * 使い方:
 * ```ts
 * const mocks = createMockServices({
 *   userRepository: true,
 *   hashService: true,
 *   logger: true,
 * });
 * setupDIContainer(mocks);
 * ```
 */

import {
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockLoginAttemptService,
  createAutoMockRateLimitService,
  createAutoMockSessionRepository,
  createAutoMockUserDomainService,
  createAutoMockUserRepository,
} from '@tests/utils/mocks/autoMocks';
import type { MockProxy } from 'vitest-mock-extended';
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import type { ISessionRepository } from '@/layers/domain/repositories/ISessionRepository';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IUserDomainService } from '@/layers/domain/services/UserDomainService';
import type { IHashService } from '@/layers/infrastructure/services/HashService';

/** registerMockServices に渡せるサービスのマッピング型 */
export interface MockServiceMap {
  userRepository?: MockProxy<IUserRepository>;
  sessionRepository?: MockProxy<ISessionRepository>;
  userDomainService?: MockProxy<IUserDomainService>;
  hashService?: MockProxy<IHashService>;
  logger?: MockProxy<ILogger>;
  loginAttemptService?: MockProxy<ILoginAttemptService>;
  rateLimitService?: MockProxy<IRateLimitService>;
  // 任意の追加サービス（UseCase等）を柔軟に受け取る
  [token: symbol]: unknown;
}

/**
 * DIコンテナをクリアしてモックサービスを一括登録する。
 *
 * - `container.clearInstances()` を自動で呼ぶため、beforeEach 内で
 *   手動呼び出しは不要になる。
 * - 標準トークン以外は `extraTokens` で任意のシンボルとインスタンスを追加できる。
 *
 * @example
 * ```ts
 * let mocks: ReturnType<typeof createDefaultMocks>;
 * beforeEach(() => {
 *   mocks = createDefaultMocks();
 *   registerMockServices(mocks);
 * });
 * ```
 */
/** MockServiceMap のキーと INJECTION_TOKENS の対応マップ */
const SERVICE_TOKEN_MAP = {
  userRepository: INJECTION_TOKENS.UserRepository,
  sessionRepository: INJECTION_TOKENS.SessionRepository,
  userDomainService: INJECTION_TOKENS.UserDomainService,
  hashService: INJECTION_TOKENS.HashService,
  logger: INJECTION_TOKENS.Logger,
  loginAttemptService: INJECTION_TOKENS.LoginAttemptService,
  rateLimitService: INJECTION_TOKENS.RateLimitService,
} as const satisfies Record<string, symbol>;

export function registerMockServices(
  services: {
    userRepository?: MockProxy<IUserRepository>;
    sessionRepository?: MockProxy<ISessionRepository>;
    userDomainService?: MockProxy<IUserDomainService>;
    hashService?: MockProxy<IHashService>;
    logger?: MockProxy<ILogger>;
    loginAttemptService?: MockProxy<ILoginAttemptService>;
    rateLimitService?: MockProxy<IRateLimitService>;
  },
  extraTokens?: Array<[symbol, unknown]>,
): void {
  container.clearInstances();

  for (const [key, token] of Object.entries(SERVICE_TOKEN_MAP) as Array<
    [keyof typeof SERVICE_TOKEN_MAP, symbol]
  >) {
    const instance = services[key];
    if (instance) {
      container.registerInstance(token, instance);
    }
  }

  // 任意の追加トークン（GetCurrentUseCaseなど）
  if (extraTokens) {
    for (const [token, instance] of extraTokens) {
      container.registerInstance(token, instance);
    }
  }
}

/**
 * よく使うモックサービスをまとめて生成するファクトリ。
 * 必要なものだけ選択して生成する。
 *
 * @example
 * ```ts
 * const { mockUserRepository, mockHashService, mockLogger } = createDefaultMocks({
 *   userRepository: true,
 *   hashService: true,
 *   logger: true,
 * });
 * ```
 */
export function createDefaultMocks<
  T extends {
    userRepository?: boolean;
    sessionRepository?: boolean;
    userDomainService?: boolean;
    hashService?: boolean;
    logger?: boolean;
    loginAttemptService?: boolean;
    rateLimitService?: boolean;
  },
>(
  options: T,
): {
  mockUserRepository: T['userRepository'] extends true
    ? MockProxy<IUserRepository>
    : undefined;
  mockSessionRepository: T['sessionRepository'] extends true
    ? MockProxy<ISessionRepository>
    : undefined;
  mockUserDomainService: T['userDomainService'] extends true
    ? MockProxy<IUserDomainService>
    : undefined;
  mockHashService: T['hashService'] extends true
    ? MockProxy<IHashService>
    : undefined;
  mockLogger: T['logger'] extends true ? MockProxy<ILogger> : undefined;
  mockLoginAttemptService: T['loginAttemptService'] extends true
    ? MockProxy<ILoginAttemptService>
    : undefined;
  mockRateLimitService: T['rateLimitService'] extends true
    ? MockProxy<IRateLimitService>
    : undefined;
} {
  return {
    mockUserRepository: (options.userRepository
      ? createAutoMockUserRepository()
      : undefined) as any,
    mockSessionRepository: (options.sessionRepository
      ? createAutoMockSessionRepository()
      : undefined) as any,
    mockUserDomainService: (options.userDomainService
      ? createAutoMockUserDomainService()
      : undefined) as any,
    mockHashService: (options.hashService
      ? createAutoMockHashService()
      : undefined) as any,
    mockLogger: (options.logger ? createAutoMockLogger() : undefined) as any,
    mockLoginAttemptService: (options.loginAttemptService
      ? createAutoMockLoginAttemptService()
      : undefined) as any,
    mockRateLimitService: (options.rateLimitService
      ? createAutoMockRateLimitService()
      : undefined) as any,
  };
}
