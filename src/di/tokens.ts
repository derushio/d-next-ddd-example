/**
 * TSyringe DI Container用のInjection Tokens定義
 *
 * Symbol.for()を使用することで：
 * - 型安全性の確保（string literalベースの脆弱性回避）
 * - 名前衝突の防止
 * - デバッグ時の可読性向上
 */
// Application層インターフェース
import type { IAuthSessionService } from '@/layers/application/interfaces/IAuthSessionService';
import type { IConfigService } from '@/layers/application/interfaces/IConfigService';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ILoginAttemptService } from '@/layers/application/interfaces/ILoginAttemptService';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
// Service型のインポート
// Legacy Application Services (will be phased out)
import type { AuthService } from '@/layers/application/services/AuthService';
import type { TokenService } from '@/layers/application/services/TokenService';
import type { UserService } from '@/layers/application/services/UserService';
import type { ChangePasswordUseCase } from '@/layers/application/usecases/auth/ChangePasswordUseCase';
import type { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import type { RefreshTokenUseCase } from '@/layers/application/usecases/auth/RefreshTokenUseCase';
import type { ResetPasswordUseCase } from '@/layers/application/usecases/auth/ResetPasswordUseCase';
import type { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import type { SignOutUseCase } from '@/layers/application/usecases/auth/SignOutUseCase';
import type { UpdateUserUseCase } from '@/layers/application/usecases/UpdateUserUseCase';
// Use Cases
import type { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import type { DeleteUserUseCase } from '@/layers/application/usecases/user/DeleteUserUseCase';
import type { GetUserByIdUseCase } from '@/layers/application/usecases/user/GetUserByIdUseCase';
import type { GetUsersUseCase } from '@/layers/application/usecases/user/GetUsersUseCase';
// [HYGEN:USECASE_IMPORTS]

import type { ISessionRepository } from '@/layers/domain/repositories/ISessionRepository';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
// Domain Services
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import type { IErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';

/**
 * 全DIコンテナで使用するToken定数
 */
export const INJECTION_TOKENS = {
  // Infrastructure Services
  PrismaClient: Symbol.for('PrismaClient'),
  ConfigService: Symbol.for('ConfigService'),
  HashService: Symbol.for('HashService'),
  Logger: Symbol.for('Logger'),
  ErrorHandler: Symbol.for('ErrorHandler'),
  AuthSessionService: Symbol.for('AuthSessionService'),
  /** ログイン試行管理・アカウントロックアウトService */
  LoginAttemptService: Symbol.for('LoginAttemptService'),
  /** Rate Limitサービス（認証リクエスト制限） */
  RateLimitService: Symbol.for('RateLimitService'),

  // Repository Layer
  UserRepository: Symbol.for('UserRepository'),
  /** Phase 3追加: userSession テーブル操作Repository */
  SessionRepository: Symbol.for('SessionRepository'),
  // [HYGEN:REPO_TOKENS]

  // Domain Services
  UserDomainService: Symbol.for('UserDomainService'),

  // Use Cases
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
  GetUsersUseCase: Symbol.for('GetUsersUseCase'),
  GetUserByIdUseCase: Symbol.for('GetUserByIdUseCase'),
  DeleteUserUseCase: Symbol.for('DeleteUserUseCase'),
  UpdateUserUseCase: Symbol.for('UpdateUserUseCase'),
  SignInUseCase: Symbol.for('SignInUseCase'),
  SignOutUseCase: Symbol.for('SignOutUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
  RefreshTokenUseCase: Symbol.for('RefreshTokenUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  ChangePasswordUseCase: Symbol.for('ChangePasswordUseCase'),
  // [HYGEN:USECASE_TOKENS]

  // Legacy Application Services (will be phased out)
  UserService: Symbol.for('UserService'),
  AuthService: Symbol.for('AuthService'),
  /** Phase 3追加: JWT生成・検証を担当するService */
  TokenService: Symbol.for('TokenService'),
} as const;

/**
 * INJECTION_TOKENS のキーに対応する Symbol 型を抽出するユーティリティ型。
 * 型引数にキー名を与えることで、対応する Symbol リテラル型が取得できる。
 */
export type InjectionToken<T extends keyof typeof INJECTION_TOKENS> =
  (typeof INJECTION_TOKENS)[T];

/**
 * 🚀 型安全なDIサービス型マッピング
 * TokenからService型を自動推論できるようにする超便利な型システム
 */
export interface ServiceTypeMap {
  // Infrastructure Services
  PrismaClient: PrismaClient;
  ConfigService: IConfigService;
  HashService: IHashService;
  Logger: ILogger;
  ErrorHandler: IErrorHandler;
  AuthSessionService: IAuthSessionService;
  LoginAttemptService: ILoginAttemptService;
  RateLimitService: IRateLimitService;

  // Repository Layer
  UserRepository: IUserRepository;
  SessionRepository: ISessionRepository;
  // [HYGEN:REPO_TYPEMAP]

  // Domain Services
  UserDomainService: UserDomainService;

  // Use Cases
  CreateUserUseCase: CreateUserUseCase;
  GetUsersUseCase: GetUsersUseCase;
  GetUserByIdUseCase: GetUserByIdUseCase;
  DeleteUserUseCase: DeleteUserUseCase;
  UpdateUserUseCase: UpdateUserUseCase;
  SignInUseCase: SignInUseCase;
  SignOutUseCase: SignOutUseCase;
  GetCurrentUserUseCase: GetCurrentUserUseCase;
  RefreshTokenUseCase: RefreshTokenUseCase;
  ResetPasswordUseCase: ResetPasswordUseCase;
  ChangePasswordUseCase: ChangePasswordUseCase;
  // [HYGEN:USECASE_TYPEMAP]

  // Legacy Application Services (will be phased out)
  UserService: UserService;
  AuthService: AuthService;
  TokenService: TokenService;
}

/**
 * 🎯 Tokenから自動的にService型を取得するヘルパー型
 * これでもう手動で型を指定する必要なし！
 */
export type ServiceType<T extends keyof ServiceTypeMap> = ServiceTypeMap[T];
