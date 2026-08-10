---
name: e2e-principles
description: |
  E2Eテストの原則と哲学を定義するスキル。
  本末転倒の対応禁止、あるべき姿論への忠実、データのスタンドアロン性を徹底。

  トリガー例:
  - 「E2Eテスト作成」「E2E設計」「E2E原則」
  - tests/e2e/ 配下のファイル作成・編集時
  - 「テストデータ」「スタンドアロン」「あるべき姿」
---

# E2E Principles Skill

E2Eテストの本質と哲学を理解し、正しい設計・実装を行うための原則集。

---

## 🎯 E2Eテストの本質

### E2Eテストとは

**End-to-End Testing**: システム全体を通した実際のユーザーシナリオを検証するテスト。

### 目的

- **ユーザー体験の検証**: 実際のユーザーがたどる操作フローが正しく機能するか
- **統合の確認**: フロントエンド、バックエンド、データベースの統合が正しく動作するか
- **リグレッション防止**: 既存機能が新しい変更で壊れていないか
- **信頼性の保証**: デプロイ前の最終的な品質保証

### ユニットテストとの違い

| 観点 | ユニットテスト | E2Eテスト |
|------|--------------|----------|
| **粒度** | 関数・クラス単位 | ユーザーシナリオ全体 |
| **目的** | ロジックの正確性 | ユーザー体験の検証 |
| **速度** | 高速（ミリ秒） | 低速（秒単位） |
| **環境** | モック・スタブ | 実際のブラウザ・DB |
| **保守性** | 高い | 実装に依存 |
| **カバレッジ** | 詳細な分岐 | 主要なシナリオ |

**重要**: E2Eテストはユニットテストの代替ではなく、補完関係にあります。

---

## 🚫 本末転倒禁止ルール（絶対遵守）

### 禁止パターン 1: テストを通すために実装を変更する

#### ❌ 禁止例

```typescript
// 実装コード
async function submitForm(data: FormData) {
  const result = await validateForm(data);
  if (!result.isValid) {
    throw new Error('Validation failed');
  }
  return saveToDatabase(data);
}

// E2Eテストが失敗
// → 「エラーメッセージが表示されない」

// ❌ テストを通すために実装を変更
async function submitForm(data: FormData) {
  const result = await validateForm(data);
  if (!result.isValid) {
    showErrorMessage(result.errors); // ← テストのために追加
    throw new Error('Validation failed');
  }
  return saveToDatabase(data);
}
```

#### ✅ 正しい対応

```typescript
// 実装コードはそのまま（これが正しい仕様と判断）
async function submitForm(data: FormData) {
  const result = await validateForm(data);
  if (!result.isValid) {
    throw new Error('Validation failed');
  }
  return saveToDatabase(data);
}

// テストを実装の実態に合わせて修正
test('バリデーションエラー時は例外がスローされる', async ({ page }) => {
  await page.goto('/form');
  await page.fill('[data-testid="email"]', 'invalid-email');

  // エラーがスローされることを検証（UIにメッセージが表示されないことも仕様）
  const response = page.waitForResponse(resp => resp.url().includes('/api/submit'));
  await page.click('[data-testid="submit"]');

  const resp = await response;
  expect(resp.status()).toBe(400);
});
```

**なぜ問題か**: テストは実装の正当性を検証するもの。テストを通すために実装を変更すると、テストの意味がなくなります。

### 禁止パターン 2: 成功しないテストをスキップ・コメントアウト

#### ❌ 禁止例

```typescript
// test.skip を乱用
test.skip('ユーザー登録後にダッシュボードに遷移する', async ({ page }) => {
  // このテストは時々失敗するのでスキップ
  // TODO: 後で直す
});

// または
// test('ユーザー登録後にダッシュボードに遷移する', async ({ page }) => {
//   await page.goto('/signup');
//   await page.fill('[data-testid="email"]', 'test@example.com');
//   // ...
// });
```

#### ✅ 正しい対応

