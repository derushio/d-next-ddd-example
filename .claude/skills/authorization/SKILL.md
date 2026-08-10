---
name: authorization
description: |
  CASL（TypeScriptフレンドリーな認可ライブラリ）による
  RBAC/ABACの実装パターンを提供するスキル。
  Role/Permissionモデル設計、guardAuth拡張、
  Server Action/Server Component/Client Componentでの認可チェックを含む。

  トリガー例:
  - 認可, RBAC, ABAC, 権限, ロール, パーミッション
  - CASL, ability, can, cannot, ForbiddenError
  - guardAuth拡張, アクセス制御, 管理者, admin
  - 「この操作は管理者のみ」「権限チェック」「ロールベース」
---

# authorization スキル

## 概要

現在のプロジェクトでは「ログイン済みか否か」のみを判定する認証チェックとして2つのパターンがある:

- **`GetCurrentUserUseCase.requireAuthentication()`**: Server Action での認証チェック（標準パターン）
- **`guardAuth()`** (`src/utils/auth/guardAuth.ts`): Server Component での認証チェック + 未認証時リダイレクト

ロールベースの認可（「この操作は管理者のみ」等）は未実装。
CASL を導入することで、型安全な認可チェックを実現する。

## ライブラリ: CASL

```bash
pnpm add @casl/ability
```

## 設計パターン

### 1. Role/Permission モデル（Prisma拡張）

```prisma
// prisma/schema.prisma

enum Role {
  USER
  EDITOR
  ADMIN
  SUPER_ADMIN
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  passwordHash String
  role         Role     @default(USER)
  // ...
}
```

### 2. Ability定義（CASL）

```typescript
// src/lib/casl/ability.ts
import { AbilityBuilder, PureAbility, createMongoAbility } from '@casl/ability';

// アクション定義
type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

// サブジェクト定義
type Subjects = 'User' | 'Post' | 'Comment' | 'all';

export type AppAbility = PureAbility<[Actions, Subjects]>;

export function defineAbilityFor(user: { id: string; role: string }): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (user.role) {
    case 'SUPER_ADMIN':
      can('manage', 'all');
      break;

    case 'ADMIN':
      can('manage', 'User');
      can('manage', 'Post');
      can('manage', 'Comment');
      break;

    case 'EDITOR':
      can('read', 'User');
      can('create', 'Post');
      can('update', 'Post');
      can('read', 'Post');
      can('manage', 'Comment');
      break;

    case 'USER':
      can('read', 'User');
      can('read', 'Post');
      can('create', 'Comment');
      can('update', 'Comment');
      can('delete', 'Comment');
      break;
  }

  return build();
}
```

### 3. Server Action での認可チェック

```typescript
// src/app/server-actions/user/deleteUser.ts
import { resolve } from '@/di/resolver';
import { defineAbilityFor } from '@/lib/casl/ability';
import { ForbiddenError } from '@casl/ability';

export async function deleteUser(params: { userId: string }) {
  // 認証チェック（DDD/Clean Architecture パターン）
  // auth() 直接呼び出しは禁止。GetCurrentUserUseCase.requireAuthentication() 経由で行う。
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();

  if (authResult.isErr()) {
    return { error: { message: authResult.error.message, code: authResult.error.code } };
  }

  const user = authResult.value;
  const ability = defineAbilityFor(user);

  // 認可チェック — 権限がなければ ForbiddenError
  ForbiddenError.from(ability).throwUnlessCan('delete', 'User');

  // 削除処理...
}
```

> **⚠️ 移行時の注意**: 現在の `GetCurrentUserUseCase.requireAuthentication()` は
> `{ id: string; email: string; name: string }` を返します。
> CASL 導入時はロール情報も含むよう `GetCurrentUserResponse` を拡張し、
> **全呼び出し箇所の更新が必要**です。
>
> **移行チェックリスト**:
> 1. Prisma スキーマの User モデルに `role` フィールドを追加し `pnpm db:migrate:dev` を実行
> 2. Auth.js の session/jwt callback で `role` を token・session に含める
> 3. `IAuthSessionService` / `GetCurrentUserUseCase` を拡張して `role` を返すよう変更
> 4. `grep -r "requireAuthentication\|GetCurrentUserUseCase" src/` で全呼び出し箇所を特定
> 5. 各 Server Action の `user` オブジェクトに `role` が含まれることを確認

### 4. requireAuthentication パターン（標準実装）

```typescript
// src/app/server-actions/user/updateProfile.ts
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { err } from '@/layers/application/types/Result';
import { defineAbilityFor, type AppAbility } from '@/lib/casl/ability';

export async function updateProfile(formData: FormData) {
  // 認証チェック（DDD/Clean Architecture パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();

  if (authResult.isErr()) {
    return { error: authResult.error.message, code: authResult.error.code };
  }

  const user = authResult.value;
  const ability = defineAbilityFor(user);

  if (!ability.can('update', 'User')) {
    return { error: '権限がありません', code: 'FORBIDDEN' };
  }

  // 更新処理...
}
```

