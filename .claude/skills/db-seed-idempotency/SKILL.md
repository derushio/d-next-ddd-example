---
name: db-seed-idempotency
description: |
  DBシードの冪等性を強制するスキル。
  すべてのseed操作でupsertを使用し、何度実行しても同じ結果を保証するパターンを提供。
  create/createManyの使用を禁止し、安全なシード実装をガイドします。

  トリガー例:
  - 「シード」「seed」「初期データ」「テストデータ作成」
  - 「冪等性」「idempotent」「upsert」
  - src/layers/infrastructure/persistence/prisma/seeds/ 配下のファイル編集時
  - prisma/seeds/ 配下のファイル編集時
globs:
  - "src/layers/infrastructure/persistence/prisma/seeds/**/*.ts"
---

# DB Seed Idempotency Skill

## 冪等性の基本原則

**冪等性 (Idempotency)**: 同じ操作を何度実行しても、結果が同じであること。

### なぜ重要か

- 開発環境のリセット時に安全に再実行できる
- CI/CD パイプラインで繰り返し実行しても問題ない
- データの重複や不整合を防ぐ
- エラー後のリトライが安全に行える

### 冪等性を保証するための必須ルール

1. **upsert 必須**: すべてのデータ挿入は `upsert` を使用
2. **create/createMany 禁止**: 冪等性が保証できないため使用禁止
3. **ID 事前決定**: データの ID を固定値または決定論的に生成
4. **トランザクション使用**: 複数操作は `$transaction` でアトミック化
5. **where 句は ID ベース必須**: upsert の `where` 句は必ず `id` を使用（slug/email 等の可変フィールドは禁止）

---

## エントリポイントパターン

シードのエントリポイントは `prisma.config.ts` の `seed` で指定されたファイルに記述します。

```typescript
// src/layers/infrastructure/persistence/prisma/seeds/index.ts
// prisma.config.ts の seed で指定されたエントリポイント
// pnpm tsx ./src/layers/infrastructure/persistence/prisma/seeds/index.ts
import { seedUsers } from './users';
// 必要なシード関数をインポート

async function seed() {
  await seedUsers();
  // 他のシード関数を呼び出す
}

async function main() {
  try {
    await seed();
  } finally {
    await prisma.$disconnect();
  }
}

void main();
```

**注意**: `prisma.$disconnect()` は `finally` ブロックで必ず呼び出すこと。

---

## 基本パターン

### ✅ 推奨: upsert を使用した冪等的なシード

```typescript
import 'reflect-metadata';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

export async function seedUsers() {
  await prisma.$transaction(async (t) => {
    // ID を固定値として定義
    const userData = {
      id: 'm8kpy32b06shqbw7x5pgtaan',
      name: 'テストユーザー',
      email: 'test@example.com',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
    } satisfies Prisma.UserCreateInput;

    // upsert で冪等性を保証
    await t.user.upsert({
      where: { id: userData.id },
      create: userData,
      update: userData,
    });
  });
}
```

### ❌ 禁止: create を使用した非冪等的なシード

```typescript
// ❌ 2回実行すると重複エラーが発生
export async function seedUsers() {
  await prisma.user.create({
    data: {
      name: 'テストユーザー',
      email: 'test@example.com',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
    },
  });
}

// ❌ createMany も同様に禁止
export async function seedUsers() {
  await prisma.user.createMany({
    data: [
      { name: 'User 1', email: 'user1@example.com' },
      { name: 'User 2', email: 'user2@example.com' },
    ],
  });
}
```

---

## ID の事前決定パターン

### パターン 1: 固定 CUID2（最推奨）

**固定 CUID2 の生成方法**:

```bash
# CUID2 を生成するコマンド
node -e "
const { init } = require('@paralleldrive/cuid2');
const createId = init({ length: 24 });
console.log(createId());
"
```

実行例:

```bash
$ node -e "..."
m05pbit8uqekw059j44uvmfo
```

**生成した CUID2 をコードに埋め込む**:

```typescript
// ✅ 生成した CUID2 を固定値として使用
const ADMIN_USER_ID = 'm05pbit8uqekw059j44uvmfo'; // 固定CUID2
const TEST_USER_ID = 'bfctu8gvpcw9kdnzh32e03vu';  // 固定CUID2

export async function seedUsers() {
  await prisma.$transaction(async (t) => {
    await t.user.upsert({
      where: { id: ADMIN_USER_ID },
      create: {
        id: ADMIN_USER_ID,
        name: '管理者',
        email: 'admin@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
      update: {
        name: '管理者',
        email: 'admin@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
    });
  });
}
```

