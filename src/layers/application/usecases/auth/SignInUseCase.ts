import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

export interface SignInRequest {
  email: string;
  password: string;
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
    @inject(INJECTION_TOKENS.UserDomainService)
    private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute({
    email,
    password,
  }: SignInRequest): Promise<Result<SignInResponse>> {
    this.logger.info('サインイン試行開始', { email });

    try {
      // Email Value Objectを作成（バリデーション込み）
      const emailVO = new Email(email);

      // パスワードの基本バリデーション
      if (!password || password.trim().length === 0) {
        this.logger.warn('サインイン失敗: パスワードが入力されていません', {
          email,
        });
        return failure('パスワードを入力してください', 'EMPTY_PASSWORD');
      }

      // ユーザー検索
      const user = await this.userRepository.findByEmail(emailVO);
      if (!user) {
        this.logger.warn('サインイン失敗: ユーザーが見つかりません', { email });
        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'INVALID_CREDENTIALS',
        );
      }

      // パスワード検証
      const isPasswordValid = await this.hashService.compareHash(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn('サインイン失敗: パスワード不正', {
          userId: user.id.value,
        });
        return failure(
          'メールアドレスまたはパスワードが正しくありません',
          'INVALID_CREDENTIALS',
        );
      }

      this.logger.info('サインイン成功', { userId: user.id.value });

      return success({
        user: {
          id: user.id.value,
          name: user.name,
          email: user.email.value,
        },
      });
    } catch (error) {
      this.logger.error('サインイン処理中に予期しないエラーが発生', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // DomainErrorの場合は適切なエラーコードで返す
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // その他の予期しないエラー
      return failure(
        'サインイン処理中にエラーが発生しました',
        'UNEXPECTED_ERROR',
      );
    }
  }
}
