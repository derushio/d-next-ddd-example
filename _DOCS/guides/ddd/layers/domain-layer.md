# Domain Layer 実装ガイド 🏛️

このドキュメントでは、Domain Layer（ドメイン層）での実装ルール、許可される処理、禁止される処理について詳しく解説します。

---

## Domain Layer の責務 👑

### 基本的な役割

```mermaid
graph TD
    subgraph "Domain Layer（ビジネスの中核）"
        ENTITY[Entities]
        VO[Value Objects]
        DS[Domain Services]
        REPO[Repository Interfaces]
        DOMAIN_EVENT[Domain Events]
    end

    APP[Application Layer] --> ENTITY
    APP --> DS
    APP --> REPO

    INFRA[Infrastructure Layer] --> REPO

    style ENTITY fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style VO fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style DS fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style REPO fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style DOMAIN_EVENT fill:#fce4ec
```

**Domain Layerの責務：**

1. **ビジネスルールの実装** - 企業・業界固有のルール
2. **ドメインオブジェクトの管理** - Entity、Value Object
3. **ドメインサービスの提供** - 複数オブジェクト間のビジネスロジック
4. **不変条件の保証** - データの整合性・妥当性
5. **ドメインイベントの発行** - ビジネス上重要な出来事の通知

---

## ✅ 書いて良いもの（許可される処理）

### 1. Entity（エンティティ）実装 🎭

**ビジネス上の重要な概念を表現**

```typescript
// ✅ 許可：Entity実装（public readonly パターン）
export class User {
 private constructor(
  // public readonly でプロパティに直接アクセス可能
  public readonly id: UserId,
  public readonly email: Email,
  public readonly name: string,
  public readonly experiencePoints: number,
  public readonly level: number,
  public readonly createdAt: Date,
  public readonly lastLoginAt?: Date,
 ) {
  // 不変条件の検証
  this.validateInvariants();
 }

 // ファクトリーメソッド
 static create(id: UserId, email: Email, name: string): User {
  return new User(
   id,
   email,
   name,
   0, // 初期経験値
   1, // 初期レベル
   new Date(),
  );
 }

 // ビジネスロジック：経験値追加
 addExperiencePoints(points: number): void {
  if (points <= 0) {
   throw new DomainError(
    '経験値は正の値である必要があります',
    'INVALID_EXPERIENCE_POINTS',
   );
  }

  this.experiencePoints += points;

  // レベルアップ判定
  this.checkLevelUp();

  // 不変条件の再検証
  this.validateInvariants();
 }

 // ビジネスロジック：昇格処理
 promote(): void {
  if (!this.canPromote()) {
   throw new DomainError('昇格条件を満たしていません', 'PROMOTION_NOT_ALLOWED');
  }

  this.level += 1;

  // ドメインイベント発行
  DomainEvents.raise(new UserPromotedEvent(this.id, this.level));
 }

 // ビジネスルール：昇格可能性判定
 canPromote(): boolean {
  return (
   this.experiencePoints >= this.getRequiredExperienceForNextLevel() &&
   this.level < 10 &&
   this.isActive()
  );
 }

 // ビジネスロジック：サインイン処理
 recordLogin(): void {
  this.lastLoginAt = new Date();

  // 連続サインインボーナス判定
  if (this.isConsecutiveLogin()) {
   this.addExperiencePoints(10);
  }
 }

 // ※ ゲッターは不要 - public readonly でプロパティに直接アクセス
 // user.id, user.email, user.name, user.level などで取得可能

 // プライベートメソッド：不変条件検証
 private validateInvariants(): void {
  if (this.experiencePoints < 0) {
   throw new DomainError(
    '経験値は0以上である必要があります',
    'INVALID_EXPERIENCE_POINTS',
   );
  }

  if (this.level < 1 || this.level > 10) {
   throw new DomainError(
    'レベルは1-10の範囲である必要があります',
    'INVALID_LEVEL',
   );
  }

  if (this.name.trim().length === 0) {
   throw new DomainError('名前は空文字列にできません', 'INVALID_NAME');
  }
 }

 private checkLevelUp(): void {
  const requiredExp = this.getRequiredExperienceForNextLevel();
  if (this.experiencePoints >= requiredExp && this.level < 10) {
   this.level += 1;
   DomainEvents.raise(
    new UserLevelUpEvent(this.id, this.level, this.level - 1),
   );
  }
 }

 private getRequiredExperienceForNextLevel(): number {
  return this.level * 1000; // レベル × 1000
 }

 private isActive(): boolean {
  // アクティブ判定のビジネスロジック
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return this.lastLoginAt ? this.lastLoginAt > thirtyDaysAgo : false;
 }

 private isConsecutiveLogin(): boolean {
  // 連続サインイン判定のビジネスロジック
  if (!this.lastLoginAt) return true; // 初回サインイン

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return this.lastLoginAt.toDateString() === yesterday.toDateString();
 }
}
```

