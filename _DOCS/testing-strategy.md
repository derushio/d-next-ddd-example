# テスト戦略 🧪

このドキュメントでは、プロジェクトのテスト戦略と実装方針について説明します。

---

## テスト環境

### 使用技術

- **Vitest** - ユニットテストフレームワーク
- **vitest-mock-extended** - TypeScript対応自動モック生成ライブラリ ✨
- **Playwright** - E2Eテストフレームワーク
- **Testing Library** - Reactコンポーネントテスト
- **jsdom** - ブラウザ環境シミュレート

### 実行方法

```bash
# 全テスト実行
pnpm test

# ユニットテストのみ
pnpm test:unit

# E2Eテストのみ  
pnpm test:e2e

# ウォッチモード（開発時）
pnpm test:watch

# カバレッジ付きテスト
pnpm test:coverage
```

---

## テスト方針

### 🎯 テストピラミッド

```
       🌐 E2E Tests
      認証・重要フロー
    
    📋 Integration Tests
   UseCase・Repository統合
  
🧪 Unit Tests
ビジネスロジック・単体機能
```

### 📊 現在のテスト状況

- **ユニットテスト**: 122件 (100%成功)
- **E2Eテスト**: 14件 (100%成功)
- **総実行時間**: 約25秒

---

## モック戦略 🎭

### 🚀 自動モック生成（推奨）- vitest-mock-extended

**2025年1月より採用** - TypeScript interfaceから自動的にモックを生成する方法

#### インストール

```bash
pnpm add -D vitest-mock-extended
```

#### 基本的な使い方

```typescript
import { mock, MockProxy } from 'vitest-mock-extended';

// 1行でinterfaceの全メソッドが自動生成✨
const mockUserRepository: MockProxy<IUserRepository> = mock<IUserRepository>();

// 型安全にモック設定
mockUserRepository.save.mockResolvedValue(undefined);
mockUserRepository.findById.mockResolvedValue(user);
```

#### 自動モックヘルパー

```typescript
// tests/utils/mocks/autoMocks.ts
import { mock, MockProxy } from 'vitest-mock-extended';

export const createAutoMockUserRepository = (): MockProxy<IUserRepository> => 
  mock<IUserRepository>();

export const createAutoMockUserDomainService = (): MockProxy<UserDomainService> => 
  mock<UserDomainService>();
```

#### 使用例

```typescript
// tests/unit/usecases/CreateUserUseCase.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createAutoMockUserRepository } from '../../utils/mocks/autoMocks';

describe('CreateUserUseCase', () => {
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    // 自動生成モック作成
    mockUserRepository = createAutoMockUserRepository();
    
    // DIコンテナに登録
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  });

  it('正常系: ユーザー作成が成功する', async () => {
    // 型安全なモック設定✨
    mockUserRepository.save.mockResolvedValue(undefined);
    mockUserRepository.findByEmail.mockResolvedValue(null);
    
    // テスト実行
    const result = await useCase.execute(validInput);
    
    // 型安全なアサーション✨
    expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
  });
});
```

#### 高度な機能

```typescript
// 条件付きモック
mockService.method.calledWith('specific-arg').mockReturnValue('result');

// ディープモック（ネストしたオブジェクト）
const deepMock = mockDeep<ComplexInterface>();

// パーシャルモック（部分的な実装）
const partialMock = mock<Interface>({ property: 'value' });
```

### 🔄 移行戦略

#### 新規テスト

**必ず vitest-mock-extended を使用**

```typescript
// ✅ 新しいテストでの推奨パターン
import { mock } from 'vitest-mock-extended';

const mockRepository = mock<IUserRepository>();
```

#### 既存テスト

段階的に移行（無理に一度にリファクタリングしない）

```typescript
// 📝 既存テストは必要に応じて移行
import { createMockUserRepository } from './commonMocks'; // 後で移行予定
```

### 🛠️ 従来の手動モック（レガシー）

**新規作成は非推奨**（既存コードの参考のみ）

