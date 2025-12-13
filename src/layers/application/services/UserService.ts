import { INJECTION_TOKENS } from '@/di/tokens';
import type { IHashService } from '@/layers/application/interfaces/IHashService';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { failure, Result, success } from '@/layers/application/types/Result';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

@injectable()
export class UserService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async createUser(
    name: string,
    email: string,
    password: string,
  ): Promise<Result<User>> {
    try {
      // 入力値検証
      if (!name || typeof name !== 'string' || name.trim() === '') {
        this.logger.warn('ユーザー作成失敗: 無効な名前', { email });
        return failure('名前が無効です', 'INVALID_NAME');
      }
      if (!password || typeof password !== 'string' || password.trim() === '') {
        this.logger.warn('ユーザー作成失敗: 無効なパスワード', { email });
        return failure('パスワードが無効です', 'INVALID_PASSWORD');
      }

      this.logger.info('ユーザー作成開始', { email });

      // 重複ユーザーチェック
      const emailObj = new Email(email);
      const existingUser = await this.userRepository.findByEmail(emailObj);
      if (existingUser) {
        this.logger.warn('ユーザー作成失敗: メールアドレスが既に存在', {
          email,
        });
        return failure(
          'このメールアドレスは既に登録されています',
          'EMAIL_ALREADY_EXISTS',
        );
      }

      // パスワードハッシュ化
      const passwordHash = await this.hashService.generateHash(password);

      // Domain EntityのファクトリーメソッドでUser作成
      const user = User.create(emailObj, name, passwordHash);

      // Repository.save()でEntityを保存
      await this.userRepository.save(user);

      this.logger.info('ユーザー作成成功', {
        userId: user.id.value,
        email,
      });
      return success(user);
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.warn('ユーザー作成失敗: ドメインエラー', {
          email,
          errorCode: error.code,
          errorMessage: error.message,
        });
        return failure(error.message, error.code);
      }
      this.logger.error('ユーザー作成処理でエラー発生', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return failure(
        'ユーザー作成中にエラーが発生しました',
        'USER_CREATION_ERROR',
      );
    }
  }

  async findUserByEmail(email: string): Promise<Result<User | null>> {
    try {
      // Email Value Objectを使用
      const emailObj = new Email(email);
      const user = await this.userRepository.findByEmail(emailObj);

      this.logger.info('ユーザー検索完了', {
        email,
        found: !!user,
        userId: user ? user.id.value : null,
      });

      return success(user);
    } catch (error) {
      if (error instanceof DomainError) {
        this.logger.warn('ユーザー検索失敗: ドメインエラー', {
          email,
          errorCode: error.code,
          errorMessage: error.message,
        });
        return failure(error.message, error.code);
      }
      this.logger.error('ユーザー検索処理でエラー発生', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return failure(
        'ユーザー検索中にエラーが発生しました',
        'USER_SEARCH_ERROR',
      );
    }
  }
}
