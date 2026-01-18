---
name: testing-patterns
description: |
  Jestを使用したテストコードのパターンとベストプラクティスを提供する。
  「テストを書く」「テストを作成」「ユニットテスト」「Jestテスト」で適用される。
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Testing Patterns (Jest)

Jestを使用したテストのベストプラクティスとパターン。

## 適用条件

このスキルは以下の状況で自動的に適用される：

- テストファイル（`.test.ts`, `.spec.ts`）を作成するとき
- 「テストを書いて」と依頼されたとき
- Jest関連の質問をされたとき

## 基本原則

### AAAパターン

すべてのテストは Arrange-Act-Assert パターンで構造化する:

```typescript
test('should calculate total price', () => {
  // Arrange: 準備
  const cart = new ShoppingCart();
  cart.addItem({ name: 'Apple', price: 100 });
  cart.addItem({ name: 'Banana', price: 50 });

  // Act: 実行
  const total = cart.calculateTotal();

  // Assert: 検証
  expect(total).toBe(150);
});
```

### 命名規則

```typescript
// ✅ Good: 何をテストし、どうなるべきかが明確
test('should return empty array when no items match filter', () => {});
test('should throw error when user is not authenticated', () => {});

// ❌ Bad: 曖昧な命名
test('filter works', () => {});
test('test auth', () => {});
```

## テストパターン

### 非同期テスト

```typescript
// async/await を使用
test('should fetch user data', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Alice');
});

// Promiseを返す
test('should fetch user data', () => {
  return fetchUser(1).then(user => {
    expect(user.name).toBe('Alice');
  });
});
```

### モック

```typescript
// 関数のモック
const mockCallback = jest.fn();
mockCallback.mockReturnValue(42);

// モジュールのモック
jest.mock('./api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'test' })
}));
```

### エラーテスト

```typescript
test('should throw on invalid input', () => {
  expect(() => validateEmail('invalid')).toThrow('Invalid email format');
});

// 非同期エラー
test('should reject on network error', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('Not found');
});
```

## ファイル構造

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx    # コンポーネントと同じディレクトリ
├── utils/
│   ├── format.ts
│   └── format.test.ts
└── __tests__/              # 統合テスト用
    └── integration/
        └── checkout.test.ts
```

## サポートスクリプト

| ファイル | 説明 |
|---------|------|
| `./scripts/run-related.sh` | 変更ファイルに関連するテストのみ実行 |

## チェックリスト

テスト作成時に確認:

- [ ] AAAパターンに従っているか
- [ ] テスト名が明確か
- [ ] エッジケースをカバーしているか
- [ ] モックが適切に使われているか
- [ ] 非同期処理が正しくハンドリングされているか