**❌ 禁止: genCuid2() で毎回生成**:

```typescript
import { genCuid2 } from '@/utils/cuid2';

// ❌ 毎回新しいID生成 → 冪等性がない
export async function seedUsers() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    create: { id: genCuid2(), ... }, // ← 実行のたびに違うID！
    update: { ... },
  });
}
```

### パターン 2: 本番既存 ID を使用（既存データがある場合）

本番環境に既にデータが存在する場合は、その既存 ID を固定 ID として使用すべきです。

**本番 DB から既存 ID を取得**:

```bash
# 本番DBから既存IDを取得
psql "$DATABASE_URL" -c 'SELECT id, slug FROM "Company";'
```

出力例:

```
            id            |     slug
--------------------------+--------------
 m05pbit8uqekw059j44uvmfo | sample-a
 bfctu8gvpcw9kdnzh32e03vu | sample-b-old
```

**取得した既存 ID をシードに使用**:

```typescript
// ✅ 本番の既存IDを固定値として使用
const companies = [
  {
    id: 'm05pbit8uqekw059j44uvmfo', // 本番既存ID
    slug: 'sample-a', // slugは変更可能
    name: '株式会社サンプルA',
  },
  {
    id: 'bfctu8gvpcw9kdnzh32e03vu', // 本番既存ID
    slug: 'sample-b', // 旧 sample-b-old から変更
    name: '株式会社サンプルB',
  },
];

export async function seedCompanies() {
  await prisma.$transaction(async (t) => {
    for (const company of companies) {
      await t.company.upsert({
        where: { id: company.id }, // ← 既存IDでupsert
        create: company,
        update: { name: company.name, slug: company.slug },
      });
    }
  });
}
```

この方法により:

- slugが変更されても同じレコードが更新される
- 本番データとローカル開発環境のIDが一致する
- データの整合性が保たれる

### パターン 3: 固定 ID（シンプルな文字列）

```typescript
// Prisma の cuid2 生成器と同じ長さの固定 ID を使用
const ADMIN_USER_ID = 'admin000000000000000000'; // 24文字
const TEST_USER_ID = 'test0000000000000000000';  // 24文字

export async function seedUsers() {
  await prisma.$transaction(async (t) => {
    await t.user.upsert({
      where: { id: ADMIN_USER_ID },
      create: {
        id: ADMIN_USER_ID,
        name: '管理者',
        email: 'admin@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
      update: {
        name: '管理者',
        email: 'admin@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
    });

    await t.user.upsert({
      where: { id: TEST_USER_ID },
      create: {
        id: TEST_USER_ID,
        name: 'テストユーザー',
        email: 'test@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
      update: {
        name: 'テストユーザー',
        email: 'test@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
    });
  });
}
```

### パターン 4: 決定論的生成（非推奨 - 可変フィールド依存は危険）

**⚠️ 警告**: このパターンは email や slug などの可変フィールドに依存するため、フィールドが変更されると冪等性が壊れます。パターン1または2を推奨します。

```typescript
import { createHash } from 'node:crypto';

// メールアドレスから決定論的に ID を生成
function generateDeterministicId(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex');
  return hash.slice(0, 24); // 24文字に切り詰め
}

export async function seedUsers() {
  const users = [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
  ];

  await prisma.$transaction(async (t) => {
    for (const user of users) {
      const id = generateDeterministicId(user.email);

      await t.user.upsert({
        where: { email: user.email }, // ユニーク制約を where に使用
        create: {
          id,
          email: user.email,
          name: user.name,
        },
        update: {
          name: user.name,
        },
      });
    }
  });
}
```

---

## トランザクション使用パターン

### 基本パターン: 複数レコードを安全に作成

```typescript
export async function seedCategories() {
  await prisma.$transaction(async (t) => {
    const categories = [
      { id: 'cat1000000000000000000', name: 'Technology' },
      { id: 'cat2000000000000000000', name: 'Business' },
      { id: 'cat3000000000000000000', name: 'Health' },
    ];

    for (const category of categories) {
      await t.category.upsert({
        where: { id: category.id },
        create: category,
        update: { name: category.name },
      });
    }
  });
}
```

