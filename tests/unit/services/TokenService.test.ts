import 'reflect-metadata';

import { TokenService } from '@/layers/application/services/TokenService';
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import {
  createAutoMockConfigService,
  createAutoMockHashService,
  createAutoMockLogger,
  createAutoMockSessionRepository,
} from '@tests/utils/mocks/autoMocks';

import type { MockProxy } from 'vitest-mock-extended';

// uuidv4のモック
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// date-fnsのモック
vi.mock('date-fns', () => ({
  addMinutes: vi.fn((date, minutes) => new Date(date.getTime() + minutes * 60000)),
}));

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockSessionRepository: MockProxy<any>;
  let mockHashService: MockProxy<any>;
  let mockConfigService: MockProxy<any>;
  let mockLogger: MockProxy<any>;

  beforeEach(async () => {
    // uuidv4のモック設定
    const { v4 } = await import('uuid');
    const mockV4 = vi.mocked(v4) as any;
    mockV4
      .mockClear()
      .mockReturnValueOnce('12345678-1234-4567-8901-123456789abc') // access-token uuid  
      .mockReturnValueOnce('87654321-4321-4567-8901-cba987654321'); // reset-token uuid

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
      token: {
        maxAgeMinutes: 60,
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
    const validUserId = 'user-123';
    const mockSession = {
      id: 'session-456',
      userId: validUserId,
      accessTokenHash: 'hashed-access-token',
      resetTokenHash: 'hashed-reset-token',
    };

    it('should successfully create new token session', async () => {
      // Arrange
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      const result = await tokenService.createNewTokenSession(validUserId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({
          accessToken: '12345678-1234-4567-8901-123456789abc',
          accessTokenExpireAt: expect.any(Date),
          resetToken: '87654321-4321-4567-8901-cba987654321',
          resetTokenExpireAt: expect.any(Date),
          session: mockSession,
        });
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成開始',
        { userId: validUserId },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成完了',
        expect.objectContaining({
          userId: validUserId,
          sessionId: 'session-456',
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
      const result = await tokenService.createNewTokenSession(null as any);

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
      const result = await tokenService.createNewTokenSession(123 as any);

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
      const result = await tokenService.createNewTokenSession(validUserId);

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
          userId: validUserId,
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
      const result = await tokenService.createNewTokenSession(validUserId);

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
          userId: validUserId,
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
      const result = await tokenService.createNewTokenSession(validUserId);

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
          userId: validUserId,
          error: 'Config loading failed',
        }),
      );
    });

    it('should call session repository with correct parameters', async () => {
      // Arrange
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      await tokenService.createNewTokenSession(validUserId);

      // Assert
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        userId: validUserId,
        accessTokenHash: 'hashed-access-token',
        accessTokenExpireAt: expect.any(Date),
        resetTokenHash: 'hashed-reset-token',
        resetTokenExpireAt: expect.any(Date),
      });
    });

    it('should generate proper token expiration times', async () => {
      // Arrange
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      const result = await tokenService.createNewTokenSession(validUserId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // トークンの有効期限が設定されていることを確認
        expect(result.data.accessTokenExpireAt).toBeInstanceOf(Date);
        expect(result.data.resetTokenExpireAt).toBeInstanceOf(Date);
        
        // リセットトークンの有効期限がアクセストークンより長いことを確認
        expect(result.data.resetTokenExpireAt.getTime()).toBeGreaterThan(
          result.data.accessTokenExpireAt.getTime()
        );
      }
    });

    it('should mask sensitive data in logs', async () => {
      // Arrange
      mockHashService.generateHash
        .mockResolvedValueOnce('hashed-access-token')
        .mockResolvedValueOnce('hashed-reset-token');
      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Act
      await tokenService.createNewTokenSession(validUserId);

      // Assert - ログに機密情報がマスクされて出力されることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        '新規トークンセッション作成開始',
        expect.objectContaining({
          userId: validUserId, // ユーザーIDは機密情報ではないが、トークンは含まれていない
        }),
      );
      
      // ログにトークンの生の値が含まれていないことを確認
      const logCalls: LoggerMockCall[] = mockLogger.info.mock.calls;
      logCalls.forEach(([message, meta]) => {
        expect(JSON.stringify(meta)).not.toContain('12345678-1234-4567-8901-123456789abc');
        expect(JSON.stringify(meta)).not.toContain('87654321-4321-4567-8901-cba987654321');
      });
    });
  });
});