**なぜ許可されるのか：**

- ビジネス上の重要な概念を表現
- ビジネスルールの実装場所として最適
- 不変条件の保証が可能

### 2. Value Object（値オブジェクト）実装 💎

**不変で等価性を持つ値の表現**

```typescript
// ✅ 許可：Value Object実装
export class Email {
 private readonly value: string;

 constructor(email: string) {
  this.validateEmail(email);
  this.value = email.toLowerCase().trim();
 }

 toString(): string {
  return this.value;
 }

 // 等価性判定
 equals(other: Email): boolean {
  return this.value === other.value;
 }

 // ドメインメソッド
 getDomain(): string {
  return this.value.split('@')[1];
 }

 isCompanyEmail(): boolean {
  const companyDomains = ['company.com', 'corp.com'];
  return companyDomains.includes(this.getDomain());
 }

 private validateEmail(email: string): void {
  if (!email || email.trim().length === 0) {
   throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
   throw new DomainError(
    'メールアドレスの形式が正しくありません',
    'INVALID_EMAIL_FORMAT',
   );
  }

  if (email.length > 254) {
   throw new DomainError('メールアドレスが長すぎます', 'EMAIL_TOO_LONG');
  }
 }
}

// ✅ 許可：複雑なValue Object
export class Money {
 private readonly amount: number;
 private readonly currency: string;

 constructor(amount: number, currency: string = 'JPY') {
  this.validateAmount(amount);
  this.validateCurrency(currency);

  this.amount = Math.round(amount * 100) / 100; // 小数点以下2桁に丸める
  this.currency = currency.toUpperCase();
 }

 // ビジネスロジック：加算
 add(other: Money): Money {
  this.ensureSameCurrency(other);
  return new Money(this.amount + other.amount, this.currency);
 }

 // ビジネスロジック：減算
 subtract(other: Money): Money {
  this.ensureSameCurrency(other);
  const result = this.amount - other.amount;

  if (result < 0) {
   throw new DomainError('金額が負の値になります', 'NEGATIVE_AMOUNT');
  }

  return new Money(result, this.currency);
 }

 // ビジネスロジック：乗算
 multiply(multiplier: number): Money {
  if (multiplier < 0) {
   throw new DomainError(
    '乗数は正の値である必要があります',
    'INVALID_MULTIPLIER',
   );
  }

  return new Money(this.amount * multiplier, this.currency);
 }

 // 比較
 isGreaterThan(other: Money): boolean {
  this.ensureSameCurrency(other);
  return this.amount > other.amount;
 }

 equals(other: Money): boolean {
  return this.amount === other.amount && this.currency === other.currency;
 }

 // ※ public readonly の場合はゲッターは不要
 // money.amount, money.currency で直接アクセス可能

 private validateAmount(amount: number): void {
  if (amount < 0) {
   throw new DomainError('金額は0以上である必要があります', 'NEGATIVE_AMOUNT');
  }

  if (!Number.isFinite(amount)) {
   throw new DomainError(
    '金額は有限の数値である必要があります',
    'INVALID_AMOUNT',
   );
  }
 }

 private validateCurrency(currency: string): void {
  const validCurrencies = ['JPY', 'USD', 'EUR'];
  if (!validCurrencies.includes(currency.toUpperCase())) {
   throw new DomainError(
    'サポートされていない通貨です',
    'UNSUPPORTED_CURRENCY',
   );
  }
 }

 private ensureSameCurrency(other: Money): void {
  if (this.currency !== other.currency) {
   throw new DomainError(
    '異なる通貨同士の計算はできません',
    'CURRENCY_MISMATCH',
   );
  }
 }
}
```

### 3. Domain Service（ドメインサービス）実装 🔧