```typescript
// ❌ 手動メンテナンスが必要で非効率
export const createMockUserRepository = () => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  // 新メソッド追加のたびに手動更新が必要...😭
});
```

### 📊 手法比較

| 項目 | vitest-mock-extended | 手動モック |
|------|---------------------|-----------|
| **生産性** | ⭐⭐⭐⭐⭐ 1行で完了 | ⭐⭐ 手動メンテナンス |
| **型安全性** | ⭐⭐⭐⭐⭐ 完全対応 | ⭐⭐⭐ as any で妥協 |
| **メンテナンス** | ⭐⭐⭐⭐⭐ 自動更新 | ⭐ 手動で毎回更新 |
| **機能性** | ⭐⭐⭐⭐⭐ 豊富な機能 | ⭐⭐ 基本機能のみ |

---

## ユニットテスト実装

### UseCase層テスト

```typescript
// tests/unit/usecases/CreateUserUseCase.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { setupTestEnvironment } from '../../utils/helpers/testHelpers';

describe('CreateUserUseCase', () => {
  setupTestEnvironment();

  let mockUserRepository: MockProxy<IUserRepository>;
  let mockUserDomainService: MockProxy<UserDomainService>;

  beforeEach(() => {
    // 自動モック生成✨
    mockUserRepository = mock<IUserRepository>();
    mockUserDomainService = mock<UserDomainService>();
    
    // DIコンテナに登録
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
    container.registerInstance(INJECTION_TOKENS.UserDomainService, mockUserDomainService);
  });

  it('正常系: ユーザー作成が成功する', async () => {
    // Arrange - 型安全なモック設定
    mockUserDomainService.validateUserData.mockResolvedValue(undefined);
    mockUserRepository.save.mockResolvedValue(undefined);
    
    const useCase = container.resolve(CreateUserUseCase);
    
    // Act
    const result = await useCase.execute({
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.name).toBe('テストユーザー');
    expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
  });

  it('異常系: バリデーションエラー', async () => {
    // Arrange
    const validationError = new DomainError('バリデーションエラー', 'VALIDATION_ERROR');
    mockUserDomainService.validateUserData.mockRejectedValue(validationError);
    
    const useCase = container.resolve(CreateUserUseCase);
    
    // Act & Assert
    await expect(
      useCase.execute({
        name: '',
        email: 'invalid-email',
        password: '123',
      })
    ).rejects.toThrow(validationError);
  });
});
```

### Domain Service テスト

```typescript
// tests/unit/services/UserDomainService.test.ts
import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('UserDomainService', () => {
  it('有効なユーザーデータでバリデーション成功', async () => {
    // 自動モック生成でRepository依存を解決
    const mockUserRepository = mock<IUserRepository>();
    mockUserRepository.findByEmail.mockResolvedValue(null);
    
    const service = new UserDomainService(mockUserRepository);
    
    await expect(
      service.validateUserData('テストユーザー', 'test@example.com')
    ).resolves.not.toThrow();
    
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      expect.any(Email)
    );
  });
});
```

### Repository テスト

```typescript
// tests/unit/repositories/PrismaUserRepository.test.ts
import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('PrismaUserRepository', () => {
  it('ユーザー作成が成功する', async () => {
    // PrismaClientの自動モック
    const mockPrismaClient = mock<PrismaClient>();
    mockPrismaClient.user.create.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'テストユーザー',
      // ... その他のフィールド
    });
    
    const repository = new PrismaUserRepository(mockPrismaClient);
    
    const result = await repository.save(testUser);
    
    expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
        name: 'テストユーザー',
      })
    });
  });
});
```

---

## E2Eテスト実装

### 認証フローテスト

```typescript
// tests/e2e/auth/sign-in.spec.ts
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('正常系: サインイン・ログアウト', async ({ page }) => {
    // サインインページに移動
    await page.goto('/auth/sign-in');
    
    // サインイン情報入力
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="sign-in-button"]');
    
    // サインイン成功確認
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // ログアウト
    await page.click('[data-testid="logout-button"]');
    await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible();
  });
});
```

