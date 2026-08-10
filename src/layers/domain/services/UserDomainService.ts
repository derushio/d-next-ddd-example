import { inject, injectable } from 'tsyringe';
import { INJECTION_TOKENS } from '@/di/tokens';
import { INPUT_VALIDATION_RULES } from '@/layers/domain/constants/inputValidationRules';
import type { User } from '@/layers/domain/entities/User';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

export interface IUserDomainService {
  validateUserData(name: string, email: string): Promise<void>;
  validateEmailUpdate(currentUser: User, newEmail: string): Promise<void>;
  isEmailDuplicate(email: Email): Promise<boolean>;
}

@injectable()
export class UserDomainService implements IUserDomainService {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
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

    // 禁止文字チェック
    if (INPUT_VALIDATION_RULES.FORBIDDEN_CHARS_REGEX.test(name)) {
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
}
