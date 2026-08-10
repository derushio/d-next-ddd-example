# Entities（エンティティ）🎭

このドキュメントでは、Domain Layer の Entities について、その役割と実装ルールを詳しく解説します。

---

## Entities とは？ 🏛️

Entity（エンティティ）は、**一意性を持つビジネス上重要な概念**を表現するドメインオブジェクトです。同じ属性を持つ他のオブジェクトとは区別される、独自のIDを持つオブジェクトとして定義されます。

### Entity の特徴 📋

```mermaid
graph TD
    ENTITY[🎭 Entity] --> ID[一意のID]
    ENTITY --> STATE[不変な状態]
    ENTITY --> BEHAVIOR[ビジネスメソッド]
    ENTITY --> LIFECYCLE[ライフサイクル]

    ID --> IDENTITY[同一性の保証]
    STATE --> IMMUTABLE[Immutable設計]
    STATE --> NEW_INSTANCE[新インスタンス生成]
    BEHAVIOR --> BUSINESS_LOGIC[ビジネスルール実装]
    LIFECYCLE --> CREATION[作成]
    LIFECYCLE --> RECONSTRUCTION[再構築]
    LIFECYCLE --> DELETION[削除]

    style ENTITY fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style ID fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style STATE fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style BEHAVIOR fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style LIFECYCLE fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
```

### Entity vs Value Object の違い 🔍

| 観点               | Entity               | Value Object          |
| ------------------ | -------------------- | --------------------- |
| **同一性**         | IDによる同一性       | 値による等価性        |
| **可変性**         | 不変（Immutable）    | 不変（Immutable）     |
| **変更方法**       | 新インスタンス生成   | 新インスタンス生成    |
| **ライフサイクル** | 作成・再構築・削除   | 作成・廃棄のみ        |
| **例**             | User, Order, Product | Email, Money, Address |

---

## 🎯 Entity 設計原則

### 🔒 Immutable設計の重要性

**すべてのEntityは基本的にimmutable（不変）でなければなりません。**

従来のOOP教育では「Entityは可変（mutable）」とされることが多いですが、**現代的なドメイン駆動設計では、EntityもImmutableにすることが強く推奨されます。**

#### なぜEntityもImmutableにすべきなのか？

1. **スレッドセーフ性** 🧵

   - 複数のスレッドから同時にアクセスされても安全
   - 競合状態（Race Condition）の回避

2. **予期しない副作用の防止** 🛡️

   - オブジェクトが他の場所で変更される心配がない
   - バグの原因となる「アクション・アット・ア・ディスタンス」を防止

3. **テストの簡単さ** 🧪

   - 状態が変わらないため、テストの予測が容易
   - モックやスタブの設定が単純

4. **イベントソーシングとの親和性** 📊
   - 不変のオブジェクトはイベントストアに保存しやすい
   - 履歴追跡が容易

#### Immutable Entity実装パターン

```typescript
// ✅ 正しいImmutable Entity（public readonly パターン）
export class User {
 public readonly id: UserId;
 public readonly email: Email;
 public readonly name: string;
 public readonly passwordHash: string;
 public readonly createdAt: Date;
 public readonly updatedAt: Date;

 private constructor(props: UserProps) {
  this.id = props.id;
  this.email = props.email;
  this.name = props.name;
  this.passwordHash = props.passwordHash;
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
  this.validateInvariants();
 }

 // ファクトリーメソッド：新規作成
 static create(input: CreateUserInput): User {
  const now = new Date();
  return new User({
   id: UserId.generate(),
   email: input.email,
   name: input.name,
   passwordHash: input.passwordHash,
   createdAt: now,
   updatedAt: now,
  });
 }

 // ファクトリーメソッド：再構築（永続化から復元）
 static reconstruct(props: UserProps): User {
  return new User(props);
 }

 // 新しいインスタンスを返すビジネスメソッド
 updateProfile(email: Email, name: string): User {
  return new User({
   ...this.toProps(),
   email,
   name,
   updatedAt: new Date(),
  });
 }

 private toProps(): UserProps {
  return {
   id: this.id,
   email: this.email,
   name: this.name,
   passwordHash: this.passwordHash,
   createdAt: this.createdAt,
   updatedAt: this.updatedAt,
  };
 }
}

// ❌ 間違った可変実装
export class User {
 public id: UserId;    // ❌ readonly がない = mutable
 public email: Email;  // ❌ readonly がない = mutable
 public name: string;  // ❌ readonly がない = mutable

 // ❌ 状態を変更するメソッド（void を返す）
 updateProfile(email: Email, name: string): void {
  this.email = email;  // ❌ 危険！元のインスタンスを変更
  this.name = name;    // ❌ 危険！元のインスタンスを変更
 }
}
```

