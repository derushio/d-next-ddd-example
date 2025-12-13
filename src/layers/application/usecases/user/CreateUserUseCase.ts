import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateUserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute({
    name,
    email,
    password,
  }: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    this.logger.info('ユーザー作成開始', { name, email });

    try {
      // 1. ドメインサービスでバリデーション
      await this.userDomainService.validateUserData(name, email);

      // 2. パスワードハッシュ化
      const passwordHash = await this.hashService.generateHash(password);

      // 3. ドメインオブジェクト作成
      const user = User.create(new Email(email), name, passwordHash);

      // 4. 永続化
      await this.userRepository.save(user);

      this.logger.info('ユーザー作成完了', {
        userId: user.id.value,
        email,
      });

      // 5. レスポンス変換
      return success({
        id: user.id.value,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ユーザー作成失敗', {
        email,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // DomainErrorの場合は適切なエラーコードで返す
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      // その他の予期しないエラー
      if (error instanceof Error) {
        return failure(error.message, 'USER_CREATION_FAILED');
      }

      return failure('ユーザーの作成に失敗しました', 'USER_CREATION_FAILED');
    }
  }
}
