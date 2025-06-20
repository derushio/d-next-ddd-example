import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

import { inject, injectable } from 'tsyringe';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  id: string;
  email: string;
  name: string;
}

@injectable()
export class AuthService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async signIn({
    email,
    password,
  }: SignInRequest): Promise<Result<SignInResponse>> {
    this.logger.info('認証開始', { email });

    try {
      // ユーザー検索
      const user = await this.userRepository.findByEmail(new Email(email));
      if (!user) {
        this.logger.warn('認証失敗: ユーザーが見つかりません', { email });
        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'AUTHENTICATION_FAILED',
        );
      }

      // パスワード検証
      const isValidPassword = await this.hashService.compareHash(
        password,
        user.getPasswordHash(),
      );
      if (!isValidPassword) {
        this.logger.warn('認証失敗: パスワードが正しくありません', {
          email,
          userId: user.getId().toString(),
        });
        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'AUTHENTICATION_FAILED',
        );
      }

      this.logger.info('認証成功', { email, userId: user.getId().toString() });

      return success({
        id: user.getId().toString(),
        email: user.getEmail().toString(),
        name: user.getName(),
      });
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.warn('認証失敗: ドメインエラー', {
          email,
          errorCode: error.code,
          errorMessage: error.message,
        });
        return failure(error.message, error.code);
      }
      this.logger.error('認証処理でエラー発生', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return failure(
        '認証処理中にエラーが発生しました',
        'AUTHENTICATION_ERROR',
      );
    }
  }
}