**複数のドメインオブジェクト間のビジネスロジック**

```typescript
// ✅ 許可：Domain Service実装
export class UserDomainService {
 constructor(private userRepository: IUserRepository) {}

 // ビジネスルール：ユーザーデータの妥当性検証
 async validateUserData(name: string, email: string): Promise<void> {
  // 名前の妥当性チェック
  if (name.trim().length < 2) {
   throw new DomainError(
    '名前は2文字以上である必要があります',
    'INVALID_NAME_LENGTH',
   );
  }

  if (name.length > 50) {
   throw new DomainError(
    '名前は50文字以内である必要があります',
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
  const existingUser = await this.userRepository.findByEmail(email);
  if (existingUser) {
   throw new DomainError(
    'このメールアドレスは既に使用されています',
    'EMAIL_ALREADY_EXISTS',
   );
  }
 }

 // ビジネスルール：昇格可能性判定（public readonly プロパティを直接アクセス）
 canPromoteUser(user: User): boolean {
  // 複数条件の組み合わせによるビジネスルール
  return (
   user.experiencePoints >=
    this.getRequiredExperienceForNextLevel(user.level) &&
   user.level < 10 &&
   this.isUserActive(user) &&
   !this.hasRecentViolations(user)
  );
 }

 // ビジネスルール：ポイント転送の妥当性
 validatePointTransfer(sender: User, receiver: User, points: number): void {
  if (points <= 0) {
   throw new DomainError(
    '転送ポイントは正の値である必要があります',
    'INVALID_TRANSFER_AMOUNT',
   );
  }

  if (sender.experiencePoints < points) {
   throw new DomainError('転送ポイントが不足しています', 'INSUFFICIENT_POINTS');
  }

  if (sender.id.equals(receiver.id)) {
   throw new DomainError(
    '自分自身にはポイントを転送できません',
    'SELF_TRANSFER_NOT_ALLOWED',
   );
  }

  // 1日の転送制限チェック
  const dailyLimit = this.getDailyTransferLimit(sender.level);
  if (points > dailyLimit) {
   throw new DomainError(
    `1日の転送制限(${dailyLimit}ポイント)を超えています`,
    'DAILY_TRANSFER_LIMIT_EXCEEDED',
   );
  }
 }

 private getRequiredExperienceForNextLevel(currentLevel: number): number {
  return currentLevel * 1000;
 }

 private isUserActive(user: User): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return user.lastLoginAt ? user.lastLoginAt > thirtyDaysAgo : false;
 }

 private hasRecentViolations(user: User): boolean {
  // 実際の実装では違反履歴を確認
  // ここではサンプル実装
  return false;
 }

 private getDailyTransferLimit(level: number): number {
  return Math.min(level * 500, 5000);
 }
}
```

**なぜ許可されるのか：**

- 複数のドメインオブジェクト間の関係性を扱う
- ビジネスルールの実装場所として最適
- 単一のEntityでは表現できない複雑なビジネスロジック

### 4. Repository Interface（リポジトリインターフェース）定義 📚

**データアクセスの抽象化**

```typescript
// ✅ 許可：Repository Interface定義
export interface IUserRepository {
 // 基本CRUD
 findById(id: UserId): Promise<User | null>;
 findByEmail(email: Email): Promise<User | null>;
 save(user: User): Promise<void>;
 delete(id: UserId): Promise<void>;

 // ビジネス固有のクエリ
 findByLevelRange(minLevel: number, maxLevel: number): Promise<User[]>;
 countByLevelRange(minLevel: number, maxLevel: number): Promise<number>;
 findActiveUsers(since: Date): Promise<User[]>;
 findTopUsersByExperience(limit: number): Promise<User[]>;

 // 検索・フィルタリング
 findMany(criteria: UserSearchCriteria): Promise<User[]>;
 count(searchQuery?: string): Promise<number>;

 // トランザクション対応
 save(user: User, transaction?: Transaction): Promise<void>;
 findById(id: UserId, transaction?: Transaction): Promise<User | null>;
}

export interface UserSearchCriteria {
 page?: number;
 limit?: number;
 searchQuery?: string;
 minLevel?: number;
 maxLevel?: number;
 isActive?: boolean;
 sortBy?: 'name' | 'level' | 'createdAt' | 'lastLoginAt';
 sortOrder?: 'asc' | 'desc';
}

// ✅ 許可：複雑なRepository Interface
export interface IOrderRepository {
 findById(id: OrderId): Promise<Order | null>;
 findByUserId(userId: UserId): Promise<Order[]>;
 findRecentByUserId(userId: UserId, limit: number): Promise<Order[]>;
 save(order: Order): Promise<void>;

 // ビジネス分析用クエリ
 findOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
 calculateTotalSalesByPeriod(startDate: Date, endDate: Date): Promise<Money>;
 findTopSellingProducts(limit: number): Promise<ProductSalesData[]>;

 // 複雑な検索
 findOrdersWithCriteria(criteria: OrderSearchCriteria): Promise<Order[]>;
}
```

