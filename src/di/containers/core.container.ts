import 'reflect-metadata';

import { container } from 'tsyringe';
import { safeRegister } from '@/di/containers/safeRegister';
import { INJECTION_TOKENS } from '@/di/tokens';
import { getInstance as getDatabaseInstance } from '@/layers/infrastructure/persistence/DatabaseFactory';
import { ConfigService } from '@/layers/infrastructure/services/ConfigService';

/**
 * Core Container - 最下位レイヤー
 *
 * アプリケーション全体の基盤となるサービスを管理：
 * - PrismaClient: データベース接続
 * - ConfigService: 設定管理
 */
export const coreContainer = container.createChildContainer();

// PrismaClient: lazy factory パターンで登録
// モジュールインポート時ではなく、実際に注入が要求された時点でインスタンスを生成する。
// これにより、テスト環境でDIコンテナをインポートしても DATABASE_URL チェックが走らない。
if (!coreContainer.isRegistered(INJECTION_TOKENS.PrismaClient)) {
  coreContainer.register(INJECTION_TOKENS.PrismaClient, {
    useFactory: () => getDatabaseInstance(),
  });
}

// Core Service registrations
safeRegister(coreContainer, INJECTION_TOKENS.ConfigService, ConfigService);

// NOTE: DIコンテナ初期化ログは console.log を使用する。
// Logger自体がDIコンテナ（infrastructureContainer）で登録・管理されるため、
// コンテナ初期化時点では ILogger インスタンスがまだ利用できない。
// pino logger を使うと循環依存（Logger登録 → Logger使用 → Logger未登録）になるため console.log が正しい選択。
console.log('✅ Core Container初期化完了');