```typescript
test('ユーザー登録後にダッシュボードに遷移する', async ({ page }) => {
  await page.goto('/signup');

  // テストデータを準備
  const uniqueEmail = `test-${Date.now()}@example.com`;

  await page.fill('[data-testid="email"]', uniqueEmail);
  await page.fill('[data-testid="password"]', 'SecurePass123!');
  await page.fill('[data-testid="name"]', 'Test User');

  // 登録ボタンクリック
  await page.click('[data-testid="signup-button"]');

  // リダイレクトを待機
  await page.waitForURL('/dashboard', { timeout: 5000 });

  // ダッシュボードの要素を確認
  await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
});
```

**なぜ問題か**: 失敗するテストはバグの兆候。スキップすると問題を隠蔽し、品質保証の意味がなくなります。

### 禁止パターン 3: 実装に合わせてテストの検証観点を歪める

#### ❌ 禁止例

```typescript
// あるべき仕様: フォーム送信後、成功メッセージが表示される
// 実装: 成功メッセージが表示されず、ページ遷移のみ

// ❌ 実装に合わせてテストの検証を変更
test('フォーム送信が成功する', async ({ page }) => {
  await page.goto('/form');
  await page.fill('[data-testid="input"]', 'data');
  await page.click('[data-testid="submit"]');

  // 本来は成功メッセージを検証すべきだが、実装がないので検証を省略
  await expect(page).toHaveURL('/success'); // これだけでOKにする
});
```

#### ✅ 正しい対応

**ケース A: 実装が正しい場合（仕様が間違っていた）**

```typescript
// 仕様を見直し、ページ遷移のみが正しいと判断
test('フォーム送信後、成功ページに遷移する', async ({ page }) => {
  await page.goto('/form');
  await page.fill('[data-testid="input"]', 'data');
  await page.click('[data-testid="submit"]');

  await expect(page).toHaveURL('/success');
  // メッセージ表示は仕様に含まれないことを確認済み
});
```

**ケース B: 実装が間違っている場合（仕様が正しい）**

```typescript
// 実装を修正すべき → テストは仕様通りに書く
test('フォーム送信後、成功メッセージが表示される', async ({ page }) => {
  await page.goto('/form');
  await page.fill('[data-testid="input"]', 'data');
  await page.click('[data-testid="submit"]');

  // 仕様通りの検証
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="success-message"]')).toContainText('送信が完了しました');
});

// このテストが失敗するなら、実装を修正する
```

**なぜ問題か**: テストは仕様の検証手段。実装の都合でテストを歪めると、仕様が守られているか分からなくなります。

### 正しい対処フロー

```
テストが失敗
    ↓
実装と仕様を比較
    ↓
┌───────────────────────┬───────────────────────┐
│ 実装が正しい         │ 実装が間違っている     │
│（仕様が曖昧だった）   │（仕様が明確）         │
└───────────────────────┴───────────────────────┘
    ↓                       ↓
仕様を明確化           実装を修正
    ↓                       ↓
テストを仕様に合わせる   テストはそのまま
```

---

## 📐 あるべき姿論（Design First）

### 基本思想

**「この機能はこう実装されるべき」→「それを検証するテストはこう書かれるべき」**

実装の正当性を先に定義し、それを検証するテストを書く。テストは実装の「あるべき姿」を検証するもの。

### Design First のアプローチ

#### ステップ 1: 仕様を明確に定義

```markdown
## ユーザー登録機能の仕様

### 正常系
- メールアドレス、パスワード、名前を入力
- 「登録」ボタンをクリック
- メールアドレスの形式が正しい
- パスワードが8文字以上
- 登録成功後、ダッシュボードに遷移
- ウェルカムメッセージが表示される

### 異常系
- メールアドレスが不正な形式 → エラーメッセージ表示
- パスワードが8文字未満 → エラーメッセージ表示
- 既に登録済みのメール → エラーメッセージ表示
```

#### ステップ 2: テスト設計（実装前）

```typescript
// 実装前にテストを設計
describe('ユーザー登録機能', () => {
  test('正常系: 有効な情報で登録できる', async ({ page }) => {
    // Arrange
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      name: 'Test User',
    };

    // Act
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.fill('[data-testid="name"]', testUser.name);
    await page.click('[data-testid="signup-button"]');

    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testUser.name);
  });

  test('異常系: 不正なメールアドレスでエラー表示', async ({ page }) => {
    // Arrange & Act
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="name"]', 'Test User');
    await page.click('[data-testid="signup-button"]');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('メールアドレスの形式が正しくありません');
  });

  test('異常系: パスワードが短すぎる場合エラー表示', async ({ page }) => {
    // Arrange & Act
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[data-testid="password"]', 'short');
    await page.fill('[data-testid="name"]', 'Test User');
    await page.click('[data-testid="signup-button"]');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('パスワードは8文字以上で入力してください');
  });
});
```

