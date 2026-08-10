---
name: promise-concurrency-patterns
description: |
  Promise.all / Promise.allSettled / ResultAsync.combine の使い分けガイド。
  並列処理パターンの選択基準、エラーハンドリング戦略を提供。

  トリガー例:
  - 「Promise.all」「Promise.allSettled」「並列処理」「並行実行」
  - 「部分失敗」「全部成功」「p-map」「p-settle」
  - Promise.all([...]) を書こうとしたとき
  - 複数の非同期処理を同時実行するとき
globs:
  - "src/layers/application/**"
  - "src/layers/infrastructure/**"
---

# Promise 並行処理パターン スキル

`Promise.all` / `Promise.allSettled` / `ResultAsync.combine` の使い分けガイド。

---

## 1. 判断マトリクス

| パターン | 使い場面 | エラー挙動 |
|---------|---------|-----------|
| `Promise.all` | 全て成功が必須。1つ失敗で全体失敗 | 最初のrejectで即座に失敗（他は実行継続するが結果は捨てられる） |
| `Promise.allSettled` | 部分失敗を許容。全結果を取得 | 全て完了まで待機、各結果に `status: 'fulfilled' | 'rejected'` が付く |
| `ResultAsync.combine` | 型安全な `Promise.all` 代替。neverthrow と組み合わせる | 最初の `Err<AppError>` で失敗 |

---

## 2. このプロジェクトでの推奨パターン

### `_execute()` 内での `Promise.all` — 安全な使い方

`ResultAsync.fromPromise` + `_execute()` パターンでは、`_execute()` 内でスローされた例外が
`mapToAppError` に補足される。そのため `Promise.all` 内のどれかが reject しても安全に `AppError` に変換される。

```typescript
// ✅ GetUsersUseCase.ts — 実際のコード例
// データ取得（Promise.all で並列実行）
const [users, totalCount] = await Promise.all([
  this.userRepository.findByCriteria(criteria),
  this.userRepository.count(searchQuery),
]);
```

```typescript
// ✅ LoginAttemptService.ts — トランザクション内での並列取得
// ウィンドウ内の失敗回数と最後の失敗を並列取得
const [failedAttempts, lastFailure] = await Promise.all([
  tx.loginAttempt.count({ where: failureWhere }),
  tx.loginAttempt.findFirst({
    where: failureWhere,
    orderBy: { createdAt: 'desc' },
  }),
]);
```

**ポイント**: `_execute()` は `async` メソッドなので、`Promise.all` 内のどれかが reject すると
`_execute()` 自体も reject → `mapToAppError` が `AppError` に変換する。

---

## 3. Promise.all vs Promise.allSettled 選択ガイド

```
全ての操作が成功しないと意味がない？
  → Yes → Promise.all（または ResultAsync.combine）
  → No  → 以下に進む

各操作の結果を個別に処理したい？
  → Yes → Promise.allSettled
  → No  → Promise.all + try/catch
```

---

## 4. Promise.allSettled の使用例

部分失敗を許容する通知送信のような場面で使用する。

```typescript
// 通知送信（一部失敗しても他は送りたい場合）
const results = await Promise.allSettled([
  sendEmailNotification(user),
  sendSlackNotification(user),
  sendPushNotification(user),
]);

const failures = results.filter(r => r.status === 'rejected');
if (failures.length > 0) {
  logger.warn('一部通知の送信に失敗', { failureCount: failures.length });
}

// fulfilled の値を取り出す
const successValues = results
  .filter((r): r is PromiseFulfilledResult<NotificationResult> => r.status === 'fulfilled')
  .map(r => r.value);
```

---

## 5. ResultAsync.combine（neverthrow）

型安全に複数の `ResultAsync` を並列実行したい場合は `ResultAsync.combine` を使う。

```typescript
import { ResultAsync } from 'neverthrow';

// ✅ ResultAsync.combine — 型安全な並列実行
const combined = ResultAsync.combine([
  this.userRepository.findById(userId),   // ResultAsync<User, AppError>
  this.orderRepository.findByUser(userId), // ResultAsync<Order[], AppError>
]);

// combined は ResultAsync<[User, Order[]], AppError>
const result = await combined;
if (result.isErr()) {
  throw new AppUseCaseError(result.error.message, result.error.code);
}
const [user, orders] = result.value;
```

**注意**: `ResultAsync.combine` は `Promise.all` と同様、最初の `Err` で失敗する。
部分失敗を許容したい場合は `Promise.allSettled` を使うこと。

---

## 6. es-toolkit delay() による待機パターン

```typescript
import { delay } from 'es-toolkit';

// ✅ 推奨: es-toolkit delay
await delay(1000);

// ❌ 禁止: 手書き Promise + setTimeout
await new Promise(resolve => setTimeout(resolve, 1000));
```

`es-toolkit` の `delay` は型安全で意図が明確。手書き `Promise + setTimeout` は禁止。

---

## 7. p-map / p-settle（将来の拡張ポイント）

現時点では依存追加不要（テンプレートの規模では不要）。
大量の並列処理（数百件のAPIコール等）が必要になった場合に検討する。

```typescript
// 将来的な参考: p-map で同時実行数を制御
import pMap from 'p-map';

// concurrency: 5 = 最大5件を同時実行
const results = await pMap(items, async (item) => processItem(item), { concurrency: 5 });
```

現状の `Promise.all(items.map(...))` は全件同時実行になるため、件数が少ない場合のみ適用すること。

---

## 8. 禁止パターン

### forループ内での await（直列実行）

```typescript
// ❌ 禁止: forループ内でawait（直列実行になる）
for (const item of items) {
  await processItem(item); // 直列！遅い！
}

// ✅ 推奨: Promise.all で並列化
await Promise.all(items.map(item => processItem(item)));
```

**例外**: 前の処理の結果が次の処理に必要な場合（依存関係がある場合）は直列でよい。

### 手書き Promise + setTimeout

```typescript
// ❌ 禁止
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ 推奨
import { delay } from 'es-toolkit';
await delay(1000);
```

---

## チェックリスト

- [ ] `for`ループ内に`await`がある場合、意図的な直列実行か確認
- [ ] `Promise.all` 使用箇所で部分失敗許容の必要性を確認（必要なら `Promise.allSettled` へ）
- [ ] `_execute()` 内の `Promise.all` は `mapToAppError` で保護されているか確認
- [ ] `new Promise(resolve => setTimeout(resolve, N))` を `delay(N)` に置換
- [ ] 大量件数（数十件以上）の `Promise.all(items.map(...))` は同時実行数を検討

---

## 関連スキル

- `resultasync-patterns` — `ResultAsync.fromPromise` + `_execute()` パターン詳細
- `parallel-data-fetching` — Server Component での並列データ取得（`page.tsx` / `layout.tsx`）
- `es-toolkit-function` — `delay()` を含む es-toolkit 関数ユーティリティ
- `neverthrow-patterns` — `ok()` / `err()` / `Result` 型の基本
