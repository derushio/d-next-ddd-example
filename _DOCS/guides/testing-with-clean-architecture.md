# クリーンアーキテクチャでのテスト戦略 🧪

このドキュメントでは、クリーンアーキテクチャを採用したプロジェクトでのテスト戦略と実装パターンについて詳しく説明します。

---

## 概要 📐

### テストフレームワーク構成

本プロジェクトでは以下のテストフレームワークを使用しています：

- **Unit Tests**: **Vitest** でDomain/UseCase/Utilityをテスト
- **Component Tests**: **React Testing Library** でPresentationレイヤーをテスト
- **E2E Tests**: **Playwright** でユーザーシナリオをテスト

### テスト戦略の原則

```mermaid
graph TD
    A[高速実行] --> B[決定論的]
    B --> C[独立性]
    C --> D[可読性]
    D --> A

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style B fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style C fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style D fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
```

1. **高速実行** - テストは数秒で完了する
2. **決定論的** - 同じ入力に対して常に同じ結果
3. **独立性** - テスト間で状態を共有しない
4. **可読性** - AAA（Arrange-Act-Assert）パターンを徹底

---

## 1. Unit Tests（ユニットテスト）🔬

### 1.1 基本的なUseCaseテスト

```typescript
import { container } from '@/di/container';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';

import { beforeEach, describe, expect, it } from 'vitest';

import {
 createTestUser,
 expectMockCalledWith,
 expectMockNotCalled,
 setupMockReturnValues,
 setupTestEnvironment,
} from '../../utils/helpers/testHelpers';
import {
 createMockLogger,
 createMockUserDomainService,
 createMockUserRepository,
} from '../../utils/mocks/commonMocks';

describe('CreateUserUseCase', () => {
 let createUserUseCase: CreateUserUseCase;
 let mockUserRepository: ReturnType<typeof createMockUserRepository>;
 let mockUserDomainService: ReturnType<typeof createMockUserDomainService>;
 let mockLogger: ReturnType<typeof createMockLogger>;

 // テスト環境の自動セットアップ
 setupTestEnvironment();

 beforeEach(() => {
  // モックの作成
  mockUserRepository = createMockUserRepository();
  mockUserDomainService = createMockUserDomainService();
  mockLogger = createMockLogger();

  // DIコンテナにモックを登録
  container.registerInstance(
   INJECTION_TOKENS.UserRepository,
   mockUserRepository,
  );
  container.registerInstance(
   INJECTION_TOKENS.UserDomainService,
   mockUserDomainService,
  );
  container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

  // UseCaseインスタンスをDIコンテナから取得（型安全）
  createUserUseCase = resolve('CreateUserUseCase');
 });

 describe('execute', () => {
  const validInput = {
   name: 'John Doe',
   email: 'john@example.com',
   password: 'password123',
  };

  it('should successfully create a user', async () => {
   // Arrange
   const hashedPassword = 'hashed_password';
   const createdUser = createTestUser({
    name: validInput.name,
    email: validInput.email,
    passwordHash: hashedPassword,
   });

   setupMockReturnValues(mockUserDomainService, {
    validateUserData: null,
    hashPassword: hashedPassword,
   });
   setupMockReturnValues(mockUserRepository, {
    findByEmail: null,
    create: createdUser,
   });

   // Act
   const result = await createUserUseCase.execute(validInput);

   // Assert
   expect(result).toEqual({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
   });

   // モック呼び出しの確認
   expectMockCalledWith(mockUserDomainService.validateUserData, [validInput]);
   expectMockCalledWith(mockUserRepository.findByEmail, [validInput.email]);
   expectMockCalledWith(mockUserDomainService.hashPassword, [
    validInput.password,
   ]);
   expectMockCalledWith(mockUserRepository.create, [
    {
     name: validInput.name,
     email: validInput.email,
     passwordHash: hashedPassword,
    },
   ]);
  });

  it('should throw error for validation failure', async () => {
   // Arrange
   const validationError = new Error('有効なメールアドレスを入力してください');
   setupMockReturnValues(mockUserDomainService, {
    validateUserData: validationError,
   });

   // Act
   const result = await createUserUseCase.execute(validInput);

   // Assert
   expect(result.isErr()).toBe(true);

   expectMockCalledWith(mockUserDomainService.validateUserData, [validInput]);
   expectMockNotCalled(mockUserRepository.findByEmail);
  });

  it('should throw error when email already exists', async () => {
   // Arrange
   const existingUser = createTestUser({ email: validInput.email });

   setupMockReturnValues(mockUserDomainService, {
    validateUserData: null,
   });
   setupMockReturnValues(mockUserRepository, {
    findByEmail: existingUser,
   });

   // Act
   const result = await createUserUseCase.execute(validInput);

   // Assert
   expect(result.isErr()).toBe(true);

   expectMockCalledWith(mockUserDomainService.validateUserData, [validInput]);
   expectMockCalledWith(mockUserRepository.findByEmail, [validInput.email]);
   expectMockNotCalled(mockUserDomainService.hashPassword);
  });
 });
});
```

