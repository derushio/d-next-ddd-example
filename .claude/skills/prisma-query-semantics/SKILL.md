---
name: prisma-query-semantics
description: |
  Prismaクエリのセマンティクス（意味論的な使い分け）を提供するスキル。
  findUnique vs findFirst の正しい使い分け、
  無意味な orderBy の禁止、効率的なページネーションパターンを強制する。

  トリガー例:
  - 「Prismaクエリ」「findFirst」「findUnique」「findMany」
  - prisma.xxx.findFirst / findUnique を書こうとしたとき
  - src/layers/infrastructure/repositories/ 配下のファイル編集時
  - ページネーション、件数取得クエリの実装時
globs:
  - "src/layers/infrastructure/repositories/**/*.ts"
---

# Prisma Query Semantics Skill

Prismaクエリの意味論的な正しい使い方を提供します。
`findUnique` と `findFirst` の使い分け、冗長なクエリパターンの禁止、
効率的な複数クエリの実行パターンを徹底します。

---

## 1. findUnique vs findFirst の使い分け

### 判断基準

| 状況 | 使うべきAPI | 理由 |
|------|------------|------|
| PK（id）で検索 | `findUnique` | 一意性が保証されている |
| unique index のフィールドで検索（email等） | `findUnique` | 一意性が保証されている |
| 複合 unique index で検索 | `findUnique` | 一意性が保証されている |
| 非ユニークな条件で検索 | `findFirst` | 複数候補から1件取得 |
| 最新/最古の1件を取得 | `findFirst` + `orderBy` | 複数候補から条件で絞る |

### ✅ 正しいパターン

```typescript
// ✅ id（PK）で検索 → findUnique
const user = await prisma.user.findUnique({
  where: { id: userId },
});

// ✅ email（unique index）で検索 → findUnique
const user = await prisma.user.findUnique({
  where: { email: userEmail },
});

// ✅ 複合 unique index で検索 → findUnique
const session = await prisma.userSession.findUnique({
  where: { userId_deviceId: { userId, deviceId } },
});

// ✅ 非ユニークな条件（role等）で検索 → findFirst
const adminUser = await prisma.user.findFirst({
  where: { role: 'ADMIN', isActive: true },
});

// ✅ 最新のセッションを取得 → findFirst + orderBy
const latestSession = await prisma.userSession.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' },
});
```

### ❌ 禁止パターン

```typescript
// ❌ unique なフィールドで findFirst を使うのは語義的に誤り
const user = await prisma.user.findFirst({
  where: { id: userId },  // id は PK → findUnique を使うべき
});

// ❌ email（unique）で findFirst を使うのも誤り
const user = await prisma.user.findFirst({
  where: { email: userEmail },  // email は unique index → findUnique
});
```

---

## 2. findFirst + 無意味な orderBy の禁止

### 問題のあるパターン

`findFirst` に `orderBy` を付けるのは「複数候補から優先順位で1件取得する」ときのみ意味がある。
一意性が保証されているフィールドで検索する場合、`orderBy` は意味をなさない。

### ❌ 禁止パターン

```typescript
// ❌ id で検索しているのに orderBy を付けるのは意味がない
const user = await prisma.user.findFirst({
  where: { id: userId },
  orderBy: { createdAt: 'desc' },  // 結果は常に1件なので orderBy は無意味
});

// ❌ findFirst + orderBy の組み合わせが自動的に問題なわけではないが、
//    unique なフィールドで使う場合は findUnique に変更すること
```

### ✅ orderBy が意味のある findFirst

```typescript
// ✅ 複数候補から最新のものを1件取得する
const latestLoginAttempt = await prisma.loginAttempt.findFirst({
  where: { ipAddress, userId },
  orderBy: { attemptedAt: 'desc' },  // 最新1件を取得するので意味がある
});
```

---

## 3. findMany + count を別々に呼ぶ vs $transaction

### ページネーション実装のベストプラクティス

リスト + 総件数の取得は必ず `$transaction` でまとめて取得すること。
別々に呼ぶとレース条件（データが変わって件数が合わない）が発生する可能性がある。

### ✅ 正しいパターン（$transaction）

