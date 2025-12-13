# コードスタイルと規約

## アーキテクチャ原則

### レイヤー責務の厳格な分離

- **Presentation Layer**: UI Components, Server Actions, Page Components（単一責任）
- **Application Layer**: Use Cases, DTOs, App Services（ビジネスフロー）
- **Domain Layer**: Entities, Value Objects, Domain Services（ビジネスルール）
- **Infrastructure Layer**: Repositories, External APIs, Database（技術実装）

### 禁止事項

- レイヤー越境の直接依存（Presentation → Infrastructure）
- Domain層でのフレームワーク依存
- 相対パスでのインポート（alias使用必須）

## Result型パターン（必須）

### UseCase戻り値

```typescript
// 全UseCaseはResult型を返却
async execute(request: Request): Promise<Result<Response>> {
  try {
    // 処理...
    return success(response);
  } catch (error) {
    return failure('エラーメッセージ', 'ERROR_CODE');
  }
}
```

## 依存性注入の統一パターン

### サービス層

```typescript
@injectable()
export class Service {
 constructor(
  @inject(INJECTION_TOKENS.Repository)
  private readonly repository: IRepository,
 ) {}
}
```

### Presentation層

```typescript
// Server Actions/Components
const useCase = resolve(INJECTION_TOKENS.UseCase);
```

## インポート・モジュール管理

### 必須ルール

- **index.ts ファイル作成禁止**
- **個別インポート必須**
- **alias使用必須**（@/\* 形式）
- **相対パス禁止**

### 正しい例

```typescript
import { Button } from '@/components/ui/Button';
import { UserService } from '@/layers/application/services/UserService';
```

## React・UI実装規約

### Server Components優先

- 基本的にはServer Component（RSC）を使用
- Client Componentは必要最小限に限定
- ドーナツ構造の原則（外側RSC、内側必要な部分のみClient）

### Server Actions統合

```typescript
'use server';
export async function action(formData: FormData) {
 const useCase = resolve(INJECTION_TOKENS.UseCase);
 const result = await useCase.execute(input);

 if (isFailure(result)) {
  return { success: false, message: result.error.message };
 }
 return { success: true, data: result.data };
}
```

## TypeScript設定

- **strict mode**: 有効
- **experimentalDecorators**: 有効（TSyringe対応）
- **emitDecoratorMetadata**: 有効
- **no-explicit-any**: エラー設定

## Prettier設定

- **printWidth**: 80
- **tabWidth**: 2
- **semi**: true
- **singleQuote**: true
- **trailingComma**: 'all'
- **Import sorting**: @ianvs/prettier-plugin-sort-imports使用

## ESLint設定

- **Next.js**: core-web-vitals, typescript準拠
- **相対参照禁止**: no-restricted-imports設定
- **無視パターン**: node_modules, .next, Prisma generated等
