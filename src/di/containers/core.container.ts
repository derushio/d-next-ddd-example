import 'reflect-metadata';

import { INJECTION_TOKENS } from '@/di/tokens';
import { DatabaseFactory } from '@/layers/infrastructure/persistence/DatabaseFactory';
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
// biome-ignore lint/suspicious/noExplicitAny: DIコンテナのコンストラクタ型は実行時に多様な引数パターンを受け取るためanyが必要
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
