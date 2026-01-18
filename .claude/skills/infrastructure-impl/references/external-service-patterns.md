# External Service Integration Patterns

Infrastructure層での外部サービス連携パターンとベストプラクティスを記載します。

---

## メールサービス連携

### SendGrid実装例

```typescript
// src/layers/infrastructure/services/implementations/SendGridEmailService.ts
import type { IEmailService } from '@/layers/domain/services/IEmailService';
import { injectable } from 'tsyringe';
import sgMail from '@sendgrid/mail';

@injectable()
export class SendGridEmailService implements IEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_FROM!,
        subject: 'ようこそ！',
        html: `<p>${name}さん、ご登録ありがとうございます。</p>`,
      });
    } catch (error) {
      console.error('ウェルカムメール送信エラー:', error);
      throw new Error('ウェルカムメールの送信に失敗しました');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    try {
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_FROM!,
        subject: 'パスワードリセットのご案内',
        html: `
          <p>パスワードリセットのリクエストを受け付けました。</p>
          <p>以下のリンクからパスワードをリセットしてください：</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>このリンクは24時間有効です。</p>
        `,
      });
    } catch (error) {
      console.error('パスワードリセットメール送信エラー:', error);
      throw new Error('パスワードリセットメールの送信に失敗しました');
    }
  }
}
```

### テスト用モック実装

```typescript
// src/layers/infrastructure/services/implementations/MockEmailService.ts
import type { IEmailService } from '@/layers/domain/services/IEmailService';
import { injectable } from 'tsyringe';

@injectable()
export class MockEmailService implements IEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    content: string;
  }> = [];

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`[Mock Email] ウェルカムメールを送信: ${email} (${name})`);
    this.sentEmails.push({
      to: email,
      subject: 'ようこそ！',
      content: `${name}さん、ご登録ありがとうございます。`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    console.log(`[Mock Email] パスワードリセットメールを送信: ${email}`);
    this.sentEmails.push({
      to: email,
      subject: 'パスワードリセットのご案内',
      content: `リセットトークン: ${resetToken}`,
    });
  }

  // テスト用ヘルパー
  getSentEmails() {
    return this.sentEmails;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}
```

---

## ストレージサービス連携

### AWS S3実装例

```typescript
// src/layers/infrastructure/services/implementations/S3StorageService.ts
import type { IStorageService } from '@/layers/domain/services/IStorageService';
import { injectable } from 'tsyringe';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@injectable()
export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3ファイルアップロードエラー:', error);
      throw new Error('ファイルのアップロードに失敗しました');
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      console.error('S3署名付きURL生成エラー:', error);
      throw new Error('ダウンロードURLの生成に失敗しました');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('S3ファイル削除エラー:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }
}
```

### ローカルファイルシステム実装例（開発用）

```typescript
// src/layers/infrastructure/services/implementations/LocalStorageService.ts
import type { IStorageService } from '@/layers/domain/services/IStorageService';
import { injectable } from 'tsyringe';
import * as fs from 'fs/promises';
import * as path from 'path';

@injectable()
export class LocalStorageService implements IStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      const filePath = path.join(this.uploadDir, key);
      const dir = path.dirname(filePath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, buffer);

      return `/uploads/${key}`;
    } catch (error) {
      console.error('ローカルファイル保存エラー:', error);
      throw new Error('ファイルの保存に失敗しました');
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // ローカル環境では署名不要
    return `/uploads/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, key);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('ローカルファイル削除エラー:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }
}
```

---

## 外部API連携

### RESTful API クライアント実装例

```typescript
// src/layers/infrastructure/services/implementations/ExternalApiService.ts
import type { IExternalApiService } from '@/layers/domain/services/IExternalApiService';
import { injectable } from 'tsyringe';
import axios, { AxiosInstance } from 'axios';

@injectable()
export class ExternalApiService implements IExternalApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.EXTERNAL_API_BASE_URL!,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY!}`,
      },
    });

    // リクエスト/レスポンスインターセプター
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[外部API] リクエスト: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[外部API] リクエストエラー:', error);
        return Promise.reject(error);
      },
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[外部API] レスポンス: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('[外部API] レスポンスエラー:', error.response?.status, error.message);
        return Promise.reject(error);
      },
    );
  }

  async fetchUserData(userId: string): Promise<ExternalUserData> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error('外部APIからのユーザーデータ取得に失敗しました');
    }
  }

  async createOrder(orderData: CreateOrderData): Promise<ExternalOrderResponse> {
    try {
      const response = await this.client.post('/orders', orderData);
      return response.data;
    } catch (error) {
      throw new Error('外部APIへの注文作成に失敗しました');
    }
  }
}
```

### リトライロジック実装例

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@injectable()
export class ResilientExternalApiService implements IExternalApiService {
  private client: AxiosInstance;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1秒

  constructor() {
    this.client = axios.create({
      baseURL: process.env.EXTERNAL_API_BASE_URL!,
      timeout: 10000,
    });
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`[リトライ] 残り試行回数: ${retries}`);
        await this.delay(this.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // ネットワークエラーまたは5xxエラーの場合にリトライ
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchUserData(userId: string): Promise<ExternalUserData> {
    return this.retryRequest(async () => {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    });
  }
}
```

---

## 環境別サービス切り替え

### DI設定での切り替え

```typescript
// src/di/container.ts
import { container } from 'tsyringe';
import { INJECTION_TOKENS } from './tokens';

// 環境変数に基づいて実装を切り替え
if (process.env.NODE_ENV === 'production') {
  // 本番環境: 実際の外部サービスを使用
  container.registerSingleton(
    INJECTION_TOKENS.EmailService,
    SendGridEmailService,
  );
  container.registerSingleton(
    INJECTION_TOKENS.StorageService,
    S3StorageService,
  );
} else if (process.env.NODE_ENV === 'test') {
  // テスト環境: モック実装を使用
  container.registerSingleton(
    INJECTION_TOKENS.EmailService,
    MockEmailService,
  );
  container.registerSingleton(
    INJECTION_TOKENS.StorageService,
    MockStorageService,
  );
} else {
  // 開発環境: ローカル実装を使用
  container.registerSingleton(
    INJECTION_TOKENS.EmailService,
    MockEmailService,
  );
  container.registerSingleton(
    INJECTION_TOKENS.StorageService,
    LocalStorageService,
  );
}
```

---

## エラーハンドリングとロギング

### 共通エラーハンドリング

```typescript
export abstract class BaseExternalService {
  protected handleError(error: unknown, context: string): never {
    console.error(`[${context}] エラー:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 401 || status === 403) {
        throw new Error(`認証エラー: ${message}`);
      } else if (status === 404) {
        throw new Error(`リソースが見つかりません: ${message}`);
      } else if (status && status >= 500) {
        throw new Error(`外部サービスエラー: ${message}`);
      }
    }

    throw new Error(`${context}でエラーが発生しました`);
  }
}

@injectable()
export class ExternalApiService extends BaseExternalService implements IExternalApiService {
  async fetchUserData(userId: string): Promise<ExternalUserData> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'ユーザーデータ取得');
    }
  }
}
```

---

**外部サービス連携は、Infrastructure層の重要な責務です。適切なエラーハンドリングとリトライロジックを実装し、環境別に実装を切り替えられるようにしてください。**