### 高度なパターン: 並列実行で高速化

```typescript
export async function seedCategories() {
  await prisma.$transaction(async (t) => {
    const categories = [
      { id: 'cat1000000000000000000', name: 'Technology' },
      { id: 'cat2000000000000000000', name: 'Business' },
      { id: 'cat3000000000000000000', name: 'Health' },
    ];

    // Promise.all で並列実行（依存関係がない場合のみ）
    await Promise.all(
      categories.map((category) =>
        t.category.upsert({
          where: { id: category.id },
          create: category,
          update: { name: category.name },
        })
      )
    );
  });
}
```

---

## 複数レコードの upsert パターン

### パターン 1: ループで upsert

```typescript
export async function seedTags() {
  const tags = [
    { id: 'tag1000000000000000000', name: 'JavaScript' },
    { id: 'tag2000000000000000000', name: 'TypeScript' },
    { id: 'tag3000000000000000000', name: 'React' },
    { id: 'tag4000000000000000000', name: 'Next.js' },
  ];

  await prisma.$transaction(async (t) => {
    for (const tag of tags) {
      await t.tag.upsert({
        where: { id: tag.id },
        create: tag,
        update: { name: tag.name },
      });
    }
  });
}
```

### パターン 2: 型安全性を確保した upsert

```typescript
export async function seedTags() {
  await prisma.$transaction(async (t) => {
    const tags = [
      {
        id: 'tag1000000000000000000',
        name: 'JavaScript',
        slug: 'javascript',
      },
      {
        id: 'tag2000000000000000000',
        name: 'TypeScript',
        slug: 'typescript',
      },
    ] satisfies Prisma.TagCreateInput[];

    for (const tag of tags) {
      await t.tag.upsert({
        where: { id: tag.id },
        create: tag,
        update: {
          name: tag.name,
          slug: tag.slug,
        },
      });
    }
  });
}
```

---

## 親子関係のあるデータのシードパターン

### パターン 1: 親→子の順序で作成

```typescript
export async function seedBlogPosts() {
  await prisma.$transaction(async (t) => {
    // 1. 親（User）を先に作成
    const authorId = 'author00000000000000000';
    await t.user.upsert({
      where: { id: authorId },
      create: {
        id: authorId,
        name: '著者',
        email: 'author@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$...', // ← resolve('HashService').generateHash() で生成
      },
      update: {
        name: '著者',
        email: 'author@example.com',
      },
    });

    // 2. 子（Post）を作成
    const postId = 'post000000000000000000';
    await t.post.upsert({
      where: { id: postId },
      create: {
        id: postId,
        title: 'サンプル記事',
        content: '記事の内容',
        authorId: authorId, // 親の ID を参照
      },
      update: {
        title: 'サンプル記事',
        content: '記事の内容',
        authorId: authorId,
      },
    });
  });
}
```

### パターン 2: ネストした関係（connect 使用）

```typescript
export async function seedPostWithTags() {
  await prisma.$transaction(async (t) => {
    // タグを先に作成
    const tagIds = ['tag1000000000000000000', 'tag2000000000000000000'];

    for (const tagId of tagIds) {
      await t.tag.upsert({
        where: { id: tagId },
        create: { id: tagId, name: `Tag ${tagId}` },
        update: { name: `Tag ${tagId}` },
      });
    }

    // 投稿を作成してタグを紐付け
    const postId = 'post000000000000000000';
    await t.post.upsert({
      where: { id: postId },
      create: {
        id: postId,
        title: 'タグ付き記事',
        content: '内容',
        authorId: 'author00000000000000000',
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
      update: {
        title: 'タグ付き記事',
        content: '内容',
        tags: {
          set: tagIds.map((id) => ({ id })), // update時は set で置き換え
        },
      },
    });
  });
}
```

### パターン 3: 中間テーブルの upsert

```typescript
export async function seedPostTagRelations() {
  await prisma.$transaction(async (t) => {
    const relations = [
      { postId: 'post000000000000000000', tagId: 'tag1000000000000000000' },
      { postId: 'post000000000000000000', tagId: 'tag2000000000000000000' },
    ];

    for (const relation of relations) {
      await t.postTag.upsert({
        where: {
          postId_tagId: {
            postId: relation.postId,
            tagId: relation.tagId,
          },
        },
        create: relation,
        update: {}, // 中間テーブルは更新不要な場合が多い
      });
    }
  });
}
```

