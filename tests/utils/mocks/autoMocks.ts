import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import type { ISessionRepository } from '@/layers/domain/repositories/ISessionRepository';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import type { IConfigService } from '@/layers/infrastructure/services/ConfigService';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

// 🚀 自動モック生成関数（vitest-mock-extended）

// Repository層
export const createAutoMockUserRepository = (): MockProxy<IUserRepository> =>
  mock<IUserRepository>();

export const createAutoMockSessionRepository =
  (): MockProxy<ISessionRepository> => mock<ISessionRepository>();

// Domain Service層
export const createAutoMockUserDomainService =
  (): MockProxy<UserDomainService> => mock<UserDomainService>();

// Infrastructure Service層
export const createAutoMockHashService = (): MockProxy<IHashService> =>
  mock<IHashService>();

export const createAutoMockLogger = (): MockProxy<ILogger> => mock<ILogger>();

export const createAutoMockConfigService = (): MockProxy<IConfigService> =>
  mock<IConfigService>();

// Security Service層
export const createAutoMockLoginAttemptService =
  (): MockProxy<ILoginAttemptService> => {
    const mockService = mock<ILoginAttemptService>();
    // デフォルトでロックアウト無し、Rate Limit無しの状態を返す
    mockService.checkLockout.mockResolvedValue({
      isLocked: false,
      failedAttempts: 0,
      remainingAttempts: 5,
    });
    mockService.recordAttempt.mockResolvedValue(undefined);
    mockService.resetAttempts.mockResolvedValue(undefined);
    return mockService;
  };

export const createAutoMockRateLimitService =
  (): MockProxy<IRateLimitService> => {
    const mockService = mock<IRateLimitService>();
    // デフォルトでRate Limitを許可する状態を返す
    mockService.checkLimit.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 5,
      remaining: 5,
    });
    mockService.resetLimit.mockResolvedValue(undefined);
    mockService.cleanup.mockResolvedValue(undefined);
    return mockService;
  };

// Database層
// 注意: PrismaClientは型が複雑すぎるため、自動モック化は困難
// commonMocks.tsの手動モックを使用してください

// 🎭 特殊用途モック

/**
 * Console Mock for Logger tests
 * Note: console は global object なので MockProxy ではなく通常のオブジェクト
 */
export const createAutoMockConsole = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
});

// 🚨 複雑な構造のため手動モック関数をここに移動
// これらは将来的に自動モック化を検討

/**
 * ConfigService Mock (複雑な構造のため手動)
 */
export const createMockConfigService = (
  config = {
    token: {
      saltRounds: 10,
      secret: 'test-secret',
      maxAgeMinutes: 60,
      updateAgeMinutes: 30,
    },
    database: {
      url: 'test-db-url',
    },
    app: {
      baseUrl: 'http://localhost:3000',
      isDevelopment: true,
      nodeEnv: 'test',
    },
  },
) => ({
  getConfig: vi.fn().mockReturnValue(config),
});
