# vitest-mock-extended セットアップ・使用方法 🎭

このドキュメントでは、`vitest-mock-extended` の使用方法とよくある問題の解決方法について説明します。

---

## 概要

### 🎯 目的

- **手動モック作成の手間を削減**
- **TypeScript interface から自動モック生成**
- **完全な型安全性を確保**
- **メンテナンス負荷を軽減**

### 📊 効果比較

| 項目 | 従来の手動モック | vitest-mock-extended |
|------|-----------------|---------------------|
| 生産性 | ⭐⭐ 手動メンテナンス | ⭐⭐⭐⭐⭐ 1行で完了 |
| 型安全性 | ⭐⭐⭐ `as any` で妥協 | ⭐⭐⭐⭐⭐ 完全対応 |
| メンテナンス | ⭐ 手動で毎回更新 | ⭐⭐⭐⭐⭐ 自動更新 |

---

## 基本的な使用方法

### 1. 基本的なモック生成

```typescript
import { mock, MockProxy } from 'vitest-mock-extended';

// interface から自動モック生成
const mockUserRepository: MockProxy<IUserRepository> = mock<IUserRepository>();

// 型安全なモック設定
mockUserRepository.save.mockResolvedValue(undefined);
mockUserRepository.findById.mockResolvedValue(user);
```

### 2. ヘルパー関数の作成

```typescript
// tests/utils/mocks/autoMocks.ts
import { mock, MockProxy } from 'vitest-mock-extended';

export const createAutoMockUserRepository = (): MockProxy<IUserRepository> => 
  mock<IUserRepository>();

export const createAutoMockUserDomainService = (): MockProxy<UserDomainService> => 
  mock<UserDomainService>();
```

### 3. テストでの使用

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createAutoMockUserRepository } from '../../utils/mocks/autoMocks';

describe('CreateUserUseCase', () => {
  let mockUserRepository: MockProxy<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = createAutoMockUserRepository();
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  });

  it('正常系: ユーザー作成が成功する', async () => {
    // 型安全なモック設定
    mockUserRepository.save.mockResolvedValue(undefined);
    
    const useCase = container.resolve(CreateUserUseCase);
    const result = await useCase.execute(validInput);
    
    // 型安全なアサーション
    expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));
  });
});
```

---

## よくある問題と解決方法

### 🚨 問題1: 型エラー "Property does not exist"

**症状**:

```typescript
// ❌ エラー: Property 'someMethod' does not exist
mockService.someMethod.mockResolvedValue(result);
```

**原因**: interface の定義が正しくない、または import が間違っている

**解決方法**:

```typescript
// ✅ interface の定義を確認
export interface IUserService {
  someMethod(param: string): Promise<Result>; // メソッドが定義されているか確認
}

// ✅ 正しい import
import type { IUserService } from '@/layers/domain/services/IUserService';
const mockService = mock<IUserService>();
```

### 🚨 問題2: MockProxy 型エラー

**症状**:

```typescript
// ❌ Type 'MockProxy<IService>' is not assignable to type 'IService'
container.registerInstance(INJECTION_TOKENS.Service, mockService);
```

**解決方法**:

```typescript
// ✅ 型アサーションを使用
container.registerInstance(INJECTION_TOKENS.Service, mockService as IService);

// または

// ✅ MockProxy 型を明示的に使用
let mockService: MockProxy<IService>;
beforeEach(() => {
  mockService = mock<IService>();
  container.registerInstance(INJECTION_TOKENS.Service, mockService);
});
```

### 🚨 問題3: ディープモックが必要な場合

**症状**:

```typescript
// ❌ ネストしたオブジェクトのプロパティがモックされない
mockService.config.database.host; // undefined
```

**解決方法**:

```typescript
import { mockDeep } from 'vitest-mock-extended';

