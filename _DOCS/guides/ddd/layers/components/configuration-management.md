# Configuration Management - 設定・環境管理 ⚙️

アプリケーションの設定値、環境変数、外部サービスの接続情報などを管理するコンポーネントです。環境に応じた設定の切り替えと、設定値の型安全性を保証します。

> **注意**: このプロジェクトでは `@t3-oss/env-nextjs` の `createEnv` を使用して環境変数を型安全に管理しています。
> `process.env` の直接参照は原則禁止であり、`src/lib/env.ts` の `env` オブジェクト経由でアクセスしてください。
> 以下のコード例における `process.env` 参照は概念説明のためのものです。実装時は `env.VARIABLE_NAME` を使用してください。

---

## 🎯 コンポーネントの定義

**Configuration Management**は、Infrastructure Layerに属し、アプリケーションの実行に必要な設定値を管理するコンポーネントです。環境変数の読み込み、設定値の検証、型安全性の確保、機密情報の保護を責務とします。

### 📊 特性と役割

```mermaid
graph TD
    subgraph "Configuration Management の特性"
        A[環境変数の管理]
        B[型安全性の保証]
        C[設定値の検証]
        D[機密情報の保護]
        E[環境別設定]
    end

    subgraph "管理対象"
        F[データベース接続]
        G[外部API設定]
        H[アプリケーション設定]
        I[ログ設定]
        J[セキュリティ設定]
    end

    A --> F
    B --> G
    C --> H
    D --> I
    E --> J

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style B fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style C fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style D fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style E fill:#fce4ec
```

### 🔄 設定管理の流れ

```mermaid
graph LR
    ENV[環境変数] --> LOADER[設定ローダー]
    FILE[設定ファイル] --> LOADER
    LOADER --> VALIDATOR[設定検証]
    VALIDATOR --> PARSER[型変換]
    PARSER --> CONFIG[設定オブジェクト]
    CONFIG --> DI[DIコンテナ]

    style ENV fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style LOADER fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style VALIDATOR fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style PARSER fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style CONFIG fill:#fce4ec
```

---

## ✅ 何をして良いか

### 1. 型安全な設定管理 🔒

**環境変数を型安全に管理する実装**