### 5. Domain Event（ドメインイベント）実装 📢

**ビジネス上重要な出来事の表現**

```typescript
// ✅ 許可：Domain Event実装
export abstract class DomainEvent {
 public readonly occurredAt: Date;
 public readonly eventId: string;

 constructor() {
  this.occurredAt = new Date();
  this.eventId = generateEventId();
 }

 abstract getEventName(): string;
}

export class UserCreatedEvent extends DomainEvent {
 constructor(
  public readonly userId: UserId,
  public readonly email: Email,
  public readonly name: string,
 ) {
  super();
 }

 getEventName(): string {
  return 'UserCreated';
 }
}

export class UserLevelUpEvent extends DomainEvent {
 constructor(
  public readonly userId: UserId,
  public readonly newLevel: number,
  public readonly previousLevel: number,
 ) {
  super();
 }

 getEventName(): string {
  return 'UserLevelUp';
 }
}

export class UserPromotedEvent extends DomainEvent {
 constructor(
  public readonly userId: UserId,
  public readonly newLevel: number,
 ) {
  super();
 }

 getEventName(): string {
  return 'UserPromoted';
 }
}

// ✅ 許可：Domain Event Publisher
export class DomainEvents {
 private static events: DomainEvent[] = [];
 private static handlers: Map<string, ((event: DomainEvent) => void)[]> =
  new Map();

 static raise(event: DomainEvent): void {
  this.events.push(event);
 }

 static register(
  eventName: string,
  handler: (event: DomainEvent) => void,
 ): void {
  if (!this.handlers.has(eventName)) {
   this.handlers.set(eventName, []);
  }
  this.handlers.get(eventName)!.push(handler);
 }

 static async dispatchEvents(): Promise<void> {
  const eventsToDispatch = [...this.events];
  this.events = [];

  for (const event of eventsToDispatch) {
   const eventHandlers = this.handlers.get(event.getEventName()) || [];

   for (const handler of eventHandlers) {
    try {
     await handler(event);
    } catch (error) {
     console.error(`Error handling event ${event.getEventName()}:`, error);
    }
   }
  }
 }

 static clearEvents(): void {
  this.events = [];
 }
}
```

---

## ❌ 書いてはダメなもの（禁止される処理）

### 1. トランザクション管理・フロー制御 🚫

```typescript
// ❌ 禁止：トランザクション管理をDomainに実装
export class User {
 async transferPoints(receiver: User, points: number): Promise<void> {
  // ❌ トランザクション管理はApplication Layerの責務
  const transaction = await this.databaseFactory.beginTransaction();

  try {
   this.subtractPoints(points);
   receiver.addPoints(points);

   await this.userRepository.save(this, transaction);
   await this.userRepository.save(receiver, transaction);

   await transaction.commit();
  } catch (error) {
   await transaction.rollback();
   throw error;
  }
 }
}

// ✅ 正しい実装：ドメインロジックのみ
export class User {
 subtractPoints(points: number): void {
  if (points <= 0) {
   throw new DomainError(
    '減算ポイントは正の値である必要があります',
    'INVALID_POINTS',
   );
  }

  if (this.experiencePoints < points) {
   throw new DomainError('ポイントが不足しています', 'INSUFFICIENT_POINTS');
  }

  this.experiencePoints -= points;
  this.validateInvariants();
 }

 addPoints(points: number): void {
  if (points <= 0) {
   throw new DomainError(
    '追加ポイントは正の値である必要があります',
    'INVALID_POINTS',
   );
  }

  this.experiencePoints += points;
  this.checkLevelUp();
  this.validateInvariants();
 }
}
```

**なぜ禁止なのか：**

