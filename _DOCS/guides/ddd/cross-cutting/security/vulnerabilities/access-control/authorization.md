# 認可制御の欠落対策ガイド

## 概要

認可制御の欠落（Authorization Bypass）は、Webアプリケーションがユーザの権限を適切にチェックせず、本来アクセスできないリソースへのアクセスや権限外の操作を許してしまう脆弱性です。

### 脆弱性の説明

認証（Authentication: 誰であるか）と認可（Authorization: 何ができるか）は異なる概念です。認証が成功していても、適切な認可チェックがなければ、以下のような問題が発生します。

**認可制御の欠落パターン:**

1. **水平権限昇格（Horizontal Privilege Escalation）**
   - 同じ権限レベルの他ユーザーのデータにアクセス
   - 例: ユーザーAがユーザーBのプロフィールを編集

2. **垂直権限昇格（Vertical Privilege Escalation）**
   - より高い権限レベルの機能にアクセス
   - 例: 一般ユーザーが管理者機能を実行

3. **IDOR（Insecure Direct Object Reference）**
   - URLやパラメータのIDを変更してアクセス
   - 例: `/users/123` を `/users/124` に変更して他人の情報を閲覧

**脆弱な例:**

```typescript
// 危険: 認証チェックのみで認可チェックがない
export async function updateUser(userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return err({ message: '認証が必要です', code: 'UNAUTHORIZED' });
  }

  // 問題: 誰でも任意のユーザーを更新できる
  await prisma.user.update({
    where: { id: userId },
    data: { name: formData.get('name') as string },
  });
}
```

### 発生しうる脅威

認可制御の欠落が存在すると、以下のような深刻な被害が発生します。

| 脅威 | 説明 | 影響度 |
|------|------|--------|
| 他ユーザーデータの窃取・改ざん | IDOR攻撃により他人の個人情報、注文履歴、メッセージ等にアクセス | 高 |
| 管理者機能の不正利用 | 一般ユーザーが管理画面にアクセスし、システム設定を変更 | 致命的 |
| 機密ファイルへのアクセス | 権限のないユーザーが機密文書、財務情報等をダウンロード | 高 |
| データの大量窃取 | ID値を順次変更して全ユーザーのデータを収集 | 高 |
| 不正な金銭取引 | 他人のアカウントで購入、送金、クーポン使用 | 高 |

### 特に注意が必要なケース

以下の機能実装時は、認可制御の欠落リスクが高いため、特に慎重な設計が必要です。

- **IDベースのリソースアクセス**
  - `/users/:id`, `/posts/:id`, `/orders/:id` などのパラメータ化されたルート
  - API エンドポイントでのリソース取得・更新・削除
  - ファイルダウンロード機能

- **管理機能**
  - ユーザー管理（作成、編集、削除、権限変更）
  - システム設定の変更
  - 統計・レポート閲覧

- **所有権が関与する操作**
  - 投稿の編集・削除
  - 注文のキャンセル・返金
  - プライベートメッセージの閲覧

- **権限レベルが複数ある機能**
  - 組織の管理者とメンバー
  - プロジェクトのオーナーと閲覧者
  - 有料プランと無料プランの機能差

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| IPA | 8. アクセス制御・認可制御の欠落 | 「安全なウェブサイトの作り方」第11版 |
| OWASP Top 10 | A01:2021-Broken Access Control | アクセス制御の不備（OWASP Top 10 で1位） |
| CWE | CWE-285: Improper Authorization | 不適切な認可 |

**優先度**: 最高（OWASP Top 10 2021年版で1位）

**関連するCWE:**

- CWE-284: Improper Access Control（不適切なアクセス制御）
- CWE-639: Authorization Bypass Through User-Controlled Key（ユーザ制御キーによる認可バイパス）
- CWE-732: Incorrect Permission Assignment for Critical Resource（重要リソースへの不適切な権限割り当て）

### IPAガイドラインの対策分類

#### 根本的解決（必須実装）

