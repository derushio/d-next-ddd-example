import 'reflect-metadata';

import { coreContainer } from '@/layers/infrastructure/di/containers/core.container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
import { ErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';
import { HashService } from '@/layers/infrastructure/services/HashService';
import { Logger } from '@/layers/infrastructure/services/Logger';

/**
 * Infrastructure Container - インフラストラクチャ層
 *
 * Core層の上に構築され、技術的な実装詳細を管理：
 * - HashService: パスワードハッシュ化
 * - Logger: ログ出力
 * - ErrorHandler: エラーハンドリング
 * - Repository実装: データアクセス層
 */
export const infrastructureContainer = coreContainer.createChildContainer();

// Prevent duplicate registration
function safeRegister<T>(token: symbol, creator: new (...args: any[]) => T) {
  if (!infrastructureContainer.isRegistered(token)) {
    infrastructureContainer.registerSingleton(creator);
    infrastructureContainer.register(token, { useToken: creator });
  }
}

// Infrastructure Service registrations
safeRegister(INJECTION_TOKENS.HashService, HashService);
safeRegister(INJECTION_TOKENS.Logger, Logger);
safeRegister(INJECTION_TOKENS.ErrorHandler, ErrorHandler);

// Repository registrations (Infrastructure層の一部)
safeRegister(INJECTION_TOKENS.UserRepository, PrismaUserRepository);
safeRegister(INJECTION_TOKENS.SessionRepository, PrismaSessionRepository);

console.log('✅ Infrastructure Container初期化完了');