---

## テストヘルパー関数

```typescript
// tests/utils/helpers/testHelpers.ts
import { container } from '@/layers/infrastructure/di/container';
import { beforeEach } from 'vitest';

/**
 * テスト環境のセットアップ
 * 
 * 各テストの beforeEach で使用することで、テスト間の独立性を確保します。
 */
export function setupTestEnvironment() {
  beforeEach(() => {
    // DIコンテナのリセット
    container.clearInstances();
  });
}

/**
 * モック関数呼び出し確認のヘルパー
 */
export function expectMockCalledWith<T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  ...expectedArgs: Parameters<T>
) {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * モック関数未呼び出し確認のヘルパー
 */
export function expectMockNotCalled<T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
) {
  expect(mockFn).not.toHaveBeenCalled();
}
```

---

## テスト書き方ガイド

### ✅ 良いテストの特徴

- **独立性**: 他のテストに依存しない
- **再現性**: 何度実行しても同じ結果
- **高速性**: 迅速なフィードバック
- **明確性**: テストの意図が明確
- **型安全性**: vitest-mock-extended による完全な型チェック ✨

### テスト命名規則

```typescript
describe('テスト対象クラス/関数名', () => {
  it('正常系: 期待される動作の説明', () => {});
  it('異常系: エラーケースの説明', () => {});
  it('境界値: エッジケースの説明', () => {});
});
```

### アサーション例

```typescript
// 基本的なアサーション
expect(result).toBeDefined();
expect(result.id).toBe('expected-id');
expect(result.items).toHaveLength(3);

// 非同期処理のアサーション
await expect(asyncFunction()).resolves.toBe('success');
await expect(asyncFunction()).rejects.toThrow('Error message');

// オブジェクトのアサーション
expect(result).toMatchObject({
  name: 'テストユーザー',
  email: 'test@example.com',
});

// モック関数のアサーション（型安全）✨
expect(mockRepository.save).toHaveBeenCalledWith(expect.any(User));
expect(mockService.method).toHaveBeenCalledTimes(1);
```

---

## CI/CD 統合

### GitHub Actions での実行

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: |
          pnpm test
```

---

## ベストプラクティス

### ✅ 推奨

- **vitest-mock-extended の積極採用** ✨
- 実装と同時にテスト作成
- テストファースト開発の採用
- モックの適切な使用
- カバレッジ90%以上を目標

### ❌ 避けるべき

- 手動モックの新規作成
- テストが相互に依存する設計
- 過度に複雑なモック
- 実装の詳細をテストする
- テストのためのテスト

### 🔄 モック選択指針

```typescript
// ✅ 新規テスト - vitest-mock-extended を使用
const mock = mock<Interface>();

// 📝 既存テスト - 段階的に移行
const mock = createMockInterface(); // 必要に応じて移行

// ❌ 新規テスト - 手動モック作成は禁止
const mock = { method: vi.fn() }; // 型安全性が低い
```

---

## トラブルシューティング

### vitest-mock-extended 関連

1. **型エラーが発生する場合**
   - `MockProxy<T>` 型を正しく使用しているか確認
   - interface/class の import が正しいか確認

2. **メソッドが見つからない場合**
   - interfaceの定義を確認
   - TypeScriptの型チェックを実行

### 従来の問題（解決済み）

1. **モック設定漏れ**: 自動生成により解消 ✨
2. **型安全性の欠如**: MockProxy により完全解決 ✨
3. **メンテナンス負荷**: 自動更新により解消 ✨

### DI関連のテストエラー

1. `reflect-metadata` のインポート確認
2. DIコンテナの初期化確認
3. モックサービスの登録確認

参考実装:

- [自動モックヘルパー](../../tests/utils/mocks/autoMocks.ts) ✨
- [テストセットアップ](../../tests/setup.ts)
- [従来モック](../../tests/utils/mocks/commonMocks.ts)
- [E2Eテスト例](../../tests/e2e/auth/sign-in.spec.ts)
