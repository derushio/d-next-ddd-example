# Layer Decision Tree

機能内容・コード性質から、適切なアーキテクチャレイヤーを判定する詳細フローチャート。

---

## 🎯 概要

このドキュメントは、以下の判定を支援します：

1. **機能内容 → レイヤー配置**
2. **コード性質 → レイヤー分類**
3. **依存関係 → 許可/禁止判定**

---

## 📊 レイヤー判定フローチャート（詳細版）

```
実装したいコード/機能
        ↓
┌──────────────────────────────────────────────┐
│ 質問1: このコードは何に依存しているか？      │
└──────────────────────────────────────────────┘
        ↓
    ┌───┴───┐
    │       │
外部技術？  純粋ロジック？
(DB/API)   (計算/検証)
    │       │
    ↓       ↓
┌─────────┐ ┌─────────────────────┐
│Infrastructure│ │質問2: これはビジネス│
│          │ │ルールか？           │
└─────────┘ └─────────────────────┘
                ↓
            ┌───┴───┐
            │       │
         YES       NO
            │       │
            ↓       ↓
    ┌─────────┐ ┌─────────────┐
    │ Domain  │ │質問3: 複数の│
    │         │ │ドメインを調整│
    └─────────┘ │するか?      │
                └─────────────┘
                    ↓
                ┌───┴───┐
                │       │
             YES       NO
                │       │
                ↓       ↓
        ┌─────────────┐ ┌───────────┐
        │Application  │ │質問4: UIと│
        │             │ │連携するか?│
        └─────────────┘ └───────────┘
                            ↓
                        ┌───┴───┐
                        │       │
                     YES       NO
                        │       │
                        ↓       ↓
                ┌──────────────┐ ┌─────────┐
                │Presentation  │ │Frontend │
                │              │ │         │
                └──────────────┘ └─────────┘
```

---

## 🔍 詳細判定ルール

### Domain層判定

**以下の特徴に該当する場合、Domain層に配置**:

```
✅ Domain層に配置すべきコード:
- [ ] ビジネスルールを表現している
- [ ] フレームワークに依存していない（純粋TypeScript）
- [ ] DBやAPIなどの外部技術に依存していない
- [ ] 他のドメインオブジェクトに依存しない（単一責任）
- [ ] 不変条件・制約を持つ
- [ ] ビジネス用語で表現できる

❌ Domain層に配置すべきでないコード:
- [ ] データベース操作を含む
- [ ] 外部APIを呼び出す
- [ ] UIフレームワークに依存する
- [ ] 複数のドメインオブジェクトを調整する
- [ ] インフラストラクチャに依存する
```

**具体例**:

| コード例 | 判定 | 理由 |
|---------|------|------|
| `Email`クラス（メールアドレス形式検証） | ✅ Domain | 純粋なビジネスルール、外部依存なし |
| `User`エンティティ（名前変更メソッド） | ✅ Domain | ビジネスロジック、フレームワーク非依存 |
| `IUserRepository`インターフェース | ✅ Domain | 抽象化、具体実装なし |
| `calculateDiscount()`（割引計算） | ✅ Domain | ビジネスルール、純粋関数 |
| `PrismaUserRepository` | ❌ Infrastructure | Prismaに依存（外部技術） |
| `CreateUserUseCase` | ❌ Application | 複数オブジェクトの調整 |

---

### Application層判定

**以下の特徴に該当する場合、Application層に配置**:

```
✅ Application層に配置すべきコード:
- [ ] 複数のドメインオブジェクトを調整する
- [ ] ビジネスフローを制御する
- [ ] トランザクション境界を定義する
- [ ] Repositoryを使用してデータを取得/保存
- [ ] ドメインロジックを呼び出す
- [ ] Result型でエラーハンドリング

❌ Application層に配置すべきでないコード:
- [ ] ビジネスルール自体を実装する（Domain層）
- [ ] DBの具体的な操作を実装する（Infrastructure層）
- [ ] UIコンポーネントを含む（Frontend層）
- [ ] FormData処理を含む（Presentation層）
```

**具体例**:

