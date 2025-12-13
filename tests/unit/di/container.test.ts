import 'reflect-metadata';

import { ConfigService } from '@/layers/infrastructure/services/ConfigService';
import { ErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';
import { HashService } from '@/layers/infrastructure/services/HashService';
import { Logger } from '@/layers/infrastructure/services/Logger';
import { UpdateUserUseCase } from '@/layers/application/usecases/UpdateUserUseCase';
import { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import { AuthSessionService } from '@/layers/infrastructure/services/AuthSessionService';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { DatabaseFactory } from '@/layers/infrastructure/persistence/DatabaseFactory';
// DIコンテナの初期化のために、明示的にcontainerモジュールをインポート
// ただし、テスト時は個別に管理する
import { INJECTION_TOKENS, type InjectionToken } from '@/di/tokens';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';
import { PrismaSessionRepository } from '@/layers/infrastructure/repositories/implementations/PrismaSessionRepository';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';

import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// テスト用のresolve関数（型安全）
function testResolve<
  K extends
    keyof import('@/di/tokens').ServiceTypeMap,
>(
  serviceName: K,
): import('@/di/tokens').ServiceType<K> {
  return container.resolve<
    import('@/di/tokens').ServiceType<K>
  >(INJECTION_TOKENS[serviceName] as InjectionToken<K>);
}

describe('DIコンテナテスト', () => {
  beforeEach(() => {
    // テスト間でコンテナをクリア
    container.clearInstances();
    // DatabaseFactoryもリセット
    DatabaseFactory.resetInstance();

    // テスト用のモックPrismaClientを設定
    const mockPrisma = {
      user: { create: vi.fn(), findUnique: vi.fn() },
      userSession: { create: vi.fn(), findFirst: vi.fn() },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    } as unknown as PrismaClient;
    DatabaseFactory.setInstance(mockPrisma);

    // DIコンテナに各サービスを登録
    container.registerInstance(
      INJECTION_TOKENS.PrismaClient,
      DatabaseFactory.getInstance(),
    );
    container.registerSingleton(INJECTION_TOKENS.ConfigService, ConfigService);
    container.registerSingleton(INJECTION_TOKENS.HashService, HashService);
    container.registerSingleton(INJECTION_TOKENS.Logger, Logger);
    container.registerSingleton(INJECTION_TOKENS.ErrorHandler, ErrorHandler);
    container.registerSingleton(
      INJECTION_TOKENS.UserRepository,
      PrismaUserRepository,
    );
    container.registerSingleton(
      INJECTION_TOKENS.SessionRepository,
      PrismaSessionRepository,
    );
    container.registerSingleton(
      INJECTION_TOKENS.UserDomainService,
      UserDomainService,
    );
    container.registerSingleton(
      INJECTION_TOKENS.AuthSessionService,
      AuthSessionService,
    );
    container.registerSingleton(
      INJECTION_TOKENS.GetCurrentUserUseCase,
      GetCurrentUserUseCase,
    );
    container.registerSingleton(
      INJECTION_TOKENS.CreateUserUseCase,
      CreateUserUseCase,
    );
    container.registerSingleton(INJECTION_TOKENS.SignInUseCase, SignInUseCase);
    container.registerSingleton(
      INJECTION_TOKENS.UpdateUserUseCase,
      UpdateUserUseCase,
    );
  });

  describe('基本的なサービス解決', () => {
    it('Loggerが正常に解決できる', () => {
      const logger = testResolve('Logger');
      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
    });

    it('HashServiceが正常に解決できる', () => {
      const hashService = testResolve('HashService');
      expect(hashService).toBeDefined();
      expect(hashService.generateHash).toBeInstanceOf(Function);
    });

    it('ConfigServiceが正常に解決できる', () => {
      const configService = testResolve('ConfigService');
      expect(configService).toBeDefined();
      expect(configService.getConfig).toBeInstanceOf(Function);
    });
  });

  describe('データベース関連サービス', () => {
    it('PrismaClientが正常に解決できる', () => {
      const prismaClient = testResolve('PrismaClient');
      expect(prismaClient).toBeDefined();
      expect(prismaClient.user).toBeDefined();
      expect(prismaClient.userSession).toBeDefined();
    });

    it('UserRepositoryが正常に解決できる', () => {
      const userRepository = testResolve('UserRepository');
      expect(userRepository).toBeDefined();
      expect(userRepository.findByEmail).toBeInstanceOf(Function);
      expect(userRepository.save).toBeInstanceOf(Function);
      expect(userRepository.update).toBeInstanceOf(Function);
    });

    it('SessionRepositoryが正常に解決できる', () => {
      const sessionRepository = testResolve('SessionRepository');
      expect(sessionRepository).toBeDefined();
      expect(sessionRepository.create).toBeInstanceOf(Function);
      expect(sessionRepository.findFirst).toBeInstanceOf(Function);
    });
  });

  describe('UseCase層', () => {
    it('SignInUseCaseが正常に解決できる', () => {
      const signInUseCase = testResolve('SignInUseCase');
      expect(signInUseCase).toBeDefined();
      expect(signInUseCase.execute).toBeInstanceOf(Function);
    });

    it('CreateUserUseCaseが正常に解決できる', () => {
      const createUserUseCase = testResolve('CreateUserUseCase');
      expect(createUserUseCase).toBeDefined();
      expect(createUserUseCase.execute).toBeInstanceOf(Function);
    });

    it('UpdateUserUseCaseが正常に解決できる', () => {
      const updateUserUseCase = testResolve('UpdateUserUseCase');
      expect(updateUserUseCase).toBeDefined();
      expect(updateUserUseCase.execute).toBeInstanceOf(Function);
    });
  });

  describe('DatabaseFactory', () => {
    it('シングルトンインスタンスが取得できる', () => {
      const instance1 = DatabaseFactory.getInstance();
      const instance2 = DatabaseFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('テスト用インスタンスを設定できる', () => {
      const mockPrisma = {
        user: { create: vi.fn(), findUnique: vi.fn() },
        userSession: { create: vi.fn(), findFirst: vi.fn() },
        $connect: vi.fn(),
        $disconnect: vi.fn(),
      } as unknown as PrismaClient;

      DatabaseFactory.setInstance(mockPrisma);
      const instance = DatabaseFactory.getInstance();
      expect(instance).toBe(mockPrisma);
    });
  });
});