- トランザクション管理はApplication Layerの責務
- データベースアクセスはInfrastructure Layerの責務
- Domain Layerは純粋なビジネスロジックに集中すべき

### 2. 外部サービス呼び出し 🌐

```typescript
// ❌ 禁止：外部サービス呼び出し
export class User {
 promote(): void {
  if (!this.canPromote()) {
   throw new DomainError('昇格条件を満たしていません', 'PROMOTION_NOT_ALLOWED');
  }

  this.level += 1;

  // ❌ 外部サービス呼び出しはInfrastructure Layerの責務
  await this.emailService.sendPromotionNotification(this.email);
 }
}

// ✅ 正しい実装：ドメインイベント発行
export class User {
 promote(): void {
  if (!this.canPromote()) {
   throw new DomainError('昇格条件を満たしていません', 'PROMOTION_NOT_ALLOWED');
  }

  const oldLevel = this.level;
  this.level += 1;

  // ドメインイベントで通知（外部サービス呼び出しは行わない）
  DomainEvents.raise(new UserPromotedEvent(this.id, oldLevel, this.level));
 }
}
```

### 3. 表示用フォーマット 🎨

**表示用フォーマットは禁止**

```typescript
// ❌ 禁止：UI関連の処理をDomainに実装
export class User {
 // ❌ 表示用フォーマットはPresentation Layerの責務
 getDisplayName(): string {
  return `${this.name} (Lv.${this.level})`;
 }

 getLevelBadge(): string {
  if (this.level >= 10) return '🏆';
  if (this.level >= 5) return '⭐';
  return '🌱';
 }

 getFormattedCreatedAt(): string {
  return this.createdAt.toLocaleDateString('ja-JP');
 }

 // ❌ UI状態の管理
 isEditable(): boolean {
  return true; // UI固有の判定
 }
}

// ✅ 正しい実装：純粋なビジネスロジックのみ
export class User {
 // ビジネスルール：昇格可能性判定
 canPromote(): boolean {
  return (
   this.experiencePoints >= this.getRequiredExperienceForNextLevel() &&
   this.level < 10 &&
   this.isActive()
  );
 }

 // ビジネスルール：アクティブユーザー判定
 isActive(): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return this.lastLoginAt ? this.lastLoginAt > thirtyDaysAgo : false;
 }
}
```

### 4. フレームワーク固有の実装 🔧

**Next.js・React固有の処理は禁止**

```typescript
// ❌ 禁止：フレームワーク固有の実装をDomainに記述
export class User {
 // ❌ Next.js固有の処理
 async revalidateUserCache(): Promise<void> {
  await revalidatePath(`/users/${this.id}`);
 }

 // ❌ React固有の処理
 toReactProps(): UserProps {
  return {
   id: this.id,
   name: this.name,
   level: this.level,
   onEdit: () => {},
   onDelete: () => {},
  };
 }

 // ❌ HTTP関連の処理
 toApiResponse(): ApiResponse<UserData> {
  return {
   success: true,
   data: {
    id: this.id,
    name: this.name,
    level: this.level,
   },
  };
 }
}

// ✅ 正しい実装：フレームワークに依存しないピュアなドメインロジック
export class User {
 // ビジネスルール：経験値追加
 addExperiencePoints(points: number): void {
  if (points <= 0) {
   throw new DomainError(
    '経験値は正の値である必要があります',
    'INVALID_EXPERIENCE_POINTS',
   );
  }

  this.experiencePoints += points;
  this.checkLevelUp();
  this.validateInvariants();
 }

 // ビジネスルール：レベルアップ判定
 private checkLevelUp(): void {
  const requiredExp = this.getRequiredExperienceForNextLevel();
  if (this.experiencePoints >= requiredExp && this.level < 10) {
   this.level += 1;
   DomainEvents.raise(
    new UserLevelUpEvent(this.id, this.level, this.level - 1),
   );
  }
 }
}
```

---

## 🎯 実装パターン・ベストプラクティス

### Entity設計パターン

**1. 不変条件の保証**