1. **すべてのリソースアクセスで認可チェック実施**
   - 認証チェックに加えて、リソース所有者または権限レベルを確認
   - URL/IDを変更してもアクセスできないことを保証

2. **最小権限の原則（Principle of Least Privilege）**
   - ユーザーには必要最小限の権限のみ付与
   - デフォルトは拒否、明示的に許可されたもののみ実行

3. **デフォルト拒否（Deny by Default）**
   - ホワイトリスト方式で明示的に許可
   - 認可チェックの漏れがあっても拒否される設計

#### 保険的対策（推奨実装）

1. **監査ログの記録**
   - すべてのリソースアクセスをログに記録
   - 異常なアクセスパターンを検知

2. **セッション管理の強化**
   - セッションタイムアウトの適切な設定
   - 権限変更時のセッション再検証

3. **定期的なアクセス権限レビュー**
   - 不要な権限の削除
   - 退職者のアカウント無効化

## Clean Architecture での対策

認可制御は、アーキテクチャの各層で適切に実装する必要があります。

### 根本的解決策（必須）

#### 1. Domain層: 権限ロジックの定義

Domain層で権限判定のビジネスルールを定義します。

```typescript
// src/layers/domain/entities/User.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: UserRole,
  ) {}

  /**
   * 指定されたユーザーを編集可能か判定
   * - 本人は編集可能
   * - 管理者も編集可能
   */
  canEdit(targetUser: User): boolean {
    if (this.id === targetUser.id) {
      return true; // 本人
    }
    if (this.role === 'admin') {
      return true; // 管理者
    }
    return false;
  }

  /**
   * 管理機能にアクセス可能か判定
   */
  canAccessAdminPanel(): boolean {
    return this.role === 'admin';
  }

  /**
   * 指定されたリソースを閲覧可能か判定
   */
  canView(resource: { ownerId: string; visibility: 'public' | 'private' }): boolean {
    if (resource.visibility === 'public') {
      return true; // 公開リソース
    }
    if (resource.ownerId === this.id) {
      return true; // 所有者
    }
    if (this.role === 'admin') {
      return true; // 管理者
    }
    return false;
  }
}

export type UserRole = 'admin' | 'user';
```

```typescript
// src/layers/domain/entities/Post.ts
export class Post {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly authorId: string,
    public readonly visibility: 'public' | 'private',
  ) {}

  /**
   * 指定されたユーザーが投稿を編集可能か判定
   */
  canBeEditedBy(user: User): boolean {
    if (user.id === this.authorId) {
      return true; // 投稿者本人
    }
    if (user.role === 'admin') {
      return true; // 管理者
    }
    return false;
  }

  /**
   * 指定されたユーザーが投稿を閲覧可能か判定
   */
  canBeViewedBy(user: User): boolean {
    if (this.visibility === 'public') {
      return true; // 公開投稿
    }
    if (user.id === this.authorId) {
      return true; // 投稿者本人
    }
    if (user.role === 'admin') {
      return true; // 管理者
    }
    return false;
  }
}
```

#### 2. Application層: UseCaseでの認可チェック

UseCase内で認証・認可を確認し、権限のない操作を拒否します。

```typescript
// src/layers/application/use-cases/user/UpdateUserUseCase.ts
import { injectable, inject } from 'tsyringe';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { TOKENS } from '@/di/tokens';

interface UpdateUserRequest {
  currentUserId: string; // 実行者
  targetUserId: string;  // 対象ユーザー
  name?: string;
  email?: string;
}

interface UpdateUserResponse {
  userId: string;
}

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(request: UpdateUserRequest): Promise<Result<UpdateUserResponse, AppError>> {
    // 1. 実行者の取得
    const currentUserResult = await this.userRepository.findById(request.currentUserId);
    if (currentUserResult.isErr() || !currentUserResult.value) {
      return err({ message: '実行者が見つかりません', code: 'CURRENT_USER_NOT_FOUND' });
    }
    const currentUser = currentUserResult.value;

    // 2. 対象ユーザーの取得
    const targetUserResult = await this.userRepository.findById(request.targetUserId);
    if (targetUserResult.isErr() || !targetUserResult.value) {
      return err({ message: '対象ユーザーが見つかりません', code: 'TARGET_USER_NOT_FOUND' });
    }
    const targetUser = targetUserResult.value;

    // 3. 認可チェック（Domain層のビジネスルールを使用）
    if (!currentUser.canEdit(targetUser)) {
      return err({ message: 'このユーザーを編集する権限がありません', code: 'FORBIDDEN' });
    }

    // 4. 更新処理
    const updatedUser = new User(
      targetUser.id,
      request.email ?? targetUser.email,
      targetUser.role,
    );

    const updateResult = await this.userRepository.update(updatedUser);
    if (updateResult.isErr()) {
      return err({ message: 'ユーザーの更新に失敗しました', code: 'UPDATE_FAILED' });
    }

    return ok({ userId: updatedUser.id });
  }
}
```

