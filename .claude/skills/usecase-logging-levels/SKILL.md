---
name: usecase-logging-levels
description: |
  UseCase カテゴリ別のログ出力レベルガイドラインを提供するスキル。
  認証操作（DETAILED）、CRUD操作（STANDARD）、読み取り操作（MINIMAL）の
  3段階でログ密度を標準化する。

  トリガー例:
  - 「ログ」「ロギング」「logger.info」「logger.warn」「ログレベル」
  - UseCase の _execute() 内でログを書こうとしたとき
  - src/layers/application/usecases/ 配下のファイル編集時
  - 「監査ログ」「セキュリティログ」「ログ設計」
globs:
  - "src/layers/application/usecases/**/*.ts"
---

# UseCase Logging Levels Skill

UseCase カテゴリごとのログ密度を3段階で標準化します。

---

## 1. ログレベル概要

| レベル | カテゴリ | 代表 UseCase | 密度 |
|--------|----------|-------------|------|
| **DETAILED** | 認証系 | SignIn, ChangePassword, ResetPassword | 全ステップ + セキュリティイベント + rate limit |
| **STANDARD** | CRUD系 | CreateUser, UpdateUser, DeleteUser | 開始 + 成功/失敗 + キーパラメータ |
| **MINIMAL** | 読み取り系 | GetUsers, GetUserById, GetCurrentUser | 開始 + 件数のみ |

---

## 2. DETAILED（認証系 UseCase）

### 対象

- `SignInUseCase`
- `SignOutUseCase`
- `ChangePasswordUseCase`
- `ResetPasswordUseCase`
- `RefreshTokenUseCase`

### ルール

- 全処理ステップを `info` でログ出力
- セキュリティイベント（ロック・rate limit・不正アクセス）は `warn` で出力
- rate limit / lockout の数値メタデータを必ず含める
- 成功時は `userId` を含める（メールアドレスは可読のため含めてもよい）

### コード例（SignInUseCase から）

```typescript
private async _execute(request: SignInRequest): Promise<SignInResponse> {
  const { email, password, ipAddress } = request;

  // ステップ1: 開始ログ
  this.logger.info('サインイン試行開始', { email });

  // ステップ2: Rate Limit チェック結果（セキュリティイベント）
  if (!rateLimitResult.allowed) {
    this.logger.warn('Rate Limit超過: リクエスト拒否', {
      ipAddress,
      current: rateLimitResult.current,
      limit: rateLimitResult.limit,
      retryAfterMs: rateLimitResult.retryAfterMs,
    });
    throw new AppUseCaseError(...);
  }

  // ステップ3: アカウントロック（セキュリティイベント）
  if (lockoutStatus.isLocked) {
    this.logger.warn('サインイン拒否: アカウントロック中', {
      email,
      lockoutUntil: lockoutStatus.lockoutUntil,
      failedAttempts: lockoutStatus.failedAttempts,
    });
    throw new AppUseCaseError(...);
  }

  // ステップ4: ユーザー未検出（セキュリティイベント）
  if (!user) {
    this.logger.warn('サインイン失敗: ユーザーが見つかりません', { email });
    throw new AppUseCaseError(...);
  }

  // ステップ5: パスワード不正（セキュリティイベント）
  if (!isPasswordValid) {
    this.logger.warn('サインイン失敗: パスワード不正', {
      userId: user.id.value,
    });
    throw new AppUseCaseError(...);
  }

  // ステップ6: 成功ログ
  this.logger.info('サインイン成功', { userId: user.id.value });

  return { user: { id: user.id.value, ... } };
}
```

---

## 3. STANDARD（CRUD系 UseCase）

### 対象

- `CreateUserUseCase`
- `UpdateUserUseCase`
- `DeleteUserUseCase`

### ルール

- **開始時**: キーパラメータを `info` でログ（パスワード等の機密情報は除外）
- **成功時**: 結果サマリー（生成されたID・更新されたフィールド等）を `info` でログ
- **失敗時**: `mapToAppError()` が自動的に `error` ログを出力するため個別ログ不要
- 中間ステップのログは原則不要（処理の透明性が必要な場合のみ追加）

### コード例（CreateUserUseCase から）

```typescript
private async _execute(request: CreateUserRequest): Promise<CreateUserResponse> {
  const { name, email, password } = request;

  // 開始: キーパラメータを含める（パスワードは除外）
  this.logger.info('ユーザー作成開始', { name, email });

  validateInput(createUserInputSchema, { name, email, password });

  await this.userDomainService.validateUserData(name, email);
  const passwordHash = await this.hashService.generateHash(password);
  const user = User.create(new Email(email), name, passwordHash);
  await this.userRepository.save(user);

  // 成功: 生成されたIDを含める
  this.logger.info('ユーザー作成完了', {
    userId: user.id.value,
    email,
  });

  return toUserResponseDTO(user);
}
```