| コード例 | 判定 | 理由 |
|---------|------|------|
| `CreateUserUseCase` | ✅ Application | User作成フロー制御 |
| `GetUserProfileUseCase` | ✅ Application | データ取得・変換フロー |
| `TransferMoneyUseCase` | ✅ Application | 複数エンティティ（送金元・先）の調整 |
| `UserDTO` | ✅ Application | レイヤー間データ転送 |
| `Email`検証ロジック | ❌ Domain | ビジネスルール（Domain Value Object） |
| Prisma クエリ | ❌ Infrastructure | 技術的実装 |
| Server Action | ❌ Presentation | UI連携層 |

---

### Infrastructure層判定

**以下の特徴に該当する場合、Infrastructure層に配置**:

```
✅ Infrastructure層に配置すべきコード:
- [ ] Repository Interface の具体実装
- [ ] データベース操作（Prisma等）
- [ ] 外部API連携
- [ ] ファイルI/O
- [ ] メール送信
- [ ] 認証・暗号化の技術的実装
- [ ] DI登録設定

❌ Infrastructure層に配置すべきでないコード:
- [ ] ビジネスルールを実装する（Domain層）
- [ ] ビジネスフローを制御する（Application層）
- [ ] UIコンポーネント（Frontend層）
- [ ] Server Actions（Presentation層）
```

**具体例**:

| コード例 | 判定 | 理由 |
|---------|------|------|
| `PrismaUserRepository` | ✅ Infrastructure | Repository実装、Prisma使用 |
| `StripePaymentService` | ✅ Infrastructure | 外部API連携 |
| `BcryptHashService` | ✅ Infrastructure | 暗号化技術実装 |
| `S3FileStorageService` | ✅ Infrastructure | ファイルストレージ |
| `JWTAuthenticationService` | ✅ Infrastructure | JWT技術実装 |
| `IUserRepository` | ❌ Domain | 抽象化（Interface） |
| `CreateUserUseCase` | ❌ Application | ビジネスフロー |

---

### Presentation層判定

**以下の特徴に該当する場合、Presentation層に配置**:

```
✅ Presentation層に配置すべきコード:
- [ ] Server Actions
- [ ] FormData処理
- [ ] UseCase呼び出し
- [ ] リダイレクト
- [ ] Cookie操作
- [ ] セッション管理（表層）
- [ ] バリデーション（入力形式のみ）

❌ Presentation層に配置すべきでないコード:
- [ ] ビジネスルール（Domain層）
- [ ] ビジネスフロー（Application層）
- [ ] DB操作（Infrastructure層）
- [ ] UIコンポーネント（Frontend層）
```

**具体例**:

| コード例 | 判定 | 理由 |
|---------|------|------|
| `createUserAction` | ✅ Presentation | Server Action、FormData処理 |
| `signInAction` | ✅ Presentation | 認証フロー、Cookieセット |
| `updateProfileAction` | ✅ Presentation | フォーム処理、UseCase呼出 |
| FormDataバリデーション | ✅ Presentation | 入力形式検証 |
| リダイレクト処理 | ✅ Presentation | UI制御 |
| `CreateUserUseCase` | ❌ Application | ビジネスフロー |
| `<SignUpForm />` | ❌ Frontend | UIコンポーネント |

---

### Frontend層判定

**以下の特徴に該当する場合、Frontend層に配置**:

```
✅ Frontend層に配置すべきコード:
- [ ] React Component
- [ ] UI表示ロジック
- [ ] ユーザー入力処理
- [ ] useState/useContext
- [ ] カスタムフック
- [ ] CSS/TailwindCSS
- [ ] イベントハンドラ

❌ Frontend層に配置すべきでないコード:
- [ ] ビジネスルール（Domain層）
- [ ] ビジネスフロー（Application層）
- [ ] DB操作（Infrastructure層）
- [ ] FormData処理（Presentation層）
```

**具体例**:

| コード例 | 判定 | 理由 |
|---------|------|------|
| `<SignUpForm />` | ✅ Frontend | React Component |
| `<UserList />` | ✅ Frontend | 表示ロジック |
| `useUser()` カスタムフック | ✅ Frontend | 状態管理 |
| `Button` コンポーネント | ✅ Frontend | UI要素 |
| TailwindCSS クラス | ✅ Frontend | スタイリング |
| `createUserAction` 呼び出し | ✅ Frontend | Server Action呼び出しのみ |
| `CreateUserUseCase` | ❌ Application | ビジネスフロー |
| FormData構築 | ✅ Frontend | クライアント側処理 |