```typescript
// ✅ 許可：設定インターフェースの定義
export interface IApplicationConfig {
 // アプリケーション基本設定
 readonly app: {
  readonly name: string;
  readonly version: string;
  readonly port: number;
  readonly host: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
 };

 // データベース設定
 readonly database: {
  readonly url: string;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly name: string;
  readonly ssl: boolean;
  readonly maxConnections: number;
  readonly connectionTimeout: number;
 };

 // 外部サービス設定
 readonly externalServices: {
  readonly sendgrid: {
   readonly apiKey: string;
   readonly fromEmail: string;
   readonly webhookSecret: string;
  };
  readonly aws: {
   readonly region: string;
   readonly accessKeyId: string;
   readonly secretAccessKey: string;
   readonly s3BucketName: string;
  };
  readonly redis: {
   readonly url: string;
   readonly password?: string;
   readonly ttl: number;
  };
 };

 // セキュリティ設定
 readonly security: {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptRounds: number;
  readonly corsOrigins: string[];
  readonly rateLimitWindow: number;
  readonly rateLimitMaxRequests: number;
 };

 // 機能フラグ
 readonly features: {
  readonly enableEmailNotifications: boolean;
  readonly enableFileUploads: boolean;
  readonly enableCaching: boolean;
  readonly enableMetrics: boolean;
 };
}

// ✅ 許可：設定実装クラス
export class ApplicationConfig implements IApplicationConfig {
 readonly app: IApplicationConfig['app'];
 readonly database: IApplicationConfig['database'];
 readonly externalServices: IApplicationConfig['externalServices'];
 readonly security: IApplicationConfig['security'];
 readonly features: IApplicationConfig['features'];

 constructor() {
  // 環境変数の読み込みと検証
  this.validateEnvironmentVariables();

  this.app = {
   name: this.getRequiredString('APP_NAME', 'MyApp'),
   version: this.getRequiredString('APP_VERSION', '1.0.0'),
   port: this.getRequiredNumber('PORT', 3000),
   host: this.getRequiredString('HOST', 'localhost'),
   environment: this.getRequiredEnum(
    'NODE_ENV',
    ['development', 'staging', 'production'],
    'development',
   ),
   logLevel: this.getRequiredEnum(
    'LOG_LEVEL',
    ['debug', 'info', 'warn', 'error'],
    'info',
   ),
  };

  this.database = {
   url: this.getRequiredString('DATABASE_URL'),
   host: this.getRequiredString('DB_HOST', 'localhost'),
   port: this.getRequiredNumber('DB_PORT', 5432),
   username: this.getRequiredString('DB_USERNAME'),
   password: this.getRequiredString('DB_PASSWORD'),
   name: this.getRequiredString('DB_NAME'),
   ssl: this.getRequiredBoolean('DB_SSL', false),
   maxConnections: this.getRequiredNumber('DB_MAX_CONNECTIONS', 10),
   connectionTimeout: this.getRequiredNumber('DB_CONNECTION_TIMEOUT', 5000),
  };

  this.externalServices = {
   sendgrid: {
    apiKey: this.getRequiredString('SENDGRID_API_KEY'),
    fromEmail: this.getRequiredString('SENDGRID_FROM_EMAIL'),
    webhookSecret: this.getRequiredString('SENDGRID_WEBHOOK_SECRET'),
   },
   aws: {
    region: this.getRequiredString('AWS_REGION', 'ap-northeast-1'),
    accessKeyId: this.getRequiredString('AWS_ACCESS_KEY_ID'),
    secretAccessKey: this.getRequiredString('AWS_SECRET_ACCESS_KEY'),
    s3BucketName: this.getRequiredString('AWS_S3_BUCKET_NAME'),
   },
   redis: {
    url: this.getRequiredString('REDIS_URL'),
    password: this.getOptionalString('REDIS_PASSWORD'),
    ttl: this.getRequiredNumber('REDIS_TTL', 3600),
   },
  };

  this.security = {
   jwtSecret: this.getRequiredString('JWT_SECRET'),
   jwtExpiresIn: this.getRequiredString('JWT_EXPIRES_IN', '24h'),
   bcryptRounds: this.getRequiredNumber('BCRYPT_ROUNDS', 12),
   corsOrigins: this.getRequiredStringArray('CORS_ORIGINS', [
    'http://localhost:3000',
   ]),
   rateLimitWindow: this.getRequiredNumber('RATE_LIMIT_WINDOW', 900000), // 15分
   rateLimitMaxRequests: this.getRequiredNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  };

  this.features = {
   enableEmailNotifications: this.getRequiredBoolean(
    'ENABLE_EMAIL_NOTIFICATIONS',
    true,
   ),
   enableFileUploads: this.getRequiredBoolean('ENABLE_FILE_UPLOADS', true),
   enableCaching: this.getRequiredBoolean('ENABLE_CACHING', true),
   enableMetrics: this.getRequiredBoolean('ENABLE_METRICS', false),
  };
 }

 private validateEnvironmentVariables(): void {
  const requiredVars = [
   'DATABASE_URL',
   'DB_USERNAME',
   'DB_PASSWORD',
   'DB_NAME',
   'SENDGRID_API_KEY',
   'SENDGRID_FROM_EMAIL',
   'SENDGRID_WEBHOOK_SECRET',
   'AWS_ACCESS_KEY_ID',
   'AWS_SECRET_ACCESS_KEY',
   'AWS_S3_BUCKET_NAME',
   'REDIS_URL',
   'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
   throw new ConfigurationError(
    `必須の環境変数が設定されていません: ${missingVars.join(', ')}`,
    'MISSING_ENVIRONMENT_VARIABLES',
   );
  }
 }

 private getRequiredString(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
   throw new ConfigurationError(
    `環境変数 ${key} が設定されていません`,
    'MISSING_REQUIRED_CONFIG',
   );
  }
  return value;
 }

 private getOptionalString(key: string): string | undefined {
  return process.env[key];
 }

 private getRequiredNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
   throw new ConfigurationError(
    `環境変数 ${key} が設定されていません`,
    'MISSING_REQUIRED_CONFIG',
   );
  }

  const numValue = value ? parseInt(value, 10) : defaultValue!;
  if (isNaN(numValue)) {
   throw new ConfigurationError(
    `環境変数 ${key} は数値である必要があります: ${value}`,
    'INVALID_NUMBER_CONFIG',
   );
  }

  return numValue;
 }

 private getRequiredBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
   throw new ConfigurationError(
    `環境変数 ${key} が設定されていません`,
    'MISSING_REQUIRED_CONFIG',
   );
  }

  if (!value) return defaultValue!;

  const lowerValue = value.toLowerCase();
  if (lowerValue === 'true' || lowerValue === '1') return true;
  if (lowerValue === 'false' || lowerValue === '0') return false;

  throw new ConfigurationError(
   `環境変数 ${key} はboolean値である必要があります: ${value}`,
   'INVALID_BOOLEAN_CONFIG',
  );
 }

 private getRequiredEnum<T extends string>(
  key: string,
  allowedValues: T[],
  defaultValue?: T,
 ): T {
  const value = (process.env[key] || defaultValue) as T;
  if (!value) {
   throw new ConfigurationError(
    `環境変数 ${key} が設定されていません`,
    'MISSING_REQUIRED_CONFIG',
   );
  }

  if (!allowedValues.includes(value)) {
   throw new ConfigurationError(
    `環境変数 ${key} は以下の値のいずれかである必要があります: ${allowedValues.join(', ')}`,
    'INVALID_ENUM_CONFIG',
   );
  }

  return value;
 }

 private getRequiredStringArray(
  key: string,
  defaultValue?: string[],
 ): string[] {
  const value = process.env[key];
  if (!value && !defaultValue) {
   throw new ConfigurationError(
    `環境変数 ${key} が設定されていません`,
    'MISSING_REQUIRED_CONFIG',
   );
  }

  if (!value) return defaultValue!;

  return value
   .split(',')
   .map((item) => item.trim())
   .filter((item) => item.length > 0);
 }
}
```

