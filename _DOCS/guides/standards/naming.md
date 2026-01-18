# 命名規則 📝

Clean Architecture + DDD プロジェクトにおける統一的な命名規約

---

## 📖 このドキュメントについて

### 🎯 目的

- **一貫性確保**: プロジェクト全体での統一された命名
- **可読性向上**: 名前から役割・責務が即座に理解可能
- **メンテナンス性**: 予測しやすい命名によるコードナビゲーション効率化

### 🔗 関連ドキュメント

- **[コーディング規約](coding.md)** - 全体的なコーディング標準
- **[プロジェクト構造](project-structure.md)** - ディレクトリ・ファイル構成
- **[アーキテクチャ概要](../../architecture/overview.md)** - システム全体設計

---

## 📁 ファイル命名規則

### ソースファイル

| 種類 | 命名規則 | 例 |
|------|----------|-----|
| **Entity** | `{Name}.ts` (PascalCase) | `User.ts`, `Order.ts` |
| **Value Object** | `{Name}.ts` (PascalCase) | `Email.ts`, `Money.ts` |
| **EntityId** | `{EntityName}Id.ts` | `UserId.ts`, `OrderId.ts` |
| **UseCase** | `{Action}{Entity}UseCase.ts` | `CreateUserUseCase.ts` |
| **Repository Interface** | `I{Entity}Repository.ts` | `IUserRepository.ts` |
| **Repository Implementation** | `Prisma{Entity}Repository.ts` | `PrismaUserRepository.ts` |
| **Server Action** | `{action}.ts` (camelCase) | `createUser.ts`, `signIn.ts` |
| **Domain Service** | `{Entity}DomainService.ts` | `UserDomainService.ts` |

### コンポーネントファイル

| 種類 | 命名規則 | 例 |
|------|----------|-----|
| **Page Component** | `{Name}Page.tsx` | `UserProfilePage.tsx` |
| **Client Component** | `{Name}Client.tsx` | `UserFormClient.tsx` |
| **Server Component** | `{Name}.tsx` | `UserList.tsx` |
| **Form Component** | `{Name}Form.tsx` | `CreateUserForm.tsx` |
| **Layout** | `{Name}Layout.tsx` | `DashboardLayout.tsx` |

### テストファイル

| 種類 | 命名規則 | 例 |
|------|----------|-----|
| **Unit Test** | `{TargetFile}.test.ts(x)` | `CreateUserUseCase.test.ts` |
| **E2E Test** | `{feature}.spec.ts` | `user-registration.spec.ts` |

---

## 🏷️ 変数・関数命名規則

### 変数

```typescript
// ✅ 推奨: camelCase
const userId = 'user-123';
const userRepository = new PrismaUserRepository();
const isEmailValid = email.validate();

// ❌ 禁止
const user_id = 'user-123';  // snake_case
const UserID = 'user-123';   // PascalCase
```

### 定数

```typescript
// ✅ 推奨: UPPER_SNAKE_CASE（グローバル定数）
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_PAGE_SIZE = 20;

// ✅ 環境変数は例外的にそのまま使用
process.env.DATABASE_URL;
```

### 関数・メソッド

```typescript
// ✅ 推奨: camelCase + 動詞から始める
async function createUser(data: CreateUserRequest): Promise<User> { }
async function findUserById(id: UserId): Promise<User | null> { }
function validateEmail(email: string): boolean { }
function calculateTotalPrice(items: CartItem[]): Money { }

// ❌ 禁止
function UserCreate() { }  // 名詞から始まる
function create_user() { } // snake_case
```

### ブール値

```typescript
// ✅ 推奨: is/has/can/should で始める
const isActive = true;
const hasPermission = checkPermission(user);
const canEdit = user.hasRole('editor');
const shouldRefresh = cache.isExpired();

// ❌ 禁止
const active = true;     // 曖昧
const permission = true; // 曖昧
```

---

## 🏗️ クラス・インターフェース命名規則

### クラス

```typescript
// ✅ 推奨: PascalCase + 責務を表すサフィックス
class User { }                      // Entity
class UserId { }                    // Value Object (EntityId)
class Email { }                     // Value Object
class CreateUserUseCase { }         // UseCase
class PrismaUserRepository { }      // Repository実装
class UserDomainService { }         // Domain Service
class AuthenticationService { }     // Application Service

// ❌ 禁止
class userData { }    // camelCase
class user_entity { } // snake_case
class UserClass { }   // 冗長なサフィックス
```

