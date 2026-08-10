---
name: test-di-setup
description: |
  テストファイルのDIコンテナセットアップを効率化するスキル。
  registerMockServices() / createDefaultMocks() の使用を強制し、
  手動の container.clearInstances() + container.registerInstance() ボイラープレートを禁止する。

  トリガー例:
  - 「テストDI」「DIセットアップ」「モック登録」
  - container.clearInstances, container.registerInstance を書こうとしたとき
  - *.test.ts ファイルで beforeEach を書くとき
  - tests/unit/usecases/ 配下のファイル作成・編集時
---

# テスト DI セットアップパターン

## このスキルの目的

- テストの `beforeEach` ボイラープレートを最小化する
- `tests/utils/setup/diSetup.ts` のユーティリティを活用させる
- 一貫したテストセットアップパターンを維持する

## 標準パターン

```typescript
import { createDefaultMocks, registerMockServices } from '@tests/utils/setup/diSetup';
import { resolve } from '@/di/resolver';

describe('MyUseCase', () => {
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;
  let useCase: MyUseCase;

  beforeEach(() => {
    // ✅ 正しい: createDefaultMocks + registerMockServices
    const mocks = createDefaultMocks({ userRepository: true, logger: true });
    mockUserRepository = mocks.mockUserRepository;
    mockLogger = mocks.mockLogger;
    registerMockServices({
      userRepository: mockUserRepository,
      logger: mockLogger,
    });
    useCase = resolve('MyUseCase');
  });
});
```

## 追加トークン（GetCurrentUserUseCase等）

標準サービス以外のモックは `extraTokens` で渡す:

```typescript
import { INJECTION_TOKENS } from '@/di/tokens';
import { mock } from 'vitest-mock-extended';

const mockGetCurrentUserUseCase = mock<GetCurrentUserUseCase>();

registerMockServices(
  { userRepository: mockUserRepository, logger: mockLogger },
  [[INJECTION_TOKENS.GetCurrentUserUseCase, mockGetCurrentUserUseCase]],
);
```

## 禁止パターン

```typescript
// ❌ 禁止: 手動の clearInstances
beforeEach(() => {
  container.clearInstances(); // グローバル setup.ts で実行済み
  // ...
});

// ❌ 禁止: 手動の registerInstance ボイラープレート
container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);
container.registerInstance(INJECTION_TOKENS.HashService, mockHashService);

// ❌ 禁止: createAutoMock* の直接使用（createDefaultMocks 経由で使う）
mockUserRepository = createAutoMockUserRepository();
mockLogger = createAutoMockLogger();
```

## グローバル setup.ts との関係

`tests/setup.ts` は以下を全テストの `beforeEach` で自動実行:
- `container.clearInstances()` — DIコンテナクリア
- `faker.seed(12345)` — テストデータの再現性確保

`registerMockServices()` も内部で `clearInstances()` を呼ぶため、
テストファイル内での手動呼び出しは完全に不要。

## PrismaClient モック

`container.test.ts` 等でPrismaClientのモックが必要な場合:

```typescript
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';

// ✅ 正しい: 共通ヘルパーを使用
const mockPrisma = createMockPrismaClient();

// ❌ 禁止: vi.fn() で手動構築
const mockPrisma = { user: { create: vi.fn(), findUnique: vi.fn(), ... } };
```

## チェックリスト

- [ ] `container.clearInstances()` を手動で呼んでいない
- [ ] `container.registerInstance()` を直接使っていない
- [ ] `createDefaultMocks()` + `registerMockServices()` パターンを使用
- [ ] `createAutoMock*` を直接importしていない（`createDefaultMocks` 経由）
- [ ] 追加トークンは `extraTokens` 引数で渡している

## サービス登録のDRYパターン

`registerMockServices` 内での個別 if チェーンは tokenマッピングオブジェクト + ループに統一すること。

```tsx
const SERVICE_TOKEN_MAP: Record<string, symbol> = {
  userRepository: INJECTION_TOKENS.UserRepository,
  sessionRepository: INJECTION_TOKENS.SessionRepository,
  // ...
};

for (const [key, token] of Object.entries(SERVICE_TOKEN_MAP)) {
  const instance = services[key as keyof MockServiceMap];
  if (instance) container.registerInstance(token, instance);
}
```

## 関連スキル

- `test-patterns` — テスト全般
- `test-factory-patterns` — テストデータ生成
- `test-config-optimization` — テスト設定最適化
