import { resolve } from '@/di/resolver';
import type { IConfigService } from '@/layers/infrastructure/services/ConfigService';
import type { IErrorHandler } from '@/layers/infrastructure/services/ErrorHandler';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { describe, expect, expectTypeOf, it } from 'vitest';

describe('DI Type Inference Tests', () => {
  describe('resolve() function', () => {
    it('should provide correct type inference for Logger', () => {
      const logger = resolve('Logger');

      // 型推論のテスト
      expectTypeOf(logger).toEqualTypeOf<ILogger>();

      // 実際のインスタンスのテスト
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should provide correct type inference for ConfigService', () => {
      const config = resolve('ConfigService');

      // 型推論のテスト
      expectTypeOf(config).toEqualTypeOf<IConfigService>();

      // 実際のインスタンスのテスト
      expect(config).toBeDefined();
      expect(config.getConfig).toBeDefined();
      expect(typeof config.getConfig).toBe('function');
    });

    it('should provide correct type inference for HashService', () => {
      const hashService = resolve('HashService');

      // 型推論のテスト
      expectTypeOf(hashService).toEqualTypeOf<IHashService>();

      // 実際のインスタンスのテスト
      expect(hashService).toBeDefined();
      expect(hashService.generateHash).toBeDefined();
      expect(hashService.compareHash).toBeDefined();
      expect(typeof hashService.generateHash).toBe('function');
      expect(typeof hashService.compareHash).toBe('function');
    });

    it('should provide correct type inference for ErrorHandler', () => {
      const errorHandler = resolve('ErrorHandler');

      // 型推論のテスト
      expectTypeOf(errorHandler).toEqualTypeOf<IErrorHandler>();

      // 実際のインスタンスのテスト
      expect(errorHandler).toBeDefined();
      expect(errorHandler.handleError).toBeDefined();
      expect(typeof errorHandler.handleError).toBe('function');
    });

    it('should provide correct type inference for infrastructure services', () => {
      // インフラサービスの型推論テスト（PrismaClientに依存しないもの）
      const logger = resolve('Logger');
      const config = resolve('ConfigService');
      const errorHandler = resolve('ErrorHandler');
      const hashService = resolve('HashService');

      // 全て定義されていることを確認
      expect(logger).toBeDefined();
      expect(config).toBeDefined();
      expect(errorHandler).toBeDefined();
      expect(hashService).toBeDefined();
    });

    it('should return the same instance for singleton services', () => {
      // Singletonパターンのテスト
      const logger1 = resolve('Logger');
      const logger2 = resolve('Logger');

      expect(logger1).toBe(logger2);

      const config1 = resolve('ConfigService');
      const config2 = resolve('ConfigService');

      expect(config1).toBe(config2);
    });
  });

  describe('Type Safety Tests', () => {
    it('should only accept valid service names for infrastructure services', () => {
      // PrismaClientに依存しないサービスのみテスト
      expect(() => resolve('Logger')).not.toThrow();
      expect(() => resolve('ConfigService')).not.toThrow();
      expect(() => resolve('HashService')).not.toThrow();
      expect(() => resolve('ErrorHandler')).not.toThrow();

      // TypeScriptレベルでの型チェック（コンパイル時エラー）
      // 以下はコメントアウト - 実際にはTypeScriptコンパイラがエラーを出す
      // const invalid = resolve('NonExistentService'); // TS Error
    });

    it('should provide IntelliSense autocomplete for infrastructure service names', () => {
      // このテストは実際の開発時のIntelliSenseをシミュレート
      // resolve(' と入力した時に以下の候補が表示されることを期待
      const validInfraServiceNames = [
        'Logger',
        'ConfigService',
        'ErrorHandler',
        'HashService',
      ];

      // 全ての有効なインフラサービス名でresolveが動作することを確認
      validInfraServiceNames.forEach((serviceName) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 動的サービス名での型推論テスト実行のためanyが必要
        expect(() => resolve(serviceName as any)).not.toThrow();
      });
    });
  });

  describe('Service Method Tests', () => {
    it('should have correct methods on Logger service', () => {
      const logger = resolve('Logger');

      // メソッドの存在確認
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();

      // メソッドの型確認
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have correct methods on ConfigService', () => {
      const config = resolve('ConfigService');

      // メソッドの存在確認
      expect(config.getConfig).toBeDefined();
      expect(typeof config.getConfig).toBe('function');

      // 設定値の取得テスト
      const appConfig = config.getConfig();
      expect(appConfig).toBeDefined();
      expect(appConfig.app).toBeDefined();
      expect(appConfig.token).toBeDefined();
    });

    it('should have correct methods on HashService', () => {
      const hashService = resolve('HashService');

      // メソッドの存在確認
      expect(hashService.generateHash).toBeDefined();
      expect(hashService.compareHash).toBeDefined();
      expect(typeof hashService.generateHash).toBe('function');
      expect(typeof hashService.compareHash).toBe('function');
    });
  });
});
