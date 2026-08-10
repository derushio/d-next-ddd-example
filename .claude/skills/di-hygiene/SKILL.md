---
name: di-hygiene
description: |
  DI（依存性注入）コンテナの衛生管理パターンを提供するスキル。
  未使用@inject検出、@deprecatedサービスライフサイクル、
  Token/TypeMapクリーンアップを扱う。

  トリガー例:
  - 「未使用DI」「@deprecated」「コンテナクリーンアップ」
  - 「injection token」「TypeMap」「safeRegister」
  - 「DIサービス削除」「未使用サービス」「コンテナ整理」
  - src/di/ 配下の編集時
---

# DI Hygiene Skill

TSyringe DIコンテナの衛生管理パターンを提供します。
未使用 `@inject` の検出、`@deprecated` サービスの完全削除ライフサイクル、
Token/TypeMapのクリーンアップ手順を支援します。

---

## 1. 未使用 `@inject` パラメータの検出

### アンダースコアプレフィックスは「未使用」の慣習的サイン

```typescript
// ⚠️ 要注意: _xxx は「このパラメータは使っていない」という慣習的サイン
@injectable()
export class SomeUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,

    @inject(INJECTION_TOKENS.Logger)
    private _logger: ILogger,  // ← _logger: この inject は本当に必要か確認
  ) {}
}
```

アンダースコアプレフィックスが付いているパラメータは：
1. 元々使う予定だったが不要になったもの
2. リファクタリング後に参照が消えたもの

が多い。**`@inject` を残したまま未使用にするのは禁止**。
削除するか、実際に使用するかのどちらかに整理すること。

### 検出方法

```bash
# _xxx パラメータで @inject されているものを検索
grep -rn "@inject" src/ --include="*.ts" | grep "_[a-z]"

# 未使用 import を一括チェック（pnpm check で検出される）
pnpm check
```

---

## 2. `@deprecated` サービスの完全削除ライフサイクル

サービスを削除する際は、以下の順序で進めること。
**一括削除は禁止**（参照が残ると実行時エラーになる）。

### フェーズ1: 移行準備（@deprecated 注記追加）

```typescript
/**
 * @deprecated このサービスは非推奨です。
 * CreateUserUseCase 内のビジネスロジックに統合されました。
 * 新規実装では UseCase を直接使用してください。
 * 削除予定: 全参照箇所の移行完了後
 */
@injectable()
export class LegacyUserService {
  // ...
}
```

### フェーズ2: 全参照箇所を新実装に移行

```bash
# 参照箇所を検索
grep -rn "LegacyUserService\|INJECTION_TOKENS.LegacyUserService" src/ --include="*.ts"
```

各参照箇所を新実装（UseCase等）に切り替える。
移行完了後、参照が0件であることを確認してからフェーズ3へ。

### フェーズ3: DIコンテナから `safeRegister` 呼び出しを削除

```typescript
// src/di/containers/infrastructure.container.ts または application.container.ts

// ❌ 削除する行
safeRegister(
  applicationContainer,
  INJECTION_TOKENS.LegacyUserService,
  LegacyUserService,
);
```

### フェーズ4: サービスファイル本体を削除

```bash
rm src/layers/application/services/LegacyUserService.ts
# または
rm src/layers/infrastructure/services/LegacyUserService.ts
```

### フェーズ5: `INJECTION_TOKENS` と `ServiceTypeMap` からエントリ削除

```typescript
// src/di/tokens.ts

export const INJECTION_TOKENS = {
  // ...
  // ❌ 削除する行
  LegacyUserService: Symbol.for('LegacyUserService'),
} as const;

export interface ServiceTypeMap {
  // ...
  // ❌ 削除する行
  LegacyUserService: ILegacyUserService;
}
```

### フェーズ6: 関連テストファイルを削除

```bash
rm src/layers/application/services/__tests__/LegacyUserService.test.ts
```

### フェーズ7: 孤立したimportの掃除

```bash
# 削除したサービスのimportが残っていないか確認
grep -rn "LegacyUserService" src/ --include="*.ts"
# 0件であることを確認
pnpm check  # 型エラーと未使用importがないことを確認
```

---

## 3. Token/TypeMap クリーンアップチェックリスト

サービスを追加・削除した際に必ず確認すること：

### 追加時
- [ ] `INJECTION_TOKENS` に `Symbol.for('<ServiceName>')` を追加
- [ ] `ServiceTypeMap` に型エントリを追加
- [ ] 適切なコンテナ（core/infrastructure/application）に `safeRegister` を追加
- [ ] テストファイルで `mockDeep<T>()` または `mock<T>()` を使用したモックを追加