### 1.2 Domain Service テスト

```typescript
import { UserDomainService } from '@/services/domain/UserDomainService';

import { beforeEach, describe, expect, it } from 'vitest';

import {
 createTestUser,
 setupMockReturnValues,
} from '../../utils/helpers/testHelpers';
import {
 createMockConfigService,
 createMockHashService,
} from '../../utils/mocks/commonMocks';

describe('UserDomainService', () => {
 let userDomainService: UserDomainService;
 let mockHashService: ReturnType<typeof createMockHashService>;
 let mockConfigService: ReturnType<typeof createMockConfigService>;

 beforeEach(() => {
  mockHashService = createMockHashService();
  mockConfigService = createMockConfigService();

  userDomainService = new UserDomainService(mockHashService, mockConfigService);
 });

 describe('validateUserData', () => {
  it('should validate correct user data', () => {
   // Arrange
   const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
   };

   // Act & Assert
   expect(() => userDomainService.validateUserData(validData)).not.toThrow();
  });

  it('should throw error for invalid email', () => {
   // Arrange
   const invalidData = {
    name: 'John Doe',
    email: 'invalid-email',
    password: 'password123',
   };

   // Act & Assert
   expect(() => userDomainService.validateUserData(invalidData)).toThrow(
    '有効なメールアドレスを入力してください',
   );
  });

  it('should throw error for short password', () => {
   // Arrange
   const invalidData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: '123',
   };

   // Act & Assert
   expect(() => userDomainService.validateUserData(invalidData)).toThrow(
    'パスワードは8文字以上である必要があります',
   );
  });
 });

 describe('hashPassword', () => {
  it('should hash password successfully', async () => {
   // Arrange
   const password = 'password123';
   const hashedPassword = 'hashed_password_123';

   setupMockReturnValues(mockHashService, {
    generateHash: hashedPassword,
   });

   // Act
   const result = await userDomainService.hashPassword(password);

   // Assert
   expect(result).toBe(hashedPassword);
   expect(mockHashService.generateHash).toHaveBeenCalledWith(password);
  });

  it('should throw error when hashing fails', async () => {
   // Arrange
   const password = 'password123';
   const hashError = new Error('Hashing failed');

   setupMockReturnValues(mockHashService, {
    generateHash: hashError,
   });

   // Act & Assert
   await expect(userDomainService.hashPassword(password)).rejects.toThrow(
    'Hashing failed',
   );
  });
 });

 describe('verifyPassword', () => {
  it('should verify password successfully', async () => {
   // Arrange
   const password = 'password123';
   const hashedPassword = 'hashed_password_123';

   setupMockReturnValues(mockHashService, {
    compareHash: true,
   });

   // Act
   const result = await userDomainService.verifyPassword(
    password,
    hashedPassword,
   );

   // Assert
   expect(result).toBe(true);
   expect(mockHashService.compareHash).toHaveBeenCalledWith(
    password,
    hashedPassword,
   );
  });

  it('should return false for incorrect password', async () => {
   // Arrange
   const password = 'wrongpassword';
   const hashedPassword = 'hashed_password_123';

   setupMockReturnValues(mockHashService, {
    compareHash: false,
   });

   // Act
   const result = await userDomainService.verifyPassword(
    password,
    hashedPassword,
   );

   // Assert
   expect(result).toBe(false);
  });
 });
});
```