// ✅ ディープモックを使用
const mockService = mockDeep<IComplexService>();
mockService.config.database.host.mockReturnValue('localhost');
```

### 🚨 問題4: 条件付きモック設定

**症状**: 特定の引数でのみ異なる値を返したい

**解決方法**:

```typescript
// ✅ 条件付きモック設定
mockRepository.findById
  .calledWith('user-1').mockResolvedValue(user1)
  .calledWith('user-2').mockResolvedValue(user2);

// または

// ✅ mockImplementation を使用
mockRepository.findById.mockImplementation(async (id: string) => {
  if (id === 'user-1') return user1;
  if (id === 'user-2') return user2;
  return null;
});
```

### 🚨 問題5: 既存の手動モックとの混在

**症状**: 既存テストと新しいテストが混在している

**解決方法**:

```typescript
// ✅ 段階的移行パターン
describe('UserService', () => {
  // 既存テスト（そのまま残す）
  describe('legacy tests', () => {
    const mockRepo = createMockUserRepository(); // 従来の手動モック
    // ... 既存のテスト
  });

  // 新しいテスト（vitest-mock-extended を使用）
  describe('new tests', () => {
    const mockRepo = mock<IUserRepository>(); // 自動モック
    // ... 新しいテスト
  });
});
```

---

## 高度な使用方法

### 1. パーシャルモック

```typescript
// 一部のプロパティのみモック
const partialMock = mock<IUserService>({
  getUserName: () => 'Test User', // 固定値
  // 他のメソッドは自動モック
});
```

### 2. スパイモック

```typescript
// 実際の実装を呼び出しつつモック
const spyMock = mock<IUserService>();
spyMock.someMethod.mockImplementation(async (param) => {
  // 実際の処理 + テスト用の処理
  const result = await realService.someMethod(param);
  return { ...result, testFlag: true };
});
```

### 3. モックのリセット

```typescript
beforeEach(() => {
  // 全モックをリセット
  vi.clearAllMocks();
  
  // 特定のモックのみリセット
  mockUserRepository.mockClear();
});
```

---

## ベストプラクティス

### ✅ 推奨パターン

```typescript
// 1. ヘルパー関数を作成
export const createAutoMockUserRepository = () => mock<IUserRepository>();

// 2. beforeEach でモック初期化
beforeEach(() => {
  mockRepo = createAutoMockUserRepository();
  container.registerInstance(INJECTION_TOKENS.UserRepository, mockRepo);
});

// 3. テスト内で型安全な設定
it('should work', async () => {
  mockRepo.save.mockResolvedValue(undefined);
  // テスト実行
});
```

### ❌ 避けるべきパターン

```typescript
// ❌ 型安全性を損なう
const mockRepo = { save: vi.fn() } as any;

// ❌ 手動でメソッドを列挙
const mockRepo = {
  save: vi.fn(),
  findById: vi.fn(),
  // 新メソッド追加のたびに手動更新...
};

// ❌ グローバルなモック（テスト間で影響）
const globalMock = mock<IService>();
```

---

## 移行ガイド

### 段階的移行手順

1. **新規テストから開始**

   ```typescript
   // 新しいテストファイルでは必ず vitest-mock-extended を使用
   const mockService = mock<IService>();
   ```

2. **ヘルパー関数の作成**

   ```typescript
   // tests/utils/mocks/autoMocks.ts に追加
   export const createAutoMockNewService = () => mock<INewService>();
   ```

3. **既存テストの段階的更新**

   ```typescript
   // 必要に応じて既存テストも更新（無理に一度にやらない）
   ```

### 移行チェックリスト

- [ ] 新規テストで `vitest-mock-extended` を使用
- [ ] ヘルパー関数を `autoMocks.ts` に追加
- [ ] 型安全性を確保（`MockProxy<T>` 型を使用）
- [ ] 既存テストは段階的に移行

---

## 関連ドキュメント

- [テスト戦略](../testing-strategy.md) - 全体的なテスト方針
- [開発ガイド](../development-guide.md) - 開発フローでのテスト実装
- [依存性注入](../dependency-injection.md) - DIコンテナとの連携

---

**💡 Tip**: 問題が発生したら、まず interface の定義と import パスを確認してください。多くの問題はここで解決できます。
