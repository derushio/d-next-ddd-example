import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';

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
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async signIn({ email, password }: SignInRequest): Promise<SignInResponse> {
    this.logger.info('認証開始', { email });

    // ユーザー検索
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn('認証失敗: ユーザーが見つかりません', { email });
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // パスワード検証
    const isValidPassword = await this.hashService.compareHash(password, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn('認証失敗: パスワードが正しくありません', { email, userId: user.id });
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    this.logger.info('認証成功', { email, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
} 
