---
name: test-patterns
description: |
  vitest-mock-extended、setupTestEnvironment、Result型テスト、E2Eテスト(Playwright)、
  fishery + @faker-js/faker テストファクトリーのベストプラクティスを自動適用するスキル。
  Clean Architecture + DDD プロジェクトにおける型安全で保守性の高いテスト実装を支援します。

  トリガー例:
  - 「テストを書きたい」「テスト作成」「ユニットテスト」「E2Eテスト」
  - *.test.ts, *.spec.ts ファイルを作成・編集するとき
  - 「モック」「mock」「スタブ」
  - 「Result型のテスト」「成功/失敗ケース」
  - 「UseCase テスト」「Repository テスト」
  - 「カバレッジ向上」「テストケース追加」
  - 「Playwright」「E2E」「認証フローテスト」「ページオブジェクト」
  - 「テストファクトリー」「faker」「fishery」「テストデータ生成」
---

# Test Patterns Skill

vitest-mock-extended、Result型、E2Eテスト(Playwright)による包括的テスト実装を支援するスキル。

---

## 🎯 このスキルの目的

- **型安全なユニットテスト**: vitest-mock-extended による完全型対応
- **DI統合**: setupTestEnvironment による環境分離
- **Result型対応**: neverthrow の .isOk()/.isErr()/.value/.error による型安全なエラーハンドリングテスト
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

### mock\<T\>() vs mockDeep\<T\>() の使い分け

| ケース | 使用するモック |
|--------|---------------|
| 浅い型（ILogger, IHashService等） | `mock<T>()` |
| 深い型（PrismaClient等） | `mockDeep<T>()` |

`mockDeep` はネストされたプロパティ・メソッドも自動的にモック化する。PrismaClientのように `prisma.user.findUnique()` のようなチェーンが必要な場合に使用する。

```typescript
import { mock, mockDeep } from 'vitest-mock-extended';

// 浅い型: mock<T>()
const mockLogger = mock<ILogger>();
const mockHashService = mock<IHashService>();

// 深い型: mockDeep<T>()
const mockPrisma = mockDeep<PrismaClient>();
mockPrisma.user.findUnique.mockResolvedValue(prismaUser); // チェーンが必要なため mockDeep
```

---

## 🏭 テストファクトリーパターン（fishery + @faker-js/faker）

テストデータ生成には **fishery + @faker-js/faker** を使用する。ハードコードされた固定値は避け、ランダムかつ型安全なデータを生成すること。

### 基本的な使い方

```typescript
import { userFactory, userPrismaDataFactory } from '@tests/utils/factories';
import { userSessionFactory, userSessionPrismaDataFactory } from '@tests/utils/factories';

// ドメインエンティティ（Application/Domain層のテストに使用）
const user = userFactory.build();
const user = userFactory.build({}, { transient: { emailValue: 'alice@example.com' } });

// Prismaが返す生データ形式（Infrastructure層のテストに使用）
const prismaUser = userPrismaDataFactory.build();
const prismaUser = userPrismaDataFactory.build({ email: 'alice@example.com' });

// UserSession（有効なセッション）
const session = userSessionFactory.build();

// UserSession（期限切れ）
const expiredSession = userSessionFactory.build({}, { transient: { expired: true } });
```

### 複数件生成

```typescript
// 3件のユーザーを生成
const users = userFactory.buildList(3);

// 特定メールアドレスのみ指定して生成
const testUsers = [
  userFactory.build({}, { transient: { emailValue: 'john@example.com' } }),
  userFactory.build({}, { transient: { emailValue: 'jane@example.com' } }),
];
```

### 2種類のファクトリーの使い分け

| ファクトリー | 生成される型 | 使用シーン |
|------------|------------|----------|
| `userFactory` | `User`（ドメインエンティティ） | UseCase・Domain層のテスト |
| `userPrismaDataFactory` | `PrismaUserData`（plain object） | Repository実装のテスト（Prismaモックの戻り値） |
| `userSessionFactory` | `UserSession`（ドメインエンティティ） | UseCase・Domain層のテスト |
| `userSessionPrismaDataFactory` | `PrismaUserSessionData`（plain object） | Repository実装のテスト（Prismaモックの戻り値） |

### Infrastructure層での使用例（Prismaモック）

```typescript
import { userPrismaDataFactory } from '@tests/utils/factories';

it('ユーザーを取得できる', async () => {
  const prismaUser = userPrismaDataFactory.build({ email: 'test@example.com' });
  mockPrisma.user.findUnique.mockResolvedValue(prismaUser);

  const user = await repository.findByEmail(new Email('test@example.com'));

  expect(user?.email.value).toBe('test@example.com');
});
```

### 新しいエンティティ用ファクトリーの作成規則

新規エンティティ（例: `Product`）を追加した場合は `tests/utils/factories/` 配下にファクトリーを作成し、`index.ts` にエクスポートを追加する:

