# SQLインジェクション対策ガイド

## 概要

### 脆弱性の説明

SQLインジェクションは、アプリケーションがユーザー入力を適切に検証せずにSQLクエリに組み込むことで発生する脆弱性です。攻撃者が悪意のあるSQL文を注入することで、以下のような深刻な被害が発生します。

**発生メカニズム:**

```sql
-- 脆弱なコード例（仮想）
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

攻撃者が `userInput` に `admin' OR '1'='1` を入力すると、以下のクエリが実行されます。

```sql
SELECT * FROM users WHERE email = 'admin' OR '1'='1'
-- すべてのユーザーレコードが返却される
```

### 発生しうる脅威

| 脅威 | 影響度 | 説明 |
|------|--------|------|
| データ漏洩 | 高 | 機密情報（個人情報、認証情報等）の不正取得 |
| データ改ざん | 高 | UPDATE文による既存データの不正変更 |
| データ削除 | 高 | DROP TABLE等による重要データの破壊 |
| 認証バイパス | 高 | ログイン処理の回避と不正アクセス |
| 管理者権限奪取 | 高 | システム全体への完全なアクセス権限取得 |
| OSコマンド実行 | 高 | データベースを介したサーバーOSへの攻撃 |

### 特に注意が必要なケース

以下の機能実装時には特に慎重な対策が必要です。

1. **検索機能**: あいまい検索（LIKE演算子）やフィルタリング機能
2. **ログイン処理**: メールアドレス・パスワードを用いた認証クエリ
3. **動的クエリ生成**: ソート順、検索条件、ページネーション等の動的要素
4. **レポート生成**: ユーザー指定条件による集計クエリ
5. **管理画面**: 複雑なフィルタリングやバルク操作

## IPA/OWASP対応

| 基準 | カテゴリ | 重要度 |
|------|---------|--------|
| IPA | 1. SQLインジェクション | 高 |
| OWASP Top 10 2021 | A03:2021-Injection | 高 |
| CWE | CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection') | 高 |

**参考資料:**

- [IPA「安全なウェブサイトの作り方」第7版](https://www.ipa.go.jp/security/vuln/websecurity/about.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)

## Next.js + TypeScript + Prisma での対策

### 根本的解決策（必須）

#### 1. Prisma ORMのパラメータ化クエリを使用

Prisma ORMは自動的にパラメータ化クエリを生成し、SQLインジェクションを防ぎます。全てのデータベース操作においてPrismaの型安全なメソッドを使用してください。

**安全な実装例（推奨）:**

```typescript
// src/layers/infrastructure/repositories/implementations/PrismaUserRepository.ts
import { PrismaClient } from '@prisma/client';

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
  ) {}

  // 安全: Prismaが自動的にパラメータ化クエリを生成
  async findByEmail(email: Email): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { email: email.value }, // パラメータとして安全に渡される
    });

    return userData ? this.toDomainObject(userData) : null;
  }

  // 安全: 複数条件もPrismaのクエリビルダーで構築
  async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (criteria.searchQuery) {
      where.OR = [
        { name: { contains: criteria.searchQuery, mode: 'insensitive' } },
        { email: { contains: criteria.searchQuery, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: {
        [criteria.sortBy || 'createdAt']: criteria.sortOrder || 'desc',
      },
      skip: criteria.page ? (criteria.page - 1) * (criteria.limit || 10) : 0,
      take: criteria.limit || 10,
    });

    return users.map(this.toDomainObject);
  }
}
```

**なぜ安全か:**

- Prismaは内部的にプリペアドステートメントを使用
- ユーザー入力は常にパラメータとして扱われ、SQL文として評価されない
- TypeScriptの型システムにより、不正な値の混入をコンパイル時に検出

#### 2. $queryRaw / $executeRaw の禁止または厳格なエスケープ

Prismaの生SQLクエリ機能（`$queryRaw`, `$executeRaw`）は、適切に使用しないとSQLインジェクションのリスクがあります。

**原則: 使用禁止**

可能な限り、PrismaのクエリビルダーAPIを使用してください。どうしても生SQLが必要な場合のみ、以下の安全な方法で実装します。

**危険な実装例（禁止）:**

```typescript
// 危険: ユーザー入力を文字列結合でクエリに含めている
async findByEmailUnsafe(email: string): Promise<User | null> {
  const users = await this.prisma.$queryRaw`
    SELECT * FROM "User" WHERE email = '${email}'
  `; // SQLインジェクションのリスク
  return users[0] || null;
}
```

**安全な実装例（やむを得ない場合）:**

```typescript
// 安全: タグ付きテンプレートでパラメータ化
async findByEmailSafe(email: string): Promise<User | null> {
  // Prisma.sqlテンプレートはパラメータを自動的にエスケープ
  const users = await this.prisma.$queryRaw`
    SELECT * FROM "User" WHERE email = ${email}
  `; // emailは安全にエスケープされる
  return users[0] || null;
}