#### UseCaseでの使い方

```typescript
// ✅ Immutable Entityの正しい使い方
export class UpdateUserUseCase {
 async execute(
  request: UpdateUserRequest,
 ): Promise<Result<UpdateUserResponse, AppError>> {
  const existingUser = await this.userRepository.findById(
   new UserId(request.userId),
  );

  // 新しいインスタンスを生成（existingUserは変更されない）
  const updatedUser = existingUser.updateProfile(
   new Email(request.email),
   request.name,
  );

  // 新しいインスタンスを永続化
  await this.userRepository.update(updatedUser);

  // public readonly で直接アクセス
  return ok({
   id: updatedUser.id.value,
   email: updatedUser.email.value,
   name: updatedUser.name,
   updatedAt: updatedUser.updatedAt,  // 直接アクセス（getterではない）
  });
 }
}
```

---

## ✅ 何をして良いか

### 1. **一意のIDを持つ** 🆔

```typescript
// ✅ 推薦：一意のIDによる識別（public readonly パターン）
export class User {
 public readonly id: UserId;        // 一意のID
 public readonly email: Email;
 public readonly name: string;
 public readonly createdAt: Date;
 public readonly updatedAt: Date;

 private constructor(props: UserProps) {
  this.id = props.id;
  this.email = props.email;
  this.name = props.name;
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
  this.validateInvariants();
 }

 // 同一性判定
 equals(other: User): boolean {
  return this.id.equals(other.id);
 }
}
```

### 2. **ビジネスメソッドの実装（Immutableパターン）** 🎯

```typescript
// ✅ 推薦：Entity内でのビジネスロジック実装（新インスタンス返却）
export class User {
 public readonly id: UserId;
 public readonly email: Email;
 public readonly name: string;
 public readonly passwordHash: string;
 public readonly createdAt: Date;
 public readonly updatedAt: Date;
 // ... その他のプロパティ

 // ビジネスメソッド：プロフィール更新（新インスタンスを返す）
 updateProfile(name: string): User {
  if (name.trim().length === 0) {
   throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
  }

  return new User({
   ...this.toProps(),
   name,
   updatedAt: new Date(),
  });
 }

 // ビジネスメソッド：メールアドレス変更（新インスタンスを返す）
 changeEmail(newEmail: Email): User {
  if (this.email.equals(newEmail)) {
   return this; // 同じメールアドレスの場合は自身を返す
  }

  return new User({
   ...this.toProps(),
   email: newEmail,
   updatedAt: new Date(),
  });
 }

 // ビジネスルール：名前の有効性判定（読み取り専用メソッド）
 isValidName(): boolean {
  return this.name.trim().length > 0 && this.name.length <= 50;
 }

 // 内部ヘルパー
 private toProps(): UserProps {
  return {
   id: this.id,
   email: this.email,
   name: this.name,
   passwordHash: this.passwordHash,
   createdAt: this.createdAt,
   updatedAt: this.updatedAt,
  };
 }
}
```

### 3. **不変条件の保証** 🛡️

```typescript
// ✅ 推薦：常に妥当な状態を保証
export class User {
 private validateInvariants(): void {
  if (this.name.trim().length === 0) {
   throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
  }

  if (this.name.length > 50) {
   throw new DomainError('名前は50文字以内である必要があります', 'NAME_TOO_LONG');
  }

  if (this.passwordHash.length === 0) {
   throw new DomainError('パスワードハッシュは必須です', 'INVALID_PASSWORD_HASH');
  }

  // メールアドレスの妥当性はValue Objectで保証済み
 }
}
```

### 4. **ファクトリーメソッドの提供** 🏭

