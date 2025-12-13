/**
 * アプリケーション設定値インターフェース
 * Application層で定義し、Infrastructure層で実装する
 */
export interface AppConfig {
  token: {
    saltRounds: number;
    secret: string;
    maxAgeMinutes: number;
    updateAgeMinutes: number;
  };
  database: {
    url: string;
  };
  app: {
    baseUrl: string;
    isDevelopment: boolean;
    nodeEnv: string;
  };
}

/**
 * Client Component用設定値インターフェース
 * NEXT_PUBLIC_ プレフィックス付き環境変数のみアクセス可能
 */
export interface ClientAppConfig {
  app: {
    baseUrl: string;
    isDevelopment: boolean;
    nodeEnv: string;
  };
}

/**
 * 設定取得サービスのインターフェース
 * Application層で定義し、Infrastructure層で実装する
 */
export interface IConfigService {
  /** 設定オブジェクトを取得する */
  getConfig(): AppConfig;
}
