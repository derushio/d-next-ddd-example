import 'reflect-metadata';

import { coreContainer } from '@/di/containers/core.container';
import { safeRegister } from '@/di/containers/safeRegister';
import { INJECTION_TOKENS } from '@/di/tokens';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
// [HYGEN:REPO_IMPORTS]

import { AuthSessionService } from '@/layers/infrastructure/services/AuthSessionService';
import { ErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';
import { HashService } from '@/layers/infrastructure/services/HashService';
import { Logger } from '@/layers/infrastructure/services/Logger';
import { LoginAttemptService } from '@/layers/infrastructure/services/LoginAttemptService';
import { RateLimitService } from '@/layers/infrastructure/services/RateLimitService';

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

// Infrastructure Service registrations
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.HashService,
  HashService,
);
safeRegister(infrastructureContainer, INJECTION_TOKENS.Logger, Logger);
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.ErrorHandler,
  ErrorHandler,
);
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.AuthSessionService,
  AuthSessionService,
);
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.LoginAttemptService,
  LoginAttemptService,
);
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.RateLimitService,
  RateLimitService,
);

// Repository registrations (Infrastructure層の一部)
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.UserRepository,
  PrismaUserRepository,
);
safeRegister(
  infrastructureContainer,
  INJECTION_TOKENS.SessionRepository,
  PrismaSessionRepository,
);
// [HYGEN:REPO_REGISTER]

// NOTE: DIコンテナ初期化ログは console.log を使用する。
// Logger自体がこのコンテナ（infrastructureContainer）で登録されるため、
// 登録完了を知らせるログ出力時点ではまだ ILogger インスタンスを解決できない。
// pino logger を使うと循環依存になるため console.log が正しい選択。
console.log('✅ Infrastructure Container初期化完了');
