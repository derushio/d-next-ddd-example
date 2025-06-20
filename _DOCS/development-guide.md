# 開発ガイド 🛠️

このドキュメントでは、新機能開発時の実装手順とベストプラクティスについて説明します。

---

## 開発フロー

### 🚀 クイックスタート

```bash
# 1. 依存関係インストール
pnpm install

# 2. 開発環境セットアップ
make setup

# 3. 開発サーバー起動
pnpm dev
```

### 📋 開発時の基本コマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test         # Unit + E2E テスト
pnpm test:unit    # ユニットテストのみ
pnpm test:watch   # ウォッチモード

# コード品質チェック
pnpm lint         # ESLint実行
pnpm format       # Prettier実行
pnpm type-check   # TypeScript型チェック

# ビルド
pnpm build        # 本番ビルド
```

---

## 新機能開発手順

### 1. UseCase 作成

新しい機能は UseCase から始めます。

```typescript
// src/layers/application/usecases/[feature]/[Action]UseCase.ts
import { injectable, inject } from 'tsyringe';
import { resolve } from '@/layers/infrastructure/di/container';

@injectable()
export class CreateProductUseCase {
  async execute(data: CreateProductRequest): Promise<ProductResponse> {
    // 1. サービス取得
    const productDomainService = resolve('ProductDomainService');
    const productRepository = resolve('ProductRepository');
    const logger = resolve('Logger');

    // 2. ビジネスルール検証
    await productDomainService.validateProductData(data);
    
    // 3. データ操作
    const product = await productRepository.create(data);
    
    // 4. ログ・結果返却
    logger.info('商品作成完了', { productId: product.id });
    return product;
  }
}
```

### 2. Domain Service 作成（必要に応じて）

ビジネスロジックがある場合はDomain Serviceを作成します。

```typescript
// src/layers/domain/services/ProductDomainService.ts
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IHashService } from '@/services/infrastructure/HashService';

@injectable()
export class ProductDomainService {
  constructor(
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService
  ) {}
  
  async validateProductData(data: CreateProductData): Promise<void> {
    if (!data.name || data.name.length < 2) {
      throw new Error('商品名は2文字以上で入力してください');
    }
    
    if (data.price <= 0) {
      throw new Error('価格は0より大きい値を入力してください');
    }
  }
}
```

### 3. Repository 作成

データアクセスが必要な場合はRepositoryを作成します。

```typescript
// src/layers/domain/repositories/IProductRepository.ts
export interface IProductRepository {
  create(data: CreateProductData): Promise<Product>;
  findById(id: string): Promise<Product | null>;
}

// src/layers/infrastructure/repositories/implementations/PrismaProductRepository.ts
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

@injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient
  ) {}
  
  async create(data: CreateProductData): Promise<Product> {
    return await this.prisma.product.create({ data });
  }
}
```

### 4. DI登録

新しいサービスをDIコンテナに登録します。

**📌 重要：DIトークン追加手順**

新しいサービスを作成した場合、**必ず以下の手順を踏んでください**：

1. **`src/layers/infrastructure/di/tokens.ts`にトークンとインポートを追加**:

```typescript
// 型インポート追加
import type { UpdateUserUseCase } from '@/layers/application/usecases/UpdateUserUseCase';

// INJECTION_TOKENSにトークン追加
export const INJECTION_TOKENS = {
  // 既存のトークン...
  UpdateUserUseCase: Symbol.for('UpdateUserUseCase'),
} as const;

// ServiceTypeMapに型定義追加
export interface ServiceTypeMap {
  // 既存の型定義...
  UpdateUserUseCase: UpdateUserUseCase;
}
```

2. **サービスクラスに`@injectable()`デコレータと依存性注入設定を追加**:

```typescript
import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository) 
    private readonly userRepository: IUserRepository
  ) {}
}
```

3. **適切なコンテナファイルに登録**:

```typescript
container.registerSingleton(INJECTION_TOKENS.UpdateUserUseCase, UpdateUserUseCase);
```

**⚠️ 注意**: `'ServiceName' as any` のような型安全性を損なう書き方は禁止です。

**分離されたDIコンテナアーキテクチャ**

本プロジェクトは Clean Architecture の層に基づいてDIコンテナを分離しています：

```
Core Container (基盤層)
└── Infrastructure Container (インフラ層) 
    └── Domain Container (ドメイン層)
        └── Application Container (アプリケーション層)
