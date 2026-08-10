---
name: prisma-error-handling
description: |
  Prismaランタイムエラーの共通ハンドリングパターンを提供するスキル。
  error-handling-utils・repository-error-patterns を統合した完全版。
  toErrorMeta スプレッドパターン、mapPrismaError ヘルパー、
  repositoryOperation HOF（読み取り専用）と manual try-catch（書き込み操作）の使い分け、
  applyMasking によるログマスキング、Server Action での toErrorMeta 使用、
  PrismaClientKnownRequestError コードマッピング、TransactionClient 型、
  DomainError 変換パターンを扱う。

  トリガー例:
  - 「PrismaClientKnownRequestError」「P2002」「P2025」「P2003」
  - 「TransactionClient」「Prismaエラー変換」「ドメインエラー変換」
  - 「mapPrismaError」「toErrorMeta」「catch ブロック」「repositoryOperation」
  - 「error instanceof Error」「catch」「try {」
  - 「applyMasking」「ログマスキング」
  - 「Repository エラーハンドリング」「save」「update」「delete」メソッドの catch ブロック実装時
  - 「findById」「findByEmail」「findByCriteria」「count」メソッド実装時
  - Repository実装時、Service実装時
  - src/layers/infrastructure/repositories/ 配下の編集時
  - src/layers/infrastructure/**/*.ts 配下の編集時

  ※ prisma-v7-troubleshooting はマイグレーション/セットアップ/v7移行問題に特化。
  このスキルはランタイムエラーハンドリングとRepository実装パターンに特化。

globs:
  - "src/layers/infrastructure/repositories/**/*.ts"
  - "src/layers/infrastructure/**/*.ts"
---

# Prisma Error Handling Skill

Repository層でのPrismaランタイムエラーのハンドリングパターンを提供します。
`error-handling-utils`・`repository-error-patterns` を統合した完全版スキルです。
`mapPrismaError` ヘルパー、`repositoryOperation` HOF の使い分け、
`toErrorMeta` スプレッドパターン、ログマスキング、
`PrismaClientKnownRequestError` の正しいコードマッピング、
`TransactionClient` の型安全な扱い方、DomainError への変換パターンを支援します。

---

## 1. prisma-v7-troubleshooting との棲み分け

| スキル | 対象 |
|--------|------|
| **prisma-error-handling**（このスキル） | ランタイムエラーハンドリング、Repository実装時のエラー変換パターン |
| **prisma-v7-troubleshooting** | マイグレーション失敗、v6→v7移行、Turbopack互換性、セットアップエラー |

---

## 2. PrismaClientKnownRequestError コードマッピング

### エラーコード一覧（このプロジェクトで頻出）

| コード | 名称 | 典型的な原因 | DomainError変換例 |
|--------|------|-------------|-------------------|
| **P2002** | Unique constraint failed | UNIQUE制約違反（重複INSERT/UPDATE） | `DomainError('メールアドレスが既に使用されています', 'EMAIL_DUPLICATE')` |
| **P2025** | Record not found | 存在しないレコードのupdate/delete | `DomainError('対象レコードが見つかりません', 'RECORD_NOT_FOUND')` |
| **P2003** | Foreign key constraint failed | 参照先レコードが存在しない | `DomainError('存在しないユーザーです', 'USER_NOT_FOUND')` |
| **P2021** | Table not found | マイグレーション未適用 | prisma-v7-troubleshooting を参照 |
| **P2024** | Timed out | 接続プール枯渇 | prisma-v7-troubleshooting を参照 |

### 正しいエラー判定方法

```typescript
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
import { DomainError } from '@/layers/domain/errors/DomainError';

// ✅ 正しい: instanceof チェック + エラーコードで判定
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') {
    // meta.target で制約違反フィールドを特定
    const target = (error.meta?.target as string[]) ?? [];
    if (target.includes('email')) {
      throw new DomainError('メールアドレスが既に使用されています', 'EMAIL_DUPLICATE');
    }
    throw new DomainError('データが重複しています', 'DUPLICATE_ENTRY');
  }
  if (error.code === 'P2025') {
    throw new DomainError('対象レコードが見つかりません', 'RECORD_NOT_FOUND');
  }
  if (error.code === 'P2003') {
    throw new DomainError('関連するリソースが存在しません', 'FOREIGN_KEY_VIOLATION');
  }
}

// ❌ 禁止: message.includes() による文字列マッチ（Prismaバージョンアップで壊れる）
if (error.message.includes('Unique constraint')) { ... }
```

---

## 3. mapPrismaError ヘルパー（DRY原則）

`src/layers/infrastructure/repositories/utils/mapPrismaError.ts` に定義。
Repository の catch ブロックで **Prisma固有エラーを DomainError にマッピング** する共通ヘルパー。
P2002/P2025 の重複コードを排除するために使用する。

### インポートと基本使用

```typescript
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
import { DomainError } from '@/layers/domain/errors/DomainError';

async save(user: User, transaction?: ITransaction): Promise<void> {
  try {
    const client = this.getClient(transaction);
    await client.user.upsert({ ... });
  } catch (error) {
    this.logger.error('ユーザー保存に失敗', {
      userId: user.id.value,
      ...toErrorMeta(error),
    });

    // ✅ mapPrismaError: マッチすれば DomainError を throw、マッチしなければ何もしない
    mapPrismaError(error, {
      p2002Email: 'メールアドレスが既に使用されています',
    });

    // mapPrismaError がマッチしなかった場合のフォールバック
    throw new DomainError('ユーザーの保存に失敗しました', 'USER_SAVE_FAILED');
  }
}
```

### PrismaErrorMappings のオプション

```typescript
mapPrismaError(
  error: unknown,
  mappings: {
    /** P2002: email フィールドの unique 制約違反 */
    p2002Email?: string;
    /** P2002: email 以外のカスタム unique 違反（target 配列を受け取り DomainError | null を返す） */
    p2002Custom?: (target: string[]) => DomainError | null;
    /** P2003: foreign key 制約違反 */
    p2003?: string;
    /** P2003: カスタムハンドリング */
    p2003Custom?: () => DomainError | null;
    /** P2025: record not found（update/delete 対象が存在しない） */
    p2025?: string;
  },
): void
// ※ 対応するマッピングがなければスローせずに終了
// ※ 呼び出し元でフォールバックエラー（DomainError）を必ずスローすること
```

### delete/update での P2025 マッピング例

```typescript
async delete(id: UserId): Promise<void> {
  try {
    await this.prisma.user.delete({ where: { id: id.value } });
  } catch (error) {
    this.logger.error('ユーザー削除に失敗', {
      userId: id.value,
      ...toErrorMeta(error),
    });
    mapPrismaError(error, {
      p2025: '削除対象のユーザーが見つかりません',
    });
    throw new DomainError('ユーザーの削除に失敗しました', 'USER_DELETE_FAILED');
  }
}
```

### p2002Custom の使い方（メール以外のUNIQUE制約）

```typescript
mapPrismaError(error, {
  p2002Custom: (target) => {
    if (target.includes('username')) {
      return new DomainError('ユーザー名が既に使用されています', 'USERNAME_DUPLICATE');
    }
    return null; // null の場合はスローしない
  },
});
```

### P2002 ガード条件の注意点

`mapPrismaError` の P2002 ハンドラーの outer guard は `p2002Email` と `p2002Custom` の両方をチェックすること。

```typescript
// ✅ 正しい guard
if (error.code === 'P2002' && (mappings.p2002Email || mappings.p2002Custom)) {
  const target = (error.meta?.target as string[]) ?? [];
  if (target.includes('email') && mappings.p2002Email) {
    throw new DomainError(mappings.p2002Email, 'EMAIL_DUPLICATE');
  }
  if (mappings.p2002Custom) {
    const customError = mappings.p2002Custom(target);
    if (customError) throw customError;
  }
}

// ❌ 誤った guard（p2002Custom だけ渡した場合に到達しない）
if (error.code === 'P2002' && mappings.p2002Email) {
  // p2002Custom のみの場合、この分岐に入れない
}
```

---

## 4. toErrorMeta ヘルパー（ログメタデータ）

`src/layers/infrastructure/utils/toErrorMeta.ts` に定義。
catch ブロックのログ出力で **スプレッド演算子** と組み合わせて使用する。

```typescript
import { toErrorMeta } from '@/layers/infrastructure/utils/toErrorMeta';

// シグネチャ: toErrorMeta(error) → { error: string; stack?: string }
// - Error インスタンス → { error: error.message, stack: error.stack }
// - それ以外         → { error: String(error) }

catch (error) {
  // ✅ スプレッドで他のメタと合成
  this.logger.error('ユーザー検索に失敗', {
    userId: id.value,
    ...toErrorMeta(error),
  });

  throw new DomainError('ユーザーの検索に失敗しました', 'USER_FIND_FAILED');
}
```

**禁止パターン**:

```typescript
// ❌ 禁止: 毎回同じ型ガードをインライン記述
this.logger.error('失敗', {
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
});

// ✅ 正しい: toErrorMeta スプレッドに統一
this.logger.error('失敗', {
  ...toErrorMeta(error),
});
```

---

## 5. repositoryOperation HOF vs manual try-catch 判断基準

Repository メソッドには2つのエラーハンドリングパターンが存在する。

| mapPrismaError が必要か | パターン |
|---|---|
| 不要（読み取り専用） | **Pattern A: repositoryOperation HOF** |
| 必要（書き込み操作） | **Pattern B: manual try-catch + mapPrismaError** |

詳細な適用基準:

| 条件 | パターン | 理由 |
|------|----------|------|
| 読み取り専用（find/count等）| **Pattern A** | 個別の Prisma エラー変換が不要 |
| 書き込み操作（save/update/delete）| **Pattern B** | P2002/P2025等の個別エラー変換が必要 |
| P2002（unique制約違反）が発生しうる | **Pattern B** | `EMAIL_DUPLICATE` 等のドメインエラーに変換が必要 |
| P2025（レコード未存在）が発生しうる | **Pattern B** | `RECORD_NOT_FOUND` エラーに変換が必要 |

---

## 6. Pattern A: repositoryOperation HOF（読み取り専用）

ファイル: `src/layers/infrastructure/repositories/utils/repositoryOperation.ts`

try-catch + ログ + DomainError 変換を一元管理する Higher-Order Function。
**適用範囲**: findById, findByEmail, findByCriteria, count 等の読み取り操作

```typescript
// ✅ 正しい: findById に repositoryOperation を使用
async findById(id: UserId, transaction?: ITransaction): Promise<User | null> {
  this.logger.info('ユーザーID検索開始', { userId: id.value });

  return repositoryOperation(
    async () => {
      const client = this.getClient(transaction);
      const userData = await client.user.findUnique({
        where: { id: id.value },
      });

      if (userData) {
        this.logger.info('ユーザーID検索成功', {
          userId: id.value,
          email: userData.email,
        });
        return this.toDomainObject(userData);
      } else {
        this.logger.info('ユーザーが見つかりません', { userId: id.value });
        return null;
      }
    },
    this.logger,
    { operation: 'ID検索', entity: 'ユーザー', params: { userId: id.value } },
    'ユーザーの検索に失敗しました',
    'USER_FIND_FAILED',
  );
}
```

### repositoryOperation の引数

```typescript
repositoryOperation<T>(
  operation: () => Promise<T>,    // 実際のDB操作
  logger: ILogger,                // ロガー
  context: {                      // ログ出力コンテキスト
    operation: string;            // 操作名（'ID検索', '条件検索' 等）
    entity: string;               // エンティティ名（'ユーザー', 'セッション' 等）
    params?: Record<string, unknown>; // 検索パラメータ（ログ用）
  },
  errorMessage: string,           // DomainError メッセージ
  errorCode: string,              // DomainError コード
): Promise<T>
```

### Pattern A が適用できるメソッド例

- `findById()`
- `findByEmail()`
- `findByCriteria()`
- `findAll()`
- `count()`
- `exists()`

---

## 7. Pattern B: manual try-catch + mapPrismaError（書き込み操作）

ファイル: `src/layers/infrastructure/repositories/utils/mapPrismaError.ts`

```typescript
// ✅ 正しい: save に manual try-catch + mapPrismaError を使用
async save(user: User, transaction?: ITransaction): Promise<void> {
  this.logger.info('ユーザー保存開始', {
    userId: user.id.value,
    email: user.email.value,
  });

  try {
    const client = this.getClient(transaction);
    const data = this.toPersistenceObject(user);

    await client.user.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        email: data.email,
        updatedAt: data.updatedAt,
      },
      create: data,
    });

    this.logger.info('ユーザー保存成功', {
      userId: user.id.value,
      email: user.email.value,
    });
  } catch (error) {
    this.logger.error('ユーザー保存に失敗', {
      userId: user.id.value,
      email: user.email.value,
      ...toErrorMeta(error),
    });

    // Prismaエラーを適切なドメインエラーに変換
    mapPrismaError(error, {
      p2002Email: 'メールアドレスが既に使用されています',
    });

    throw new DomainError('ユーザーの保存に失敗しました', 'USER_SAVE_FAILED');
  }
}
```

```typescript
// ✅ 正しい: update に mapPrismaError（P2002 + P2025 両方）
async update(user: User, transaction?: ITransaction): Promise<void> {
  // ... logger.info ...
  try {
    // ... DB操作 ...
  } catch (error) {
    this.logger.error('ユーザー更新に失敗', {
      userId: user.id.value,
      ...toErrorMeta(error),
    });

    mapPrismaError(error, {
      p2002Email: 'メールアドレスが既に使用されています',
      p2025: '更新対象のユーザーが見つかりません',
    });

    throw new DomainError('ユーザーの更新に失敗しました', 'USER_UPDATE_FAILED');
  }
}
```

### Pattern B が必要なメソッド例

- `save()`
- `update()`
- `delete()`
- `upsert()`（一意制約が関わる場合）

---

## 8. 全メソッドへの一貫した try/catch

**findByCriteria・count・delete も含めて全メソッドに try/catch を適用すること。**
読み取り系（find/count）は Prisma エラーをそのまま上に投げないよう、
必ず DomainError に変換してからスローする。

```typescript
// ✅ findByCriteria — 読み取り系も try/catch + toErrorMeta + DomainError
async findByCriteria(criteria: UserSearchCriteria): Promise<User[]> {
  try {
    const users = await this.prisma.user.findMany({ where: buildWhere(criteria) });
    return users.map(this.toDomainObject.bind(this));
  } catch (error) {
    this.logger.error('ユーザー条件検索に失敗', {
      criteria,
      ...toErrorMeta(error),
    });
    throw new DomainError('ユーザーの検索に失敗しました', 'USER_FIND_FAILED');
  }
}

// ✅ count — 集計系も同様
async count(searchQuery?: string): Promise<number> {
  try {
    const total = await this.prisma.user.count({ where: buildWhere(searchQuery) });
    return total;
  } catch (error) {
    this.logger.error('ユーザー数カウントに失敗', {
      searchQuery,
      ...toErrorMeta(error),
    });
    throw new DomainError('ユーザー数の取得に失敗しました', 'USER_COUNT_FAILED');
  }
}
```

---

## 9. TransactionClient 型パターン

### ITransaction インターフェースと getClient() パターン

このプロジェクトでは `ITransaction` を Domain層で定義し、
Infrastructure層でPrismaの `TransactionClient` にキャストする設計を採用しています。

```typescript
// ✅ 正しい: Prisma.TransactionClient へのキャスト
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

private getClient(
  transaction?: ITransaction,
): PrismaClient | Prisma.TransactionClient {
  return (transaction as unknown as Prisma.TransactionClient) ?? this.prisma;
}
```

### アンチパターン: `as unknown as PrismaClient`

以下のパターンは**型安全性が低く禁止**：

```typescript
// ❌ 禁止: PrismaClient全体へのキャストは型情報が失われる
private getClient(transaction?: unknown): PrismaClient {
  return (transaction as unknown as PrismaClient) || this.prisma;
}
```

`Prisma.TransactionClient` は `PrismaClient` のサブセット型であり、
トランザクション中に使えないメソッド（`$transaction`, `$connect`, `$disconnect` 等）が除外されています。
`PrismaClient` へキャストすると、コンパイル上は呼べてしまうが実行時エラーになる危険があります。

### トランザクション実装の全体例（mapPrismaError + toErrorMeta 使用）

```typescript
// src/layers/infrastructure/repositories/implementations/PrismaUserRepository.ts
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
import { toErrorMeta } from '@/layers/infrastructure/utils/toErrorMeta';

async save(user: User, transaction?: ITransaction): Promise<void> {
  try {
    const client = this.getClient(transaction);
    await client.user.upsert({ ... });
  } catch (error) {
    this.logger.error('ユーザー保存に失敗', {
      userId: user.id.value,
      email: user.email.value,
      ...toErrorMeta(error),
    });
    mapPrismaError(error, {
      p2002Email: 'メールアドレスが既に使用されています',
    });
    throw new DomainError('ユーザーの保存に失敗しました', 'USER_SAVE_FAILED');
  }
}
```

---

## 10. ログマスキング: applyMasking パターン

`src/utils/logMasking.ts` で定義されている関数の使い分け:

| 関数 | 用途 |
|------|------|
| `applyMasking` | **Logger 内部で使用**。ログオブジェクト全体の再帰的マスキング |
| `maskSensitiveData` | 個別のオブジェクトをマスクする場合（テスト等） |

通常のアプリケーションコードでは直接使用せず、Logger（`ILogger`）経由でのログ出力が正しい。
Logger が `applyMasking` を自動で適用するため、呼び出し元でのマスキング処理は不要。

```typescript
// ✅ 正しい: ILogger 経由（Logger が自動マスキング）
this.logger.error('ユーザー処理に失敗', {
  userId: user.id.value,
  email: user.email.value,  // Logger が password 等を自動マスク
});

// ❌ 不要: 手動マスキング（Logger に委ねる）
import { maskSensitiveData } from '@/utils/logMasking';
this.logger.error('失敗', maskSensitiveData({ email, password })); // 二重マスキングになる
```

---

## 11. Server Action での toErrorMeta 使用

`toErrorMeta` は Infrastructure 層（Repository/Service）専用ではなく、Presentation 層（Server Action）の catch ブロックでも使用できる。
予期しない例外が Server Action の外まで漏れた場合に、一貫したフォーマットでログを出力できる。

```typescript
import { toErrorMeta } from '@/utils/toErrorMeta';
```

> **注意**: import パスが Infrastructure 層と異なる。`@/utils/toErrorMeta`（プロジェクトルート utils）から import すること。

### コード例

```typescript
// ❌ OLD: 手書きの instanceof チェック
export async function createUserAction(formData: FormData) {
  try {
    // ...
  } catch (error) {
    logger.error('Server Action で予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ✅ NEW: toErrorMeta スプレッドパターン
export async function createUserAction(formData: FormData) {
  try {
    // ...
  } catch (error) {
    logger.error('Server Action で予期しないエラー', {
      ...toErrorMeta(error),
    });
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
```

### toErrorMeta 適用範囲

| 層 | 使用可否 | 備考 |
|----|---------|------|
| Repository（Infrastructure） | ✅ | 主な使用箇所。`@/layers/infrastructure/utils/toErrorMeta` からimport |
| Service（Infrastructure） | ✅ | 同上 |
| Server Action（Presentation） | ✅ | `@/utils/toErrorMeta` からimport |
| UseCase（Application） | ⚠️ | `mapToAppError` を使用すること。直接 catch する場合は使用可 |
| Domain | ❌ | Domain 層はロガーを持たない。エラーは DomainError として throw するだけ |

---

## 12. DomainError への変換パターン

### 変換の責務

**PrismaエラーはRepository層でキャッチし、必ずDomainErrorに変換**してから上位に投げること。
Application層/UseCase層にPrisma固有の型を漏らさない。

変換フロー:

```
Prisma Error → catch → mapPrismaError (P2002/P2025) → DomainError throw
                     → toErrorMeta spread (logger.error)
                     → フォールバック DomainError throw
```

UseCase は `mapToAppError` 経由で `DomainError` を `AppError` に変換する。

### DomainError を二重変換しない

```typescript
// ✅ 正しい: DomainError はそのまま上位に通す（再変換しない）
// mapPrismaError が throw した DomainError はそのまま伝播される
// catch ブロックのフォールバック throw new DomainError(...) が最後の変換点
```

---

## 13. Prisma.XxxGetPayload 型活用

Repository内のマッピングメソッドで手書き型を避ける：

```typescript
import type { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

// ✅ Prisma生成型を使用（include/selectに合わせた型が自動導出される）
type SessionWithUser = Prisma.UserSessionGetPayload<{
  include: { User: true };
}>;

private toDomainModel(prismaSession: SessionWithUser): UserSessionWithUser {
  // ...
}

// ❌ 禁止: 手書きインライン型
private toDomainModel(data: { id: string; userId: string; User: { id: string } }): Domain {
```

---

## 14. prisma.$transaction() の使い方

UseCase層からトランザクションを開始し、Repository層に渡すパターン：

```typescript
// Application層（UseCase）でトランザクション開始
execute(request: Request): ResultAsync<Response, AppError> {
  return ResultAsync.fromPromise(
    this._execute(request),
    mapToAppError(this.logger, 'CreateUser', 'USER_CREATE_FAILED'),
  );
}

private async _execute(request: Request): Promise<Response> {
  await this.prisma.$transaction(async (tx) => {
    // tx は Prisma.TransactionClient
    // Repository の transaction? 引数に渡す
    await this.userRepository.save(user, tx as unknown as ITransaction);
    await this.sessionRepository.create(session, tx as unknown as ITransaction);
  });
  return response;
}
```

> **注意**: UseCase層でPrismaを直接インポートしてよいのは `$transaction` を呼ぶ場合のみ。
> クエリは必ずRepository経由で行うこと。

---

## 15. 禁止パターン

```typescript
// ❌ 禁止: 書き込み操作に repositoryOperation を使う
// repositoryOperation は mapPrismaError を内包しないため、
// P2002/P2025 等のドメインエラー変換が機能しない
async save(user: User): Promise<void> {
  return repositoryOperation(
    async () => {
      await this.prisma.user.upsert({ ... }); // P2002 が発生しても EMAIL_DUPLICATE に変換されない
    },
    this.logger,
    { operation: '保存', entity: 'ユーザー' },
    'ユーザーの保存に失敗しました',
    'USER_SAVE_FAILED', // 常にこのコードになってしまう
  );
}
```

```typescript
// ❌ 禁止: mapPrismaError の後にフォールバックエラーをスローしない
try {
  await this.prisma.user.update({ ... });
} catch (error) {
  mapPrismaError(error, { p2025: '...' });
  // ← フォールバックがないため、P2002 等は catch されずに素通りしてしまう
}
```

```typescript
// ❌ 禁止: message.includes() による文字列マッチ
if (error.message.includes('Unique constraint')) { ... }
```

```typescript
// ❌ 禁止: 毎回同じ型ガードをインライン記述
this.logger.error('失敗', {
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
});
```

```typescript
// ❌ 禁止: エラーコードの命名規則違反
// エラーコードは UPPER_SNAKE_CASE で統一
// 'user_find_failed', 'userFindFailed' 等は禁止
```

---

## チェックリスト

### 読み取りメソッド（find/count 等）
- [ ] `repositoryOperation()` HOF を使用している
- [ ] `context.operation` と `context.entity` を日本語で記述している
- [ ] `errorCode` は `UPPER_SNAKE_CASE` になっている

### 書き込みメソッド（save/update/delete 等）
- [ ] `try-catch` パターンを使用している
- [ ] `this.logger.error()` + `toErrorMeta(error)` でエラーログを出力している（インライン型ガード禁止）
- [ ] `mapPrismaError()` でPrismaエラーを変換している（手書きの P2002/P2025 instanceof チェックを避ける）
- [ ] `mapPrismaError()` の後に必ずフォールバック `throw new DomainError(...)` がある
- [ ] P2002（unique制約）が発生しうる場合: `p2002Email` または `p2002Custom` を設定している
- [ ] P2025（レコード未存在）が発生しうる場合: `p2025` を設定している
- [ ] P2003（外部キー違反）→ 手動 `instanceof` チェック + DomainError（mapPrismaError は未対応）

### Repository実装全体
- [ ] `getClient()` の戻り値型は `PrismaClient | Prisma.TransactionClient`（`PrismaClient` 単独ではない）
- [ ] Prismaエラーを必ず `DomainError` に変換してからthrowしている
- [ ] **全メソッド**（findByCriteria/count/delete 含む）に try/catch を適用している
- [ ] Prismaの生成型（`Prisma.XxxGetPayload`）を活用し、手書き型を避けている
- [ ] ログは `ILogger` 経由のみ（手動マスキング不要）

---

## インポートパス一覧

```typescript
import { mapPrismaError } from '@/layers/infrastructure/repositories/utils/mapPrismaError';
import { repositoryOperation } from '@/layers/infrastructure/repositories/utils/repositoryOperation';
import { toErrorMeta } from '@/layers/infrastructure/utils/toErrorMeta';  // Infrastructure層
import { toErrorMeta } from '@/utils/toErrorMeta';  // Presentation層（Server Action）
import { DomainError } from '@/layers/domain/errors/DomainError';
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';
```

---

## 関連スキル

- **prisma-v7-troubleshooting**: マイグレーション・セットアップ・v7移行問題
- **resultasync-patterns**: UseCase 層でのエラー処理（AppUseCaseError, mapToAppError）
- **infrastructure-impl**: Repository 実装の全体パターン
- **pino-logging**: 構造化ログパターン
