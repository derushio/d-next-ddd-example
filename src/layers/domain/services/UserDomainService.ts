import { INJECTION_TOKENS } from '@/di/tokens';
import { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IHashService } from '@/layers/domain/interfaces/IHashService';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

import { inject, injectable } from 'tsyringe';

export interface IUserDomainService {
  validateUserData(name: string, email: string): Promise<void>;
  validateEmailUpdate(currentUser: User, newEmail: string): Promise<void>;
  isEmailDuplicate(email: Email): Promise<boolean>;
  validateEmail(email: string): void;
  validatePassword(password: string): void;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

@injectable()
export class UserDomainService implements IUserDomainService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,
    @inject(INJECTION_TOKENS.HashService)
    private hashService: IHashService,
  ) {}

  // ビジネスルール：ユーザーデータの妥当性検証
  async validateUserData(name: string, email: string): Promise<void> {
    // 名前の妥当性チェック
    if (name.trim().length < 2) {
      throw new DomainError(
        '名前は2文字以上である必要があります',
        'INVALID_NAME_LENGTH',
      );
    }

    if (name.length > 100) {
      throw new DomainError(
        '名前は100文字以内である必要があります',
        'NAME_TOO_LONG',
      );
    }

    // 禁止文字チェック
    const forbiddenChars = /[<>\"'&]/;
    if (forbiddenChars.test(name)) {
      throw new DomainError(
        '名前に使用できない文字が含まれています',
        'INVALID_NAME_CHARACTERS',
      );
    }

    // メールアドレスの重複チェック（他のドメインオブジェクトとの関係性）
    const emailValue = new Email(email); // バリデーションも兼ねる
    const existingUser = await this.userRepository.findByEmail(emailValue);
    if (existingUser) {
      throw new DomainError(
        'このメールアドレスは既に使用されています',
        'EMAIL_ALREADY_EXISTS',
      );
    }
  }

  // ビジネスルール：メールアドレス更新の妥当性
  async validateEmailUpdate(
    currentUser: User,
    newEmail: string,
  ): Promise<void> {
    const emailValue = new Email(newEmail);

    // 現在のメールアドレスと同じ場合は問題なし
    if (currentUser.email.equals(emailValue)) {
      return;
    }

    // 他のユーザーが使用していないかチェック
    const existingUser = await this.userRepository.findByEmail(emailValue);
    if (existingUser && !existingUser.id.equals(currentUser.id)) {
      throw new DomainError(
        'このメールアドレスは既に使用されています',
        'EMAIL_ALREADY_EXISTS',
      );
    }
  }

  // ビジネスルール：メールアドレス重複チェック（bool値で返す）
  async isEmailDuplicate(email: Email): Promise<boolean> {
    const existingUser = await this.userRepository.findByEmail(email);
    return existingUser !== null;
  }

  validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainError(
        '有効なメールアドレスを入力してください',
        'INVALID_EMAIL_FORMAT',
      );
    }
  }

  validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new DomainError('パスワードは必須です', 'PASSWORD_REQUIRED');
    }

    if (password.length < 8) {
      throw new DomainError(
        'パスワードは8文字以上で入力してください',
        'PASSWORD_TOO_SHORT',
      );
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await this.hashService.generateHash(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await this.hashService.compareHash(password, hash);
  }
}
