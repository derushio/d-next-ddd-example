import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { toUserResponseDTO } from '@/layers/application/mappers/UserMapper';
import { type AppError, ResultAsync } from '@/layers/application/types/Result';
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
import { User } from '@/layers/domain/entities/User';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { Email } from '@/layers/domain/value-objects/Email';
import {
  createUserInputSchema,
  type CreateUserRequest,
} from '@/layers/application/usecases/user/CreateUserUseCase.schema';
export { createUserInputSchema, type CreateUserRequest };

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
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private readonly userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService)
    private readonly hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
  ) {}

  execute(
    request: CreateUserRequest,
  ): ResultAsync<CreateUserResponse, AppError> {
    return ResultAsync.fromPromise(
      this._execute(request),
      mapToAppError(this.logger, 'ユーザー作成失敗', 'USER_CREATION_FAILED'),
    );
  }

  private async _execute(
    request: CreateUserRequest,
  ): Promise<CreateUserResponse> {
    const { name, email, password } = request;
    this.logger.info('ユーザー作成開始', { name, email });

    validateInput(createUserInputSchema, { name, email, password });

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
    return toUserResponseDTO(user);
  }
}