### 2. 環境別設定管理 🌍

**開発・ステージング・本番環境での設定切り替え**

```typescript
// ✅ 許可：環境別設定ファクトリー
export class ConfigurationFactory {
 static create(): IApplicationConfig {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
   case 'development':
    return new DevelopmentConfig();
   case 'staging':
    return new StagingConfig();
   case 'production':
    return new ProductionConfig();
   default:
    throw new ConfigurationError(
     `サポートされていない環境です: ${environment}`,
     'UNSUPPORTED_ENVIRONMENT',
    );
  }
 }
}

// ✅ 許可：開発環境用設定
export class DevelopmentConfig extends ApplicationConfig {
 constructor() {
  super();

  // 開発環境固有の設定上書き
  (this.app as any) = {
   ...this.app,
   logLevel: 'debug' as const,
   port: this.getRequiredNumber('PORT', 3000),
  };

  (this.database as any) = {
   ...this.database,
   ssl: false,
   maxConnections: 5,
  };

  (this.features as any) = {
   ...this.features,
   enableMetrics: false, // 開発環境ではメトリクス無効
   enableCaching: false, // 開発環境ではキャッシュ無効
  };
 }

 // 開発環境用のヘルパーメソッド
 isDevelopment(): boolean {
  return true;
 }

 getDevDatabaseUrl(): string {
  return process.env.DEV_DATABASE_URL || this.database.url;
 }
}

// ✅ 許可：本番環境用設定
export class ProductionConfig extends ApplicationConfig {
 constructor() {
  super();

  // 本番環境固有の検証
  this.validateProductionSettings();

  // 本番環境固有の設定上書き
  (this.app as any) = {
   ...this.app,
   logLevel: 'warn' as const,
  };

  (this.database as any) = {
   ...this.database,
   ssl: true,
   maxConnections: 20,
  };

  (this.security as any) = {
   ...this.security,
   bcryptRounds: 14, // 本番環境ではより強固に
   rateLimitWindow: 300000, // 5分間
   rateLimitMaxRequests: 50, // より厳格に
  };
 }

 private validateProductionSettings(): void {
  // 本番環境では必須の設定
  const productionRequiredVars = [
   'JWT_SECRET',
   'DATABASE_URL',
   'SENDGRID_API_KEY',
  ];

  productionRequiredVars.forEach((varName) => {
   const value = process.env[varName];
   if (!value) {
    throw new ConfigurationError(
     `本番環境では環境変数 ${varName} が必須です`,
     'MISSING_PRODUCTION_CONFIG',
    );
   }

   // 本番環境では短すぎるシークレットを拒否
   if (varName.includes('SECRET') && value.length < 32) {
    throw new ConfigurationError(
     `本番環境では ${varName} は32文字以上である必要があります`,
     'WEAK_PRODUCTION_SECRET',
    );
   }
  });
 }

 isProduction(): boolean {
  return true;
 }
}
```

