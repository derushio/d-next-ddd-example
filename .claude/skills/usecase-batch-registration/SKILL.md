---
name: usecase-batch-registration
description: |
  application.container.ts の UseCase 一括登録パターンを提供するスキル。
  個別 safeRegister() 呼び出しを batchRegister() ヘルパーに集約し、
  順序制約と HYGEN マーカー互換性を維持する。

  トリガー例:
  - 「safeRegister」「batchRegister」「一括登録」「application.container.ts」
  - UseCase を新規追加するとき
  - src/di/containers/application.container.ts 編集時
  - 「HYGEN」「UseCase登録」「コンテナ登録」
globs:
  - "src/di/containers/application.container.ts"
---

# UseCase Batch Registration Skill

`application.container.ts` で UseCase を DI コンテナに一括登録するパターンを解説します。

---

## 1. ヘルパーの場所と役割

### ファイル構成

```
src/di/containers/
├── safeRegister.ts          # batchRegister / safeRegister ヘルパー定義
├── application.container.ts # UseCase 登録エントリポイント
├── domain.container.ts
├── infrastructure.container.ts
└── core.container.ts
```

### safeRegister.ts の2つのヘルパー

#### `safeRegister()` — 単体登録（内部実装用）

```typescript
export function safeRegister<T>(
  childContainer: DependencyContainer,
  token: symbol,
  creator: new (...args: any[]) => T,
): void {
  // bubble: true で親コンテナまで遡って登録済みチェック
  if (!childContainer.isRegistered(token, true)) {
    childContainer.registerSingleton(creator);
    childContainer.register(token, { useToken: creator });
  }
}
```

- すでに登録済みのトークンはスキップ（テスト時のモック登録との競合防止）
- 2段階登録: `registerSingleton(creator)` → `register(token, { useToken: creator })`

#### `batchRegister()` — 複数UseCase一括登録（推奨）

```typescript
export function batchRegister(
  container: DependencyContainer,
  registrations: Array<{
    token: symbol;
    impl: new (...args: any[]) => unknown;
  }>,
): void {
  for (const { token, impl } of registrations) {
    safeRegister(container, token, impl);
  }
}
```

- 内部で `safeRegister()` を順番に呼び出す
- **配列の順序が登録順序** → 依存関係がある場合は順序が重要

---

## 2. グループ化のルール

`application.container.ts` では UseCase を依存関係に基づいてグループ分けする。

### Group 1: 認証系 UseCase（先に登録）

他の UseCase から `GetCurrentUserUseCase` が参照されるため、必ず先に登録する。

```typescript
// Group 1: 認証系UseCase（他のUseCaseから依存されるため先に登録）
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.GetCurrentUserUseCase, impl: GetCurrentUserUseCase },
  { token: INJECTION_TOKENS.SignInUseCase, impl: SignInUseCase },
  { token: INJECTION_TOKENS.SignOutUseCase, impl: SignOutUseCase },
  { token: INJECTION_TOKENS.RefreshTokenUseCase, impl: RefreshTokenUseCase },
  { token: INJECTION_TOKENS.ResetPasswordUseCase, impl: ResetPasswordUseCase },
  { token: INJECTION_TOKENS.ChangePasswordUseCase, impl: ChangePasswordUseCase },
]);
```

### Group 2: ユーザー系 UseCase（後に登録）

`GetCurrentUserUseCase` に依存するため、Group 1 の後に登録する。

```typescript
// Group 2: ユーザー系UseCase（GetCurrentUserUseCaseに依存）
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.CreateUserUseCase, impl: CreateUserUseCase },
  { token: INJECTION_TOKENS.GetUsersUseCase, impl: GetUsersUseCase },
  { token: INJECTION_TOKENS.GetUserByIdUseCase, impl: GetUserByIdUseCase },
  { token: INJECTION_TOKENS.DeleteUserUseCase, impl: DeleteUserUseCase },
  { token: INJECTION_TOKENS.UpdateUserUseCase, impl: UpdateUserUseCase },
]);
// [HYGEN:USECASE_REGISTER]
```

### 新しいグループが必要な場合

新しいドメイン（例: `Order`）が追加された場合は Group 3 として追加する。

```typescript
// Group 3: 注文系UseCase
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.CreateOrderUseCase, impl: CreateOrderUseCase },
  { token: INJECTION_TOKENS.GetOrdersUseCase, impl: GetOrdersUseCase },
]);
// [HYGEN:USECASE_REGISTER]  ← マーカーは最後のグループの直後に維持
```

---

## 3. HYGEN マーカーの維持ルール

HYGEN コードジェネレーターは `application.container.ts` のマーカーコメントを目印にしてコードを挿入する。