```typescript
// ✅ 推薦：適切なオブジェクト生成メソッド
export class User {
 // 新規作成用ファクトリーメソッド（3引数）
 static create(email: Email, name: string, passwordHash: string): User {
  const now = new Date();
  return new User({
   id: UserId.generate(),
   email,
   name,
   passwordHash,
   createdAt: now,
   updatedAt: now,
  });
 }

 // 復元用ファクトリーメソッド（Repository用・6引数）
 static reconstruct(
  id: UserId,
  email: Email,
  name: string,
  passwordHash: string,
  createdAt: Date,
  updatedAt: Date,
 ): User {
  return new User({
   id,
   email,
   name,
   passwordHash,
   createdAt,
   updatedAt,
  });
 }
}
```

### 5. **状態変更の制御（新インスタンス返却）** 🔄

```typescript
// ✅ 推薦：適切な状態変更メソッド（Immutableパターン）
export class User {
 public readonly email: Email;
 public readonly name: string;
 // ... その他のプロパティ

 // 状態変更は新インスタンスを返す専用メソッドで
 changeEmail(newEmail: Email): User {
  // ビジネスルール：メール変更の妥当性チェック
  if (this.email.equals(newEmail)) {
   return this; // 同じメールアドレスの場合は自身を返す
  }

  // 新しいインスタンスを返す（元のオブジェクトは変更しない）
  return new User({
   ...this.toProps(),
   email: newEmail,
   updatedAt: new Date(),
  });
 }

 // プロフィール更新（新インスタンスを返す）
 updateProfile(name: string): User {
  if (name.trim().length === 0) {
   throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
  }

  return new User({
   ...this.toProps(),
   name,
   updatedAt: new Date(),
  });
 }
}
```

---

## ❌ 何をしてはならないか

### 1. **データベース操作の直接実装** 🚫

```typescript
// ❌ 禁止：Entity内でのデータベース操作
export class User {
 async save(): Promise<void> {
  const prisma = new PrismaClient(); // 禁止
  await prisma.user.update({
   where: { id: this.id.value },
   data: {
    /* ... */
   },
  });
 }

 async delete(): Promise<void> {
  const prisma = new PrismaClient(); // 禁止
  await prisma.user.delete({ where: { id: this.id.value } });
 }
}
```

### 2. **UI・表示用フォーマットの実装** 🎨

```typescript
// ❌ 禁止：表示用フォーマット
export class User {
 getDisplayName(): string {
  return `${this.name}様`; // Presentation Layerの責務
 }

 getFormattedRegistrationDate(): string {
  return this.createdAt.toLocaleDateString('ja-JP'); // 表示フォーマットは禁止
 }

 toJSON(): object {
  // API レスポンス用の変換は Application Layer の責務
  return {
   id: this.id.value,
   name: this.name,
   registeredAt: this.getFormattedRegistrationDate(), // 禁止
  };
 }
}
```

### 3. **外部サービスの直接呼び出し** 🌐

```typescript
// ❌ 禁止：外部API呼び出し
export class User {
 async sendWelcomeEmail(): Promise<void> {
  // メール送信は Infrastructure Layer の責務
  const emailService = new SendGridService(); // 禁止
  await emailService.send({
   to: this.email.value,
   subject: 'Welcome!',
   body: '登録ありがとうございます',
  });
 }

 async uploadAvatar(file: Buffer): Promise<string> {
  // ファイルアップロードは Infrastructure Layer の責務
  const s3 = new AWS.S3(); // 禁止
  const result = await s3
   .upload({
    Bucket: 'avatars',
    Key: `${this.id.value}.jpg`,
    Body: file,
   })
   .promise();

  return result.Location;
 }
}
```

### 4. **Application Layer のロジック** 📋

```typescript
// ❌ 禁止：ユースケース的なフロー制御
export class User {
 async completeRegistration(): Promise<void> {
  // 複数のサービスを組み合わせた処理は Application Layer の責務
  await this.save(); // Repository操作
  await this.sendWelcomeEmail(); // メール送信
  await this.createInitialSettings(); // 他のEntity操作
  // これらの組み合わせはUse Caseで行うべき
 }
}
```

### 5. **フレームワーク・インフラ依存** 🔧

```typescript
// ❌ 禁止：フレームワーク依存
import { PrismaClient } from '@prisma/client'; // 禁止
import { NextRequest } from 'next/server'; // 禁止

export class User {
 processRequest(req: NextRequest): void {
  // 禁止
  // Next.js固有の処理は Presentation Layer の責務
 }
}
```