// より推奨: Prisma.sqlヘルパーを使用
import { Prisma } from '@prisma/client';

async complexQuery(status: string, minDate: Date): Promise<User[]> {
  return await this.prisma.$queryRaw(
    Prisma.sql`
      SELECT * FROM "User"
      WHERE status = ${status}
      AND "createdAt" >= ${minDate}
    `
  );
}
```

**重要な注意事項:**

- タグ付きテンプレート（`` ` `` ）を使用すれば、`${variable}`はパラメータとして安全に処理される
- 通常の文字列結合（`+`, `${}`）は**絶対に使用しない**
- カラム名やテーブル名をユーザー入力から動的生成する場合は、ホワイトリスト検証が必須

#### 3. ユーザー入力の型検証（Zod等）

Presentation層（Server Actions）でユーザー入力を厳密に検証します。

```typescript
// src/app/server-actions/user/createUser.ts
import { z } from 'zod';

// バリデーションスキーマ
const createUserSchema = z.object({
  name: z.string().min(1).max(100), // 長さ制限
  email: z.email(), // フォーマット検証
  password: z.string().min(8).max(128), // 長さ制限
});

export async function createUser(formData: FormData) {
  const validatedFields = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;

  // 検証済みデータをUseCaseに渡す
  const createUserUseCase = resolve('CreateUserUseCase');
  const result = await createUserUseCase.execute({ name, email, password });

  // ... Result型の処理
}
```

### 保険的対策（推奨）

根本的対策を実施した上で、多層防御として以下の保険的対策も実施します。

#### 1. 入力値の長さ制限

異常に長い入力を受け付けないことで、攻撃の成功率を下げます。

```typescript
// Value Objectでの検証
export class Email {
  private static readonly MAX_LENGTH = 254; // RFC 5321

  constructor(public readonly value: string) {
    if (value.length > Email.MAX_LENGTH) {
      throw new Error(`メールアドレスは${Email.MAX_LENGTH}文字以内で入力してください`);
    }

    // メールフォーマット検証
    if (!this.isValid(value)) {
      throw new Error('無効なメールアドレス形式です');
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

#### 2. 特殊文字のエスケープ（LIKE演算子使用時）

LIKE演算子でのあいまい検索時、ワイルドカード文字（`%`, `_`）を適切にエスケープします。

```typescript
// LIKE演算子用のエスケープ関数
function escapeLikeQuery(query: string): string {
  // PostgreSQLのLIKEエスケープ: \を追加
  return query.replace(/[%_\\]/g, '\\$&');
}

// 使用例
async searchUsers(searchQuery: string): Promise<User[]> {
  const escaped = escapeLikeQuery(searchQuery);

  const users = await this.prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: escaped, mode: 'insensitive' } },
        { email: { contains: escaped, mode: 'insensitive' } },
      ],
    },
  });

  return users.map(this.toDomainObject);
}
```

**注意:** Prismaの`contains`演算子は自動的にエスケープしますが、念のため明示的に処理することを推奨します。

#### 3. 最小権限のDBユーザー使用

データベース接続ユーザーには必要最小限の権限のみを付与します。

**推奨設定（PostgreSQL）:**

```sql
-- アプリケーション用ユーザーの作成
CREATE USER app_user WITH PASSWORD 'secure_password';

-- 必要なテーブルのみへのアクセス権限
GRANT SELECT, INSERT, UPDATE ON TABLE "User" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserSession" TO app_user;
GRANT SELECT, INSERT ON TABLE "LoginAttempt" TO app_user;

-- 読み取り専用ユーザー（レポート機能用）
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

**環境変数での設定:**

```env
# .env
# 書き込み権限あり（通常のアプリケーション）
DATABASE_URL="postgresql://app_user:secure_password@localhost:5432/mydb"

# 読み取り専用（レポート機能）
DATABASE_URL_READONLY="postgresql://readonly_user:readonly_password@localhost:5432/mydb"
```

## チェックリスト

実装時およびコードレビュー時に以下の項目を確認してください。

### 実装チェックリスト

- [ ] Prisma ORMのクエリビルダーAPIを使用しているか
- [ ] `$queryRaw` / `$executeRaw` が存在しないか（やむを得ない場合は安全なパラメータ化を実施）
- [ ] ユーザー入力が文字列結合でクエリに含まれていないか
- [ ] Zodスキーマによる入力検証が実装されているか
- [ ] Value Objectで型レベルのバリデーションが実装されているか
- [ ] LIKE演算子使用時にワイルドカードのエスケープが実施されているか
- [ ] データベースユーザーの権限が最小限に設定されているか
- [ ] 動的なソート順やカラム名がホワイトリスト検証されているか