### 1.3 Repository テスト

```typescript
import { PrismaUserRepository } from '@/repositories/implementations/PrismaUserRepository';

import { beforeEach, describe, expect, it } from 'vitest';

import {
 createTestUser,
 setupMockReturnValues,
} from '../../utils/helpers/testHelpers';
import { createMockPrismaClient } from '../../utils/mocks/commonMocks';

describe('PrismaUserRepository', () => {
 let userRepository: PrismaUserRepository;
 let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

 beforeEach(() => {
  mockPrismaClient = createMockPrismaClient();
  userRepository = new PrismaUserRepository(mockPrismaClient);
 });

 describe('create', () => {
  it('should create user successfully', async () => {
   // Arrange
   const userData = {
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed_password',
   };
   const createdUser = createTestUser(userData);

   setupMockReturnValues(mockPrismaClient.user, {
    create: createdUser,
   });

   // Act
   const result = await userRepository.create(userData);

   // Assert
   expect(result).toEqual(createdUser);
   expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
    data: userData,
   });
  });

  it('should throw error when creation fails', async () => {
   // Arrange
   const userData = {
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed_password',
   };
   const dbError = new Error('Database error');

   setupMockReturnValues(mockPrismaClient.user, {
    create: dbError,
   });

   // Act & Assert
   await expect(userRepository.create(userData)).rejects.toThrow(
    'Database error',
   );
  });
 });

 describe('findByEmail', () => {
  it('should find user by email', async () => {
   // Arrange
   const email = 'john@example.com';
   const foundUser = createTestUser({ email });

   setupMockReturnValues(mockPrismaClient.user, {
    findUnique: foundUser,
   });

   // Act
   const result = await userRepository.findByEmail(email);

   // Assert
   expect(result).toEqual(foundUser);
   expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
    where: { email },
   });
  });

  it('should return null when user not found', async () => {
   // Arrange
   const email = 'notfound@example.com';

   setupMockReturnValues(mockPrismaClient.user, {
    findUnique: null,
   });

   // Act
   const result = await userRepository.findByEmail(email);

   // Assert
   expect(result).toBeNull();
  });
 });
});
```

---

## 2. テストアーキテクチャとモック戦略 🛠️

### 2.1 テストピラミッドとクリーンアーキテクチャ

```mermaid
graph TB
    subgraph "🧪 テストピラミッド"
        E2E[E2E Tests<br/>Playwright<br/>ユーザーシナリオ]
        COMP[Component Tests<br/>React Testing Library<br/>UI振る舞い]
        UNIT[Unit Tests<br/>Vitest<br/>ビジネスロジック]
    end

    subgraph "🏗️ クリーンアーキテクチャレイヤー"
        PRES[Presentation Layer]
        APP[Application Layer]
        DOM[Domain Layer]
        INFRA[Infrastructure Layer]
    end

    subgraph "🎯 テスト対象と手法"
        E2E --> PRES
        COMP --> PRES
        COMP --> APP
        UNIT --> APP
        UNIT --> DOM
        UNIT --> INFRA
    end

    subgraph "⚡ テスト特性"
        SLOW[遅い・少数・統合的]
        MID[中程度・適量・機能的]
        FAST[高速・多数・独立的]
    end

    E2E --> SLOW
    COMP --> MID
    UNIT --> FAST

    style E2E fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style COMP fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style UNIT fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style FAST fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style MID fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style SLOW fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
```

### 2.2 モックアーキテクチャの設計

