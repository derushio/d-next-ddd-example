# Repository Implementation Patterns

Infrastructure層でのRepository実装の詳細パターンとベストプラクティスを記載します。

---

## データマッパーパターン

### 基本マッピング

```typescript
export class UserRepository implements IUserRepository {
  // DB → Domain Entity 変換
  private toDomainObject(userData: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.reconstruct({
      id: new UserId(userData.id),
      email: new Email(userData.email),
      name: userData.name,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  }

  // Domain Entity → DB 変換
  private toPersistenceObject(user: User): {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: user.id.value,           // public readonly アクセス
      email: user.email.value,     // public readonly アクセス
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

### 専用マッパークラス（複雑な変換向け）

```typescript
export class UserDataMapper {
  static toDomain(userData: PrismaUserData): User {
    return User.reconstruct({
      id: new UserId(userData.id),
      email: new Email(userData.email),
      name: userData.name,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  }

  static toPersistence(user: User): PrismaUserData {
    return {
      id: user.id.value,
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toDomainList(userDataList: PrismaUserData[]): User[] {
    return userDataList.map((data) => this.toDomain(data));
  }
}

// Repository内での使用
export class UserRepository implements IUserRepository {
  private toDomainObject(userData: PrismaUserData): User {
    return UserDataMapper.toDomain(userData);
  }

  private toPersistenceObject(user: User): PrismaUserData {
    return UserDataMapper.toPersistence(user);
  }
}
```

---

## 仕様パターンの活用

複雑な検索条件を仕様化することで、コードの可読性と再利用性を向上させます。

```typescript
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

export class UserSearchSpecification {
  constructor(
    public readonly isActive?: boolean,
    public readonly levelRange?: { min: number; max: number },
    public readonly emailDomain?: string,
    public readonly lastLoginSince?: Date,
  ) {}

  buildWhereClause(): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (this.isActive !== undefined) {
      where.isActive = this.isActive;
    }

    if (this.levelRange) {
      where.level = {
        gte: this.levelRange.min,
        lte: this.levelRange.max,
      };
    }

    if (this.emailDomain) {
      where.email = {
        endsWith: `@${this.emailDomain}`,
      };
    }

    if (this.lastLoginSince) {
      where.lastLoginAt = {
        gte: this.lastLoginSince,
      };
    }

    return where;
  }
}

// Repository内での使用
export class UserRepository implements IUserRepository {
  async findBySpecification(spec: UserSearchSpecification): Promise<User[]> {
    const userData = await this.prisma.user.findMany({
      where: spec.buildWhereClause(),
    });

    return userData.map((data) => this.toDomainObject(data));
  }
}
```

---

## InMemory実装（テスト用）

テストで使用するInMemory実装の例です。

```typescript
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.value) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.value === email.value) {
        return user;
      }
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }

  async update(user: User): Promise<void> {
    if (!this.users.has(user.id.value)) {
      throw new DomainError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }
    this.users.set(user.id.value, user);
  }

  async delete(id: UserId): Promise<void> {
    if (!this.users.delete(id.value)) {
      throw new DomainError('ユーザーが見つかりません', 'USER_NOT_FOUND');
    }
  }

  // テスト用ヘルパー
  clear(): void {
    this.users.clear();
  }

  count(): number {
    return this.users.size;
  }
}
```

---

## エラーハンドリングパターン

```typescript
export class UserRepository implements IUserRepository {
  // 共通エラー変換ヘルパー
  private convertToDomainError(error: unknown, code: string): DomainError {
    if (error instanceof DomainError) {
      return error;
    }

    // Prismaエラーの変換
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          return new DomainError('データが既に存在します', 'DUPLICATE_ENTRY');
        case 'P2025': // Record not found
          return new DomainError('データが見つかりません', 'NOT_FOUND');
        default:
          return new DomainError(
            'データベースエラーが発生しました',
            'DATABASE_ERROR',
          );
      }
    }

    const message =
      error instanceof Error ? error.message : '不明なエラーが発生しました';
    return new DomainError(message, code);
  }

  async findById(id: UserId): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: id.value },
      });

      if (!userData) {
        return null;
      }

      return this.toDomainObject(userData);
    } catch (error) {
      throw this.convertToDomainError(error, 'USER_FIND_ERROR');
    }
  }
}
```

---

## パフォーマンス最適化パターン

### N+1問題の回避

```typescript
// バッチ取得
async findByIds(ids: UserId[]): Promise<User[]> {
  if (ids.length === 0) {
    return [];
  }

  const userData = await this.prisma.user.findMany({
    where: {
      id: { in: ids.map((id) => id.value) },
    },
  });

  // 元の順序を保持してマッピング
  const userMap = new Map(
    userData.map((data) => [data.id, this.toDomainObject(data)]),
  );

  return ids
    .map((id) => userMap.get(id.value))
    .filter((user): user is User => user !== undefined);
}

// 関連データを含む取得
async findByIdWithRelations(id: UserId): Promise<UserWithRelations | null> {
  const userData = await this.prisma.user.findUnique({
    where: { id: id.value },
    include: {
      profile: true,
      sessions: {
        where: { expiresAt: { gte: new Date() } },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return userData ? this.toDomainObjectWithRelations(userData) : null;
}
```

### ページネーション

```typescript
async findAll(pagination: {
  page: number;
  pageSize: number;
}): Promise<{ users: User[]; total: number }> {
  const skip = (pagination.page - 1) * pagination.pageSize;
  const take = pagination.pageSize;

  const [userData, total] = await Promise.all([
    this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.user.count(),
  ]);

  return {
    users: userData.map((data) => this.toDomainObject(data)),
    total,
  };
}
```

---

**Repository実装は、Domain層の要求を満たしながら、効率的なデータアクセスを実現する必要があります。パフォーマンスとコードの可読性のバランスを取りながら実装してください。**