#### ステップ 3: 実装

テスト設計に基づいて実装を進める。テストが通るまで実装を続ける。

#### ステップ 4: 検証

実装完了後、テストを実行して仕様通りに動作することを確認。

### 具体例: 認証フロー

#### 仕様定義

```markdown
## ログイン機能

### 前提条件
- ユーザーは既に登録済み

### 正常系
1. ログインページにアクセス
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック
4. 認証成功
5. ダッシュボードに遷移
6. ユーザー名が表示される

### 異常系
1. 存在しないメールアドレス → エラーメッセージ
2. パスワードが間違っている → エラーメッセージ
3. 空のフィールド → エラーメッセージ
```

#### テスト実装

```typescript
describe('ログイン機能', () => {
  // データ準備（beforeEach で実施）
  let testUser: { email: string; password: string; name: string };

  beforeEach(async () => {
    // テストユーザーを作成
    testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      name: 'Test User',
    };

    // APIまたはシードでユーザー作成
    await createTestUser(testUser);
  });

  test('正常系: 有効な認証情報でログインできる', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="sign-in-button"]');

    // リダイレクト確認
    await expect(page).toHaveURL('/dashboard');

    // ユーザー名表示確認
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText(testUser.name);
  });

  test('異常系: 存在しないメールアドレスでエラー', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.fill('[data-testid="email"]', 'nonexistent@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="sign-in-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('メールアドレスまたはパスワードが正しくありません');
  });

  test('異常系: パスワードが間違っている場合エラー', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="sign-in-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('メールアドレスまたはパスワードが正しくありません');
  });
});
```

### 具体例: CRUD操作

#### 仕様定義

```markdown
## 記事管理機能

### 作成
- タイトル、内容を入力
- 「作成」ボタンクリック
- 記事一覧に遷移
- 作成した記事が表示される

### 更新
- 記事詳細ページで「編集」ボタンクリック
- タイトル、内容を変更
- 「更新」ボタンクリック
- 記事詳細に戻る
- 更新内容が反映されている

### 削除
- 記事詳細ページで「削除」ボタンクリック
- 確認ダイアログが表示
- 「削除」を選択
- 記事一覧に遷移
- 削除した記事が表示されない
```

#### テスト実装

```typescript
describe('記事管理機能', () => {
  let testUser: { id: string; email: string; password: string };

  beforeEach(async ({ page }) => {
    // テストユーザー作成
    testUser = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePass123!',
    });

    // ログイン
    await signIn(page, testUser.email, testUser.password);
  });

  test('作成: 記事を作成できる', async ({ page }) => {
    const article = {
      title: `Test Article ${Date.now()}`,
      content: 'This is a test article content.',
    };

    // 作成ページへ
    await page.goto('/articles/new');

    // フォーム入力
    await page.fill('[data-testid="title"]', article.title);
    await page.fill('[data-testid="content"]', article.content);
    await page.click('[data-testid="create-button"]');

    // 一覧ページに遷移
    await expect(page).toHaveURL('/articles');

    // 作成した記事が表示される
    await expect(page.locator(`text="${article.title}"`)).toBeVisible();
  });

  test('更新: 記事を更新できる', async ({ page }) => {
    // 事前に記事作成
    const article = await createTestArticle({
      authorId: testUser.id,
      title: 'Original Title',
      content: 'Original Content',
    });

    // 編集ページへ
    await page.goto(`/articles/${article.id}/edit`);

    // フォーム変更
    const newTitle = `Updated Title ${Date.now()}`;
    await page.fill('[data-testid="title"]', newTitle);
    await page.click('[data-testid="update-button"]');

    // 詳細ページに遷移
    await expect(page).toHaveURL(`/articles/${article.id}`);

    // 更新内容が反映
    await expect(page.locator('[data-testid="article-title"]')).toContainText(newTitle);
  });

  test('削除: 記事を削除できる', async ({ page }) => {
    // 事前に記事作成
    const article = await createTestArticle({
      authorId: testUser.id,
      title: 'Article to Delete',
      content: 'This will be deleted',
    });

    // 詳細ページへ
    await page.goto(`/articles/${article.id}`);

    // 削除ボタンクリック
    await page.click('[data-testid="delete-button"]');

    // 確認ダイアログ
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-delete"]');

    // 一覧ページに遷移
    await expect(page).toHaveURL('/articles');

    // 削除した記事が表示されない
    await expect(page.locator(`text="${article.title}"`)).not.toBeVisible();
  });
});
```