```mermaid
graph TB
    subgraph "🏭 Mock Factory System"
        A[createMockUserRepository] --> A1[IUserRepository型]
        B[createMockUserDomainService] --> B1[UserDomainService型]
        C[createMockLogger] --> C1[ILogger型]
        D[createMockPrismaClient] --> D1[PrismaClient型]
    end

    subgraph "🔧 Test Helper Functions"
        E[setupMockReturnValues] --> E1[モック戻り値設定]
        F[expectMockCalledWith] --> F1[呼び出し検証]
        G[expectMockNotCalled] --> G1[未呼び出し検証]
        H[createTestUser] --> H1[テストデータ生成]
    end

    subgraph "🎪 Test Environment"
        I[setupTestEnvironment] --> I1[DIコンテナリセット]
        I --> I2[テスト間独立性確保]
        I --> I3[beforeEach自動実行]
    end

    subgraph "🔄 Test Flow"
        J[Arrange] --> K[モック作成・設定]
        K --> L[DIコンテナ登録]
        L --> M[Act: テスト実行]
        M --> N[Assert: 結果検証]
        N --> O[モック呼び出し検証]
    end

    A --> K
    B --> K
    C --> K
    E --> K
    F --> O
    G --> O
    H --> K
    I --> L

    style A fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style E fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style I fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style J fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style M fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
    style N fill:#92400e,stroke:#f59e0b,stroke-width:2px,color:#ffffff
```

### 2.3 モックファクトリーパターン

**一貫性のあるモック作成:**

```typescript
// tests/utils/mocks/commonMocks.ts
export const createMockUserRepository = (): IUserRepository =>
 ({
  create: vi.fn(),
  findByEmail: vi.fn(),
 }) as any;

export const createMockUserDomainService = (): UserDomainService =>
 ({
  validateUserData: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
 }) as any;
```

### 2.2 テストヘルパー関数

```typescript
// tests/utils/helpers/testHelpers.ts
import { beforeEach, expect, vi } from 'vitest';

/**
 * モックの戻り値を設定するヘルパー
 */
export const setupMockReturnValues = (
 mocks: Record<string, any>,
 values: Record<string, any>,
) => {
 Object.entries(values).forEach(([key, value]) => {
  if (mocks[key]) {
   if (value instanceof Error) {
    mocks[key].mockRejectedValue(value);
   } else if (
    key === 'compareHash' ||
    key === 'generateHash' ||
    key === 'create' ||
    key === 'findUnique' ||
    key === 'findFirst'
   ) {
    // 非同期メソッドはPromiseとして扱う
    mocks[key].mockResolvedValue(value);
   } else {
    // 同期的な値
    mocks[key].mockReturnValue(value);
   }
  }
 });
};

/**
 * 期待されるモック呼び出しをアサートするヘルパー
 */
export const expectMockCalledWith = (
 mockFn: any,
 expectedArgs: any[],
 callIndex = 0,
) => {
 return expect(mockFn).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
};

/**
 * モックが呼ばれていないことをアサートするヘルパー
 */
export const expectMockNotCalled = (mockFn: any) => {
 return expect(mockFn).not.toHaveBeenCalled();
};

/**
 * テストデータファクトリー
 */
export const createTestUser = (overrides = {}) => ({
 id: 'test-user-1',
 name: 'Test User',
 email: 'test@example.com',
 passwordHash: 'hashed_password_123',
 createdAt: new Date('2024-01-01T00:00:00Z'),
 updatedAt: new Date('2024-01-01T00:00:00Z'),
 ...overrides,
});

/**
 * テスト環境のセットアップ
 */
export function setupTestEnvironment() {
 beforeEach(() => {
  // DIコンテナのリセット
  container.clearInstances();
 });
}
```

### 2.3 DIコンテナを使ったテスト

```typescript
import { container } from '@/di/container';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';

describe('DIコンテナを使ったテスト', () => {
 setupTestEnvironment(); // 自動的にbeforeEachでコンテナをクリア

 beforeEach(() => {
  // モックをDIコンテナに登録
  const mockRepository = createMockUserRepository();
  const mockService = createMockUserDomainService();

  container.registerInstance(INJECTION_TOKENS.UserRepository, mockRepository);
  container.registerInstance(INJECTION_TOKENS.UserDomainService, mockService);

  // 型安全にUseCaseを取得
  const useCase = resolve('CreateUserUseCase');
 });
});
```

