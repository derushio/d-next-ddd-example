import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { UserDomainService } from '@/layers/domain/services/UserDomainService';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';
import { Email } from '@/layers/domain/value-objects/Email';
import { DomainError } from '@/layers/domain/errors/DomainError';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@injectable()
export class SignInUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.UserDomainService) private userDomainService: UserDomainService,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async execute({ email, password }: SignInRequest): Promise<SignInResponse> {
    this.logger.info('サインイン試行開始', { email });

    try {
      // Email Value Objectを作成（バリデーション込み）
      const emailVO = new Email(email);

      // パスワードの基本バリデーション
      if (!password || password.trim().length === 0) {
        throw new DomainError('パスワードを入力してください', 'EMPTY_PASSWORD');
      }

      // ユーザー検索
      const user = await this.userRepository.findByEmail(emailVO);
      if (!user) {
        this.logger.warn('サインイン失敗: ユーザーが見つかりません', { email });
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      // パスワード検証
      const isPasswordValid = await this.hashService.compareHash(
        password,
        user.getPasswordHash()
      );
      
      if (!isPasswordValid) {
        this.logger.warn('サインイン失敗: パスワード不正', { userId: user.getId().toString() });
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      this.logger.info('サインイン成功', { userId: user.getId().toString() });
      
      return {
        success: true,
        user: {
          id: user.getId().toString(),
          name: user.getName(),
          email: user.getEmail().toString(),
        },
      };

    } catch (error) {
      this.logger.warn('サインイン失敗', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // DomainErrorはそのまま再スロー
      if (error instanceof DomainError) {
        throw new Error(error.message);
      }
      
      // その他のエラーも再スロー
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }
  }
} 
