import { injectable, inject } from 'tsyringe';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

export interface UpdateUserRequest {
  userId: string;
  email?: string;
  name?: string;
}

export interface UpdateUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    updatedAt: Date;
  };
  error?: {
    message: string;
    code?: string;
  };
}

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService)
    private readonly userDomainService: UserDomainService
  ) {}

  async execute(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      // ユーザーID検証
      const userId = new UserId(request.userId);
      
      // 既存ユーザー取得
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: {
            message: 'ユーザーが見つかりません',
            code: 'USER_NOT_FOUND'
          }
        };
      }

      // 更新データ準備
      const newEmail = request.email ? new Email(request.email) : existingUser.getEmail();
      const newName = request.name !== undefined ? request.name : existingUser.getName();

      // ドメインサービスでの重複チェック（メールアドレスが変更される場合）
      if (request.email && request.email !== existingUser.getEmail().toString()) {
        const isDuplicate = await this.userDomainService.isEmailDuplicate(newEmail);
        if (isDuplicate) {
          return {
            success: false,
            error: {
              message: 'このメールアドレスは既に使用されています',
              code: 'EMAIL_DUPLICATE'
            }
          };
        }
      }

      // プロフィール更新（ドメインロジック）
      existingUser.updateProfile(newEmail, newName);

      // 永続化
      await this.userRepository.update(existingUser);

      return {
        success: true,
        user: {
          id: existingUser.getId().toString(),
          email: existingUser.getEmail().toString(),
          name: existingUser.getName(),
          updatedAt: existingUser.getUpdatedAt()
        }
      };

    } catch (error) {
      if (error instanceof DomainError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code
          }
        };
      }

      // 予期しないエラー
      console.error('UpdateUserUseCase実行エラー:', error);
      return {
        success: false,
        error: {
          message: 'ユーザー更新に失敗しました',
          code: 'UNEXPECTED_ERROR'
        }
      };
    }
  }
} 