### 3. 機密情報の安全な管理 🔐

**機密情報の暗号化と安全な取り扱い**

```typescript
// ✅ 許可：機密情報管理
export class SecretManager {
 private readonly encryptionKey: string;

 constructor(encryptionKey: string) {
  if (encryptionKey.length < 32) {
   throw new ConfigurationError(
    '暗号化キーは32文字以上である必要があります',
    'WEAK_ENCRYPTION_KEY',
   );
  }
  this.encryptionKey = encryptionKey;
 }

 // 機密情報の暗号化
 encryptSecret(plaintext: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
 }

 // 機密情報の復号化
 decryptSecret(encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
 }

 // 環境変数から機密情報を安全に取得
 getSecretFromEnv(key: string): string {
  const encrypted = process.env[key];
  if (!encrypted) {
   throw new ConfigurationError(
    `機密情報 ${key} が設定されていません`,
    'MISSING_SECRET',
   );
  }

  try {
   return this.decryptSecret(encrypted);
  } catch (error) {
   throw new ConfigurationError(
    `機密情報 ${key} の復号化に失敗しました`,
    'DECRYPTION_FAILED',
    error,
   );
  }
 }
}

// ✅ 許可：機密情報を含む設定クラス
export class SecureApplicationConfig extends ApplicationConfig {
 private readonly secretManager: SecretManager;

 constructor(secretManager: SecretManager) {
  super();
  this.secretManager = secretManager;

  // 機密情報を復号化して設定
  (this.externalServices as any) = {
   ...this.externalServices,
   sendgrid: {
    ...this.externalServices.sendgrid,
    apiKey: this.secretManager.getSecretFromEnv('SENDGRID_API_KEY_ENCRYPTED'),
   },
   aws: {
    ...this.externalServices.aws,
    secretAccessKey: this.secretManager.getSecretFromEnv(
     'AWS_SECRET_ACCESS_KEY_ENCRYPTED',
    ),
   },
  };

  (this.security as any) = {
   ...this.security,
   jwtSecret: this.secretManager.getSecretFromEnv('JWT_SECRET_ENCRYPTED'),
  };
 }

 // 設定値をログ出力する際は機密情報をマスク
 toLogSafeObject(): Partial<IApplicationConfig> {
  return {
   app: this.app,
   database: {
    ...this.database,
    password: '***MASKED***',
    url: this.maskDatabaseUrl(this.database.url),
   },
   externalServices: {
    sendgrid: {
     ...this.externalServices.sendgrid,
     apiKey: '***MASKED***',
     webhookSecret: '***MASKED***',
    },
    aws: {
     ...this.externalServices.aws,
     accessKeyId: this.maskAwsKey(this.externalServices.aws.accessKeyId),
     secretAccessKey: '***MASKED***',
    },
    redis: {
     ...this.externalServices.redis,
     password: this.externalServices.redis.password
      ? '***MASKED***'
      : undefined,
    },
   },
   security: {
    ...this.security,
    jwtSecret: '***MASKED***',
   },
   features: this.features,
  };
 }

 private maskDatabaseUrl(url: string): string {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***MASKED***@');
 }

 private maskAwsKey(key: string): string {
  if (key.length <= 8) return '***MASKED***';
  return key.substring(0, 4) + '***MASKED***' + key.substring(key.length - 4);
 }
}
```