```typescript
// tests/utils/factories/productFactory.ts
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { Product } from '@/layers/domain/entities/Product';

type ProductTransientParams = {
  nameValue?: string;
};

export const productFactory = Factory.define<Product, ProductTransientParams>(
  ({ transientParams }) => {
    const name = transientParams.nameValue ?? faker.commerce.productName();
    return Product.create(name, faker.number.int({ min: 1, max: 10000 }));
  },
);
```

**重要**: `createTestUser` / `createTestSession` は `testHelpers.ts` から削除済み。テストデータは必ず fishery ファクトリー経由で作成すること（fishery-first ルール）。

---

## 🎆 Result型テストパターン（neverthrow）

neverthrow の `.isOk()` / `.isErr()` / `.value` / `.error` を使用する。

### 成功ケース

```typescript
it('有効な入力でユーザーを作成できる', async () => {
  mockUserRepository.findByEmail.mockResolvedValue(null);

  const result = await useCase.execute({ name: 'Test User', email: 'test@example.com', password: 'password123' });

  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(result.value.name).toBe('Test User');
    expect(result.value.id).toBeDefined();
  }
});
```

### 失敗ケース（バリデーション / ビジネスルール / インフラ）

```typescript
it('無効なメールアドレスの場合は失敗する', async () => {
  const result = await useCase.execute({ name: 'Test', email: 'invalid-email', password: 'pass' });

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
  }
});

it('Repository例外発生時はシステムエラーを返す', async () => {
  mockUserRepository.findByEmail.mockRejectedValue(new Error('DB error'));

  const result = await useCase.execute({ name: 'Test', email: 'test@example.com', password: 'pass' });

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error.code).toBe('UNEXPECTED_ERROR');
  }
});
```

**非推奨（後方互換のみ）**: `isSuccess(result)` → `result.isOk()`、`isFailure(result)` → `result.isErr()`、`result.data` → `result.value`

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
    const updatedUser = user.changeName('New Name');
    expect(updatedUser.name).toBe('New Name');
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

**Prisma v7固有のモック設定**: prisma-v7-patterns スキルの「PJ固有のPrisma v7構成」セクションも参照

---

## 🎨 Presentation Layer テストパターン

```typescript
import { signIn } from '@/app/server-actions/auth/signIn';
import { mock } from 'vitest-mock-extended';

describe('signIn', () => {
  setupTestEnvironment();

  let mockSignInUseCase: MockProxy<SignInUseCase>;

  beforeEach(() => {
    mockSignInUseCase = mock<SignInUseCase>();
    container.registerInstance(INJECTION_TOKENS.SignInUseCase, mockSignInUseCase);
  });

  it('有効な認証情報でサインインできる', async () => {
    const { ok } = await import('@/layers/application/types/Result');
    mockSignInUseCase.execute.mockResolvedValue(ok({ userId: 'user-123' }));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await signIn(formData);

    // Server Action は plain object を返す（Result型ではない）
    expect(result.success).toBe(true);
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

セレクタを Page Object クラスに集中管理し、実装変更時の修正箇所を最小化する。

```typescript
// tests/e2e/pages/SignInPage.ts
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SignInPage {
  // セレクタ定数（変更時はここのみ修正）
  private readonly emailInput = 'input[name="email"]';
  private readonly passwordInput = 'input[name="password"]';
  private readonly submitButton = '[data-testid="sign-in-button"]';
  private readonly errorAlert = '[data-testid="sign-in-error"]';

  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  async fillAndSubmit(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  /** 成功パス: サインインしてリダイレクト先を待機する */
  async signIn(email: string, password: string, redirectUrl = '/') {
    await this.fillAndSubmit(email, password);
    await this.page.waitForURL(redirectUrl, { timeout: 10000 });
  }

  async expectFormVisible() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.submitButton)).toBeVisible();
  }

  async expectError(text: string) {
    const alert = this.page.locator(this.errorAlert);
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(text);
  }
}
```

### test.extend() Fixtures パターン（推奨）

認証済み状態など、複数テストで共通するセットアップを Fixture として定義する。
各テストで `beforeEach` に重複したセットアップを書くことを防ぐ。

```typescript
// tests/e2e/fixtures/index.ts
import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

export const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test@1234!',
} as const;

type E2EFixtures = {
  signInPage: SignInPage;
  authenticatedPage: Page;  // サインイン済みの page
};

export const test = base.extend<E2EFixtures>({
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },

  authenticatedPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.signIn(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await use(page);
    // teardown: セッションをクリア
    await page.context().clearCookies();
  },
});

export { expect } from '@playwright/test';
```

```typescript
// tests/e2e/auth/sign-in.spec.ts
// ← @playwright/test ではなく fixtures からインポートする
import { TEST_CREDENTIALS, expect, test } from '../fixtures';

