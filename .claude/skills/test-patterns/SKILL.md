---
name: test-patterns
description: |
  vitest-mock-extended、setupTestEnvironment、Result型テスト、E2Eテスト(Playwright)の
  ベストプラクティスを自動適用するスキル。
  Clean Architecture + DDD プロジェクトにおける型安全で保守性の高いテスト実装を支援します。

  トリガー例:
  - 「テストを書きたい」「テスト作成」「ユニットテスト」「E2Eテスト」
  - *.test.ts, *.spec.ts ファイルを作成・編集するとき
  - 「モック」「mock」「スタブ」
  - 「Result型のテスト」「成功/失敗ケース」
  - 「UseCase テスト」「Repository テスト」
  - 「カバレッジ向上」「テストケース追加」
  - 「Playwright」「E2E」「認証フローテスト」「ページオブジェクト」
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Test Patterns Skill

vitest-mock-extended、Result型、E2Eテスト(Playwright)による包括的テスト実装を支援するスキル。

---

## 🎯 このスキルの目的

- **型安全なユニットテスト**: vitest-mock-extended による完全型対応
- **DI統合**: setupTestEnvironment による環境分離
- **Result型対応**: isSuccess/isFailure による統一的エラーハンドリングテスト
- **E2Eテスト**: Playwright による実践的なエンドツーエンドテスト
- **高品質保証**: レイヤー別カバレッジ目標達成

---

## 📊 レイヤー別カバレッジ目標

| レイヤー | 目標 | 重点 |
|---------|------|------|
| **Application** | **94%+** | UseCase・Result型パターン |
| **Domain** | **90%+** | ビジネスルール・Value Object |
| **Infrastructure** | **85%+** | Repository実装・外部連携 |
| **Presentation** | **80%+** | Server Actions・UI状態 |

---

## 🧪 基本テストパターン

### 1. テスト環境セットアップ（必須）

**すべてのテストファイルで必須**:

```typescript
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

describe('MyUseCase', () => {
  setupTestEnvironment(); // DIコンテナリセット必須

  // テストコード...
});
```

**重要**: `setupTestEnvironment()` を呼ばないと、前のテストのDI状態が残ります。

---

## 🤖 自動モック生成パターン

```typescript
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import { createAutoMockUserRepository, createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import type { MockProxy } from 'vitest-mock-extended';

describe('CreateUserUseCase', () => {
  setupTestEnvironment(); // DIコンテナリセット必須

  let useCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    // 自動モック生成 + DIコンテナ登録
    mockUserRepository = createAutoMockUserRepository();
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);

    useCase = resolve('CreateUserUseCase');
  });
});
```

**モック選択基準:**
- ✅ **自動モック (`autoMocks.ts`)**: Repository, Domain/Application Services, Logger
- ⚠️ **手動モック (`commonMocks.ts`)**: PrismaClient（型が複雑）、モジュールモック

---

## 🎆 Result型テストパターン

### 成功ケース

```typescript
import { isSuccess } from '@/layers/application/types/Result';

it('有効な入力でユーザーを作成できる', async () => {
  mockUserRepository.findByEmail.mockResolvedValue(null);

  const result = await useCase.execute({ name: 'Test User', email: 'test@example.com', password: 'password123' });

  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data.name).toBe('Test User');
    expect(result.data.userId).toBeDefined();
  }
});
```

### 失敗ケース（バリデーション / ビジネスルール / インフラ）

```typescript
import { isFailure } from '@/layers/application/types/Result';

it('無効なメールアドレスの場合は失敗する', async () => {
  const result = await useCase.execute({ name: 'Test', email: 'invalid-email', password: 'pass' });

  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
  }
});

it('Repository例外発生時はシステムエラーを返す', async () => {
  mockUserRepository.findByEmail.mockRejectedValue(new Error('DB error'));

  const result = await useCase.execute({ name: 'Test', email: 'test@example.com', password: 'pass' });

  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.code).toBe('UNEXPECTED_ERROR');
  }
});
```

---