---

## 🔗 依存関係判定

### 依存方向ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                         (依存性逆転の原則)
```

### 許可されているimport

| From Layer | To Layer | 許可？ | 理由 |
|-----------|----------|-------|------|
| Presentation | Application | ✅ YES | UseCase呼び出しのため |
| Presentation | Domain | ✅ YES | DTO・Entity使用のため |
| Presentation | Infrastructure | ❌ NO | 具体実装に依存してはならない |
| Application | Domain | ✅ YES | ビジネスルール使用のため |
| Application | Infrastructure | ❌ NO | 具体実装に依存してはならない |
| Infrastructure | Domain | ✅ YES | Interface実装のため |
| Infrastructure | Application | ❌ NO | 上位レイヤーへの依存禁止 |
| Domain | Application | ❌ NO | 下位レイヤーは上位に依存しない |
| Domain | Infrastructure | ❌ NO | 外部技術への依存禁止 |
| Domain | Presentation | ❌ NO | UI層への依存禁止 |

### 依存関係チェックリスト

```
✅ 許可されているimport:
- Presentation → Application (UseCase)
- Presentation → Domain (Entity, DTO)
- Application → Domain (Entity, Value Object, Repository Interface)
- Infrastructure → Domain (Interface実装)
- Frontend → Presentation (Server Action呼び出し)

❌ 禁止されているimport:
- Domain → Application
- Domain → Infrastructure
- Domain → Presentation
- Application → Infrastructure
- Application → Presentation
- Infrastructure → Application
- Infrastructure → Presentation
```

---

## 🎲 実践的判定例

### ケーススタディ1: ユーザー登録機能

**要件**: メールアドレス、名前、パスワードでユーザー登録

**判定プロセス**:

```
1. Email検証ロジック
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → YES
   → Domain層 (Email Value Object)

2. User エンティティ
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → YES
   → Domain層 (User Entity)

3. IUserRepository
   質問1: 外部技術に依存？ → NO（抽象化）
   質問2: ビジネスルール？ → NO（永続化の抽象）
   → Domain層 (Repository Interface)

4. PrismaUserRepository
   質問1: 外部技術に依存？ → YES（Prisma）
   → Infrastructure層 (Repository実装)

5. CreateUserUseCase
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → YES
   → Application層 (UseCase)

6. createUserAction
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → NO
   質問4: UIと連携？ → YES
   → Presentation層 (Server Action)

7. <SignUpForm />
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → NO
   質問4: UIと連携？ → YES（UI自体）
   → Frontend層 (React Component)
```

**結果**:

```
src/layers/domain/
  ├── entities/User.ts
  ├── value-objects/Email.ts
  └── repositories/IUserRepository.ts

src/layers/application/
  └── usecases/user/CreateUserUseCase.ts

src/layers/infrastructure/
  └── persistence/prisma/PrismaUserRepository.ts

src/layers/presentation/
  └── actions/user/createUserAction.ts

src/components/features/auth/
  └── SignUpForm.tsx
```

---

### ケーススタディ2: 商品割引計算

**要件**: 会員ランクに応じて商品価格から割引を計算

**判定プロセス**:

```
1. 割引率計算ロジック
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → YES
   → Domain層 (Product Entity メソッド or DiscountService)

2. 会員ランクの定義
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → YES
   → Domain層 (MemberRank Value Object)

3. 割引適用後の価格を取得するUseCase
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → YES（Product + MemberRank）
   → Application層 (CalculateDiscountedPriceUseCase)
```

**結果**:

```
src/layers/domain/
  ├── entities/Product.ts         # calculateDiscount(memberRank)
  ├── value-objects/MemberRank.ts # 会員ランク定義
  └── value-objects/Price.ts      # 価格Value Object

src/layers/application/
  └── usecases/product/CalculateDiscountedPriceUseCase.ts
```

---

### ケーススタディ3: メール送信機能

**要件**: ユーザー登録時にウェルカムメールを送信

**判定プロセス**:

```
1. メール送信の抽象化
   質問1: 外部技術に依存？ → NO（抽象化）
   → Domain層 (IEmailService Interface)