```typescript
// ✅ 適切な不変条件の実装
export class Order {
 private constructor(
  private readonly id: OrderId,
  private readonly userId: UserId,
  private items: OrderItem[],
  private status: OrderStatus,
  private readonly createdAt: Date,
 ) {
  this.validateInvariants();
 }

 addItem(product: Product, quantity: number): void {
  if (this.status !== OrderStatus.DRAFT) {
   throw new DomainError(
    '確定済みの注文には商品を追加できません',
    'ORDER_NOT_EDITABLE',
   );
  }

  const existingItem = this.items.find((item) =>
   item.productId.equals(product.id),
  );

  if (existingItem) {
   existingItem.increaseQuantity(quantity);
  } else {
   this.items.push(
    new OrderItem(product.id, quantity, product.price),
   );
  }

  this.validateInvariants();
 }

 confirm(): void {
  if (this.items.length === 0) {
   throw new DomainError('商品が選択されていません', 'NO_ITEMS_IN_ORDER');
  }

  if (this.status !== OrderStatus.DRAFT) {
   throw new DomainError('既に確定済みの注文です', 'ORDER_ALREADY_CONFIRMED');
  }

  this.status = OrderStatus.CONFIRMED;
  DomainEvents.raise(new OrderConfirmedEvent(this.id, this.userId));
 }

 private validateInvariants(): void {
  if (this.items.length > 100) {
   throw new DomainError('注文商品数は100個までです', 'TOO_MANY_ITEMS');
  }

  const totalAmount = this.calculateTotalAmount();
  if (totalAmount.isGreaterThan(new Money(1000000))) {
   throw new DomainError(
    '注文金額が上限を超えています',
    'ORDER_AMOUNT_EXCEEDED',
   );
  }
 }
}
```

**2. ファクトリーパターンの活用**

```typescript
// ✅ 適切なファクトリーパターン
export class UserFactory {
 static createNewUser(
  email: Email,
  name: string,
  registrationSource: RegistrationSource,
 ): User {
  const userId = new UserId(generateUserId());

  // 登録元による初期設定の違い
  let initialExperience = 0;
  if (registrationSource === RegistrationSource.REFERRAL) {
   initialExperience = 100; // 紹介登録ボーナス
  }

  const user = User.create(userId, email, name);

  if (initialExperience > 0) {
   user.addExperiencePoints(initialExperience);
  }

  // ドメインイベント発行
  DomainEvents.raise(new UserCreatedEvent(userId, email, name));

  return user;
 }

 static createTestUser(overrides: Partial<UserData> = {}): User {
  const defaultData = {
   id: new UserId('test-user-id'),
   email: new Email('test@example.com'),
   name: 'テストユーザー',
   experiencePoints: 0,
   level: 1,
  };

  const userData = { ...defaultData, ...overrides };

  return new User(
   userData.id,
   userData.email,
   userData.name,
   userData.experiencePoints,
   userData.level,
   new Date(),
  );
 }
}
```

### Value Object設計パターン

**1. 複雑なバリデーション**

```typescript
// ✅ 複雑なValue Objectの実装
export class PhoneNumber {
 private readonly value: string;
 private readonly countryCode: string;

 constructor(phoneNumber: string, countryCode: string = 'JP') {
  this.countryCode = countryCode.toUpperCase();
  this.value = this.normalizePhoneNumber(phoneNumber);
  this.validatePhoneNumber();
 }

 toString(): string {
  return this.value;
 }

 toInternationalFormat(): string {
  switch (this.countryCode) {
   case 'JP':
    return `+81-${this.value.substring(1)}`;
   case 'US':
    return `+1-${this.value}`;
   default:
    return this.value;
  }
 }

 equals(other: PhoneNumber): boolean {
  return this.value === other.value && this.countryCode === other.countryCode;
 }

 private normalizePhoneNumber(phoneNumber: string): string {
  // ハイフン、スペース、括弧を除去
  return phoneNumber.replace(/[-\s()]/g, '');
 }

 private validatePhoneNumber(): void {
  if (!this.value) {
   throw new DomainError('電話番号は必須です', 'PHONE_NUMBER_REQUIRED');
  }

  switch (this.countryCode) {
   case 'JP':
    this.validateJapanesePhoneNumber();
    break;
   case 'US':
    this.validateUSPhoneNumber();
    break;
   default:
    throw new DomainError(
     'サポートされていない国コードです',
     'UNSUPPORTED_COUNTRY_CODE',
    );
  }
 }

 private validateJapanesePhoneNumber(): void {
  const mobileRegex = /^0[789]0\d{8}$/;
  const landlineRegex = /^0\d{9,10}$/;

  if (!mobileRegex.test(this.value) && !landlineRegex.test(this.value)) {
   throw new DomainError(
    '日本の電話番号形式が正しくありません',
    'INVALID_JP_PHONE_FORMAT',
   );
  }
 }

 private validateUSPhoneNumber(): void {
  const usPhoneRegex = /^\d{10}$/;

  if (!usPhoneRegex.test(this.value)) {
   throw new DomainError(
    'アメリカの電話番号形式が正しくありません',
    'INVALID_US_PHONE_FORMAT',
   );
  }
 }
}
```