## 🎯 Domain Layer テストパターン

### Value Object テスト

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Email } from '@/layers/domain/value-objects/Email';

describe('Email Value Object', () => {
  it('有効なメールアドレスで作成できる', () => {
    const email = new Email('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('無効な形式の場合はDomainErrorをスローする', () => {
    expect(() => new Email('invalid-email')).toThrow(DomainError);
  });

  it('同じ値のEmailは等価', () => {
    const email1 = new Email('test@example.com');
    const email2 = new Email('test@example.com');
    expect(email1.equals(email2)).toBe(true);
  });
});
```

### Entity テスト

```typescript
import { User } from '@/layers/domain/entities/User';

describe('User Entity', () => {
  it('有効なデータでUserを作成できる', () => {
    const user = User.create(new Email('test@example.com'), 'Test User', 'hashed_password');
    expect(user.name).toBe('Test User');
    expect(user.userId).toBeInstanceOf(UserId);
  });

  it('名前を変更できる', () => {
    const user = User.create(new Email('test@example.com'), 'Original', 'pass');
    user.changeName('New Name');
    expect(user.name).toBe('New Name');
  });
});
```

---

## 🔧 Infrastructure Layer テストパターン

```typescript
import { PrismaUserRepository } from '@/layers/infrastructure/persistence/prisma/PrismaUserRepository';
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';

describe('PrismaUserRepository', () => {
  setupTestEnvironment();

  let repository: PrismaUserRepository;
  let mockPrisma: MockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    repository = new PrismaUserRepository(mockPrisma);
  });

  it('存在するユーザーを取得できる', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@example.com', ... });

    const user = await repository.findByEmail(new Email('test@example.com'));

    expect(user?.email.value).toBe('test@example.com');
  });
});
```

---

## 🎨 Presentation Layer テストパターン

```typescript
import { signInAction } from '@/layers/presentation/actions/auth/signInAction';
import { mock } from 'vitest-mock-extended';

describe('signInAction', () => {
  setupTestEnvironment();

  let mockSignInUseCase: MockProxy<SignInUseCase>;

  beforeEach(() => {
    mockSignInUseCase = mock<SignInUseCase>();
    container.registerInstance(INJECTION_TOKENS.SignInUseCase, mockSignInUseCase);
  });

  it('有効な認証情報でサインインできる', async () => {
    mockSignInUseCase.execute.mockResolvedValue(success({ userId: 'user-123' }));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await signInAction(formData);

    expect(isSuccess(result)).toBe(true);
  });
});
```

---

## 🎬 E2Eテストパターン (Playwright)

### 基本構造（Arrange-Act-Assert）

```typescript
import { expect, test } from '@playwright/test';

test.describe('機能名', () => {
  test('正常系: 期待される動作', async ({ page }) => {
    // Arrange - テスト準備
    await page.goto('/');
    await page.fill('[data-testid="input"]', 'テストデータ');

    // Act - 操作実行
    await page.click('[data-testid="submit-button"]');

    // Assert - 結果確認
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    await expect(page.locator('[data-testid="result"]')).toContainText('成功');
  });
});
```

### ページオブジェクトパターン（推奨）

```typescript
// tests/e2e/pages/SignInPage.ts
export class SignInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  async signIn(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="sign-in-button"]');
  }
}
```

### 待機処理のベストプラクティス

```typescript
// ✅ 推奨: 状態ベースの待機
await expect(page.locator('[data-testid="loading"]')).toBeHidden();
await expect(page.locator('[data-testid="result"]')).toBeVisible();
await page.waitForLoadState('networkidle');

// ⚠️ 許容: アニメーション完了待ち（理由をコメント明記）
await page.waitForTimeout(300); // CSS transition: 0.3s の完了待ち