---

## 🏗️ 設計パターンとベストプラクティス

### 1. **Rich Domain Model の採用（Immutableパターン）** 💰

```typescript
// ✅ 推薦：ビジネスロジックをEntityに集約（不変設計）
export class User {
 public readonly id: UserId;
 public readonly email: Email;
 public readonly name: string;
 public readonly passwordHash: string;
 public readonly createdAt: Date;
 public readonly updatedAt: Date;

 private constructor(props: UserProps) {
  // 全プロパティを設定
  this.id = props.id;
  this.email = props.email;
  this.name = props.name;
  this.passwordHash = props.passwordHash;
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
  this.validateInvariants();
 }

 // ビジネスメソッド群（新インスタンスを返す）
 changeEmail(email: Email): User { /* 新インスタンス返却 */ }
 updateProfile(name: string): User { /* 新インスタンス返却 */ }
 updatePasswordHash(passwordHash: string): User { /* 新インスタンス返却 */ }

 // 読み取り専用判定メソッド
 isValidName(): boolean { /* 状態を変更しない */ }
}

// ❌ 避ける：Anemic Domain Model（貧血モデル）
export class User {
 // データのみでビジネスロジックがない
 id: string;
 email: string;
 name: string;
 passwordHash: string;
}
```

### 2. **カプセル化の徹底（public readonly パターン）** 🔒

```typescript
// ✅ 推薦：public readonly による適切なカプセル化
export class User {
 public readonly id: UserId;           // 読み取り専用で公開
 public readonly email: Email;         // 読み取り専用で公開
 public readonly name: string;         // 読み取り専用で公開
 public readonly passwordHash: string; // 読み取り専用で公開
 public readonly createdAt: Date;
 public readonly updatedAt: Date;

 private constructor(props: UserProps) {
  this.id = props.id;
  this.email = props.email;
  this.name = props.name;
  this.passwordHash = props.passwordHash;
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
  this.validateInvariants();
 }

 // 状態変更は新インスタンスを返すメソッド経由のみ
 changeEmail(newEmail: Email): User {
  return new User({
   ...this.toProps(),
   email: newEmail,
   updatedAt: new Date(),
  });
 }

 private toProps(): UserProps {
  return {
   id: this.id,
   email: this.email,
   name: this.name,
   passwordHash: this.passwordHash,
   createdAt: this.createdAt,
   updatedAt: this.updatedAt,
  };
 }
}

// ❌ 避ける：mutableなpublicプロパティ
export class User {
 public id: string;    // ❌ readonlyがない = 外部から変更可能
 public email: string; // ❌ 直接変更可能になってしまう
 public name: string;
}
```

**getterメソッドは禁止、public readonly を使用:**

| 観点 | public readonly | getter メソッド |
|------|-----------------|-----------------|
| **使用可否** | ✅ 必須 | ❌ 禁止 |
| **アクセス** | `user.email` | ~~`user.getEmail()`~~ |
| **理由** | シンプルで明確 | 不要な複雑性 |
| **Immutability** | TypeScriptで保証 | 実装依存 |

> ⚠️ **重要**: Entityでは `get` プレフィックス付きのgetterメソッド（`getEmail()`, `getName()` 等）は使用禁止です。
> `public readonly` で直接プロパティにアクセスしてください。

### 3. **ドメインイベントの活用（Immutableパターン）** 📡

```typescript
// ✅ 推薦：重要なビジネスイベントの通知（UseCase側で処理）
export class User {
 public readonly email: Email;
 public readonly name: string;

 // メール変更処理（新インスタンスを返す）
 changeEmail(newEmail: Email): User {
  return new User({
   ...this.toProps(),
   email: newEmail,
   updatedAt: new Date(),
  });
  // 注: イベント発行はUseCase側で行う
 }

 // プロフィール更新（新インスタンスを返す）
 updateProfile(newName: string): User {
  if (!newName || newName.trim().length === 0) {
   throw new Error('名前は空にできません');
  }

  return new User({
   ...this.toProps(),
   name: newName,
   updatedAt: new Date(),
  });
 }

 // メール変更可否判定（読み取り専用）
 canChangeEmail(newEmail: Email): boolean {
  return !this.email.equals(newEmail);
 }
}

// UseCase でのイベント発行例
const previousEmail = user.email;
const updatedUser = user.changeEmail(newEmail);

if (!previousEmail.equals(updatedUser.email)) {
 DomainEvents.raise(
  new UserEmailChangedEvent(updatedUser.id, previousEmail, updatedUser.email, new Date()),
 );
}
```