### コードレビューチェックリスト

- [ ] Repositoryクラスで生SQL文字列が使用されていないか
- [ ] 外部入力がそのままクエリに渡されていないか
- [ ] エラーメッセージにSQL文が含まれていないか（情報漏洩）
- [ ] ログ出力にSQLクエリ全文が記録されていないか
- [ ] トランザクション内でのクエリも安全に実装されているか

## テストパターン

SQLインジェクション対策の有効性を確認するためのテストパターンです。

### ユニットテスト例（悪意ある入力の処理確認）

```typescript
// tests/unit/repositories/PrismaUserRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaUserRepository } from '@/layers/infrastructure/repositories/implementations/PrismaUserRepository';
import { Email } from '@/layers/domain/value-objects/Email';

describe('PrismaUserRepository - SQLインジェクション対策', () => {
  let repository: PrismaUserRepository;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrismaClient = createMockPrismaClient();
    const mockLogger = createAutoMockLogger();
    repository = new PrismaUserRepository(mockPrismaClient, mockLogger);
  });

  it('SQLインジェクション試行: シングルクォートを含むメールアドレスで検索してもエラーにならない', async () => {
    // Arrange: 攻撃的な入力
    const maliciousEmail = new Email("test' OR '1'='1'--@example.com");
    mockPrismaClient.user.findUnique.mockResolvedValue(null);

    // Act
    const result = await repository.findByEmail(maliciousEmail);

    // Assert: Prismaが安全にパラメータ化するため、nullが返る
    expect(result).toBeNull();
    expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test' OR '1'='1'--@example.com" },
    });
  });

  it('SQLインジェクション試行: UNION SELECTを含む検索クエリでも安全に処理される', async () => {
    // Arrange
    const maliciousQuery = "test' UNION SELECT * FROM User--";
    const criteria = { searchQuery: maliciousQuery };
    mockPrismaClient.user.findMany.mockResolvedValue([]);

    // Act
    const result = await repository.findByCriteria(criteria);

    // Assert: Prismaが安全にエスケープするため空配列が返る
    expect(result).toEqual([]);
    expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: maliciousQuery, mode: 'insensitive' } },
            { email: { contains: maliciousQuery, mode: 'insensitive' } },
          ],
        },
      })
    );
  });

  it('特殊文字を含む正規のメールアドレスを正常に検索できる', async () => {
    // Arrange: 正当な特殊文字入力
    const validEmail = new Email("test+alias@example.com");
    const mockUserData = {
      id: 'testuseridcuid2abc12',
      email: 'test+alias@example.com',
      name: 'Test User',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrismaClient.user.findUnique.mockResolvedValue(mockUserData);

    // Act
    const result = await repository.findByEmail(validEmail);

    // Assert: 正常に取得できる
    expect(result).not.toBeNull();
    expect(result?.email.value).toBe('test+alias@example.com');
  });
});
```

### 境界値テスト

```typescript
describe('PrismaUserRepository - 境界値テスト', () => {
  it('空文字列の検索クエリを処理できる', async () => {
    const criteria = { searchQuery: '' };
    const result = await repository.findByCriteria(criteria);
    expect(result).toBeDefined();
  });

  it('非常に長い検索クエリ（1000文字）を安全に処理できる', async () => {
    const longQuery = 'a'.repeat(1000);
    const criteria = { searchQuery: longQuery };
    mockPrismaClient.user.findMany.mockResolvedValue([]);

    const result = await repository.findByCriteria(criteria);
    expect(result).toEqual([]);
  });

  it('LIKE演算子のワイルドカード文字（%, _）を含むクエリを正常に処理できる', async () => {
    const queryWithWildcards = 'test%_value';
    const criteria = { searchQuery: queryWithWildcards };
    mockPrismaClient.user.findMany.mockResolvedValue([]);

    const result = await repository.findByCriteria(criteria);
    expect(result).toBeDefined();
  });
});
```

### E2Eテスト例（Playwright）