```typescript
// src/layers/application/use-cases/post/DeletePostUseCase.ts
import { injectable, inject } from 'tsyringe';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';
import type { IPostRepository } from '@/layers/domain/repositories/IPostRepository';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { TOKENS } from '@/di/tokens';

interface DeletePostRequest {
  userId: string;
  postId: string;
}

@injectable()
export class DeletePostUseCase {
  constructor(
    @inject(TOKENS.PostRepository)
    private readonly postRepository: IPostRepository,
    @inject(TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(request: DeletePostRequest): Promise<Result<void, AppError>> {
    // 1. ユーザー取得
    const userResult = await this.userRepository.findById(request.userId);
    if (userResult.isErr() || !userResult.value) {
      return err({ message: 'ユーザーが見つかりません', code: 'USER_NOT_FOUND' });
    }
    const user = userResult.value;

    // 2. 投稿取得
    const postResult = await this.postRepository.findById(request.postId);
    if (postResult.isErr() || !postResult.value) {
      return err({ message: '投稿が見つかりません', code: 'POST_NOT_FOUND' });
    }
    const post = postResult.value;

    // 3. 認可チェック（投稿者本人または管理者のみ削除可能）
    if (!post.canBeEditedBy(user)) {
      return err({ message: 'この投稿を削除する権限がありません', code: 'FORBIDDEN' });
    }

    // 4. 削除処理
    const deleteResult = await this.postRepository.delete(request.postId);
    if (deleteResult.isErr()) {
      return err({ message: '投稿の削除に失敗しました', code: 'DELETE_FAILED' });
    }

    return ok(undefined);
  }
}
```

#### 3. Presentation層: Server Actionsでのセッション確認

Server Actionsで認証セッションを確認し、UseCaseに渡します。

```typescript
// src/app/users/[id]/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import type { Result, AppError } from '@/layers/application/types/Result';
import { err } from '@/layers/application/types/Result';
import { resolve } from '@/di/resolver';
import { UpdateUserUseCase } from '@/layers/application/use-cases/user/UpdateUserUseCase';

/**
 * ユーザー情報更新アクション
 *
 * セキュリティ対策:
 * - Server Actionsの自動CSRF保護
 * - requireAuthentication() による認証チェック（推奨パターン）
 * - UseCaseでの認可チェック（本人または管理者のみ）
 */
export async function updateUser(
  targetUserId: string,
  formData: FormData,
): Promise<Result<void, AppError>> {
  // 1. 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return err(authResult.error);
  }
  const currentUser = authResult.value;

  // 2. UseCase実行（認可チェックはUseCase内で実施）
  const useCase = resolve(UpdateUserUseCase);
  const result = await useCase.execute({
    currentUserId: currentUser.id,
    targetUserId,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  });

  if (result.isOk()) {
    revalidatePath(`/users/${targetUserId}`);
  }

  return result;
}
```