---

## 🧪 テスト戦略

### Unit Tests（単体テスト）

```typescript
// ✅ Entity テストの例（public readonly パターン）
describe('User Entity', () => {
 describe('create', () => {
  it('正常なパラメータでUserを作成できる', () => {
   // Arrange
   const email = new Email('test@example.com');
   const name = 'テストユーザー';
   const passwordHash = 'hashed_password_abc123';

   // Act
   const user = User.create(email, name, passwordHash);

   // Assert（直接プロパティアクセス）
   expect(user.email).toEqual(email);
   expect(user.name).toBe(name);
   expect(user.passwordHash).toBe(passwordHash);
   expect(user.id).toBeDefined();
   expect(user.createdAt).toBeDefined();
  });
 });

 describe('changeEmail', () => {
  it('メール変更で新しいインスタンスが返される', () => {
   // Arrange
   const user = User.create(
    new Email('test@example.com'),
    'テストユーザー',
    'hashed_password_abc123',
   );
   const newEmail = new Email('new@example.com');

   // Act（新インスタンスを受け取る）
   const updatedUser = user.changeEmail(newEmail);

   // Assert（元のuserは変更されない）
   expect(user.email.value).toBe('test@example.com');

   // 新しいインスタンスの確認
   expect(updatedUser.email).toEqual(newEmail);
   expect(updatedUser.id).toEqual(user.id);
  });
 });

 describe('updateProfile', () => {
  it('空の名前でエラーが発生する', () => {
   // Arrange
   const user = User.create(
    new Email('test@example.com'),
    'テストユーザー',
    'hashed_password_abc123',
   );

   // Act & Assert
   expect(() => user.updateProfile('')).toThrow('名前は空にできません');
  });
 });

 describe('不変条件', () => {
  it('空のパスワードハッシュでエラーが発生する', () => {
   // Arrange & Act & Assert
   expect(() =>
    User.reconstruct(
     new UserId('user-123'),
     new Email('test@example.com'),
     'テストユーザー',
     '', // 空のパスワードハッシュ
     new Date(),
     new Date(),
    ),
   ).toThrow('パスワードハッシュは空にできません');
  });
 });
});
```

---

## 🔍 実装チェックリスト

Entity を実装する際の確認事項：

### 基本構造

- [ ] 一意のIDを持っている（Value Object として）
- [ ] プライベートコンストラクタを使用している
- [ ] ファクトリーメソッド（create/reconstruct）を提供している
- [ ] `public readonly` でプロパティを公開している（getterメソッドは禁止）
- [ ] `toProps()` メソッドで内部状態を取得できる

### Immutable設計

- [ ] 全プロパティが `readonly` である
- [ ] 状態変更メソッドは新インスタンスを返す（`void` ではない）
- [ ] 元のインスタンスは変更されない
- [ ] 不変条件を validateInvariants() で検証している

### ビジネスロジック

- [ ] ビジネスメソッドを Entity 内に実装している
- [ ] 判定メソッド（canXxx, isXxx）は `boolean` を返す
- [ ] 更新メソッドは新しい `Entity` インスタンスを返す

### 禁止事項の回避

- [ ] getterメソッド（`getXxx()`）を使用していない
- [ ] データベース操作を直接実装していない
- [ ] UI・表示フォーマットを実装していない
- [ ] 外部サービスを直接呼び出していない
- [ ] フレームワークに依存していない

### テスト

- [ ] 各ビジネスメソッドの単体テストがある
- [ ] 不変条件違反のテストがある
- [ ] Immutability（元のインスタンスが変更されないこと）のテストがある
- [ ] ファクトリーメソッドのテストがある

---

**Entity は Domain Layer の中核となるコンポーネントです。ビジネスルールを適切に実装し、技術的詳細から独立させることが重要です！** 🎭✨
