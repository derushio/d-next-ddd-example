# Entity実装パターン詳細リファレンス

Entityの高度な実装パターンと設計手法を解説します。

## 複雑なビジネスロジックの実装

### 状態遷移の管理

```typescript
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export class User {
  public readonly id: UserId;
  public readonly email: Email;
  public readonly name: string;
  public readonly status: UserStatus;
  public readonly suspendedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.status = props.status;
    this.suspendedAt = props.suspendedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.validateInvariants();
  }

  // 状態遷移: アクティブ → 停止
  suspend(reason: string): User {
    if (this.status !== UserStatus.ACTIVE) {
      throw new DomainError(
        'アクティブなユーザーのみ停止できます',
        'INVALID_STATUS_TRANSITION',
      );
    }

    return new User({
      ...this.toProps(),
      status: UserStatus.SUSPENDED,
      suspendedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 状態遷移: 停止 → アクティブ
  reactivate(): User {
    if (this.status !== UserStatus.SUSPENDED) {
      throw new DomainError(
        '停止中のユーザーのみ再アクティブ化できます',
        'INVALID_STATUS_TRANSITION',
      );
    }

    return new User({
      ...this.toProps(),
      status: UserStatus.ACTIVE,
      suspendedAt: null,
      updatedAt: new Date(),
    });
  }

  // 状態遷移: 任意 → 削除
  markAsDeleted(): User {
    if (this.status === UserStatus.DELETED) {
      throw new DomainError(
        '既に削除されています',
        'ALREADY_DELETED',
      );
    }

    return new User({
      ...this.toProps(),
      status: UserStatus.DELETED,
      updatedAt: new Date(),
    });
  }

  // ガード条件
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isSuspended(): boolean {
    return this.status === UserStatus.SUSPENDED;
  }

  canPerformAction(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      status: this.status,
      suspendedAt: this.suspendedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private validateInvariants(): void {
    if (this.status === UserStatus.SUSPENDED && !this.suspendedAt) {
      throw new DomainError(
        '停止状態のユーザーには停止日時が必要です',
        'INVALID_SUSPENDED_STATE',
      );
    }

    if (this.status !== UserStatus.SUSPENDED && this.suspendedAt) {
      throw new DomainError(
        '停止状態でないユーザーに停止日時があります',
        'INVALID_ACTIVE_STATE',
      );
    }
  }
}
```

### ドメインイベントの統合

```typescript
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
}

export class UserPromotedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;

  constructor(
    public readonly userId: UserId,
    public readonly previousLevel: number,
    public readonly newLevel: number,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}

export class User {
  public readonly id: UserId;
  public readonly level: number;
  public readonly experiencePoints: number;

  private constructor(props: UserProps) {
    // ... プロパティ設定
  }

  promote(): User {
    if (!this.canPromote()) {
      throw new DomainError(
        '昇格条件を満たしていません',
        'PROMOTION_NOT_ALLOWED',
      );
    }

    const previousLevel = this.level;
    const promotedUser = new User({
      ...this.toProps(),
      level: this.level + 1,
      updatedAt: new Date(),
    });

    // イベントはUseCaseで処理
    return promotedUser;
  }

  canPromote(): boolean {
    return (
      this.experiencePoints >= this.getRequiredExperienceForNextLevel() &&
      this.level < 10
    );
  }

  private getRequiredExperienceForNextLevel(): number {
    return this.level * 1000;
  }

  // レベルアップ判定（UseCase側で使用）
  hasLeveledUp(previousLevel: number): boolean {
    return this.level > previousLevel;
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      level: this.level,
      experiencePoints: this.experiencePoints,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// UseCase側でのイベント発行例
const previousLevel = user.level;
const promotedUser = user.promote();

if (promotedUser.hasLeveledUp(previousLevel)) {
  DomainEvents.raise(
    new UserPromotedEvent(
      promotedUser.id,
      previousLevel,
      promotedUser.level,
    ),
  );
}
```

## 複雑な不変条件の検証

### 複数フィールド間の整合性チェック