```typescript
// src/app/posts/[id]/actions.ts
'use server';

import { redirect } from 'next/navigation';
import type { Result, AppError } from '@/layers/application/types/Result';
import { err } from '@/layers/application/types/Result';
import { resolve } from '@/di/resolver';
import { DeletePostUseCase } from '@/layers/application/use-cases/post/DeletePostUseCase';

/**
 * 投稿削除アクション
 */
export async function deletePost(postId: string): Promise<Result<void, AppError>> {
  // 1. 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return err(authResult.error);
  }
  const currentUser = authResult.value;

  // 2. UseCase実行（認可チェックはUseCase内で実施）
  const useCase = resolve(DeletePostUseCase);
  const result = await useCase.execute({
    userId: currentUser.id,
    postId,
  });

  if (result.isOk()) {
    redirect('/posts');
  }

  return result;
}
```

#### 4. リソース所有者確認（IDOR対策）

URLパラメータやリクエストボディのIDを変更しても、所有者確認により不正アクセスを防ぎます。

```typescript
// src/layers/application/use-cases/order/CancelOrderUseCase.ts
import { injectable, inject } from 'tsyringe';
import type { Result, AppError } from '@/layers/application/types/Result';
import { ok, err } from '@/layers/application/types/Result';
import type { IOrderRepository } from '@/layers/domain/repositories/IOrderRepository';
import { TOKENS } from '@/di/tokens';

interface CancelOrderRequest {
  userId: string;
  orderId: string;
}

@injectable()
export class CancelOrderUseCase {
  constructor(
    @inject(TOKENS.OrderRepository)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(request: CancelOrderRequest): Promise<Result<void, AppError>> {
    // 1. 注文取得
    const orderResult = await this.orderRepository.findById(request.orderId);
    if (orderResult.isErr() || !orderResult.value) {
      return err({ message: '注文が見つかりません', code: 'ORDER_NOT_FOUND' });
    }
    const order = orderResult.value;

    // 2. IDOR対策: 所有者確認
    if (order.userId !== request.userId) {
      // エラーメッセージは意図的に曖昧にする（列挙攻撃対策）
      return err({ message: '注文が見つかりません', code: 'ORDER_NOT_FOUND' });
    }

    // 3. キャンセル可能状態か確認
    if (!order.canBeCancelled()) {
      return err({ message: 'この注文はキャンセルできません', code: 'ORDER_CANNOT_CANCEL' });
    }

    // 4. キャンセル処理
    order.cancel();
    const updateResult = await this.orderRepository.update(order);
    if (updateResult.isErr()) {
      return err({ message: '注文のキャンセルに失敗しました', code: 'CANCEL_FAILED' });
    }

    return ok(undefined);
  }
}
```

### 保険的対策（推奨）

#### 1. 監査ログの記録

重要な操作のログを記録し、不正アクセスを検知します。

```typescript
// src/layers/infrastructure/logging/AuditLogger.ts
import { injectable } from 'tsyringe';

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'success' | 'failure';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@injectable()
export class AuditLogger {
  constructor(
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
  ) {}

  /**
   * 監査ログを記録
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // データベースまたはログサービスに記録
    this.logger.info('[AUDIT]', entry);

    // 失敗ログは特に注目
    if (entry.result === 'failure') {
      this.logger.warn('[AUDIT:FAILURE]', { action: entry.action, reason: entry.reason });
    }

    // 実際の実装例:
    // await prisma.auditLog.create({ data: entry });
    // await cloudWatchLogs.putLogEvents({ logEvents: [entry] });
  }

  /**
   * アクセス試行ログ（成功・失敗両方）
   */
  async logAccessAttempt(params: {
    userId: string;
    resourceType: string;
    resourceId: string;
    action: 'read' | 'create' | 'update' | 'delete';
    granted: boolean;
    reason?: string;
  }): Promise<void> {
    await this.log({
      timestamp: new Date(),
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      result: params.granted ? 'success' : 'failure',
      reason: params.reason,
    });
  }
}
```