---

## DI コンテナとの統合パターン

### パターン 1: Service を使用したハッシュ生成

```typescript
import 'reflect-metadata';
import { resolve } from '@/di/resolver';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

export async function seedAdminUser() {
  // DI コンテナから HashService を取得
  const hashService = resolve('HashService');

  await prisma.$transaction(async (t) => {
    const password = 'admin-password-123';
    const hash = await hashService.generateHash(password);

    const adminData = {
      id: 'admin000000000000000000',
      name: '管理者',
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'ADMIN',
    } satisfies Prisma.UserCreateInput;

    await t.user.upsert({
      where: { id: adminData.id },
      create: adminData,
      update: {
        name: adminData.name,
        email: adminData.email,
        passwordHash: adminData.passwordHash,
        role: adminData.role,
      },
    });
  });
}
```

### パターン 2: 環境変数を使用した設定

```typescript
import 'reflect-metadata';
import { resolve } from '@/di/resolver';
import { prisma } from '@/layers/infrastructure/persistence/prisma';

export async function seedAdminUser() {
  const hashService = resolve('HashService');

  // 環境変数から初期パスワードを取得
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? 'change-me';
  const hash = await hashService.generateHash(password);

  await prisma.$transaction(async (t) => {
    await t.user.upsert({
      where: { id: 'admin000000000000000000' },
      create: {
        id: 'admin000000000000000000',
        name: '管理者',
        email: process.env.ADMIN_EMAIL ?? 'admin@example.com',
        passwordHash: hash,
        role: 'ADMIN',
      },
      update: {
        name: '管理者',
        email: process.env.ADMIN_EMAIL ?? 'admin@example.com',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });
  });
}
```

---

## 禁止パターンと推奨パターンの対比

### ❌ 禁止: where 句に slug/email 等の可変フィールドを使用

```typescript
// ❌ slugでupsert → slugが変更されると冪等性が壊れる
await prisma.company.upsert({
  where: { slug: 'old-slug' }, // ← ダメ！slugは変更される可能性がある
  create: { id: genCuid2(), slug: 'old-slug', ... },
  update: { ... },
});
```

**問題点**:

- slug が `old-slug` から `new-slug` に変更されると:
  1. where 句が `new-slug` を検索 → 見つからない
  2. create が実行される → 新しいレコード作成
  3. 旧 slug のレコードが残る → データ重複・冪等性崩壊

**✅ 推奨: where 句は必ず ID ベース**

```typescript
// ✅ IDでupsert → slugが変わっても同じレコードを更新
await prisma.company.upsert({
  where: { id: 'm05pbit8uqekw059j44uvmfo' }, // ← 固定CUID2
  create: {
    id: 'm05pbit8uqekw059j44uvmfo',
    slug: 'new-slug', // slugは自由に変更可能
    ...
  },
  update: {
    slug: 'new-slug', // updateでslugを更新
    ...
  },
});
```

**原則**:

- **where 句は常に `id` を使用**
- slug, email, name などの可変フィールドは where 句に使用しない
- 可変フィールドは create/update の両方に含める

### ❌ 禁止: 存在チェックしてから create

```typescript
// ❌ レースコンディションが発生する可能性がある
export async function seedUser() {
  const existing = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'テストユーザー',
        email: 'test@example.com',
      },
    });
  }
}
```

### ✅ 推奨: upsert で一発操作

```typescript
// ✅ アトミックな操作で安全
export async function seedUser() {
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    create: {
      id: 'test0000000000000000000',
      name: 'テストユーザー',
      email: 'test@example.com',
    },
    update: {
      name: 'テストユーザー',
    },
  });
}
```

### ❌ 禁止: delete してから create

```typescript
// ❌ 外部キー制約でエラーになる可能性がある
export async function seedUser() {
  await prisma.user.deleteMany({
    where: { email: 'test@example.com' },
  });

  await prisma.user.create({
    data: {
      name: 'テストユーザー',
      email: 'test@example.com',
    },
  });
}
```

### ✅ 推奨: upsert で安全に更新

