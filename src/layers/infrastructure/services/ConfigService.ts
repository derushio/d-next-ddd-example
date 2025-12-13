import { Env } from '@/app/server-actions/env/Env';
import type {
  AppConfig,
  IConfigService,
} from '@/layers/application/interfaces/IConfigService';

import { injectable } from 'tsyringe';

// Re-export for backward compatibility
export type {
  AppConfig,
  ClientAppConfig,
  IConfigService,
} from '@/layers/application/interfaces/IConfigService';

/**
 * 統合ConfigService
 *
 * 責務:
 * - Server/Client両方で使用可能な環境変数の提供
 * - 適切な環境に応じたアクセス制御
 * - 設定値キャッシュと型安全性確保
 *
 * Server側では全ての設定値にアクセス可能
 * Client側では NEXT_PUBLIC_ プレフィックス付き変数のみアクセス可能
 */
@injectable()
export class ConfigService implements IConfigService {
  /** インスタンス生成時にキャッシュして以降はイミュータブルに扱う */
  private readonly config: AppConfig = {
    token: {
      saltRounds: Env.TOKEN_SALT_ROUNDS,
      secret: Env.TOKEN_SECRET,
      maxAgeMinutes: Env.TOKEN_MAX_AGE_MINUTES,
      updateAgeMinutes: Env.TOKEN_UPDATE_AGE_MINUTES,
    },
    database: {
      url: Env.DATABASE_URL,
    },
    app: {
      baseUrl: Env.NEXT_PUBLIC_BASE_URL,
      isDevelopment: process.env.NODE_ENV === 'development',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
  } as const;

  /**
   * 設定オブジェクトを返却する。
   * 呼び出し側で破壊的変更が行われないよう
   * ディープコピーではなく Readonly として扱うことを推奨。
   */
  getConfig(): AppConfig {
    return this.config;
  }

  // 個別取得のgetterの作成を禁止する
}
