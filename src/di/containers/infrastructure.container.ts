import 'reflect-metadata';

import { coreContainer } from '@/di/containers/core.container';
import { INJECTION_TOKENS } from '@/di/tokens';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
import { AuthSessionService } from '@/layers/infrastructure/services/AuthSessionService';
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DIコンテナのコンストラクタ型は実行時に多様な引数パターンを受け取るためanyが必要
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
safeRegister(INJECTION_TOKENS.AuthSessionService, AuthSessionService);

// Repository registrations (Infrastructure層の一部)
safeRegister(INJECTION_TOKENS.UserRepository, PrismaUserRepository);
safeRegister(INJECTION_TOKENS.SessionRepository, PrismaSessionRepository);

console.log('✅ Infrastructure Container初期化完了');