### 4. 設定バリデーションと検証 ✅

**設定値の妥当性検証と詳細なエラーレポート**

```typescript
// ✅ 許可：設定検証クラス
export class ConfigurationValidator {
 private readonly errors: ConfigurationValidationError[] = [];

 validate(config: IApplicationConfig): void {
  this.errors.length = 0;

  this.validateAppConfig(config.app);
  this.validateDatabaseConfig(config.database);
  this.validateExternalServicesConfig(config.externalServices);
  this.validateSecurityConfig(config.security);

  if (this.errors.length > 0) {
   throw new ConfigurationError(
    '設定値の検証に失敗しました',
    'CONFIGURATION_VALIDATION_FAILED',
    undefined,
    this.errors,
   );
  }
 }

 private validateAppConfig(app: IApplicationConfig['app']): void {
  if (app.port < 1 || app.port > 65535) {
   this.addError(
    'app.port',
    'ポート番号は1-65535の範囲である必要があります',
    app.port,
   );
  }

  if (app.name.length < 1 || app.name.length > 100) {
   this.addError(
    'app.name',
    'アプリケーション名は1-100文字である必要があります',
    app.name,
   );
  }

  if (!['development', 'staging', 'production'].includes(app.environment)) {
   this.addError(
    'app.environment',
    '環境は development, staging, production のいずれかである必要があります',
    app.environment,
   );
  }
 }

 private validateDatabaseConfig(
  database: IApplicationConfig['database'],
 ): void {
  if (database.port < 1 || database.port > 65535) {
   this.addError(
    'database.port',
    'データベースポートは1-65535の範囲である必要があります',
    database.port,
   );
  }

  if (database.maxConnections < 1 || database.maxConnections > 100) {
   this.addError(
    'database.maxConnections',
    '最大接続数は1-100の範囲である必要があります',
    database.maxConnections,
   );
  }

  if (database.connectionTimeout < 1000 || database.connectionTimeout > 60000) {
   this.addError(
    'database.connectionTimeout',
    '接続タイムアウトは1000-60000msの範囲である必要があります',
    database.connectionTimeout,
   );
  }

  // URLの形式検証
  if (!this.isValidUrl(database.url)) {
   this.addError(
    'database.url',
    'データベースURLの形式が正しくありません',
    database.url,
   );
  }
 }

 private validateExternalServicesConfig(
  services: IApplicationConfig['externalServices'],
 ): void {
  // SendGrid設定の検証
  if (!this.isValidEmail(services.sendgrid.fromEmail)) {
   this.addError(
    'externalServices.sendgrid.fromEmail',
    'メールアドレスの形式が正しくありません',
    services.sendgrid.fromEmail,
   );
  }

  if (services.sendgrid.apiKey.length < 10) {
   this.addError(
    'externalServices.sendgrid.apiKey',
    'SendGrid APIキーが短すぎます',
   );
  }

  // AWS設定の検証
  if (!/^[A-Z0-9]{20}$/.test(services.aws.accessKeyId)) {
   this.addError(
    'externalServices.aws.accessKeyId',
    'AWS Access Key IDの形式が正しくありません',
   );
  }

  if (services.aws.secretAccessKey.length < 40) {
   this.addError(
    'externalServices.aws.secretAccessKey',
    'AWS Secret Access Keyが短すぎます',
   );
  }

  // Redis設定の検証
  if (!this.isValidUrl(services.redis.url)) {
   this.addError(
    'externalServices.redis.url',
    'Redis URLの形式が正しくありません',
    services.redis.url,
   );
  }

  if (services.redis.ttl < 60 || services.redis.ttl > 86400) {
   this.addError(
    'externalServices.redis.ttl',
    'Redis TTLは60-86400秒の範囲である必要があります',
    services.redis.ttl,
   );
  }
 }

 private validateSecurityConfig(
  security: IApplicationConfig['security'],
 ): void {
  if (security.jwtSecret.length < 32) {
   this.addError(
    'security.jwtSecret',
    'JWT シークレットは32文字以上である必要があります',
   );
  }

  if (security.bcryptRounds < 10 || security.bcryptRounds > 15) {
   this.addError(
    'security.bcryptRounds',
    'Bcrypt ラウンド数は10-15の範囲である必要があります',
    security.bcryptRounds,
   );
  }

  if (
   security.rateLimitMaxRequests < 1 ||
   security.rateLimitMaxRequests > 10000
  ) {
   this.addError(
    'security.rateLimitMaxRequests',
    'レート制限リクエスト数は1-10000の範囲である必要があります',
    security.rateLimitMaxRequests,
   );
  }

  // CORS設定の検証
  security.corsOrigins.forEach((origin, index) => {
   if (!this.isValidUrl(origin) && origin !== '*') {
    this.addError(
     `security.corsOrigins[${index}]`,
     'CORS オリジンの形式が正しくありません',
     origin,
    );
   }
  });
 }

 private addError(path: string, message: string, value?: any): void {
  this.errors.push({
   path,
   message,
   value: value !== undefined ? String(value) : undefined,
  });
 }

 private isValidUrl(url: string): boolean {
  try {
   new URL(url);
   return true;
  } catch {
   return false;
  }
 }

 private isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
 }
}

// 設定検証エラーの詳細情報
export interface ConfigurationValidationError {
 path: string;
 message: string;
 value?: string;
}
```

