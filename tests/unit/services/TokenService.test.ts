import 'reflect-metadata';

import { TokenService } from '@/layers/application/services/TokenService';
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import { User } from '@/layers/domain/entities/User';
import { UserSession } from '@/layers/domain/entities/UserSession';
import type {
  ISessionRepository,
  UserSessionWithUser,
} from '@/layers/domain/repositories/ISessionRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { SessionId } from '@/layers/domain/value-objects/SessionId';
import { UserId } from '@/layers/domain/value-objects/UserId';
import type { IConfigService } from '@/layers/infrastructure/services/ConfigService';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  createAutoMockConfigService,
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockSessionRepository,
} from '@tests/utils/mocks/autoMocks';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

// uuidv4のモック
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// date-fnsのモック
vi.mock('date-fns', () => ({
  addMinutes: vi.fn(
    (date, minutes) => new Date(date.getTime() + minutes * 60000),
  ),
}));

// ログ呼び出しの型定義
type LoggerMockCall = [string, Record<string, unknown>?];

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockSessionRepository: MockProxy<ISessionRepository>;
  let mockHashService: MockProxy<IHashService>;
  let mockConfigService: MockProxy<IConfigService>;
  let mockLogger: MockProxy<ILogger>;

  // テスト用のCUID2形式のID
  const testUserId = 'testuserid1234567890abc';
  const testSessionId = 'testsessionid12345678';

  // テスト用のモックセッション結果を生成
  const createMockSessionWithUser = (): UserSessionWithUser => {
    const sessionEntity = UserSession.reconstruct(
      new SessionId(testSessionId),
      new UserId(testUserId),
      'hashed-access-token',
      new Date('2024-06-17T11:00:00Z'),
      'hashed-reset-token',
      new Date('2024-06-17T20:00:00Z'),
      new Date('2024-06-17T10:00:00Z'),
      new Date('2024-06-17T10:00:00Z'),
    );

    const userEntity = User.reconstruct(
      new UserId(testUserId),
      new Email('test@example.com'),
      'Test User',
      'hashed-password',
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T00:00:00Z'),
    );

    return {
      session: sessionEntity,
      user: userEntity,
    };
  };

  beforeEach(async () => {
    // uuidv4のモック設定
    const { v4 } = await import('uuid');
    const mockV4 = vi.mocked(v4) as unknown as MockedFunction<() => string>;
    mockV4
      .mockClear()
      .mockReturnValueOnce('12345678-1234-4567-8901-123456789abc') // accessToken用
      .mockReturnValueOnce('87654321-4321-4567-8901-cba987654321'); // resetToken用

    mockSessionRepository = createAutoMockSessionRepository();
    mockHashService = createAutoMockHashService();
    mockConfigService = createAutoMockConfigService();
    mockLogger = createAutoMockLogger();

    tokenService = new TokenService(
      mockSessionRepository,
      mockHashService,
      mockConfigService,
      mockLogger,
    );

    // ConfigServiceのモック設定
    mockConfigService.getConfig.mockReturnValue({
      database: {
        url: 'test-database-url',
      },
      app: {
        baseUrl: 'http://localhost:3000',
        isDevelopment: true,
        nodeEnv: 'test',
      },
      token: {
        saltRounds: 12,
        secret: 'test-secret',
        maxAgeMinutes: 60,
        updateAgeMinutes: 30,
      },
    });

    // date-fnsのモック設定
    const { addMinutes } = await import('date-fns');
    vi.mocked(addMinutes)
      .mockReturnValueOnce(new Date('2024-06-17T11:00:00Z')) // アクセストークン期限
      .mockReturnValueOnce(new Date('2024-06-17T20:00:00Z')); // リセットトークン期限
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNewTokenSession', () => {
    it('should successfully create new token session', async () => {
      // Arrange
      const mockSession = createMockSessionWithUser();
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      const result = await tokenService.createNewTokenSession(testUserId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.accessToken).toBe(
          '12345678-1234-4567-8901-123456789abc',
        );
        expect(result.data.accessTokenExpireAt).toBeInstanceOf(Date);
        expect(result.data.resetToken).toBe(
          '87654321-4321-4567-8901-cba987654321',
        );
        expect(result.data.resetTokenExpireAt).toBeInstanceOf(Date);
        expect(result.data.session.session).toBeInstanceOf(UserSession);
        expect(result.data.session.user).toBeInstanceOf(User);
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成開始',
        { userId: testUserId },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成完了',
        expect.objectContaining({
          userId: testUserId,
          sessionId: testSessionId,
        }),
      );
    });

    it('should return failure when userId is empty', async () => {
      // Act
      const result = await tokenService.createNewTokenSession('');

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが無効です');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'トークンセッション作成失敗: 無効なユーザーID',
        { userId: '' },
      );
    });

    it('should return failure when userId is null', async () => {
      // Act
      const result = await tokenService.createNewTokenSession(
        null as unknown as string,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが無効です');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }
    });

    it('should return failure when userId is whitespace only', async () => {
      // Act
      const result = await tokenService.createNewTokenSession('   ');

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが無効です');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }
    });

    it('should return failure when userId is not a string', async () => {
      // Act
      const result = await tokenService.createNewTokenSession(
        123 as unknown as string,
      );

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('ユーザーIDが無効です');
        expect(result.error.code).toBe('INVALID_USER_ID');
      }
    });

    it('should return failure when hash service throws error', async () => {
      // Arrange
      const hashError = new Error('Hash generation failed');
      mockHashService.generateHash.mockRejectedValue(hashError);

      // Act
      const result = await tokenService.createNewTokenSession(testUserId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'トークンセッション作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('TOKEN_SESSION_CREATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'トークンセッション作成処理でエラー発生',
        expect.objectContaining({
          userId: testUserId,
          error: 'Hash generation failed',
        }),
      );
    });

    it('should return failure when session repository throws error', async () => {
      // Arrange
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      const repositoryError = new Error('Database connection failed');
      mockSessionRepository.create.mockRejectedValue(repositoryError);

      // Act
      const result = await tokenService.createNewTokenSession(testUserId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'トークンセッション作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('TOKEN_SESSION_CREATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'トークンセッション作成処理でエラー発生',
        expect.objectContaining({
          userId: testUserId,
          error: 'Database connection failed',
        }),
      );
    });

    it('should return failure when config service throws error', async () => {
      // Arrange
      const configError = new Error('Config loading failed');
      mockConfigService.getConfig.mockImplementation(() => {
        throw configError;
      });

      // Act
      const result = await tokenService.createNewTokenSession(testUserId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'トークンセッション作成中にエラーが発生しました',
        );
        expect(result.error.code).toBe('TOKEN_SESSION_CREATION_ERROR');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'トークンセッション作成処理でエラー発生',
        expect.objectContaining({
          userId: testUserId,
          error: 'Config loading failed',
        }),
      );
    });

    it('should call session repository with UserSession entity', async () => {
      // Arrange
      const mockSession = createMockSessionWithUser();
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      await tokenService.createNewTokenSession(testUserId);

      // Assert - UserSession Entityが渡されていることを確認
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.objectContaining({ value: testUserId }),
          accessTokenHash: 'hashed-access-token',
          resetTokenHash: 'hashed-reset-token',
        }),
      );
    });

    it('should generate proper token expiration times', async () => {
      // Arrange
      const mockSession = createMockSessionWithUser();
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      const result = await tokenService.createNewTokenSession(testUserId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // トークンの有効期限が設定されていることを確認
        expect(result.data.accessTokenExpireAt).toBeInstanceOf(Date);
        expect(result.data.resetTokenExpireAt).toBeInstanceOf(Date);

        // リセットトークンの有効期限がアクセストークンより長いことを確認
        expect(result.data.resetTokenExpireAt.getTime()).toBeGreaterThan(
          result.data.accessTokenExpireAt.getTime(),
        );
      }
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      const mockSession = createMockSessionWithUser();
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      await tokenService.createNewTokenSession(testUserId);

      // Assert - ログに機密情報がマスクされて出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成開始',
        expect.objectContaining({
          userId: testUserId, // ユーザーIDは機密情報ではないが、トークンは含まれていない
        }),
      );

      // ログにトークンの生の値が含まれていないことを確認
      const logCalls: LoggerMockCall[] = mockLogger.info.mock.calls;
      logCalls.forEach(([_message, meta]) => {
        expect(JSON.stringify(meta)).not.toContain(
          '12345678-1234-4567-8901-123456789abc',
        );
        expect(JSON.stringify(meta)).not.toContain(
          '87654321-4321-4567-8901-cba987654321',
        );
      });
    });
  });
});