### 5. UseCase での認可チェック（DI統合）

```typescript
// src/layers/application/interfaces/IAuthorizationService.ts
export interface IAuthorizationService {
  checkPermission(userId: string, action: string, subject: string): Promise<boolean>;
  getAbility(userId: string): Promise<AppAbility>;
}

// UseCase
@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.AuthorizationService)
    private readonly authService: IAuthorizationService,
  ) {}

  async execute(request: { userId: string; requesterId: string }) {
    const ability = await this.authService.getAbility(request.requesterId);

    if (!ability.can('delete', 'User')) {
      return err({ message: '権限がありません', code: 'FORBIDDEN' });
    }

    // 削除処理...
  }
}
```

### 6. Client Component での権限ベースUI表示

```typescript
// src/components/features/user/UserActions.tsx
'use client';

import { createContext, useContext } from 'react';
import type { AppAbility } from '@/lib/casl/ability';

const AbilityContext = createContext<AppAbility | null>(null);

export function AbilityProvider({ ability, children }: { ability: AppAbility; children: React.ReactNode }) {
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

export function useAbility() {
  const ability = useContext(AbilityContext);
  if (!ability) throw new Error('AbilityProvider が必要です');
  return ability;
}

// 使用例
function DeleteButton({ userId }: { userId: string }) {
  const ability = useAbility();

  if (!ability.can('delete', 'User')) return null; // 権限がなければ非表示

  return <Button onClick={() => deleteUser(userId)}>削除</Button>;
}
```

## 導入手順

1. `pnpm add @casl/ability`
2. Prismaスキーマに `Role` enum と `role` フィールド追加
3. `src/lib/casl/ability.ts` で Ability 定義
4. 認可チェックの組み込み先を選択する（下記を参照）
5. Server Actions / UseCase に認可チェック追加
6. Client Component で権限ベースUI表示

### 認証チェックパターンの使い分け

このプロジェクトには2つの認証チェックパターンがある:

#### パターンA: `GetCurrentUserUseCase.requireAuthentication()`（推奨・Server Action標準）

Server Action での認証チェックはこのパターンを使用する。

```typescript
// src/app/server-actions/user/someAction.ts
const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
const authResult = await getCurrentUserUseCase.requireAuthentication();

if (authResult.isErr()) {
  return { error: authResult.error.message, code: authResult.error.code };
}

const user = authResult.value;
const ability = defineAbilityFor(user);
```

CASL 導入時は、`GetCurrentUserUseCase.requireAuthentication()` が返す `user` オブジェクトに `role` フィールドを追加し（`GetCurrentUserUseCase` の拡張が必要）、`defineAbilityFor(user)` でロールベースの認可を行う。

#### パターンB: `guardAuth()`（Server Component専用・リダイレクト付き）

`src/utils/auth/guardAuth.ts` の `guardAuth()` は Server Component での認証チェックと、未認証時のサインインページへの自動リダイレクトに使用する。Server Action では使用しない。

```typescript
// Server Component でのページ保護
import { guardAuth } from '@/utils/auth/guardAuth';

export default async function ProtectedPage() {
  const user = await guardAuth(); // 未認証なら /auth/sign-in にリダイレクト
  // ...
}
```

##### guardAuth() への CASL 統合（拡張パターン）

CASL 導入時は `guardAuth()` の戻り値に `role` を含めて `ability` を返す拡張が推奨:

```typescript
// src/utils/auth/guardAuth.ts（拡張後）
import { auth } from '@/lib/nextAuth';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { defineAbilityFor, type AppAbility } from '@/lib/casl/ability';

export type GuardAuthResult = {
  id: string;
  email: string;
  name: string;
  role: string;
  ability: AppAbility;
};

export async function guardAuth(): Promise<GuardAuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(routes.auth.signIn);
  }
  const user = {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    role: session.user.role ?? 'USER', // Auth.js JWT callback で role を追加要
  };
  return { ...user, ability: defineAbilityFor(user) };
}
```

```typescript
// Server Component での使用例（権限ベースUI制御）
export default async function AdminPage() {
  const { ability } = await guardAuth();

  if (!ability.can('manage', 'User')) {
    redirect(routes.home); // 権限なしのページはホームにリダイレクト
  }

  return <AdminPanel />;
}
```

> **⚠️ 前提条件**: Auth.js の JWT callback で `role` を token/session に追加する必要がある。
> `nextauth-v5-patterns` スキルの JWT callback 拡張パターンを参照。

## Clean Architecture への配置

| 要素 | レイヤー | パス |
|------|---------|------|
| Ability定義 | lib（共有） | `src/lib/casl/ability.ts` |
| IAuthorizationService | Application | `src/layers/application/interfaces/` |
| AuthorizationService実装 | Infrastructure | `src/layers/infrastructure/services/` |
| 認可チェック | Application（UseCase内） | `src/layers/application/usecases/` |
| AbilityProvider | Presentation | `src/components/providers/` |