### NG パターン（CRUD で DETAILED ログは過剰）

```typescript
// ❌ 過剰: 中間ステップを全て記録する必要はない
this.logger.info('バリデーション通過');
this.logger.info('ドメインサービスバリデーション開始');
this.logger.info('パスワードハッシュ化開始');
this.logger.info('Entityオブジェクト生成');
this.logger.info('DB保存開始');
```

---

## 4. MINIMAL（読み取り系 UseCase）

### 対象

- `GetUsersUseCase`
- `GetUserByIdUseCase`
- `GetCurrentUserUseCase`

### ルール

- **開始時**: リクエストパラメータ（ページ番号・検索条件等）を `info` で1行
- **完了時**: 取得件数・総件数等のサマリーを `info` で1行
- それ以外のログは原則不要（頻繁に呼ばれるため過剰ログはパフォーマンス劣化につながる）

### コード例（GetUsersUseCase から）

```typescript
private async _execute(request: GetUsersRequest): Promise<GetUsersResponse> {
  // 開始: リクエストパラメータ全体をまとめて1行
  this.logger.info('ユーザー一覧取得開始', { request });

  const { searchQuery, page, limit, sortBy, sortOrder } = validateInput(
    getUsersInputSchema,
    request,
  );

  const [users, totalCount] = await Promise.all([
    this.userRepository.findByCriteria({ searchQuery, page, limit, sortBy, sortOrder }),
    this.userRepository.count(searchQuery),
  ]);

  const userSummaries = users.map((user: User) => toUserResponseDTO(user));
  const totalPages = Math.ceil(totalCount / limit);

  // 完了: 取得件数サマリー
  this.logger.info('ユーザー一覧取得完了', {
    userCount: users.length,
    totalCount,
    currentPage: page,
    totalPages,
  });

  return { users: userSummaries, totalCount, currentPage: page, totalPages, ... };
}
```

---

## 5. logger.info / warn / error の使い分け

| メソッド | 使用場面 | 例 |
|---------|----------|-----|
| `logger.info` | 正常な処理フローの記録 | 処理開始・完了、主要ステップの通過 |
| `logger.warn` | セキュリティイベント・業務的な異常 | 認証失敗、rate limit 超過、ロックアウト、存在しないリソースへのアクセス |
| `logger.error` | 予期しない技術的エラー（通常は `mapToAppError()` が自動処理） | DB 接続エラー、外部API障害 |
| `logger.debug` | デバッグ用詳細情報（本番では表示されない） | 中間変数の値、クエリ詳細 |

### mapToAppError() による自動 error ログ

`ResultAsync.fromPromise` の第2引数 `mapToAppError()` が例外を catch した場合、`logger.error` は自動的に出力される。個別に `logger.error` を呼ぶ必要はない。

```typescript
execute(request: SignInRequest): ResultAsync<SignInResponse, AppError> {
  return ResultAsync.fromPromise(
    this._execute(request),
    mapToAppError(
      this.logger,
      'サインイン処理中に予期しないエラーが発生',
      'UNEXPECTED_ERROR',
    ), // ← ここで自動的に logger.error が呼ばれる
  );
}
```

---

## 6. 機密情報のマスキング

`src/utils/logMasking.ts` の `applyMasking()` が Logger 内で自動適用される。

ただし、**そもそも機密情報をメタデータに含めない**ことが最善策:

```typescript
// ❌ 絶対禁止: パスワードをログに含める
this.logger.info('サインイン試行', { email, password });

// ✅ 正しい: 機密情報を除外する
this.logger.info('サインイン試行開始', { email });

// ❌ 避けるべき: トークン全体をログに含める
this.logger.info('JWT発行', { token: jwtToken });

// ✅ 正しい: トークンの一部またはIDのみ
this.logger.info('JWT発行', { userId: user.id.value });
```

---

## 7. チェックリスト

UseCase のログ実装時:

- [ ] カテゴリ（DETAILED / STANDARD / MINIMAL）を判断した
- [ ] 開始ログに適切なキーパラメータを含めた（機密情報は除外）
- [ ] 完了ログに結果サマリーを含めた
- [ ] セキュリティイベントは `logger.warn` を使用した
- [ ] `mapToAppError()` を使用しているため個別 `logger.error` は不要であることを確認した
- [ ] パスワード・トークン等の機密情報をログに含めていない
- [ ] MINIMAL カテゴリで中間ステップのログを追加していない（パフォーマンス考慮）

---

## 関連スキル

- `pino-logging` — pino ロガーの設定・ILogger インターフェース・logMasking の詳細
- `application-impl` — UseCase 実装パターン全般（_execute / ResultAsync / validateInput）
- `security-review` — 機密情報漏洩防止のセキュリティレビュー観点