```typescript
// UseCase内での使用例
@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(TOKENS.AuditLogger)
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(request: UpdateUserRequest): Promise<Result<UpdateUserResponse, AppError>> {
    const currentUser = await this.userRepository.findById(request.currentUserId);
    const targetUser = await this.userRepository.findById(request.targetUserId);

    // 認可チェック
    const hasPermission = currentUser.value.canEdit(targetUser.value);

    // 監査ログ記録
    await this.auditLogger.logAccessAttempt({
      userId: request.currentUserId,
      resourceType: 'user',
      resourceId: request.targetUserId,
      action: 'update',
      granted: hasPermission,
      reason: hasPermission ? undefined : '権限不足',
    });

    if (!hasPermission) {
      return err({ message: 'このユーザーを編集する権限がありません', code: 'FORBIDDEN' });
    }

    // 更新処理
    // ...
  }
}
```

#### 2. ロールベースアクセス制御（RBAC）

複雑な権限管理が必要な場合は、RBACを導入します。

```typescript
// src/layers/domain/valueObjects/Permission.ts
export type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'post:read'
  | 'post:write'
  | 'post:delete'
  | 'admin:access';

export type Role = 'admin' | 'moderator' | 'user' | 'guest';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'user:read',
    'user:write',
    'user:delete',
    'post:read',
    'post:write',
    'post:delete',
    'admin:access',
  ],
  moderator: ['user:read', 'post:read', 'post:write', 'post:delete'],
  user: ['user:read', 'post:read', 'post:write'],
  guest: ['post:read'],
};

export class PermissionChecker {
  /**
   * 指定されたロールが権限を持つか確認
   */
  static hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  /**
   * 複数の権限をすべて持つか確認
   */
  static hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(role, p));
  }

  /**
   * いずれかの権限を持つか確認
   */
  static hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(role, p));
  }
}
```

```typescript
// UseCase内での使用例
@injectable()
export class DeleteUserUseCase {
  async execute(request: { currentUserId: string; targetUserId: string }): Promise<Result<void, AppError>> {
    const currentUser = await this.userRepository.findById(request.currentUserId);

    // 権限チェック
    if (!PermissionChecker.hasPermission(currentUser.value.role, 'user:delete')) {
      return err({ message: 'ユーザーを削除する権限がありません', code: 'FORBIDDEN' });
    }

    // 削除処理
    // ...
  }
}
```

#### 3. 最小権限の原則

セッション情報に必要最小限の情報のみを含め、権限は毎回サーバーで確認します。

```typescript
// src/nextAuth.ts（Auth.js v5 / next-auth 5.0.0-beta.30）
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  callbacks: {
    /**
     * JWT コールバック: トークンに最小限の情報を含める
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // roleのみ含める
      }
      return token;
    },

    /**
     * セッションコールバック: クライアントに公開する情報を制限
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        // 機密情報（メールアドレス、権限の詳細等）は含めない
      }
      return session;
    },
  },

  // セッションタイムアウト設定
  session: {
    maxAge: 24 * 60 * 60, // 24時間
  },
});
```

## チェックリスト

開発・レビュー時に以下の項目を確認してください。

### 設計チェック

- [ ] すべてのServer Actionsで認証チェックが実施されているか
- [ ] すべてのUseCaseで認可チェックが実装されているか
- [ ] 認可ロジックがDomain層に定義されているか
- [ ] リソース所有者確認が実装されているか（IDOR対策）
- [ ] 管理機能へのアクセスに権限チェックがあるか

### 実装チェック

- [ ] URLパラメータのIDを変更して他人のデータにアクセスできないか
- [ ] 本人確認が必要な操作で `userId === session.user.id` チェックがあるか
- [ ] 管理者専用機能で `role === 'admin'` チェックがあるか
- [ ] エラーメッセージが曖昧で情報漏洩のリスクがないか
- [ ] 認可失敗時のログが記録されているか

### テストチェック

- [ ] 他人のリソースにアクセスするテストがあるか
- [ ] 権限のない操作を実行するテストがあるか
- [ ] 管理者のみ実行可能な機能のテストがあるか
- [ ] IDOR攻撃のシミュレーションテストがあるか
- [ ] セッションなしでのアクセステストがあるか

## テストパターン（認可バイパステスト）

認可制御の欠落を検出するため、攻撃シナリオに基づいたテストを実施します。

### 1. ユニットテスト: Domain層の権限ロジック