### インターフェース

```typescript
// ✅ 推奨: I prefix + PascalCase
interface IUserRepository { }
interface IHashService { }
interface ILogger { }

// ✅ DTOは接尾辞で表現
interface CreateUserRequest { }
interface CreateUserResponse { }
interface UserDTO { }

// ❌ 禁止
interface UserRepositoryInterface { } // 冗長
interface userRepository { }          // camelCase
```

### 型エイリアス

```typescript
// ✅ 推奨: PascalCase
type UserId = string;
type CreateUserInput = {
  name: string;
  email: string;
};
type UserRole = 'admin' | 'user' | 'guest';

// ❌ 禁止
type userId = string;      // camelCase
type USER_ROLE = string;   // UPPER_SNAKE_CASE
```

---

## 💉 DI関連命名規則

### Token定義

```typescript
// ✅ 推奨: UPPER_SNAKE_CASE
export const INJECTION_TOKENS = {
  // Repository
  UserRepository: Symbol.for('IUserRepository'),
  OrderRepository: Symbol.for('IOrderRepository'),

  // UseCase
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
  GetUserUseCase: Symbol.for('GetUserUseCase'),

  // Service
  HashService: Symbol.for('IHashService'),
  Logger: Symbol.for('ILogger'),
} as const;
```

### TypeMap定義

```typescript
// ✅ Token名とTypeMapキーを一致させる
interface ServiceTypeMap {
  UserRepository: IUserRepository;
  OrderRepository: IOrderRepository;
  CreateUserUseCase: CreateUserUseCase;
  HashService: IHashService;
}
```

---

## 🗄️ データベース関連命名規則

### Prismaモデル

```prisma
// ✅ 推奨: PascalCase（単数形）
model User {
  id        String   @id
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // リレーション
  orders    Order[]
  profile   UserProfile?
}

// ✅ フィールド: camelCase
model Order {
  id          String   @id
  userId      String
  totalAmount Int
  orderStatus String
  orderedAt   DateTime @default(now())
}
```

---

## 🎨 CSS・スタイル命名規則

### TailwindCSS

```typescript
// ✅ 推奨: 標準のTailwindクラス使用
className="bg-primary text-white hover:bg-primary-hover"

// ✅ CSS変数使用
className="bg-[var(--primary)] text-[var(--text-inverse)]"

// ❌ 禁止: カスタムクラス名の乱用
className="custom-button-style"
```

---

## 📝 命名の一般原則

### 1. 明確性優先

```typescript
// ✅ 明確
const userRepository = new PrismaUserRepository();
const emailValidationResult = validateEmail(input.email);

// ❌ 曖昧
const repo = new PrismaUserRepository();
const result = validateEmail(input.email);
```

### 2. 一貫性維持

```typescript
// ✅ プロジェクト全体で統一
findById()   // 全Repositoryで共通
findByEmail() // 全Repositoryで共通
save()        // 全Repositoryで共通

// ❌ 不統一
getUserById()  // ある場所では
findById()     // 別の場所では
```

### 3. ドメイン言語使用

```typescript
// ✅ ドメイン言語を反映
class Order { }
class CartItem { }
function checkout() { }

// ❌ 技術的すぎる表現
class OrderDataObject { }
class CartItemEntity { }
function processOrderTransaction() { }
```

### 4. 適切な長さ

```typescript
// ✅ 適切（役割が明確かつ簡潔）
const userId = 'user-123';
const userRepository = new PrismaUserRepository();

// ❌ 短すぎ
const u = 'user-123';
const ur = new PrismaUserRepository();

// ❌ 長すぎ
const uniqueUserIdentifierString = 'user-123';
const prismaBasedUserDataAccessRepository = new PrismaUserRepository();
```

---

## ✅ 命名チェックリスト

- [ ] ファイル名は役割が一目でわかるか
- [ ] 変数・関数名は意図が明確か
- [ ] クラス名は責務を表しているか
- [ ] プロジェクト内で一貫しているか
- [ ] ドメイン言語を適切に使用しているか
- [ ] 略語を避け、明確な名前を使用しているか

---

**📝 良い命名は最高のドキュメントです。名前から意図が読み取れるコードを目指しましょう！**