---

## ❌ 何をしてはならないか

### 1. ハードコーディングされた設定値 🚫

```typescript
// ❌ 禁止：設定値のハードコーディング
export class BadConfig {
 constructor() {
  // ❌ データベース接続情報をハードコーディング
  this.databaseUrl = 'postgresql://user:password@localhost:5432/myapp';

  // ❌ APIキーをハードコーディング
  this.sendgridApiKey = 'SG.abcdef123456789';

  // ❌ 環境固有の値をハードコーディング
  this.environment = 'production'; // 変更不可能
 }
}

// ✅ 正しい：環境変数から動的に取得
export class GoodConfig {
 constructor() {
  this.databaseUrl = process.env.DATABASE_URL!;
  this.sendgridApiKey = process.env.SENDGRID_API_KEY!;
  this.environment = process.env.NODE_ENV || 'development';
 }
}
```

### 2. 機密情報のログ出力 📝

```typescript
// ❌ 禁止：機密情報をそのままログ出力
export class BadConfigLogger {
 logConfig(config: IApplicationConfig): void {
  // ❌ パスワードやAPIキーがログに記録される
  console.log('設定情報:', JSON.stringify(config, null, 2));

  // ❌ データベースURLにパスワードが含まれている
  console.log('データベース接続:', config.database.url);
 }
}

// ✅ 正しい：機密情報をマスクしてログ出力
export class GoodConfigLogger {
 logConfig(config: SecureApplicationConfig): void {
  // ✅ マスクされた設定情報のみログ出力
  console.log('設定情報:', JSON.stringify(config.toLogSafeObject(), null, 2));
 }
}
```

### 3. 型安全性を無視した設定 📊

```typescript
// ❌ 禁止：型チェックを無視した設定取得
export class BadConfigAccess {
 getPort(): number {
  // ❌ 文字列を数値として扱う（型安全性なし）
  return process.env.PORT as any;
 }

 getFeatureFlag(): boolean {
  // ❌ 文字列をbooleanとして扱う
  return process.env.ENABLE_FEATURE as any;
 }
}

// ✅ 正しい：適切な型変換と検証
export class GoodConfigAccess {
 getPort(): number {
  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port)) {
   throw new ConfigurationError('ポート番号が無効です', 'INVALID_PORT');
  }
  return port;
 }

 getFeatureFlag(): boolean {
  const value = process.env.ENABLE_FEATURE?.toLowerCase();
  return value === 'true' || value === '1';
 }
}
```

