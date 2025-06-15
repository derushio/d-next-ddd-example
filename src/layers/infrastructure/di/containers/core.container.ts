import 'reflect-metadata';

import { DatabaseFactory } from '@/layers/infrastructure/persistence/DatabaseFactory';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import { ConfigService } from '@/layers/infrastructure/services/ConfigService';
import { container } from 'tsyringe';

/**
 * Core Container - 最下位レイヤー
 *
 * アプリケーション全体の基盤となるサービスを管理：
 * - PrismaClient: データベース接続
 * - ConfigService: 設定管理
 */
export const coreContainer = container.createChildContainer();

// Prevent duplicate registration
function safeRegister<T>(token: symbol, creator: new (...args: any[]) => T) {
  if (!coreContainer.isRegistered(token)) {
    coreContainer.registerSingleton(creator);
    coreContainer.register(token, { useToken: creator });
  }
}

// PrismaClient: ファクトリーパターンで管理されたインスタンスを登録
if (!coreContainer.isRegistered(INJECTION_TOKENS.PrismaClient)) {
  coreContainer.registerInstance(
    INJECTION_TOKENS.PrismaClient,
    DatabaseFactory.getInstance(),
  );
}

// Core Service registrations
safeRegister(INJECTION_TOKENS.ConfigService, ConfigService);

console.log('✅ Core Container初期化完了');