---

## 📊 テストデータ戦略

### マスタデータの定義

**マスタデータ**: システム定義データのみ。アプリケーションの動作に必要な固定的なデータ。

#### マスタデータの例

- **ユーザーロール**: ADMIN, USER, GUEST
- **記事ステータス**: DRAFT, PUBLISHED, ARCHIVED
- **カテゴリ**: Technology, Business, Health
- **システム設定**: 言語、通貨、タイムゾーン

#### マスタデータの特徴

- システムの動作に必須
- 変更頻度が低い
- シードスクリプトで投入
- 冪等性を保証（upsert使用）

**重要**: マスタデータはシードで投入し、E2Eテスト前に必ず準備されている状態にします。

### スタンドアロンデータの原則

**スタンドアロン性**: 各テストが必要なデータを自分で用意し、他のテストに依存しない。

#### 原則 1: テストごとにデータを準備

```typescript
describe('記事管理', () => {
  test('記事を作成できる', async ({ page }) => {
    // このテスト専用のユーザーを作成
    const testUser = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
    });

    // ログイン
    await signIn(page, testUser.email, testUser.password);

    // テスト実行
    // ...
  });

  test('記事を更新できる', async ({ page }) => {
    // このテストも独自にユーザーと記事を作成
    const testUser = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
    });

    const testArticle = await createTestArticle({
      authorId: testUser.id,
      title: 'Test Article',
      content: 'Content',
    });

    // ログイン
    await signIn(page, testUser.email, testUser.password);

    // テスト実行
    // ...
  });
});
```

#### 原則 2: 他のテストが作成したデータに依存しない

```typescript
// ❌ 禁止: テスト1が作ったデータをテスト2が使用
describe('NG例', () => {
  let sharedUser: User;

  test('ユーザーを作成する', async () => {
    sharedUser = await createTestUser({...});
  });

  test('記事を作成する', async () => {
    // テスト1のユーザーに依存 → NG
    await createTestArticle({ authorId: sharedUser.id, ... });
  });
});

// ✅ 推奨: 各テストが独立
describe('OK例', () => {
  test('ユーザーを作成する', async () => {
    const user = await createTestUser({...});
    // このテスト内で完結
  });

  test('記事を作成する', async () => {
    // 独自にユーザー作成
    const user = await createTestUser({...});
    await createTestArticle({ authorId: user.id, ... });
  });
});
```

#### 原則 3: テストの順序に依存しない

```typescript
// ❌ 禁止: 実行順序に依存
describe('NG例', () => {
  test('1. ユーザー作成', async () => {
    await createTestUser({ email: 'shared@example.com', ... });
  });

  test('2. ログイン', async ({ page }) => {
    // テスト1が先に実行される前提 → NG
    await signIn(page, 'shared@example.com', 'password');
  });
});

// ✅ 推奨: 順序に依存しない
describe('OK例', () => {
  test('ユーザー作成', async () => {
    const user = await createTestUser({...});
    expect(user.id).toBeDefined();
  });

  test('ログイン', async ({ page }) => {
    // このテスト内でユーザー作成
    const user = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
    });

    await signIn(page, user.email, user.password);
  });
});
```

### データ準備パターン

#### パターン 1: beforeEach でテストごとにデータ準備