2. メール送信の具体実装（SendGrid等）
   質問1: 外部技術に依存？ → YES（SendGrid API）
   → Infrastructure層 (SendGridEmailService)

3. ウェルカムメール送信のUseCase
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → YES（User + EmailService）
   → Application層 (SendWelcomeEmailUseCase)

4. メール送信をトリガーするServer Action
   質問1: 外部技術に依存？ → NO
   質問2: ビジネスルール？ → NO
   質問3: 複数ドメインを調整？ → NO
   質問4: UIと連携？ → YES
   → Presentation層 (triggerWelcomeEmailAction)
```

**結果**:

```
src/layers/domain/
  └── services/IEmailService.ts

src/layers/application/
  └── usecases/email/SendWelcomeEmailUseCase.ts

src/layers/infrastructure/
  └── external/sendgrid/SendGridEmailService.ts

src/layers/presentation/
  └── actions/email/triggerWelcomeEmailAction.ts
```

---

## 🚨 よくある間違い

### ❌ 間違い1: Repository実装をDomain層に配置

```typescript
// ❌ 悪い例: Domain層でPrismaに依存
// src/layers/domain/repositories/UserRepository.ts
import { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {} // Domain層で外部技術に依存！
}
```

**正しい配置**:

```typescript
// ✅ Domain層: 抽象化のみ
// src/layers/domain/repositories/IUserRepository.ts
export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
}

// ✅ Infrastructure層: 具体実装
// src/layers/infrastructure/persistence/prisma/PrismaUserRepository.ts
import { PrismaClient } from '@prisma/client';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}
}
```

---

### ❌ 間違い2: UseCase内にビジネスルールを直接記述

```typescript
// ❌ 悪い例: UseCase内でビジネスルールを実装
export class CreateUserUseCase {
  async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    // ビジネスルール（メールアドレス検証）をUseCase内に記述
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      return failure('Invalid email', 'EMAIL_INVALID');
    }
    // ...
  }
}
```

**正しい実装**:

```typescript
// ✅ Domain層: ビジネスルール
// src/layers/domain/value-objects/Email.ts
export class Email {
  private constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new DomainError('Invalid email format', 'EMAIL_INVALID_FORMAT');
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// ✅ Application層: ビジネスフロー
// src/layers/application/usecases/user/CreateUserUseCase.ts
export class CreateUserUseCase {
  async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    try {
      const email = new Email(request.email); // Domain層のルールを使用
      // ...
    } catch (error) {
      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }
      // ...
    }
  }
}
```

---

### ❌ 間違い3: Server ActionでビジネスフローをResult型なしで実装

```typescript
// ❌ 悪い例: Server Action内でビジネスフローを実装
'use server';

export async function createUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // ビジネスフロー（UseCase相当）をServer Action内に記述
  const user = await prisma.user.create({
    data: { email, password },
  });

  return user; // Result型を使用していない
}
```

**正しい実装**:

```typescript
// ✅ Application層: UseCase（Result型使用）
export class CreateUserUseCase {
  async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    // ビジネスフロー実装
    // ...
    return success(response);
  }
}

// ✅ Presentation層: Server Action（UseCaseを呼び出すのみ）
'use server';

export async function createUserAction(formData: FormData): Promise<Result<void>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const useCase = resolve('CreateUserUseCase');
  const result = await useCase.execute({ email, password });

  if (isFailure(result)) {
    return failure(result.error.message, result.error.code);
  }

  redirect('/dashboard');
}
```

---

## 🔗 関連リソース

- **[SKILL.md](../SKILL.md)** - skill-navigator メインドキュメント
- **[Skill Catalog](./skill-catalog.md)** - 全スキル一覧
- **[Clean Architecture](_DOCS/guides/ddd/concepts/clean-architecture.md)** - アーキテクチャ原則
- **[DDD Concepts](_DOCS/guides/ddd/concepts/domain-driven-design.md)** - DDD基礎
- **[Layer Overview](_DOCS/architecture/layers/overview.md)** - レイヤー全体像

---

**🧭 適切なレイヤー配置で、保守性の高いアーキテクチャを実現しましょう！**