### マーカーの位置

```typescript
// ファイルの先頭インポートブロックの末尾
import { UpdateUserUseCase } from '@/layers/application/usecases/user/UpdateUserUseCase';
// [HYGEN:USECASE_IMPORTS]   ← 新規 import がここに挿入される

// ...コンテナ定義...

// 登録ブロックの末尾
batchRegister(applicationContainer, [...]);
// [HYGEN:USECASE_REGISTER]  ← 新規登録がここに挿入される
```

### 絶対に守ること

- `[HYGEN:USECASE_IMPORTS]` を削除・移動しない
- `[HYGEN:USECASE_REGISTER]` を削除・移動しない
- マーカーの前後に空行を挿入しない（HYGEN の正規表現が壊れる）
- マーカーはファイルに**1つだけ**存在すること

---

## 4. 新規 UseCase 追加手順

### HYGEN を使った自動追加（推奨）

```bash
pnpm gen:usecase
```

プロンプトに従って UseCase 名・グループ・メソッド名を入力すると、以下が自動生成・更新される:

1. `src/layers/application/usecases/<group>/<Name>UseCase.ts`
2. `src/di/tokens.ts` にトークン追加
3. `src/di/containers/application.container.ts` に import + batchRegister エントリ追加

### 手動で追加する場合

#### Step 1: UseCase ファイルを作成

```
src/layers/application/usecases/<group>/<Name>UseCase.ts
```

#### Step 2: tokens.ts にトークンを追加

```typescript
// src/di/tokens.ts
export const INJECTION_TOKENS = {
  // ... 既存トークン ...
  MyNewUseCase: Symbol('MyNewUseCase'),
} as const;
```

#### Step 3: application.container.ts を更新

```typescript
// import を [HYGEN:USECASE_IMPORTS] の直前に追加
import { MyNewUseCase } from '@/layers/application/usecases/<group>/MyNewUseCase';
// [HYGEN:USECASE_IMPORTS]

// 適切なグループの batchRegister に追加
batchRegister(applicationContainer, [
  // ... 既存エントリ ...
  { token: INJECTION_TOKENS.MyNewUseCase, impl: MyNewUseCase },
]);
// [HYGEN:USECASE_REGISTER]
```

#### Step 4: resolver.ts を更新（必要に応じて）

```typescript
// src/di/resolver.ts
export function resolve(token: keyof typeof INJECTION_TOKENS) {
  // ...
}
```

---

## 5. よくある間違い

### NG: 個別 safeRegister() の直接呼び出し

```typescript
// ❌ 避けるべき（ボイラープレートが増える）
safeRegister(applicationContainer, INJECTION_TOKENS.CreateUserUseCase, CreateUserUseCase);
safeRegister(applicationContainer, INJECTION_TOKENS.GetUsersUseCase, GetUsersUseCase);
safeRegister(applicationContainer, INJECTION_TOKENS.GetUserByIdUseCase, GetUserByIdUseCase);
```

```typescript
// ✅ 正しい: batchRegister でまとめる
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.CreateUserUseCase, impl: CreateUserUseCase },
  { token: INJECTION_TOKENS.GetUsersUseCase, impl: GetUsersUseCase },
  { token: INJECTION_TOKENS.GetUserByIdUseCase, impl: GetUserByIdUseCase },
]);
```

### NG: 依存関係の逆順登録

```typescript
// ❌ 危険: Group 2 を先に登録すると、Group 1 が未解決のまま参照される
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.CreateUserUseCase, impl: CreateUserUseCase }, // GetCurrentUserUseCase に依存
]);
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.GetCurrentUserUseCase, impl: GetCurrentUserUseCase }, // 後から登録 → エラー
]);
```

---

## 6. チェックリスト

新規 UseCase を追加したとき:

- [ ] `src/di/tokens.ts` にトークンを追加した
- [ ] `application.container.ts` に import を追加した（`[HYGEN:USECASE_IMPORTS]` 直前）
- [ ] 適切なグループの `batchRegister()` に登録エントリを追加した
- [ ] `[HYGEN:USECASE_IMPORTS]` マーカーが残っている
- [ ] `[HYGEN:USECASE_REGISTER]` マーカーが残っている
- [ ] 依存する UseCase が先に登録されていることを確認した
- [ ] `pnpm check` が通ること

---

## 関連スキル

- `di-hygiene` — DI コンテナの衛生管理（未使用トークン検出・循環依存チェック）
- `application-impl` — UseCase 実装パターン（_execute / ResultAsync / validateInput）
- `code-generation` — HYGEN コード生成ツールの詳細使い方