---

## 🎨 デザインパターンとベストプラクティス

### 1. Factory Pattern 🏭

**環境に応じた設定オブジェクトの生成**

```typescript
export class ConfigurationFactory {
 private static instance: IApplicationConfig | null = null;

 static create(): IApplicationConfig {
  if (this.instance) {
   return this.instance;
  }

  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
   case 'development':
    this.instance = new DevelopmentConfig();
    break;
   case 'staging':
    this.instance = new StagingConfig();
    break;
   case 'production':
    this.instance = new ProductionConfig();
    break;
   default:
    throw new ConfigurationError(
     `未対応の環境: ${environment}`,
     'UNSUPPORTED_ENVIRONMENT',
    );
  }

  // 設定の検証
  const validator = new ConfigurationValidator();
  validator.validate(this.instance);

  return this.instance;
 }
}
```

### 2. Builder Pattern 🔨

**複雑な設定オブジェクトの段階的構築**

```typescript
export class ConfigurationBuilder {
 private config: Partial<IApplicationConfig> = {};

 setApp(app: IApplicationConfig['app']): this {
  this.config.app = app;
  return this;
 }

 setDatabase(database: IApplicationConfig['database']): this {
  this.config.database = database;
  return this;
 }

 setExternalServices(services: IApplicationConfig['externalServices']): this {
  this.config.externalServices = services;
  return this;
 }

 setSecurity(security: IApplicationConfig['security']): this {
  this.config.security = security;
  return this;
 }

 setFeatures(features: IApplicationConfig['features']): this {
  this.config.features = features;
  return this;
 }

 build(): IApplicationConfig {
  // 必須フィールドの検証
  if (
   !this.config.app ||
   !this.config.database ||
   !this.config.externalServices ||
   !this.config.security ||
   !this.config.features
  ) {
   throw new ConfigurationError(
    '設定オブジェクトの構築に必要な情報が不足しています',
    'INCOMPLETE_CONFIGURATION',
   );
  }

  return this.config as IApplicationConfig;
 }
}
```

### 3. Observer Pattern 👁️

**設定変更の監視と通知**

```typescript
export interface ConfigurationChangeListener {
 onConfigurationChanged(key: string, oldValue: any, newValue: any): void;
}

export class DynamicConfiguration {
 private listeners: ConfigurationChangeListener[] = [];
 private config: Map<string, any> = new Map();

 addListener(listener: ConfigurationChangeListener): void {
  this.listeners.push(listener);
 }

 removeListener(listener: ConfigurationChangeListener): void {
  const index = this.listeners.indexOf(listener);
  if (index > -1) {
   this.listeners.splice(index, 1);
  }
 }

 setValue(key: string, value: any): void {
  const oldValue = this.config.get(key);
  this.config.set(key, value);

  // リスナーに変更を通知
  this.listeners.forEach((listener) => {
   listener.onConfigurationChanged(key, oldValue, value);
  });
 }

 getValue<T>(key: string): T | undefined {
  return this.config.get(key);
 }
}
```

---

## 🧪 テスト戦略

### 1. 設定値の単体テスト