```typescript
// src/layers/domain/entities/__tests__/User.test.ts
import { describe, it, expect } from 'vitest';
import { User } from '@/layers/domain/entities/User';

describe('User - 権限チェック', () => {
  describe('canEdit', () => {
    it('本人は自分を編集できる', () => {
      const user = new User('user-1', 'user1@example.com', 'user');
      expect(user.canEdit(user)).toBe(true);
    });

    it('他人は編集できない', () => {
      const user1 = new User('user-1', 'user1@example.com', 'user');
      const user2 = new User('user-2', 'user2@example.com', 'user');
      expect(user1.canEdit(user2)).toBe(false);
    });

    it('管理者は他人を編集できる', () => {
      const admin = new User('admin-1', 'admin@example.com', 'admin');
      const user = new User('user-1', 'user1@example.com', 'user');
      expect(admin.canEdit(user)).toBe(true);
    });
  });

  describe('canAccessAdminPanel', () => {
    it('管理者は管理画面にアクセスできる', () => {
      const admin = new User('admin-1', 'admin@example.com', 'admin');
      expect(admin.canAccessAdminPanel()).toBe(true);
    });

    it('一般ユーザーは管理画面にアクセスできない', () => {
      const user = new User('user-1', 'user1@example.com', 'user');
      expect(user.canAccessAdminPanel()).toBe(false);
    });
  });
});
```

### 2. ユニットテスト: UseCase の認可チェック

```typescript
// src/layers/application/use-cases/user/__tests__/UpdateUserUseCase.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { UpdateUserUseCase } from '../UpdateUserUseCase';
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { User } from '@/layers/domain/entities/User';
import { ok } from '@/layers/application/types/Result';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    mockUserRepository = mockDeep<IUserRepository>();
    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  it('本人が自分の情報を更新できる', async () => {
    const user = new User('user-1', 'user1@example.com', 'user');
    vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(ok(user));
    vi.spyOn(mockUserRepository, 'update').mockResolvedValue(ok(user));

    const result = await useCase.execute({
      currentUserId: 'user-1',
      targetUserId: 'user-1',
      name: 'New Name',
    });

    expect(result.isOk()).toBe(true);
  });

  it('他人の情報は更新できない', async () => {
    const user1 = new User('user-1', 'user1@example.com', 'user');
    const user2 = new User('user-2', 'user2@example.com', 'user');

    vi.spyOn(mockUserRepository, 'findById')
      .mockResolvedValueOnce(ok(user1)) // currentUser
      .mockResolvedValueOnce(ok(user2)); // targetUser

    const result = await useCase.execute({
      currentUserId: 'user-1',
      targetUserId: 'user-2',
      name: 'Hacked Name',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('権限がありません');
    }
  });

  it('管理者は他人の情報を更新できる', async () => {
    const admin = new User('admin-1', 'admin@example.com', 'admin');
    const user = new User('user-1', 'user1@example.com', 'user');

    vi.spyOn(mockUserRepository, 'findById')
      .mockResolvedValueOnce(ok(admin)) // currentUser
      .mockResolvedValueOnce(ok(user)); // targetUser
    vi.spyOn(mockUserRepository, 'update').mockResolvedValue(ok(user));

    const result = await useCase.execute({
      currentUserId: 'admin-1',
      targetUserId: 'user-1',
      name: 'Admin Changed Name',
    });

    expect(result.isOk()).toBe(true);
  });
});
```

### 3. E2Eテスト: IDOR攻撃シミュレーション