```typescript
// ✅ ページネーション: findMany + count を同一トランザクションで取得
const [users, total] = await prisma.$transaction([
  prisma.user.findMany({
    where: { isActive: true },
    skip: (page - 1) * perPage,
    take: perPage,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.user.count({
    where: { isActive: true },
  }),
]);

return {
  users,
  total,
  page,
  perPage,
  totalPages: Math.ceil(total / perPage),
};
```

### ❌ 禁止パターン（別々に呼ぶ）

```typescript
// ❌ findMany と count を別々に呼ぶのは禁止（レース条件リスクあり）
const users = await prisma.user.findMany({
  where: { isActive: true },
  skip: (page - 1) * perPage,
  take: perPage,
});

const total = await prisma.user.count({  // ← この間にデータが変わる可能性
  where: { isActive: true },
});
```

---

## 4. where 条件の冗長なフィールドを含めない

### 問題のあるパターン

PK（id）だけで一意に特定できるのに、userId 等の追加条件を重複して含めるのは冗長。
ただし、**セキュリティ目的でユーザー所有権を確認する場合は必須**（下記参照）。

### ❌ 冗長パターン（PKのみで十分な場合）

```typescript
// ❌ id だけで特定できるのに userId も含めるのは冗長（管理者操作等の場合）
const session = await prisma.userSession.findUnique({
  where: {
    id: sessionId,
    userId: userId,  // id で一意なら不要
  },
});
```

### ✅ セキュリティ目的での所有権確認（必須）

```typescript
// ✅ ユーザーが自分のリソースにのみアクセスできることを保証する場合は userId を含める
const session = await prisma.userSession.findFirst({
  where: {
    id: sessionId,
    userId: userId,  // ← セキュリティ上必須: 他ユーザーのセッションを取得させない
  },
});

// ✅ または findUnique 後に所有権をアプリ層で確認
const session = await prisma.userSession.findUnique({
  where: { id: sessionId },
});
if (session?.userId !== userId) {
  return err({ type: 'FORBIDDEN' });
}
```

### 判断基準

| ケース | userId 等を where に含める |
|--------|--------------------------|
| 管理者がリソースを操作する | 不要（PKのみで十分） |
| ユーザーが自分のリソースを操作する | 必須（所有権確認） |
| 公開リソースの取得 | 不要 |

---

## 5. よくある Repository 実装パターン

```typescript
@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
  ) {}

  async findById(id: string): Promise<User | null> {
    // ✅ id は PK → findUnique
    const userData = await this.prisma.user.findUnique({
      where: { id },
    });
    return userData ? UserMapper.toDomain(userData) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // ✅ email は unique index → findUnique
    const userData = await this.prisma.user.findUnique({
      where: { email },
    });
    return userData ? UserMapper.toDomain(userData) : null;
  }

  async findManyWithCount(
    page: number,
    perPage: number,
  ): Promise<{ users: User[]; total: number }> {
    // ✅ 一括取得で一貫性を保証
    const [usersData, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: usersData.map(UserMapper.toDomain),
      total,
    };
  }
}
```

---

## チェックリスト

- [ ] PK や unique index での検索に `findUnique` を使っている
- [ ] 非ユニークな条件での検索に `findFirst` を使っている
- [ ] `findFirst` の `orderBy` が意味を持っている（複数候補から絞り込む目的）
- [ ] ページネーションで `findMany` + `count` を `$transaction` でまとめている
- [ ] セキュリティ目的（所有権確認）でない冗長な where 条件を追加していない

---

## 同一Where条件のDRY化

同一の `where` 条件構築ロジックが複数メソッドに出現する場合は、private メソッドに抽出すること:

```tsx
// GOOD: 共通化された where 構築
private buildSearchWhere(searchQuery?: string): Prisma.UserWhereInput {
  if (!searchQuery) return {};
  return {
    OR: [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { email: { contains: searchQuery, mode: 'insensitive' } },
    ],
  };
}
```

---

## 関連スキル

- **prisma-v7-patterns**: Prisma 7.x固有の機能・設定パターン
- **prisma-v7-troubleshooting**: Prisma固有エラーの解決
- **prisma-error-handling**: Repository実装でのエラーハンドリング
- **infrastructure-impl**: Infrastructure層全体の実装パターン
- **security-review**: 所有権確認等のセキュリティパターン