```typescript
describe('ApplicationConfig', () => {
 let originalEnv: NodeJS.ProcessEnv;

 beforeEach(() => {
  originalEnv = { ...process.env };
 });

 afterEach(() => {
  process.env = originalEnv;
 });

 describe('constructor', () => {
  it('有効な環境変数で正常に設定が作成されること', () => {
   // Arrange
   process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
   process.env.DB_USERNAME = 'testuser';
   process.env.DB_PASSWORD = 'testpass';
   process.env.DB_NAME = 'testdb';
   process.env.SENDGRID_API_KEY = 'SG.test-api-key';
   process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
   process.env.SENDGRID_WEBHOOK_SECRET = 'webhook-secret';
   process.env.AWS_ACCESS_KEY_ID = 'AKIATEST12345678901';
   process.env.AWS_SECRET_ACCESS_KEY =
    'test-secret-access-key-40-characters-long';
   process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
   process.env.REDIS_URL = 'redis://localhost:6379';
   process.env.JWT_SECRET = 'jwt-secret-32-characters-long';

   // Act
   const config = new ApplicationConfig();

   // Assert
   expect(config.app.name).toBe('MyApp');
   expect(config.app.port).toBe(3000);
   expect(config.database.host).toBe('localhost');
   expect(config.externalServices.sendgrid.fromEmail).toBe('test@example.com');
  });

  it('必須環境変数が不足している場合にエラーが投げられること', () => {
   // Arrange
   process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
   // DB_USERNAME を意図的に省略

   // Act & Assert
   expect(() => new ApplicationConfig()).toThrow(ConfigurationError);
   expect(() => new ApplicationConfig()).toThrow('DB_USERNAME');
  });

  it('無効な数値が設定された場合にエラーが投げられること', () => {
   // Arrange
   process.env.PORT = 'invalid-number';

   // Act & Assert
   expect(() => new ApplicationConfig()).toThrow(ConfigurationError);
   expect(() => new ApplicationConfig()).toThrow('数値である必要があります');
  });
 });
});
```

### 2. 環境別設定のテスト

```typescript
describe('ConfigurationFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // 必須環境変数をセットアップ
    this.setupRequiredEnvVars();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('development環境でDevelopmentConfigが作成されること', () => {
    // Arrange
    process.env.NODE_ENV = 'development';

    // Act
    const config = ConfigurationFactory.create();

    // Assert
    expect(config).toBeInstanceOf(DevelopmentConfig);
    expect(config.app.environment).toBe('development');
    expect((config as DevelopmentConfig).isDevelopment()).toBe(true);
  });

  it('production環境でProductionConfigが作成されること', () => {
    // Arrange
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'production-jwt-secret-32-characters-long';

    // Act
    const config = ConfigurationFactory.create();

    // Assert
    expect(config).toBeInstanceOf(ProductionConfig);
    expect(config.app.environment).toBe('production');
    expect((config as ProductionConfig).isProduction()).toBe(true);
  });

  it('未対応の環境でエラーが投げられること', () => {
    // Arrange
    process.env.NODE_ENV = 'unknown';

    // Act & Assert
    expect(() => ConfigurationFactory.create()).toThrow(ConfigurationError);
    expect(() => ConfigurationFactory.create()).toThrow('未対応の環境');
  });

  private setupRequiredEnvVars(): void {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.DB_USERNAME = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_NAME = 'testdb';
    process.env.SENDGRID_API_KEY = 'SG.test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
    process.env.SENDGRID_WEBHOOK_SECRET = 'webhook-secret';
    process.env.AWS_ACCESS_KEY_ID = 'AKIATEST12345678901';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key-40-characters-long';
    process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'jwt-secret-32-characters-long';
  }
});
```

---

## ✅ 実装チェックリスト

### 基本実装

- [ ] 型安全な設定インターフェースの定義
- [ ] 環境変数の読み込みと型変換
- [ ] 必須設定値の検証
- [ ] デフォルト値の適切な設定
- [ ] エラーハンドリングとエラーメッセージ

### セキュリティ

- [ ] 機密情報のマスク処理
- [ ] 機密情報の暗号化（必要に応じて）
- [ ] ログ出力時の機密情報の除外
- [ ] 本番環境での強固な設定検証
- [ ] APIキーやパスワードの長さ検証

### 環境対応

- [ ] 開発・ステージング・本番環境の分離
- [ ] 環境別設定ファクトリーの実装
- [ ] 環境固有の設定上書き機能
- [ ] 環境別デフォルト値の設定
- [ ] 環境別バリデーションルール

### 運用・保守

- [ ] 設定変更の影響範囲の明確化
- [ ] 設定値のドキュメント化
- [ ] 設定変更時のアプリケーション再起動要否の明記
- [ ] 設定ファイルのバージョン管理
- [ ] 設定値の監視とアラート設定