---

## 3. Component Tests（コンポーネントテスト）⚛️

### 3.1 基本的なコンポーネントテスト

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInForm } from '@/components/forms/SignInForm';

// Server Actionのモック
vi.mock('@/actions/auth/signInAction', () => ({
  signInAction: vi.fn(),
}));

describe('SignInForm', () => {
  const mockSignInAction = vi.mocked(signInAction);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sign-in form correctly', () => {
    // Arrange & Act
    render(<SignInForm />);

    // Assert
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'サインイン' })).toBeInTheDocument();
  });

  it('should submit form with correct data', async () => {
    // Arrange
    mockSignInAction.mockResolvedValue({ success: true });
    render(<SignInForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'サインイン' });

    // Act
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockSignInAction).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should display error message on sign-in failure', async () => {
    // Arrange
    mockSignInAction.mockResolvedValue({
      success: false,
      error: 'サインインに失敗しました',
    });
    render(<SignInForm />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'サインイン' }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('サインインに失敗しました')).toBeInTheDocument();
    });
  });
});
```

### 3.2 DIコンテナを使ったコンポーネントテスト

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '@/components/user/UserProfile';
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import { createMockUserRepository } from '../../utils/mocks/commonMocks';
import { setupTestEnvironment, createTestUser } from '../../utils/helpers/testHelpers';

describe('UserProfile', () => {
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;

  setupTestEnvironment();

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  });

  it('should display user information', async () => {
    // Arrange
    const testUser = createTestUser({
      name: 'John Doe',
      email: 'john@example.com',
    });

    mockUserRepository.findById.mockResolvedValue(testUser);

    // Act
    render(<UserProfile userId="test-user-1" />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });
});
```

---

## 4. E2Eテスト 🎭

E2Eテストの実装パターンと詳細ガイドは以下を参照してください。

- **[E2Eテスト実践ガイド](./e2e-testing-guide.md)** - Playwright を使った E2E テストの設計・実装・実行方法

---

## 5. テスト実行とCI/CD 🚀

### 5.1 テスト実行コマンド

```bash
# ユニットテスト実行
pnpm test:unit

# ユニットテスト（ウォッチモード）
pnpm test:watch

# E2Eテスト実行
pnpm test:e2e

# 全テスト実行
pnpm test
```

### 5.2 CI/CDテストパイプライン

```mermaid
flowchart TD
    A[🚀 Push/PR トリガー] --> B{並列実行}

    subgraph "🧪 Unit Tests Job"
        B --> C1[Ubuntu環境セットアップ]
        C1 --> C2[コードチェックアウト]
        C2 --> C3[Node.js 20 セットアップ]
        C3 --> C4[pnpm install]
        C4 --> C5[pnpm test:unit<br/>⚡ 高速実行]
        C5 --> C6[✅ Unit Tests完了]
    end

    subgraph "🎭 E2E Tests Job"
        B --> D1[Ubuntu環境セットアップ]
        D1 --> D2[コードチェックアウト]
        D2 --> D3[Node.js 20 セットアップ]
        D3 --> D4[pnpm install]
        D4 --> D5[playwright install]
        D5 --> D6[pnpm test:e2e<br/>🎯 ブラウザテスト]
        D6 --> D7[✅ E2E Tests完了]
    end

    C6 --> E{両方成功？}
    D7 --> E
    E -->|Yes| F[🎉 CI/CD Success]
    E -->|No| G[❌ CI/CD Failed]

    subgraph "⏱️ 実行時間比較"
        H[Unit Tests: ~30秒]
        I[E2E Tests: ~2-5分]
        J[並列実行で時間短縮]
    end

    subgraph "🔧 テスト環境特徴"
        K[✅ 外部依存なし]
        L[✅ 高速フィードバック]
        M[✅ 安定した実行]
        N[✅ コスト効率良い]
    end

    style A fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style C5 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style D6 fill:#7c3aed,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style F fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style G fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style H fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style I fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#dc2626
    style K fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style L fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style M fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style N fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

### CI/CDパイプライン設定のメリット

```mermaid
graph LR
    subgraph "❌ 従来の統合テスト"
        A1[DB + API + フルスタック] --> A2[環境構築：5分]
        A2 --> A3[テスト実行：10分]
        A3 --> A4[クリーンアップ：2分]
        A4 --> A5[合計：17分]
    end

    subgraph "✅ クリーンアーキテクチャ"
        B1[モック中心のUnit Tests] --> B2[環境構築：30秒]
        B2 --> B3[テスト実行：30秒]
        B3 --> B4[E2E（必要最小限）：3分]
        B4 --> B5[合計：4分]
    end

    subgraph "改善効果"
        C1[⚡ 4倍高速化]
        C2[💰 CIコスト削減]
        C3[🔄 高頻度実行可能]
        C4[👥 開発者体験向上]
    end

    A5 --> C1
    B5 --> C1

    style A1 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style A5 fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style B1 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style B5 fill:#065f46,stroke:#10b981,stroke-width:2px,color:#ffffff
    style C1 fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#d97706
    style C2 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style C3 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
    style C4 fill:#f0f9ff,stroke:#0369a1,stroke-width:1px,color:#0369a1