test.describe('サインイン認証', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('正しい認証情報でサインインが成功する', async ({ signInPage, page }) => {
    await signInPage.goto();
    await signInPage.fillAndSubmit(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});

test.describe('サインイン後のセッション', () => {
  // authenticatedPage Fixture が自動的にサインイン済み状態にする
  test('セッションが維持される', async ({ authenticatedPage: page }) => {
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    expect(session.user.email).toBe(TEST_CREDENTIALS.email);
  });
});
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
pnpm test:e2e:headed       # ヘッドフルモード（ブラウザUI表示）
pnpm test:e2e:trace        # トレース記録付き実行
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
| **Result型の型ガード忘れ** | `result.value` が undefined の可能性 | `result.isOk()` で型ガード後にアクセス |
| **テストケース不足** | 成功ケースのみ | バリデーション・ビジネスルール・インフラエラーも網羅 |
| **vi.mock() をネストした位置に書く** | Vitest 4.1 以降で警告発生、将来エラー化予定 | `vi.mock()` はファイルのトップレベル（`describe` / `beforeEach` の外）に配置する |
| **❌ ハードコードヘルパーでテストデータ作成** | `createTestUser()` 等の deprecated ヘルパーは削除済み。固定値テストデータは変更に弱く、ランダム性もない | `userFactory.build()` / `userPrismaDataFactory.build()` 等 fishery ファクトリー経由でのみ作成する |
| **❌ 薄いラッパー関数の作成** | `expectMockCalledWith` 等の wrapper は削除済み。抽象化がないのに wrapper を作ると無駄 | vitest ネイティブアサーション（`expect(fn).toHaveBeenNthCalledWith(...)`, `expect(fn).toHaveBeenCalledTimes(...)`, `expect(fn).not.toHaveBeenCalled()`）を直接記述する |
| **❌ eslint-disable コメント** | このプロジェクトは Biome を使用しており ESLint は無効。`eslint-disable` は機能しない | `biome-ignore lint/suspicious/noExplicitAny: <理由>` 形式を使用する |
| **❌ `fail()` グローバル関数** | setup.ts の polyfill は削除済み。グローバル `fail()` は使えない | `expect.fail('メッセージ')` を使用する |

### Vitest 4.1 変更点

- **`vi.mock()` の配置ルール強化**: `vi.mock()` はモジュールトップレベル（`describe` や `it` ブロックの外）にのみ記述すること。ネストされた位置への記述は Vitest 4.1 で警告が出るようになり、将来のバージョンでエラー化が予定されている
- **新フック `aroundEach` / `aroundAll`**: テストのセットアップとティアダウンを1つの関数にまとめて記述できる新フックが追加された。`beforeEach`/`afterEach` や `beforeAll`/`afterAll` の組み合わせを置き換えられるが、既存コードの書き換えは任意

```typescript
import { aroundEach, aroundAll } from 'vitest';

// aroundEach: 各テストの前後を wrap
aroundEach(async (test) => {
  const db = await setupDatabase();
  await test(); // テスト実行
  await db.cleanup(); // テスト後に確実に実行
});

// aroundAll: 全テストの前後を wrap
aroundAll(async (suite) => {
  const server = await startMockServer();
  await suite(); // 全テスト実行
  await server.close();
});
```

- **新 API `mockThrow` / `mockThrowOnce`**: モック関数から例外を投げるための専用 API が追加された

```typescript
const mockFn = vi.fn();

// 毎回例外を投げる
mockFn.mockThrow(new Error('Some error'));

// 1回だけ例外を投げる（以降は通常動作）
mockFn.mockThrowOnce(new Error('One-time error'));
```

- **`--detect-async-leaks`**: テスト後に残存する非同期処理（未解決の Promise、タイマー等）を検出するオプションが追加された

```bash
# CLI から実行
pnpm vitest --detect-async-leaks
```

```typescript
// vitest.config.ts で設定
export default defineConfig({
  test: {
    detectAsyncLeaks: true,
  },
});
```

- **タグベースフィルタリング**: テストにタグを付けてフィルタリングできるようになった

```typescript
describe('UserUseCase', { tags: ['unit', 'usecase'] }, () => {
  it('creates user', { tags: ['smoke'] }, () => { /* ... */ });
});
```

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
pnpm test:e2e:headed        # ヘッドフルモード（ブラウザUI表示）
pnpm test:e2e:trace         # トレース記録付き実行
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
- [ ] Result型パターンで `result.isOk()`/`result.isErr()` を使用している（`isSuccess`/`isFailure` は非推奨）
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

- **[テスト戦略](../../../_DOCS/testing/strategy.md)** - 包括的テスト戦略
- **[ユニットテスト概要](../../../_DOCS/testing/unit/overview.md)** - テスト基礎知識
- **[自動モック戦略](../../../_DOCS/testing/unit/mocking.md)** - モック詳細ガイド
- **[E2Eテスト](../../../_DOCS/guides/e2e-testing-guide.md)** - エンドツーエンドテスト
- **[Result型パターン](../../../_DOCS/guides/ddd/cross-cutting/error-handling.md)** - エラーハンドリング
- **[DI パターン](../../../_DOCS/architecture/patterns/dependency-injection.md)** - 依存性注入

---

**🧪 型安全で保守性の高いテストコードを書きましょう！**
