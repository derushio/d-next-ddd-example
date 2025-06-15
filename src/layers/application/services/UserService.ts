import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IUserRepository } from '@/layers/infrastructure/repositories/interfaces/IUserRepository';
import type { IHashService } from '@/layers/infrastructure/services/HashService';
import type { ILogger } from '@/layers/infrastructure/services/Logger';
import type { User } from '@/layers/infrastructure/persistence/prisma/generated';

@injectable()
export class UserService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger
  ) {}

  async createUser(name: string, email: string, password: string): Promise<User> {
    this.logger.info('ユーザー作成開始', { email });

    // パスワードハッシュ化
    const passwordHash = await this.hashService.generateHash(password);

    // ユーザー作成
    const user = await this.userRepository.create({
      name,
      email,
      passwordHash,
    });

    this.logger.info('ユーザー作成成功', { userId: user.id, email });
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }
} 