```

---

## 6. テストのベストプラクティス 💡

### 6.1 AAA パターンの徹底

```typescript
it('should create user successfully', async () => {
 // Arrange: テストデータとモックの準備
 const userData = { name: 'John', email: 'john@example.com' };
 setupMockReturnValues(mockRepository, { create: createTestUser(userData) });

 // Act: テスト対象の実行
 const result = await useCase.execute(userData);

 // Assert: 結果の検証
 expect(result).toBeDefined();
 expectMockCalledWith(mockRepository.create, [userData]);
});
```

### 6.2 テストの独立性確保

```typescript
describe('UserService', () => {
 setupTestEnvironment(); // 各テスト前にDIコンテナをクリア

 beforeEach(() => {
  // 各テストで新しいモックを作成
  mockRepository = createMockUserRepository();
  mockService = createMockUserDomainService();
 });
});
```

### 6.3 エラーケースのテスト

```typescript
it('should handle database errors gracefully', async () => {
 // Arrange
 const dbError = new Error('Database connection failed');
 setupMockReturnValues(mockRepository, { create: dbError });

 // Act
 const result = await useCase.execute(userData);

 // Assert
 expect(result.isErr()).toBe(true);

 // 後続処理が実行されないことを確認
 expectMockNotCalled(mockEmailService.sendWelcomeEmail);
});
```

### 6.4 ログ出力の制約

**重要**: テストがエラーとなる場合以外は、エラーログ（`console.error`, `logger.error` 等）を使用しない。正常系のテストでは `console.log` や `console.info` を適切に使用し、テストログの可読性を保つ。

```typescript
it('should log user creation info', async () => {
 // Arrange
 const userData = { name: 'John', email: 'john@example.com' };
 const consoleSpy = vi.spyOn(console, 'info');

 // Act
 await useCase.execute(userData);

 // Assert
 expect(consoleSpy).toHaveBeenCalledWith(
  'ユーザー作成完了',
  expect.any(Object),
 );

 consoleSpy.mockRestore();
});
```

---

## まとめ 📝

クリーンアーキテクチャでのテスト戦略では、以下の点が重要です：

1. **レイヤー毎の適切なテスト手法**の選択
2. **DIコンテナを活用**したテストの独立性確保
3. **共通ヘルパー関数**による一貫性のあるテスト実装
4. **AAA パターン**による可読性の高いテスト
5. **Vitest の機能**を最大限活用した高速テスト実行

これらの原則に従うことで、保守性が高く、信頼性のあるテストスイートを構築できます。

---

## 関連ドキュメント 📚

- [クリーンアーキテクチャ概念](./ddd/concepts/clean-architecture.md) - 基本概念の理解
- [アーキテクチャ比較](./ddd/concepts/architecture-comparison.md) - 他の設計選択肢との比較
- [開発ワークフロー](./development/workflow.md) - 実装手順とベストプラクティス