```typescript
// ✅ 既存データを保持したまま更新
export async function seedUser() {
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    create: {
      id: 'test0000000000000000000',
      name: 'テストユーザー',
      email: 'test@example.com',
    },
    update: {
      name: 'テストユーザー',
    },
  });
}
```

### ❌ 禁止: 自動生成 ID に依存

```typescript
// ❌ 実行のたびに新しい ID が生成される
export async function seedUser() {
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    create: {
      // id を指定しない → 自動生成される
      name: 'テストユーザー',
      email: 'test@example.com',
    },
    update: {
      name: 'テストユーザー',
    },
  });
}
```

### ✅ 推奨: ID を明示的に指定

```typescript
// ✅ 常に同じ ID が使われる
export async function seedUser() {
  const userId = 'test0000000000000000000';

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId, // ID を明示
      name: 'テストユーザー',
      email: 'test@example.com',
    },
    update: {
      name: 'テストユーザー',
      email: 'test@example.com',
    },
  });
}
```

### ❌ 禁止: シードに移行処理を含める

```typescript
// ❌ 移行処理をseedに入れるのは危険
export async function seedCompanies() {
  // 既存データを削除する移行処理
  const existingCompanies = await prisma.company.findMany({
    where: { id: { notIn: companies.map(c => c.id) } },
  });

  if (existingCompanies.length > 0) {
    // ← 危険！将来、新しい会社追加時にリストに入れ忘れたら既存データが消える
    await prisma.company.deleteMany({
      where: { id: { notIn: companies.map(c => c.id) } },
    });
  }

  // upsert処理...
  for (const company of companies) {
    await prisma.company.upsert({ ... });
  }
}
```

**問題点**:

- シードは「あるべき状態を保証」するもので、「データ移行」の責務ではない
- 新しいレコード追加時にリストに入れ忘れると、既存データが削除される
- 移行処理は一度きりで良いが、シードは何度も実行される

**✅ 推奨: シードは純粋な upsert のみ、移行処理は別途実行**

```typescript
// ✅ シード: 純粋なupsertのみ
export async function seedCompanies() {
  await prisma.$transaction(async (t) => {
    for (const company of companies) {
      await t.company.upsert({
        where: { id: company.id },
        create: company,
        update: { name: company.name, slug: company.slug },
      });
    }
  });
}

// 移行処理が必要な場合は、別のスクリプトで一度だけ実行
// または手動でSQLを実行
// 例: scripts/migrations/remove-old-companies.ts（一度だけ実行）
```

---

## 複雑なシナリオ: 完全な例

### シナリオ: ブログシステムの初期データ