```typescript
// tests/e2e/security/authorization.spec.ts
import { test, expect } from '@playwright/test';

test.describe('認可制御: IDOR対策', () => {
  test.beforeEach(async ({ page }) => {
    // ユーザー1でログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('自分のプロフィールは編集できる', async ({ page }) => {
    await page.goto('/users/user-1/edit');
    await page.fill('input[name="name"]', 'Updated Name');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=保存しました')).toBeVisible();
  });

  test('他人のプロフィールは編集できない', async ({ page }) => {
    // ユーザー2のプロフィール編集ページにアクセスを試みる
    await page.goto('/users/user-2/edit');

    // アクセス拒否されることを確認
    await expect(page.locator('text=権限がありません')).toBeVisible();
  });

  test('URLパラメータを変更しても他人のデータにアクセスできない', async ({ page, request }) => {
    // API経由でユーザー2の情報更新を試みる
    const response = await request.post('/api/users/user-2', {
      data: {
        name: 'Hacked Name',
      },
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('認可制御: 管理者機能', () => {
  test('一般ユーザーは管理画面にアクセスできない', async ({ page }) => {
    // 一般ユーザーでログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 管理画面へアクセスを試みる
    await page.goto('/admin');

    // アクセス拒否されることを確認
    await expect(page).toHaveURL('/'); // リダイレクトされる
    await expect(page.locator('text=管理者権限が必要です')).toBeVisible();
  });

  test('管理者は管理画面にアクセスできる', async ({ page }) => {
    // 管理者でログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin_password');
    await page.click('button[type="submit"]');

    // 管理画面へアクセス
    await page.goto('/admin');

    // アクセス成功を確認
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1:has-text("管理画面")')).toBeVisible();
  });
});
```

### 4. セキュリティテスト: 権限昇格攻撃

```typescript
// tests/e2e/security/privilege-escalation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Security: 権限昇格攻撃対策', () => {
  test('セッションに管理者ロールを注入しても権限昇格できない', async ({ page, context }) => {
    // 一般ユーザーでログイン
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // セッションCookieを改ざんしようと試みる（実際には不可能だがテストで確認）
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.includes('session-token'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true); // 改ざん不可

    // 管理画面へのアクセスは依然として拒否される
    await page.goto('/admin');
    await expect(page).not.toHaveURL('/admin');
  });

  test('リクエストボディのuserIdを改ざんしても認可バイパスできない', async ({ page, request }) => {
    // ユーザー1でログイン（セッション取得）
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // ユーザー2の投稿を削除しようと試みる（userIdを偽装）
    const response = await page.request.post('/api/posts/post-2/delete', {
      data: {
        userId: 'user-2', // 偽装されたユーザーID
      },
    });

    // サーバー側でセッションから実際のuserIdを取得するため、偽装は無効
    expect(response.status()).toBe(403);
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - 認可制御](https://www.ipa.go.jp/security/vuln/websecurity/access-control.html)
- [OWASP: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [CWE-285: Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
- [CWE-639: Authorization Bypass Through User-Controlled Key (IDOR)](https://cwe.mitre.org/data/definitions/639.html)

### プロジェクト内関連ドキュメント

- [CSRF対策ガイド](../web-attacks/csrf.md)
- [セッション管理](./session-management.md)
- [IPA-OWASP対応表](../../references/ipa-owasp-mapping.md)
- [セキュリティチェックリスト](../../checklists/development.md)
- [Domain層Entity実装](../../../layers/components/entities.md)
- [Application層UseCase実装](../../../layers/components/use-cases.md)

### 外部リソース

- [PortSwigger: Access control vulnerabilities and privilege escalation](https://portswigger.net/web-security/access-control)
- [OWASP Testing Guide: Testing for Broken Access Control](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/)
- [HackTricks: IDOR](https://book.hacktricks.xyz/pentesting-web/idor)

## まとめ

認可制御の欠落対策の基本方針:

1. **Domain層での権限ロジック定義**: `canEdit()`, `canView()` などのメソッドでビジネスルールを明確化
2. **UseCase層での認可チェック**: すべてのリソースアクセスで認可を確認
3. **Presentation層での認証確認**: Server Actionsでセッション検証
4. **IDOR対策**: リソース所有者を必ず確認、URLパラメータの改ざんを防止
5. **監査ログ**: すべてのアクセス試行（成功・失敗）を記録
6. **テストの徹底**: 攻撃シナリオに基づいたE2Eテストを実施

これらの対策を多層的に実装することで、認可制御の欠落から効果的にアプリケーションを保護できます。