### 削除時
- [ ] 全参照箇所（`@inject`、`resolve()`、`container.resolve()` 等）を確認・削除
- [ ] `safeRegister` 呼び出しを削除
- [ ] ファイル自体を削除
- [ ] `INJECTION_TOKENS` からエントリ削除
- [ ] `ServiceTypeMap` からエントリ削除
- [ ] `import type { ... }` の孤立インポートを削除
- [ ] 関連テストファイルを削除
- [ ] `pnpm check` で型エラー0件を確認

---

## 4. TSyringe 固有の注意点

### `container.clearInstances()` のスコープ

```typescript
// ⚠️ 注意: clearInstances() は root container の全インスタンスをクリアする
container.clearInstances();  // root container に影響

// ✅ テスト推奨: child container を使ってスコープを限定
const testContainer = container.createChildContainer();
// テスト終了後
testContainer.reset();  // child container のみをリセット
```

このプロジェクトでは `setupTestEnvironment()` ヘルパーがクリーンアップを自動管理します：

```typescript
// src/tests/utils/helpers/testHelpers.ts
export function setupTestEnvironment(): void {
  beforeEach(() => {
    container.clearInstances();
    // DIコンテナを再初期化
  });
}
```

テストで `setupTestEnvironment()` を呼んでいれば、手動で `clearInstances()` を呼ぶ必要はありません。

### child container vs root container

| コンテナ | 用途 |
|----------|------|
| `coreContainer` | PrismaClient, ConfigService等の基盤サービス |
| `infrastructureContainer` | `coreContainer` の子。Repository・インフラサービス |
| `applicationContainer` | `infrastructureContainer` の子。UseCase |

child container は親のregistrationを継承するため、
**child containerで `safeRegister` したサービスは root container からは見えない**。
`container.resolve()` ではなく `applicationContainer.resolve()` または `resolve()` ヘルパーを使うこと。

```typescript
// src/di/resolver.ts
import { applicationContainer } from '@/di/containers/application.container';
import type { ServiceType, ServiceTypeMap } from '@/di/tokens';

export function resolve<K extends keyof ServiceTypeMap>(
  token: K,
): ServiceType<K> {
  return applicationContainer.resolve<ServiceType<K>>(INJECTION_TOKENS[token]);
}
```

---

## 5. テストモックの DI 変更追従

サービスを追加・削除した際、テストのモック設定も同期させること：

```typescript
// ✅ 正しいテストパターン（vitest-mock-extended）
import { mock, mockDeep } from 'vitest-mock-extended';
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

describe('CreateUserUseCase', () => {
  setupTestEnvironment();

  let useCase: CreateUserUseCase;
  let mockUserRepository: MockProxy<IUserRepository>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    mockUserRepository = mock<IUserRepository>();
    mockLogger = mock<ILogger>();

    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    useCase = container.resolve(CreateUserUseCase);
  });
});
```

サービスを削除した場合:
1. そのサービスの `mockInstance` 定義を削除
2. `container.registerInstance(INJECTION_TOKENS.DeletedService, ...)` を削除
3. テスト内でそのサービスに依存するアサーション（`expect(mockDeletedService.xxx).toHaveBeenCalled()` 等）を削除
4. `pnpm test:unit` で全テストが通ることを確認

---

## 6. 実例: このプロジェクトでのサービス削除（v2近代化）

v2近代化の作業では、以下の冗長なサービスが削除されました。

### 削除されたサービス群

- **AuthService**: 認証ロジックを UseCase（`SignInUseCase`, `SignOutUseCase`等）に統合
- **TokenService**: JWT/トークン管理を `AuthSessionService` に統合
- **UserService**: ユーザー操作を UseCase（`CreateUserUseCase`, `UpdateUserUseCase`等）に統合

### 削除の判断基準

- UseCase が直接 Repository を呼べば済む処理を Service が仲介していた（冗長な間接層）
- Service が UseCase の orchestration を複製していた（DRY違反）
- `@inject` 先のパラメータが実際には使われていなかった（アンダースコアプレフィックスで露呈）

### 削除後の確認事項

```bash
# 型エラーがないこと
pnpm check

# 全テストが通ること
pnpm test:unit

# DIコンテナ初期化ログが正常出力されること（devサーバー起動時）
make dev
```

---

## 関連スキル

- **best-practices**: Clean Architecture全体のパターン
- **infrastructure-impl**: Repository実装とDIコンテナ登録
- **test-patterns**: `setupTestEnvironment()` とモックパターン