```typescript
import 'reflect-metadata';
import { resolve } from '@/di/resolver';
import { prisma } from '@/layers/infrastructure/persistence/prisma';
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

// ID 定義（1箇所で管理）
const IDS = {
  ADMIN_USER: 'admin000000000000000000',
  TEST_USER: 'test0000000000000000000',
  CATEGORY_TECH: 'cat1000000000000000000',
  CATEGORY_BUSINESS: 'cat2000000000000000000',
  TAG_JS: 'tag1000000000000000000',
  TAG_TS: 'tag2000000000000000000',
  POST_1: 'post000000000000000001',
  POST_2: 'post000000000000000002',
} as const;

export async function seedBlogData() {
  const hashService = resolve('HashService');

  await prisma.$transaction(async (t) => {
    // 1. ユーザー作成
    const users = [
      {
        id: IDS.ADMIN_USER,
        name: '管理者',
        email: 'admin@example.com',
        passwordHash: await hashService.generateHash('admin-pass'),
        role: 'ADMIN',
      },
      {
        id: IDS.TEST_USER,
        name: 'テストユーザー',
        email: 'test@example.com',
        passwordHash: await hashService.generateHash('test-pass'),
        role: 'USER',
      },
    ] satisfies Prisma.UserCreateInput[];

    for (const user of users) {
      await t.user.upsert({
        where: { id: user.id },
        create: user,
        update: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
        },
      });
    }

    // 2. カテゴリー作成
    const categories = [
      { id: IDS.CATEGORY_TECH, name: 'Technology', slug: 'technology' },
      { id: IDS.CATEGORY_BUSINESS, name: 'Business', slug: 'business' },
    ] satisfies Prisma.CategoryCreateInput[];

    await Promise.all(
      categories.map((category) =>
        t.category.upsert({
          where: { id: category.id },
          create: category,
          update: { name: category.name, slug: category.slug },
        })
      )
    );

    // 3. タグ作成
    const tags = [
      { id: IDS.TAG_JS, name: 'JavaScript', slug: 'javascript' },
      { id: IDS.TAG_TS, name: 'TypeScript', slug: 'typescript' },
    ] satisfies Prisma.TagCreateInput[];

    await Promise.all(
      tags.map((tag) =>
        t.tag.upsert({
          where: { id: tag.id },
          create: tag,
          update: { name: tag.name, slug: tag.slug },
        })
      )
    );

    // 4. 投稿作成
    const posts = [
      {
        id: IDS.POST_1,
        title: 'TypeScriptの基礎',
        content: 'TypeScriptについて...',
        authorId: IDS.ADMIN_USER,
        categoryId: IDS.CATEGORY_TECH,
        tagIds: [IDS.TAG_TS],
      },
      {
        id: IDS.POST_2,
        title: 'JavaScriptの応用',
        content: 'JavaScriptについて...',
        authorId: IDS.TEST_USER,
        categoryId: IDS.CATEGORY_TECH,
        tagIds: [IDS.TAG_JS, IDS.TAG_TS],
      },
    ];

    for (const post of posts) {
      await t.post.upsert({
        where: { id: post.id },
        create: {
          id: post.id,
          title: post.title,
          content: post.content,
          authorId: post.authorId,
          categoryId: post.categoryId,
          tags: {
            connect: post.tagIds.map((id) => ({ id })),
          },
        },
        update: {
          title: post.title,
          content: post.content,
          authorId: post.authorId,
          categoryId: post.categoryId,
          tags: {
            set: post.tagIds.map((id) => ({ id })),
          },
        },
      });
    }
  });
}
```

---

## エラーハンドリングパターン

### パターン 1: トランザクション全体のロールバック

```typescript
export async function seedData() {
  try {
    await prisma.$transaction(async (t) => {
      // すべての操作がここに
      await t.user.upsert({...});
      await t.post.upsert({...});
    });
    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error; // トランザクションは自動的にロールバックされる
  }
}
```

### パターン 2: 個別エラーのログ出力

```typescript
export async function seedUsers() {
  await prisma.$transaction(async (t) => {
    const users = [...];

    for (const user of users) {
      try {
        await t.user.upsert({
          where: { id: user.id },
          create: user,
          update: user,
        });
        console.log(`✅ Upserted user: ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to upsert user ${user.email}:`, error);
        throw error; // トランザクション全体を失敗させる
      }
    }
  });
}
```

---

## チェックリスト

### 実装前チェック

- [ ] `upsert` を使用する計画になっているか?
- [ ] `create` や `createMany` を使用していないか?
- [ ] すべてのレコードに固定 ID を割り当てる計画があるか?
- [ ] **where 句は ID ベースになっているか?（slug/email でupsertしていないか?）**
- [ ] **固定 CUID2 を使用しているか?（genCuid2() で毎回生成していないか?）**
- [ ] **本番に既存データがある場合、その既存 ID を使用する計画か?**
- [ ] トランザクション内で操作する計画になっているか?
- [ ] 親子関係の依存順序を考慮しているか?
- [ ] **移行処理がシードに含まれていないか?**

### 実装中チェック

- [ ] **`where` 句には必ず `id` を指定しているか?（slug/email 等の可変フィールドは禁止）**
- [ ] `create` と `update` の両方にデータを指定しているか?
- [ ] **可変フィールド（slug, name等）は update にも含まれているか?**
- [ ] `satisfies` を使って型安全性を確保しているか?
- [ ] **固定 CUID2 を使用し、genCuid2() で毎回生成していないか?**
- [ ] DI コンテナを使ってサービスを取得しているか?（必要な場合）
- [ ] 環境変数を適切に使用しているか?（必要な場合）

### 実装後チェック

- [ ] `pnpm db:seed` を2回実行してもエラーが出ないか?
- [ ] データが重複していないか?
- [ ] 外部キー制約が正しく保たれているか?
- [ ] トランザクションが正しく機能しているか?
- [ ] エラーハンドリングが適切か?

### コードレビューチェック