```typescript
// tests/e2e/security/sql-injection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SQLインジェクション対策 E2E', () => {
  test('ログインフォームでSQLインジェクションを試みても失敗する', async ({ page }) => {
    await page.goto('/login');

    // SQLインジェクション攻撃の試行
    await page.fill('input[name="email"]', "admin' OR '1'='1'--");
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=無効なメールアドレス')).toBeVisible();

    // ログインに成功していないことを確認
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('検索フォームでSQLインジェクションを試みても安全に処理される', async ({ page }) => {
    await page.goto('/users');

    // UNION SELECT攻撃の試行
    await page.fill('input[name="search"]', "' UNION SELECT * FROM User--");
    await page.click('button[type="submit"]');

    // 検索結果が空または安全に処理されることを確認
    const results = page.locator('[data-testid="user-list"] > *');
    const count = await results.count();

    // SQL文が評価されず、通常の検索として処理される
    expect(count).toBeLessThanOrEqual(10); // ページネーション制限内
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA「安全なウェブサイトの作り方」第7版 - SQLインジェクション](https://www.ipa.go.jp/security/vuln/websecurity/sql-injection.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Prisma Query API - Parameterized Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html)

### 関連ドキュメント

- Infrastructure層実装ガイド
- Repository実装パターン
- 入力検証パターン
- セキュリティテストパターン

### 攻撃手法の詳細情報

- [OWASP Testing Guide - SQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection)
- [PortSwigger SQL Injection Cheat Sheet](https://portswigger.net/web-security/sql-injection/cheat-sheet)

## トラブルシューティング

### よくある問題と解決策

#### 問題1: Prismaの生SQLで動的なテーブル名を使いたい

**問題:**

```typescript
// 危険: テーブル名を動的に指定したい
const tableName = userInput; // ユーザー入力
const result = await prisma.$queryRaw`SELECT * FROM ${tableName}`;
```

**解決策:**
テーブル名はホワイトリストで検証してから使用します。

```typescript
const allowedTables = ['User', 'UserSession', 'LoginAttempt'] as const;
type AllowedTable = typeof allowedTables[number];

function isAllowedTable(table: string): table is AllowedTable {
  return allowedTables.includes(table as AllowedTable);
}

async function queryTable(tableName: string) {
  if (!isAllowedTable(tableName)) {
    throw new Error('無効なテーブル名です');
  }

  // 安全: ホワイトリスト検証済み
  const result = await prisma.$queryRaw(
    Prisma.sql`SELECT * FROM ${Prisma.raw(tableName)}`
  );
  return result;
}
```

#### 問題2: 動的なソート順の実装

**問題:**

```typescript
// 危険: ソート順をユーザー入力から直接指定
const sortBy = req.query.sort; // 'name', 'createdAt' 等
const order = req.query.order; // 'asc', 'desc'
```

**解決策:**
許可されたカラム名とソート順のみを受け付けます。

```typescript
const ALLOWED_SORT_FIELDS = ['name', 'email', 'createdAt', 'updatedAt'] as const;
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;

type SortField = typeof ALLOWED_SORT_FIELDS[number];
type SortOrder = typeof ALLOWED_SORT_ORDERS[number];

function validateSortField(field: string): SortField {
  if (!ALLOWED_SORT_FIELDS.includes(field as SortField)) {
    return 'createdAt'; // デフォルト値
  }
  return field as SortField;
}

function validateSortOrder(order: string): SortOrder {
  if (!ALLOWED_SORT_ORDERS.includes(order as SortOrder)) {
    return 'desc'; // デフォルト値
  }
  return order as SortOrder;
}

// 使用例
async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
  const sortBy = validateSortField(criteria.sortBy || 'createdAt');
  const sortOrder = validateSortOrder(criteria.sortOrder || 'desc');

  const users = await this.prisma.user.findMany({
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return users.map(this.toDomainObject);
}
```

#### 問題3: Prismaでフルテキスト検索を実装したい

**推奨解決策:**
PostgreSQLのフルテキスト検索機能を安全に使用します。

```typescript
// PostgreSQLのto_tsquery関数を使用（パラメータ化）
async fullTextSearch(query: string): Promise<User[]> {
  // スペースをAND演算子に変換
  const sanitizedQuery = query.replace(/\s+/g, ' & ');

  const users = await this.prisma.$queryRaw`
    SELECT * FROM "User"
    WHERE to_tsvector('english', name || ' ' || email)
    @@ to_tsquery('english', ${sanitizedQuery})
  `;

  return users.map(this.toDomainObject);
}
```

## まとめ

SQLインジェクション対策は、Webアプリケーションセキュリティの最重要課題です。本プロジェクトでは以下の原則を遵守してください。

### 必ず実施すること

1. **Prisma ORMのクエリビルダーを使用する**（根本的対策）
2. **生SQLは原則禁止**（やむを得ない場合はパラメータ化）
3. **全ての入力をZodで検証する**（Presentation層）
4. **Value Objectで型安全性を確保する**（Domain層）

### 推奨事項

5. **入力値の長さ制限を設ける**（保険的対策）
6. **LIKE演算子の特殊文字をエスケープする**（保険的対策）
7. **最小権限のDBユーザーを使用する**（被害の最小化）
8. **定期的なセキュリティテストを実施する**（継続的な検証）

### レビュー時の確認事項

- Repository実装でPrismaのクエリビルダーが使われているか
- `$queryRaw` / `$executeRaw` が不必要に使われていないか
- ユーザー入力が適切にバリデーションされているか
- テストで攻撃的な入力パターンが検証されているか

これらの対策を徹底することで、SQLインジェクションのリスクを最小限に抑えることができます。
