# UseCase実装パターン詳細リファレンス

UseCaseの高度な実装パターンと設計手法を解説します。

## 複数サービスの協調

### 外部サービス連携を含むフロー

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { IEmailService } from '@/layers/application/interfaces/IEmailService';
import type { IFileService } from '@/layers/application/interfaces/IFileService';
import type { IAnalyticsService } from '@/layers/application/interfaces/IAnalyticsService';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { inject, injectable } from 'tsyringe';

export interface CompleteRegistrationRequest {
  userId: string;
  displayName?: string;
  avatarFile?: Buffer;
}

export interface CompleteRegistrationResponse {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string;
  completedAt: Date;
}

@injectable()
export class CompleteUserRegistrationUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.EmailService)
    private emailService: IEmailService,
    @inject(INJECTION_TOKENS.FileService)
    private fileService: IFileService,
    @inject(INJECTION_TOKENS.AnalyticsService)
    private analyticsService: IAnalyticsService,
    @inject(INJECTION_TOKENS.Logger)
    private logger: ILogger,
  ) {}

  async execute(
    request: CompleteRegistrationRequest,
  ): Promise<Result<CompleteRegistrationResponse>> {
    this.logger.info('登録完了処理開始', { userId: request.userId });

    try {
      // 1. ユーザー取得
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      // 2. 登録完了可能性の検証（ドメインサービス）
      await this.userDomainService.validateRegistrationCompletion(user);

      // 3. プロフィール画像のアップロード（外部サービス）
      let avatarUrl: string | undefined;
      if (request.avatarFile) {
        try {
          avatarUrl = await this.fileService.uploadFile(
            request.avatarFile,
            `avatars/${user.id.value}`,
            'image/jpeg',
          );
        } catch (error) {
          this.logger.error('アバター画像アップロード失敗', {
            userId: request.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return failure(
            'アバター画像のアップロードに失敗しました',
            'AVATAR_UPLOAD_FAILED',
          );
        }
      }

      // 4. ユーザー情報の更新
      let updatedUser = user;
      if (request.displayName) {
        updatedUser = updatedUser.updateDisplayName(request.displayName);
      }
      if (avatarUrl) {
        updatedUser = updatedUser.updateAvatarUrl(avatarUrl);
      }
      updatedUser = updatedUser.completeRegistration();

      // 5. データ保存
      await this.userRepository.save(updatedUser);

      // 6. ウェルカムメール送信（外部サービス）
      try {
        await this.emailService.sendRegistrationCompleteEmail(
          updatedUser.email.value,
          updatedUser.name,
        );
      } catch (error) {
        // メール送信失敗はログのみ（登録処理は成功扱い）
        this.logger.warn('ウェルカムメール送信失敗', {
          userId: request.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 7. 分析データ送信（外部サービス）
      try {
        await this.analyticsService.trackEvent('user_registration_completed', {
          userId: updatedUser.id.value,
          registrationDate: new Date(),
          hasAvatar: !!avatarUrl,
        });
      } catch (error) {
        // 分析データ送信失敗はログのみ
        this.logger.warn('分析データ送信失敗', {
          userId: request.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      this.logger.info('登録完了処理完了', {
        userId: updatedUser.id.value,
        hasAvatar: !!avatarUrl,
      });

      return success({
        id: updatedUser.id.value,
        name: updatedUser.name,
        displayName: updatedUser.displayName,
        avatarUrl,
        completedAt: new Date(),
      });
    } catch (error) {
      this.logger.error('登録完了処理失敗', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('登録完了処理に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

## 検索・一覧取得パターン

### ページネーション対応

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { inject, injectable } from 'tsyringe';

export interface GetUsersRequest {
  page: number;
  pageSize: number;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
}

export interface GetUsersResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger)
    private logger: ILogger,
  ) {}

  async execute(
    request: GetUsersRequest,
  ): Promise<Result<GetUsersResponse>> {
    this.logger.info('ユーザー一覧取得開始', {
      page: request.page,
      pageSize: request.pageSize,
    });

    try {
      // バリデーション
      if (request.page < 1) {
        return failure(
          'ページ番号は1以上である必要があります',
          'INVALID_PAGE',
        );
      }

      if (request.pageSize < 1 || request.pageSize > 100) {
        return failure(
          'ページサイズは1-100の範囲である必要があります',
          'INVALID_PAGE_SIZE',
        );
      }

      // 検索条件の構築
      const criteria = {
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy || 'createdAt',
        sortOrder: request.sortOrder || 'desc',
        searchQuery: request.searchQuery,
      };

      // データ取得
      const result = await this.userRepository.findWithPagination(criteria);

      const totalPages = Math.ceil(result.totalCount / request.pageSize);

      this.logger.info('ユーザー一覧取得完了', {
        count: result.users.length,
        totalCount: result.totalCount,
      });

      return success({
        users: result.users.map((user) => ({
          id: user.id.value,
          name: user.name,
          email: user.email.value,
          createdAt: user.createdAt,
        })),
        pagination: {
          currentPage: request.page,
          pageSize: request.pageSize,
          totalCount: result.totalCount,
          totalPages,
          hasNextPage: request.page < totalPages,
          hasPreviousPage: request.page > 1,
        },
      });
    } catch (error) {
      this.logger.error('ユーザー一覧取得失敗', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('ユーザー一覧取得に失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

## バッチ処理パターン

### 複数エンティティの一括処理

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { inject, injectable } from 'tsyringe';

export interface BulkUpdateUsersRequest {
  userIds: string[];
  updates: {
    status?: 'ACTIVE' | 'SUSPENDED';
    role?: 'USER' | 'ADMIN';
  };
}

export interface BulkUpdateUsersResponse {
  successCount: number;
  failureCount: number;
  failures: Array<{
    userId: string;
    error: string;
  }>;
}

@injectable()
export class BulkUpdateUsersUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.Logger)
    private logger: ILogger,
  ) {}

  async execute(
    request: BulkUpdateUsersRequest,
  ): Promise<Result<BulkUpdateUsersResponse>> {
    this.logger.info('一括更新開始', {
      userCount: request.userIds.length,
      updates: request.updates,
    });

    try {
      // バリデーション
      if (request.userIds.length === 0) {
        return failure('更新対象のユーザーIDが指定されていません', 'NO_USERS');
      }

      if (request.userIds.length > 1000) {
        return failure(
          '一度に更新できるユーザー数は1000件までです',
          'TOO_MANY_USERS',
        );
      }

      let successCount = 0;
      let failureCount = 0;
      const failures: Array<{ userId: string; error: string }> = [];

      // 並列処理（10件ずつ）
      const chunkSize = 10;
      for (let i = 0; i < request.userIds.length; i += chunkSize) {
        const chunk = request.userIds.slice(i, i + chunkSize);
        const results = await Promise.allSettled(
          chunk.map((userId) => this.updateSingleUser(userId, request.updates)),
        );

        results.forEach((result, index) => {
          const userId = chunk[index];
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            failureCount++;
            failures.push({
              userId,
              error: result.reason.message,
            });
          }
        });
      }

      this.logger.info('一括更新完了', {
        successCount,
        failureCount,
      });

      return success({
        successCount,
        failureCount,
        failures,
      });
    } catch (error) {
      this.logger.error('一括更新失敗', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('一括更新に失敗しました', 'UNEXPECTED_ERROR');
    }
  }

  private async updateSingleUser(
    userId: string,
    updates: BulkUpdateUsersRequest['updates'],
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }

    let updatedUser = user;

    if (updates.status) {
      updatedUser = updatedUser.updateStatus(updates.status);
    }

    if (updates.role) {
      updatedUser = updatedUser.updateRole(updates.role);
    }

    await this.userRepository.save(updatedUser);
  }
}
```

## Rate Limiting統合パターン

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { IRateLimitService } from '@/layers/application/interfaces/IRateLimitService';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { inject, injectable } from 'tsyringe';

export interface SignInRequest {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface SignInResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@injectable()
export class SignInUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.RateLimitService)
    private rateLimitService: IRateLimitService,
    @inject(INJECTION_TOKENS.Logger)
    private logger: ILogger,
  ) {}

  async execute(
    request: SignInRequest,
  ): Promise<Result<SignInResponse>> {
    this.logger.info('サインイン試行開始', { email: request.email });

    try {
      // Rate Limitチェック（IPアドレスベース）
      if (request.ipAddress) {
        const rateLimitResult = await this.rateLimitService.checkLimit(
          request.ipAddress,
        );

        if (!rateLimitResult.allowed) {
          this.logger.warn('Rate Limit超過', {
            ipAddress: request.ipAddress,
            current: rateLimitResult.current,
            limit: rateLimitResult.limit,
          });

          const retryAfterSeconds = Math.ceil(
            (rateLimitResult.retryAfterMs ?? 60000) / 1000,
          );

          return failure(
            `リクエスト数が上限に達しました。${retryAfterSeconds}秒後に再試行してください。`,
            'RATE_LIMIT_EXCEEDED',
          );
        }
      }

      // 認証処理
      // ... （実際の認証ロジック）

      return success({
        user: {
          id: user.id.value,
          name: user.name,
          email: user.email.value,
        },
      });
    } catch (error) {
      this.logger.error('サインイン失敗', {
        email: request.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      return failure('サインインに失敗しました', 'UNEXPECTED_ERROR');
    }
  }
}
```

## テストパターン

### UseCase単体テスト（Result型対応）

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { isSuccess, isFailure } from '@/layers/application/types/Result';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;
  let mockHashService: MockProxy<IHashService>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    mockUserRepository = mock<IUserRepository>();
    mockUserDomainService = mock<UserDomainService>();
    mockHashService = mock<IHashService>();
    mockLogger = mock<ILogger>();

    createUserUseCase = new CreateUserUseCase(
      mockUserRepository,
      mockUserDomainService,
      mockHashService,
      mockLogger,
    );
  });

  it('正常にユーザーを作成できる', async () => {
    // Arrange
    const request = {
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    };

    mockUserDomainService.validateUserData.mockResolvedValue(undefined);
    mockHashService.generateHash.mockResolvedValue('hashedPassword');
    mockUserRepository.save.mockResolvedValue(undefined);

    // Act
    const result = await createUserUseCase.execute(request);

    // Assert - Result型パターン対応
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.name).toBe('テストユーザー');
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.id).toEqual(expect.any(String));
    }

    expect(mockUserDomainService.validateUserData).toHaveBeenCalledWith(
      'テストユーザー',
      'test@example.com',
    );
    expect(mockHashService.generateHash).toHaveBeenCalledWith('password123');
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('メールアドレス重複でエラーが返される', async () => {
    // Arrange
    const request = {
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    };

    const duplicateError = new DomainError(
      'このメールアドレスは既に使用されています',
      'EMAIL_DUPLICATE',
    );
    mockUserDomainService.validateUserData.mockRejectedValue(duplicateError);

    // Act
    const result = await createUserUseCase.execute(request);

    // Assert - Result型パターン対応
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toBe(
        'このメールアドレスは既に使用されています',
      );
      expect(result.error.code).toBe('EMAIL_DUPLICATE');
    }

    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('バリデーションエラーが適切に処理される', async () => {
    // Arrange
    const request = {
      name: 'テストユーザー',
      email: 'invalid-email',
      password: 'password123',
    };

    // Act
    const result = await createUserUseCase.execute(request);

    // Assert - Email Value Object のバリデーションエラー
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('UNEXPECTED_ERROR');
    }
  });

  it('Repository保存失敗時にエラーが返される', async () => {
    // Arrange
    const request = {
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    };

    mockUserDomainService.validateUserData.mockResolvedValue(undefined);
    mockHashService.generateHash.mockResolvedValue('hashedPassword');
    mockUserRepository.save.mockRejectedValue(
      new Error('Database connection failed'),
    );

    // Act
    const result = await createUserUseCase.execute(request);

    // Assert
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('UNEXPECTED_ERROR');
    }
  });
});
```

詳細な実装例は`_DOCS/guides/ddd/layers/components/use-cases.md`を参照してください。