- [ ] `create` や `createMany` が使われていないか?
- [ ] **`where` 句には必ず `id` が使われているか?（slug/email禁止）**
- [ ] ID がハードコードされているか、決定論的に生成されているか?
- [ ] **genCuid2() で毎回生成していないか?（固定CUID2を使用しているか?）**
- [ ] すべての upsert が `where` 句を持っているか?
- [ ] トランザクション内で実行されているか?
- [ ] 型安全性が保たれているか?（`satisfies` の使用）
- [ ] **移行処理がシードに含まれていないか?**

---

## よくある質問

### Q: なぜ create を使ってはいけないのか?

**A**: `create` は既にデータが存在する場合にエラーを投げるため、冪等性が保証できません。シードを複数回実行するとエラーが発生します。

### Q: ID を固定すると本番環境で問題にならないか?

**A**: シードは開発・テスト環境専用です。本番環境では別の方法（マイグレーション、管理画面等）でデータを作成すべきです。

### Q: upsert の where に何を指定すべきか?

**A**: **必ず `id` を指定してください**。slug や email などの可変フィールドを where 句に使用すると、フィールド変更時に冪等性が壊れます。

**悪い例**:

```typescript
// ❌ slugが変更されるとデータが重複する
where: { slug: 'company-slug' }
```

**良い例**:

```typescript
// ✅ IDは不変なので安全
where: { id: 'm05pbit8uqekw059j44uvmfo' }
```

### Q: トランザクションは必須か?

**A**: 複数の操作がある場合は必須です。一部が成功して一部が失敗すると、データが不整合な状態になります。

### Q: 大量データのシードはどうするか?

**A**: バッチ処理（chunk）に分けるか、`Promise.all` で並列化します。ただしトランザクションのタイムアウトに注意してください。

### Q: 固定 CUID2 はどうやって生成するのか?

**A**: 以下のコマンドで生成し、コードに埋め込んでください。genCuid2() で毎回生成してはいけません。

```bash
node -e "
const { init } = require('@paralleldrive/cuid2');
const createId = init({ length: 24 });
console.log(createId());
"
```

### Q: 本番に既存データがある場合はどうするか?

**A**: 本番 DB から既存 ID を取得し、その ID をシードの固定値として使用してください。

```bash
psql "$DATABASE_URL" -c 'SELECT id, slug FROM "Company";'
```

取得した ID をシードに使うことで、本番とローカル環境のデータ整合性が保たれます。

### Q: 移行処理はどこに書くべきか?

**A**: シードには書かないでください。移行処理は以下のいずれかで実行します:

- 別のスクリプト（`scripts/migrations/xxx.ts`）を一度だけ実行
- 手動で SQL を実行
- Prisma マイグレーションの `migration.sql` に記述

シードは「あるべき状態を保証」するもので、「データ移行」の責務ではありません。

---

## まとめ

### 冪等的なシードの基本原則

1. **upsert 必須**: すべての挿入操作は `upsert` を使用
2. **ID 事前決定**: データの ID を固定 CUID2 または本番既存 ID で定義
3. **where 句は ID ベース必須**: slug/email 等の可変フィールドは where 句に使用禁止
4. **トランザクション**: 複数操作は `$transaction` でアトミック化
5. **移行処理は別管理**: シードには移行処理を含めない

### 固定 ID の作成方法

**新規環境の場合**:

```bash
node -e "
const { init } = require('@paralleldrive/cuid2');
const createId = init({ length: 24 });
console.log(createId());
"
```

**本番既存データがある場合**:

```bash
psql "$DATABASE_URL" -c 'SELECT id, slug FROM "Company";'
```

### 実装の流れ

1. **ID 決定**: 固定 CUID2 を生成、または本番既存 ID を取得
2. **データ定義**: ID を含むデータを `satisfies` で型安全に準備
3. **upsert 実装**: トランザクション内で `where: { id }` を使用
4. **テスト**: `pnpm db:seed` を2回実行して冪等性を確認

### よくある落とし穴

- ❌ `where: { slug }` → slug 変更時にデータ重複
- ❌ `id: genCuid2()` → 毎回違う ID 生成
- ❌ シードに移行処理 → 新規追加時にデータ削除リスク
- ✅ `where: { id }` + 固定 CUID2 → 完全な冪等性

この原則に従えば、安全で保守性の高いシード実装が可能です。
