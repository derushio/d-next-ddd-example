# Prisma Repository モック設定問題

## 問題症状

PrismaUserRepository のテストで、モック設定が不十分でテストが失敗する。

```typescript
// ❌ エラーになる例
test('ユーザー更新', async () => {
 const mockUser = createMockUser();
 mockPrismaClient.user.update.mockResolvedValue(mockUser);

 const result = await repository.update(userId, updateData);
 // ❌ TypeError: mockPrismaClient.user.findMany is not a function
});
```

## 原因

PrismaClientのモックで、使用されるメソッドがすべて定義されていない。

### 不十分なモック例

```typescript
// ❌ 不十分なモック
const mockPrismaClient = {
 user: {
  create: vi.fn(),
  update: vi.fn(),
  // findMany, count, upsert などが不足
 },
} as any;
```

## 解決方法

### 完全なPrismaClientモック作成

```typescript
// ✅ 完全なモック設定
export function createMockPrismaClient() {
 return {
  user: {
   create: vi.fn(),
   findUnique: vi.fn(),
   findFirst: vi.fn(),
   findMany: vi.fn(),
   update: vi.fn(),
   delete: vi.fn(),
   upsert: vi.fn(),
   count: vi.fn(),
   aggregate: vi.fn(),
   groupBy: vi.fn(),
   createMany: vi.fn(),
   updateMany: vi.fn(),
   deleteMany: vi.fn(),
  },
  // 他のモデルも同様に定義...
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
 } as any;
}
```

### Repository テストのベストプラクティス

```typescript
describe('PrismaUserRepository', () => {
 let repository: PrismaUserRepository;
 let mockPrismaClient: any;

 beforeEach(() => {
  // 完全なモッククライアント作成
  mockPrismaClient = createMockPrismaClient();
  repository = new PrismaUserRepository(mockPrismaClient);
 });

 afterEach(() => {
  vi.clearAllMocks();
 });

 test('ユーザー作成', async () => {
  // Arrange
  const userData = createMockUserData();
  const expectedUser = createMockUser();
  mockPrismaClient.user.create.mockResolvedValue(expectedUser);

  // Act
  const result = await repository.create(userData);

  // Assert
  expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
   data: expect.objectContaining({
    id: expect.any(String),
    email: userData.email.value,
    name: userData.name,
   }),
  });
  expect(result).toBeDefined();
 });

 test('メールアドレスでユーザー検索', async () => {
  // Arrange
  const email = new Email('test@example.com');
  const expectedUser = createMockUser();
  mockPrismaClient.user.findUnique.mockResolvedValue(expectedUser);

  // Act
  const result = await repository.findByEmail(email);

  // Assert
  expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
   where: { email: email.value },
  });
  expect(result).toBeDefined();
 });

 test('ユーザー更新', async () => {
  // Arrange
  const userId = new UserId();
  const updateData = { name: 'Updated Name' };
  const expectedUser = createMockUser();
  mockPrismaClient.user.update.mockResolvedValue(expectedUser);

  // Act
  const result = await repository.update(userId, updateData);

  // Assert
  expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
   where: { id: userId.value },
   data: {
    name: updateData.name,
    updatedAt: expect.any(Date),
   },
  });
  expect(result).toBeDefined();
 });
});
```

## よくある追加の問題

### 1. Domain-Infrastructure 境界の問題

```typescript
// ❌ Prisma型をDomainで直接使用
return prismaUser; // Prisma型をそのまま返す

// ✅ Domain Entityに変換
return User.reconstruct({
 id: new UserId(prismaUser.id),
 email: new Email(prismaUser.email),
 name: prismaUser.name,
 createdAt: prismaUser.createdAt,
 updatedAt: prismaUser.updatedAt,
});
```

### 2. 非同期処理の考慮不足

```typescript
// ❌ awaitを忘れる
test('非同期テスト', () => {
 const result = repository.create(userData); // awaitなし
 expect(result).toBeDefined(); // Promiseオブジェクトになる
});

// ✅ 正しい非同期テスト
test('非同期テスト', async () => {
 const result = await repository.create(userData);
 expect(result).toBeDefined();
});
```

## 予防策

1. **共通モックユーティリティの作成**: `tests/utils/mocks/commonMocks.ts`
2. **型安全なモック**: TypeScriptの型チェックを活用
3. **テンプレート化**: 新しいRepositoryテスト作成時のテンプレート作成
4. **CI/CDでの検証**: モック不足を自動検出

## 関連ファイル

- `tests/utils/mocks/commonMocks.ts` - 共通モック関数
- `tests/unit/infrastructure/repositories/` - Repository テスト

## 検証済み環境

- Vitest 3.2.3
- Prisma 7.x
- TypeScript 5.x
- Clean Architecture + DDD