// ❌ 非推奨: 根拠のない固定時間待機
// await page.waitForTimeout(5000);
```

### E2Eテスト実行コマンド

```bash
pnpm test:e2e              # 基本実行
pnpm test:e2e:ui           # UI Mode（推奨）
pnpm test:e2e:report       # HTMLレポート表示
pnpm test:e2e:debug        # デバッグモード
```

**詳細は [E2Eテストパターン詳細リファレンス](references/e2e-patterns.md) を参照してください。**

---

## 🔍 モック呼び出し確認パターン

```typescript
it('正しい順序でメソッドが呼ばれる', async () => {
  await useCase.execute(validRequest);

  // 呼び出し確認
  expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.objectContaining({ value: 'test@example.com' }));
  expect(mockHashService.hash).toHaveBeenCalledWith('password123');
  expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
});
```

---

## 🚫 よくあるアンチパターンと対策

| アンチパターン | 問題 | 対策 |
|--------------|------|------|
| **setupTestEnvironment忘れ** | 前のテストのDI状態が残る | `describe()` 内で `setupTestEnvironment()` を呼ぶ |
| **mockResolvedValue/mockReturnValue混同** | 非同期・同期メソッドの区別なし | 非同期メソッドは `mockResolvedValue`、同期メソッドは `mockReturnValue` |
| **any型使用** | 型安全性が失われる | `MockProxy<T>` を使用 |
| **Result型の型ガード忘れ** | `result.data` が undefined の可能性 | `isSuccess(result)` で型ガード |
| **テストケース不足** | 成功ケースのみ | バリデーション・ビジネスルール・インフラエラーも網羅 |

---

## 🚀 テスト実行コマンド

```bash
# ユニットテスト
pnpm test:unit              # 全ユニットテスト実行
pnpm test:watch             # ウォッチモード（開発中推奨）
pnpm test:coverage          # カバレッジ付き実行

# E2Eテスト
pnpm test:e2e               # 全E2Eテスト実行
pnpm test:e2e:ui            # UI Mode（推奨）
pnpm test:e2e:report        # HTMLレポート表示

# 全テスト
pnpm test                   # ユニット + E2E
pnpm check                  # format + type-check + lint + test
```

---

## 📊 品質チェックリスト

### ユニットテスト作成時

- [ ] `setupTestEnvironment()` を呼んでいる
- [ ] 自動モック生成（`autoMocks.ts`）を使用している
- [ ] Result型パターンで `isSuccess`/`isFailure` を使用している
- [ ] 成功ケースをテストしている
- [ ] バリデーションエラーケースをテストしている
- [ ] ビジネスルールエラーケースをテストしている
- [ ] インフラエラーケースをテストしている
- [ ] モック呼び出しを確認している（`toHaveBeenCalledWith`）
- [ ] 型安全性を保っている（`any`型を使っていない）
- [ ] レイヤー別カバレッジ目標を意識している

### E2Eテスト作成時

- [ ] Arrange-Act-Assert パターンに従っている
- [ ] `data-testid` 属性でセレクタを指定している
- [ ] 状態ベースの待機（`toBeVisible`/`toBeHidden`）を使用している
- [ ] `waitForTimeout` は理由をコメントで明記している
- [ ] 認証が必要な場合は `beforeEach` でセットアップしている
- [ ] 正常系・異常系の両方をテストしている
- [ ] ページオブジェクトパターンを必要に応じて使用している
- [ ] UI Mode（`pnpm test:e2e:ui`）で動作確認している

---

## 🔗 関連ドキュメント

- **[テスト戦略](_DOCS/testing/strategy.md)** - 包括的テスト戦略
- **[ユニットテスト概要](_DOCS/testing/unit/overview.md)** - テスト基礎知識
- **[自動モック戦略](_DOCS/testing/unit/mocking.md)** - モック詳細ガイド
- **[E2Eテスト](_DOCS/guides/e2e-testing-guide.md)** - エンドツーエンドテスト
- **[Result型パターン](_DOCS/guides/ddd/cross-cutting/error-handling.md)** - エラーハンドリング
- **[DI パターン](_DOCS/architecture/patterns/dependency-injection.md)** - 依存性注入

---

**🧪 型安全で保守性の高いテストコードを書きましょう！**