```typescript
export class User {
  public readonly id: UserId;
  public readonly email: Email;
  public readonly emailVerified: boolean;
  public readonly emailVerifiedAt: Date | null;
  public readonly lastLoginAt: Date | null;
  public readonly createdAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.emailVerified = props.emailVerified;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.validateInvariants();
  }

  private validateInvariants(): void {
    // メール検証状態の整合性チェック
    if (this.emailVerified && !this.emailVerifiedAt) {
      throw new DomainError(
        'メール検証済みの場合は検証日時が必要です',
        'INVALID_EMAIL_VERIFICATION_STATE',
      );
    }

    if (!this.emailVerified && this.emailVerifiedAt) {
      throw new DomainError(
        'メール未検証の場合は検証日時があってはいけません',
        'INVALID_EMAIL_VERIFICATION_STATE',
      );
    }

    // 日付の整合性チェック
    if (this.emailVerifiedAt && this.emailVerifiedAt < this.createdAt) {
      throw new DomainError(
        'メール検証日時は作成日時より前であってはいけません',
        'INVALID_DATE_ORDER',
      );
    }

    if (this.lastLoginAt && this.lastLoginAt < this.createdAt) {
      throw new DomainError(
        '最終ログイン日時は作成日時より前であってはいけません',
        'INVALID_DATE_ORDER',
      );
    }
  }

  verifyEmail(): User {
    if (this.emailVerified) {
      return this; // 既に検証済みの場合は自身を返す
    }

    return new User({
      ...this.toProps(),
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  recordLogin(): User {
    return new User({
      ...this.toProps(),
      lastLoginAt: new Date(),
    });
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      emailVerified: this.emailVerified,
      emailVerifiedAt: this.emailVerifiedAt,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
    };
  }
}
```

## 値の計算ロジック

### ビジネスルールに基づく計算

```typescript
export class User {
  public readonly id: UserId;
  public readonly experiencePoints: number;
  public readonly level: number;
  public readonly consecutiveLoginDays: number;

  private constructor(props: UserProps) {
    // ... プロパティ設定
    this.validateInvariants();
  }

  // 経験値追加（レベルアップ判定含む）
  addExperiencePoints(points: number): User {
    if (points <= 0) {
      throw new DomainError(
        '経験値は正の値である必要があります',
        'INVALID_EXPERIENCE_POINTS',
      );
    }

    const newExperiencePoints = this.experiencePoints + points;
    const newLevel = this.calculateLevelFromExperience(newExperiencePoints);

    return new User({
      ...this.toProps(),
      experiencePoints: newExperiencePoints,
      level: newLevel,
      updatedAt: new Date(),
    });
  }

  // ボーナス計算
  calculateLoginBonus(): number {
    const baseBonus = 10;
    const consecutiveBonus = Math.min(this.consecutiveLoginDays * 5, 50);
    const levelBonus = this.level * 2;

    return baseBonus + consecutiveBonus + levelBonus;
  }

  // レベル判定
  private calculateLevelFromExperience(exp: number): number {
    // レベル1: 0-999, レベル2: 1000-2999, レベル3: 3000-5999...
    let level = 1;
    let requiredExp = 0;

    while (exp >= requiredExp) {
      requiredExp += level * 1000;
      if (exp >= requiredExp) {
        level++;
      }
    }

    return Math.min(level, 100); // 最大レベル100
  }

  private getRequiredExperienceForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += i * 1000;
    }
    return total;
  }

  getProgressToNextLevel(): {
    current: number;
    required: number;
    percentage: number;
  } {
    const currentLevelExp = this.getRequiredExperienceForLevel(this.level);
    const nextLevelExp = this.getRequiredExperienceForLevel(this.level + 1);
    const requiredForNext = nextLevelExp - currentLevelExp;
    const currentProgress = this.experiencePoints - currentLevelExp;

    return {
      current: currentProgress,
      required: requiredForNext,
      percentage: Math.floor((currentProgress / requiredForNext) * 100),
    };
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      experiencePoints: this.experiencePoints,
      level: this.level,
      consecutiveLoginDays: this.consecutiveLoginDays,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private validateInvariants(): void {
    if (this.experiencePoints < 0) {
      throw new DomainError(
        '経験値は0以上である必要があります',
        'INVALID_EXPERIENCE_POINTS',
      );
    }

    if (this.level < 1 || this.level > 100) {
      throw new DomainError(
        'レベルは1-100の範囲である必要があります',
        'INVALID_LEVEL',
      );
    }

    // レベルと経験値の整合性チェック
    const expectedLevel = this.calculateLevelFromExperience(this.experiencePoints);
    if (this.level !== expectedLevel) {
      throw new DomainError(
        'レベルと経験値が整合していません',
        'LEVEL_EXPERIENCE_MISMATCH',
      );
    }
  }
}
```