---

## 🧪 テスト戦略

### Domain Objectのテスト

```typescript
// ✅ 適切なDomain Objectテスト
describe('User', () => {
 describe('addExperiencePoints', () => {
  it('正常な経験値追加ができる', () => {
   // Arrange
   const user = UserFactory.createTestUser({ experiencePoints: 100 });

   // Act
   user.addExperiencePoints(50);

   // Assert（public readonly プロパティを直接アクセス）
   expect(user.experiencePoints).toBe(150);
  });

  it('負の経験値を追加しようとするとエラーが発生する', () => {
   // Arrange
   const user = UserFactory.createTestUser();

   // Act & Assert
   expect(() => user.addExperiencePoints(-10)).toThrow(
    new DomainError(
     '経験値は正の値である必要があります',
     'INVALID_EXPERIENCE_POINTS',
    ),
   );
  });

  it('経験値追加でレベルアップする', () => {
   // Arrange
   const user = UserFactory.createTestUser({
    experiencePoints: 950,
    level: 1,
   });

   // Act
   user.addExperiencePoints(100);

   // Assert
   expect(user.level).toBe(2);
   expect(user.experiencePoints).toBe(1050);
  });
 });

 describe('promote', () => {
  it('昇格条件を満たしている場合は昇格できる', () => {
   // Arrange
   const user = UserFactory.createTestUser({
    experiencePoints: 2000,
    level: 2,
   });
   user.recordLogin(); // アクティブ状態にする

   // Act
   user.promote();

   // Assert
   expect(user.level).toBe(3);
  });

  it('昇格条件を満たしていない場合はエラーが発生する', () => {
   // Arrange
   const user = UserFactory.createTestUser({
    experiencePoints: 500,
    level: 2,
   });

   // Act & Assert
   expect(() => user.promote()).toThrow(
    new DomainError('昇格条件を満たしていません', 'PROMOTION_NOT_ALLOWED'),
   );
  });
 });
});
```

---

## 🎯 まとめ

### Domain Layer の原則

1. **ビジネスルールに集中** - 企業・業界固有のルールの実装
2. **フレームワーク非依存** - 純粋なTypeScriptで実装
3. **不変条件の保証** - データの整合性・妥当性の確保
4. **テスタビリティ** - 単体テストが容易な設計
5. **ドメインエキスパートとの対話** - 業務専門家が理解できるコード

### 判断基準

```mermaid
graph TD
    A[実装したい処理] --> B{ビジネスルール？}
    B -->|Yes| C{単一オブジェクト？}
    B -->|No| D[他のレイヤーに移動]

    C -->|Yes| E[Entity/Value Objectに実装]
    C -->|No| F[Domain Serviceに実装]

    style E fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style F fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
```

### Domain Layer設計のチェックリスト

- [ ] ビジネスルールが適切に表現されているか？
- [ ] 不変条件が保証されているか？
- [ ] フレームワークに依存していないか？
- [ ] ドメインエキスパートが理解できるか？
- [ ] 単体テストが書きやすいか？
- [ ] 適切にドメインイベントを発行しているか？

---

## 関連ドキュメント 📚

### レイヤー間連携

- [Application Layer ガイド](./application-layer.md) - Use Case実装の詳細
- [Infrastructure Layer ガイド](./infrastructure-layer.md) - Repository実装の詳細

### 詳細実装ガイド

- [Entities](./components/entities.md) - Entityの詳細実装パターン
- [Value Objects](./components/value-objects.md) - Value Objectの詳細実装パターン
- [Repository Interfaces](./components/repository-interfaces.md) - Repository Interfaceの詳細設計

### 概念・理論

- [ドメイン駆動設計](../concepts/domain-driven-design.md) - DDD概念の詳細