```typescript
describe('記事管理', () => {
  let testUser: User;
  let testArticle: Article;

  beforeEach(async () => {
    // 各テストの前に新しいデータを準備
    testUser = await createTestUser({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
    });

    testArticle = await createTestArticle({
      authorId: testUser.id,
      title: `Test Article ${Date.now()}`,
      content: 'Test content',
    });
  });

  test('記事を表示できる', async ({ page }) => {
    await signIn(page, testUser.email, 'password123');
    await page.goto(`/articles/${testArticle.id}`);

    await expect(page.locator('[data-testid="article-title"]')).toContainText(testArticle.title);
  });

  test('記事を編集できる', async ({ page }) => {
    await signIn(page, testUser.email, 'password123');
    await page.goto(`/articles/${testArticle.id}/edit`);

    // 編集処理
  });
});
```

#### パターン 2: Factory関数で柔軟にデータ生成

```typescript
// tests/e2e/factories/userFactory.ts
export async function createTestUser(overrides?: Partial<UserCreateInput>) {
  const defaultData = {
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'Test User',
  };

  const userData = { ...defaultData, ...overrides };

  // API経由でユーザー作成
  const response = await fetch('http://localhost:3000/api/test/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  return response.json();
}

// 使用例
test('ユーザープロフィールを表示', async ({ page }) => {
  const user = await createTestUser({
    name: 'Custom Name',
  });

  await signIn(page, user.email, 'SecurePass123!');
  await page.goto('/profile');

  await expect(page.locator('[data-testid="user-name"]')).toContainText('Custom Name');
});
```

#### パターン 3: テスト用APIエンドポイント

```typescript
// src/app/api/test/users/route.ts (開発環境のみ)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const data = await req.json();

  // ユーザー作成ロジック
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      name: data.name,
    },
  });

  return NextResponse.json(user);
}

// テストから使用
async function createTestUser(data: UserCreateInput) {
  const response = await fetch('http://localhost:3000/api/test/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.statusText}`);
  }

  return response.json();
}
```

### クリーンアップ戦略

#### 戦略 1: トランザクションロールバック（最速）

```typescript
// tests/e2e/setup/database.ts
import { prisma } from '@/layers/infrastructure/persistence/prisma';

export async function withTransaction(testFn: () => Promise<void>) {
  await prisma.$transaction(async (tx) => {
    try {
      await testFn();
    } finally {
      // トランザクションをロールバック（エラーをスロー）
      throw new Error('Rollback test transaction');
    }
  }).catch((error) => {
    if (error.message !== 'Rollback test transaction') {
      throw error;
    }
  });
}