```

新しいサービスは適切な層のコンテナファイルに登録してください：

- **Core層**: `src/di/containers/core.container.ts` - PrismaClient, ConfigService
- **Infrastructure層**: `src/di/containers/infrastructure.container.ts` - HashService, Logger, Repository実装
- **Domain層**: `src/di/containers/domain.container.ts` - ドメインサービス
- **Application層**: `src/di/containers/application.container.ts` - UseCase, Legacy Service

参考実装: [DIコンテナ分離アーキテクチャ](../../src/di/containers/)

### 5. Server Action 作成

フロントエンドとの連携にはServer Actionを作成します。

```typescript
// src/app/server-actions/product/createProduct.ts
'use server';
import { resolve } from '@/layers/infrastructure/di/container';

export async function createProduct(formData: FormData) {
  const createProductUseCase = resolve('CreateProductUseCase');
  
  try {
    const result = await createProductUseCase.execute({
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
    });
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Component 開発

### Server Components (推奨)

```typescript
// src/components/ProductList.tsx
import { resolve } from '@/layers/infrastructure/di/container';

export async function ProductList() {
  const productRepository = resolve('ProductRepository');
  const products = await productRepository.findAll();
  
  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Client Components

```typescript
// src/components/ProductForm.tsx
'use client';
import { useServices } from '@/hooks/useServices';

export function ProductForm() {
  const { logger } = useServices();
  
  const handleSubmit = async (formData: FormData) => {
    logger.info('フォーム送信開始');
    // Server Action呼び出し
  };
  
  return <form action={handleSubmit}>...</form>;
}
```

---

## モジュール参照ルール

プロジェクト全体で一貫性を保つため、以下のモジュール参照ルールを厳守してください：

## 相対参照の禁止

- **相対参照（`./` や `../`）は禁止**
- 必ず alias参照（`@/*`）を使用する
- **テストファイルでも `@/*` を使用可能**（`@tests/*` はテスト用ユーティリティ向け）

```typescript
// ❌ 相対参照 - 禁止
import { UserService } from './UserService';
import { IUserRepository } from '../interfaces/IUserRepository';

// ✅ alias参照 - 推奨（テストファイルでも同様）
import { UserService } from '@/services/application/UserService';
import { IUserRepository } from '@/repositories/interfaces/IUserRepository';

// テストファイル内（src配下のモジュール）
import { User } from '@/layers/domain/entities/User';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';

// テストファイル内（テスト用ユーティリティ）
import { createMockPrismaClient } from '@tests/utils/mocks/commonMocks';
import { setupTestDatabase } from '@tests/utils/testDatabase';
```

## 設定済みのalias

- `@/*` → `./src/*`（メインコード・テストコード両方で使用可）
- `@tests/*` → `./tests/*`（テスト用ユーティリティ向け）
- `@prisma/generated/*` → `./prisma/generated/*`

## 自動チェック

- ESLint で相対参照の使用を自動検出・エラー化
- Prettier で alias参照を優先してソート

---

# テスト実装

新しい機能には必ずテストを実装します。

### 🎭 モック戦略

**なぜ**: 手動でモックメソッドを追加する手間を削減し、型安全性を確保するため  
**いつ**: ユニットテストでRepository・Service・外部依存をモックする際  
**どう**: `vitest-mock-extended` でTypeScript interfaceから自動モック生成

```typescript
// 従来（手動・非効率）
const mockRepo = { save: vi.fn(), findById: vi.fn() }; // メソッド追加のたびに手動更新

// 新方式（自動・型安全）
const mockRepo = mock<IProductRepository>(); // interface全メソッドが自動生成
```

### UseCase テスト例

```typescript
// tests/unit/usecases/CreateProductUseCase.test.ts
import { mock } from 'vitest-mock-extended';

describe('CreateProductUseCase', () => {
  it('商品作成が成功する', async () => {
    // 自動モック生成（1行で完了）
    const mockRepository = mock<IProductRepository>();
    const mockDomainService = mock<ProductDomainService>();
    
    // 型安全なモック設定
    mockDomainService.validateProductData.mockResolvedValue(undefined);
    mockRepository.save.mockResolvedValue(undefined);
    
    // DIコンテナに登録してテスト実行
    container.registerInstance(INJECTION_TOKENS.ProductRepository, mockRepository);
    const useCase = container.resolve(CreateProductUseCase);
    
    const result = await useCase.execute({ name: 'テスト商品', price: 1000 });
    
    expect(result.name).toBe('テスト商品');
    expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Product));
  });
});
```

**適用ルール**: テストは必ず自動モックを使用すること

詳細は [testing-strategy.md](./testing-strategy.md) を参照してください。

---

## ベストプラクティス

### ✅ 推奨パターン

- **UseCase First**: 機能はUseCaseから設計開始
- **コンストラクター注入**: サービス層では `@inject` を使用した依存注入を推奨
- **分離コンテナ**: 新しいサービスは適切な層のコンテナに登録
- **Server Components優先**: クライアント処理が不要ならServer Components
- **型安全性**: TypeScriptの型を最大限活用
- **テスト駆動**: 実装と同時にテストを作成

### ❌ 避けるべきパターン

- サービス層での `resolve()` 関数の使用（循環依存の原因）
- 直接的なPrisma呼び出し（Repository経由で行う）
- 巨大なコンポーネント（責任を分離する）
- テストなしの実装
- "use client" の過度な使用

### 🔄 DI注入パターンの比較

**❌ 避けるべきパターン（サービス層）:**

```typescript
@injectable()
export class UserDomainService {
  async hashPassword(password: string): Promise<string> {
    const hashService = resolve('HashService'); // 循環依存の原因
    return await hashService.generateHash(password);
  }
}
```

**✅ 推奨パターン（サービス層）:**

```typescript
@injectable()
export class UserDomainService {
  constructor(
    @inject(INJECTION_TOKENS.HashService) private hashService: IHashService
  ) {}
  
  async hashPassword(password: string): Promise<string> {
    return await this.hashService.generateHash(password);
  }
}
```

**✅ OKパターン（Server Action/Component）:**

```typescript
'use server';
export async function createUser(data: FormData) {
  const createUserUseCase = resolve('CreateUserUseCase'); // Server Action/Componentでは使用可
  return await createUserUseCase.execute(data);
}
```

---

## 開発時の注意事項

### DI関連

- **サービス層**: コンストラクター注入（`@inject`）を使用
- **Server Action/Component**: `resolve()` 関数を使用
- **分離コンテナ**: 適切な層への登録を徹底
- インターフェースへの依存を徹底

### TailwindCSS v4 関連

- `bg-opacity-50` ではなく `bg-black/50` を使用
- クリック可能要素には `cursor-pointer` を適用

### Next.js App Router 関連

- Server Components と Client Components の使い分けを意識
- "use server" は `export async function`、"use client" は `export function`

---

## トラブルシューティング

### DIコンテナ関連エラー

1. **循環依存エラー**: サービス層で `resolve()` 関数を使用していないか確認
2. **初期化順序エラー**: コンテナファイルの依存関係順序を確認
3. **登録エラー**: 適切な層のコンテナに登録されているか確認

### 型エラーが発生する場合

1. TypeScriptサーバーを再起動
2. DIトークンの定義を確認
3. インポートパスを確認

### テストが失敗する場合

1. DIコンテナの初期化を確認
2. モックの設定を確認
3. 非同期処理の待機を確認

### 開発サーバーが起動しない場合

1. `pnpm install` で依存関係を再インストール
2. `.env` ファイルの設定を確認
3. データベース接続を確認