## equals()とclone()の実装

### 同一性判定

```typescript
export class User {
  public readonly id: UserId;
  public readonly email: Email;
  public readonly name: string;

  // IDによる同一性判定
  equals(other: User): boolean {
    if (!(other instanceof User)) {
      return false;
    }
    return this.id === other.id;
  }

  // 深い等価性判定（テスト用）
  deepEquals(other: User): boolean {
    if (!(other instanceof User)) {
      return false;
    }

    return (
      this.id === other.id &&
      this.email.equals(other.email) &&
      this.name === other.name &&
      this.createdAt.getTime() === other.createdAt.getTime() &&
      this.updatedAt.getTime() === other.updatedAt.getTime()
    );
  }

  // クローン（immutableなので基本不要、特殊ケース用）
  clone(): User {
    return new User({
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
```

## テストパターン

### Entity単体テスト

```typescript
import { describe, it, expect } from 'vitest';
import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { generateUserId } from '@/layers/domain/value-objects/UserId';
import { DomainError } from '@/layers/domain/errors/DomainError';

describe('User Entity', () => {
  describe('create', () => {
    it('正常なパラメータでUserを作成できる', () => {
      const email = new Email('test@example.com');
      const user = User.create(email, 'テストユーザー', 'hashedPassword');

      expect(user.email.value).toBe('test@example.com');
      expect(user.name).toBe('テストユーザー');
    });

    it('空の名前でエラーが発生する', () => {
      const email = new Email('test@example.com');

      expect(() => User.create(email, '', 'hashedPassword')).toThrow(DomainError);
      expect(() => User.create(email, '', 'hashedPassword')).toThrow('名前は空文字列にできません');
    });
  });

  describe('updateProfile', () => {
    it('プロフィール更新で新しいインスタンスを返す', () => {
      const user = User.create(
        new Email('test@example.com'),
        'Original Name',
        'hashedPassword',
      );

      const newEmail = new Email('new@example.com');
      const updatedUser = user.updateProfile(newEmail, 'New Name');

      // 元のインスタンスは変更されない
      expect(user.name).toBe('Original Name');
      expect(user.email.value).toBe('test@example.com');

      // 新しいインスタンスは更新されている
      expect(updatedUser.name).toBe('New Name');
      expect(updatedUser.email.value).toBe('new@example.com');
      expect(updatedUser.id).toBe(user.id);
    });
  });

  describe('addExperiencePoints', () => {
    it('経験値追加でレベルアップする', () => {
      const user = createTestUser({ experiencePoints: 500, level: 1 });
      const updatedUser = user.addExperiencePoints(1000);

      expect(user.level).toBe(1);
      expect(updatedUser.level).toBe(2);
      expect(updatedUser.experiencePoints).toBe(1500);
    });

    it('負の経験値でエラーが発生する', () => {
      const user = createTestUser({ experiencePoints: 100 });

      expect(() => user.addExperiencePoints(-50)).toThrow(DomainError);
      expect(() => user.addExperiencePoints(-50)).toThrow('経験値は正の値である必要があります');
    });
  });

  describe('equals', () => {
    it('同じIDを持つUserは等価である', () => {
      const userId = generateUserId();
      const user1 = User.reconstruct(
        userId,
        new Email('test@example.com'),
        'Test User',
        'hash',
        new Date(),
        new Date(),
      );
      const user2 = User.reconstruct(
        userId,
        new Email('test@example.com'),
        'Test User',
        'hash',
        new Date(),
        new Date(),
      );

      expect(user1.equals(user2)).toBe(true);
    });

    it('異なるIDを持つUserは等価でない', () => {
      const user1 = User.create(new Email('test1@example.com'), 'User 1', 'hash');
      const user2 = User.create(new Email('test2@example.com'), 'User 2', 'hash');

      expect(user1.equals(user2)).toBe(false);
    });
  });
});

// テストヘルパー
function createTestUser(overrides?: Partial<UserProps>): User {
  const defaults = {
    id: generateUserId(),
    email: new Email('test@example.com'),
    name: 'Test User',
    passwordHash: 'hashedPassword',
    experiencePoints: 0,
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return User.reconstruct({ ...defaults, ...overrides });
}
```

詳細な実装例は`_DOCS/guides/ddd/layers/components/entities.md`を参照してください。