// 使用例
test('ユーザー作成テスト', async () => {
  await withTransaction(async () => {
    const user = await createTestUser({...});
    expect(user.id).toBeDefined();
    // トランザクション終了時に自動ロールバック
  });
});
```

#### 戦略 2: afterEach でクリーンアップ

```typescript
describe('記事管理', () => {
  const createdUserIds: string[] = [];
  const createdArticleIds: string[] = [];

  afterEach(async () => {
    // 作成したデータを削除
    await prisma.article.deleteMany({
      where: { id: { in: createdArticleIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });

    // IDリストをクリア
    createdUserIds.length = 0;
    createdArticleIds.length = 0;
  });

  test('記事を作成', async () => {
    const user = await createTestUser({...});
    createdUserIds.push(user.id);

    const article = await createTestArticle({...});
    createdArticleIds.push(article.id);

    // テスト実行
  });
});
```

#### 戦略 3: テスト専用DBの完全リセット

```typescript
// tests/e2e/setup/database.ts
export async function resetDatabase() {
  // マスタデータ以外を削除
  await prisma.article.deleteMany();
  await prisma.user.deleteMany({ where: { role: { not: 'SYSTEM' } } });

  // マスタデータは維持
}

// tests/e2e/setup/global-teardown.ts
export default async function globalTeardown() {
  await resetDatabase();
}
```

#### 戦略 4: ユニークな識別子で自己完結

```typescript
// クリーンアップ不要の設計
test('ユーザー作成', async () => {
  // タイムスタンプでユニークなメールアドレス
  const uniqueEmail = `test-${Date.now()}-${Math.random()}@example.com`;

  const user = await createTestUser({ email: uniqueEmail });

  expect(user.email).toBe(uniqueEmail);
  // クリーンアップ不要（ユニークなので他のテストと衝突しない）
});
```

**推奨**: 戦略4（ユニーク識別子）を基本とし、必要に応じて戦略2（afterEach）を併用。

---

## ✅ E2Eテスト作成チェックリスト

### 作成前の確認事項

- [ ] 仕様を明確に定義しているか?
- [ ] ユーザーシナリオを理解しているか?
- [ ] テストの目的（正常系/異常系）を明確にしているか?
- [ ] 必要なマスタデータを確認したか?
- [ ] テストデータの準備方法を決めているか?

### 設計時の確認事項

- [ ] あるべき姿論に基づいて設計しているか?
- [ ] テストケースが網羅的か（正常系・異常系・境界値）?
- [ ] データのスタンドアロン性を保っているか?
- [ ] 他のテストに依存していないか?
- [ ] テストの順序に依存していないか?

### 実装中の確認事項

- [ ] Arrange-Act-Assert パターンに従っているか?
- [ ] セレクタは Page Object に集中管理されているか?
- [ ] ボタン・アラートなどのUIコンポーネントに `data-testid` 属性を付与しているか?
  - フォームフィールドは `name` 属性（react-hook-form の仕様）で識別可
  - ボタン・エラー表示・アクション要素には `data-testid` を付与する
- [ ] `tests/e2e/fixtures/index.ts` の `test.extend()` Fixtures を使っているか?
  - 認証済み状態は `authenticatedPage` Fixture を使い `beforeEach` での重複を避ける
- [ ] 状態ベースの待機（`toBeVisible`/`toBeHidden`/`waitForURL`）を使用しているか?
- [ ] `waitForTimeout` を使う場合、理由をコメントで明記しているか?
- [ ] エラーメッセージのアサーションが具体的か?
- [ ] テストデータは `beforeEach` またはテスト内で準備しているか?

### 実装後の確認事項

- [ ] テストが単独で実行できるか?
- [ ] テストが順序を入れ替えても成功するか?
- [ ] テストを複数回実行しても成功するか?
- [ ] 失敗時のエラーメッセージが分かりやすいか?
- [ ] 不要な `test.skip` や `.only` がないか?
- [ ] クリーンアップ処理が適切か?

### レビュー時の確認事項

- [ ] 本末転倒の禁止ルールに違反していないか?
  - [ ] テストを通すために実装を変更していないか?
  - [ ] 成功しないテストをスキップしていないか?
  - [ ] 実装に合わせてテストの検証観点を歪めていないか?
- [ ] あるべき姿論に従っているか?
  - [ ] 仕様を正しく検証しているか?
  - [ ] テストが実装の正当性を検証しているか?
- [ ] データのスタンドアロン性を保っているか?
  - [ ] 他のテストのデータに依存していないか?
  - [ ] マスタデータのみに依存しているか?
- [ ] テストの品質は十分か?
  - [ ] アサーションが具体的で明確か?
  - [ ] エラーケースも網羅しているか?

---

## 🚀 実践ガイド

### ケーススタディ 1: テストが失敗した場合の対応

#### シナリオ

```typescript
test('記事作成後、一覧に表示される', async ({ page }) => {
  const user = await createTestUser({...});
  await signIn(page, user.email, user.password);

  await page.goto('/articles/new');
  await page.fill('[data-testid="title"]', 'Test Article');
  await page.fill('[data-testid="content"]', 'Test content');
  await page.click('[data-testid="create-button"]');

  // 失敗: 要素が見つからない
  await expect(page.locator('[data-testid="article-list-item"]')).toBeVisible();
});
```

#### 対応フロー

1. **実装を確認**: 実際にどう動作しているか確認
2. **仕様を確認**: どう動作すべきか確認
3. **判断**: 実装が正しいか、仕様が正しいか

**ケース A: 実装が間違っている**

```typescript
// 実装を修正（例: リダイレクトロジックの追加）
// src/app/server-actions/article/createArticleAction.ts
export async function createArticleAction(formData: FormData) {
  // 記事作成処理
  const result = await useCase.execute({...});

  if (result.isOk()) {
    // ✅ 修正: 一覧ページにリダイレクト追加
    redirect('/articles');
  }

  return result;
}

// テストはそのまま
```

**ケース B: テストのセレクタが間違っている**

```typescript
// テストを修正
test('記事作成後、一覧に表示される', async ({ page }) => {
  const user = await createTestUser({...});
  await signIn(page, user.email, user.password);

  const articleTitle = `Test Article ${Date.now()}`;

  await page.goto('/articles/new');
  await page.fill('[data-testid="title"]', articleTitle);
  await page.fill('[data-testid="content"]', 'Test content');
  await page.click('[data-testid="create-button"]');

  // ✅ 修正: 正しいセレクタに変更
  await expect(page).toHaveURL('/articles');
  await expect(page.locator(`text="${articleTitle}"`)).toBeVisible();
});
```

### ケーススタディ 2: データ準備の最適化

#### 問題: テスト実行が遅い

```typescript
// ❌ 各テストで重複したデータ準備
describe('記事管理', () => {
  test('記事を表示', async ({ page }) => {
    const user = await createTestUser({...});
    const category = await createTestCategory({...}); // 遅い
    const tags = await createTestTags([...]); // 遅い
    const article = await createTestArticle({...});

    // テスト実行
  });

  test('記事を編集', async ({ page }) => {
    const user = await createTestUser({...});
    const category = await createTestCategory({...}); // 重複
    const tags = await createTestTags([...]); // 重複
    const article = await createTestArticle({...});

    // テスト実行
  });
});
```

#### 解決策: マスタデータとテストデータの分離

```typescript
// ✅ マスタデータはシードで事前準備
// src/layers/infrastructure/persistence/prisma/seeds/e2e/seedCategories.ts
export async function seedCategories() {
  await prisma.$transaction(async (t) => {
    await t.category.upsert({
      where: { id: 'cat1000000000000000000' },
      create: { id: 'cat1000000000000000000', name: 'Technology', slug: 'technology' },
      update: { name: 'Technology', slug: 'technology' },
    });
  });
}

// テストではマスタデータを参照
describe('記事管理', () => {
  const MASTER_CATEGORY_ID = 'cat1000000000000000000';

  test('記事を表示', async ({ page }) => {
    const user = await createTestUser({...});

    // マスタデータを使用（作成不要）
    const article = await createTestArticle({
      authorId: user.id,
      categoryId: MASTER_CATEGORY_ID,
      // ...
    });

    // テスト実行（高速化）
  });
});
```

### ケーススタディ 3: フレーク（不安定）なテストの修正

#### 問題: テストが時々失敗する

```typescript
// ❌ レースコンディション発生
test('記事作成後に一覧表示', async ({ page }) => {
  await page.goto('/articles/new');
  await page.fill('[data-testid="title"]', 'Test');
  await page.click('[data-testid="create-button"]');

  // ❌ リダイレクト完了前に検証
  await expect(page.locator('[data-testid="article-list"]')).toBeVisible();
});
```

#### 解決策: 適切な待機処理

```typescript
// ✅ 状態ベースの待機
test('記事作成後に一覧表示', async ({ page }) => {
  await page.goto('/articles/new');
  await page.fill('[data-testid="title"]', 'Test');
  await page.click('[data-testid="create-button"]');

  // ✅ リダイレクトを待機
  await page.waitForURL('/articles');

  // ✅ ローディング完了を待機
  await expect(page.locator('[data-testid="loading"]')).toBeHidden();

  // ✅ 要素の表示を待機
  await expect(page.locator('[data-testid="article-list"]')).toBeVisible();
});
```

---

## 📚 関連ドキュメント

- **[テストパターン](../test-patterns/SKILL.md)** - ユニットテスト・E2Eテスト実装パターン（POM + Fixtures 詳細）
- **[Page Objects](../../../tests/e2e/pages/)** - ページ操作をカプセル化したクラス群
- **[Fixtures](../../../tests/e2e/fixtures/index.ts)** - `test.extend()` による共通セットアップ定義
- **[DBシード冪等性](../db-seed-idempotency/SKILL.md)** - マスタデータの準備
- **[Clean Architecture](../../../_DOCS/architecture/overview.md)** - アーキテクチャ全体像

---

**🎯 E2Eテストの本質を理解し、あるべき姿を追求しましょう!**
