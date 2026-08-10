# 開発時セキュリティチェックリスト

IPA（独立行政法人情報処理推進機構）が公開する「安全なウェブサイトの作り方」に準拠した、機能開発・実装時のセキュリティチェックリスト。

---

## このドキュメントについて

### 目的

- **網羅的な確認**: IPAセキュリティ基準に基づく開発時の確認項目
- **段階的チェック**: 設計・実装・テストの各フェーズで確認
- **レイヤー別対策**: Clean Architecture各層での具体的なセキュリティ対策

### 前提知識

- **必須**: [セキュリティ実装ガイド](../security.md)
- **推奨**: [セキュリティサービス](../../layers/components/security-services.md)
- **参考**: IPA「安全なウェブサイトの作り方」第7版

### 関連ドキュメント

- **[エラーハンドリング](../error-handling.md)** - セキュアなエラー処理
- **[ロギング戦略](../logging-strategy.md)** - セキュアなログ出力
- **[テスト戦略](../../../../testing/strategy.md)** - セキュリティテスト

---

## 設計フェーズ

### 脅威モデリング

#### 基本チェック

- [ ] **機能の目的と利用者**: 誰が何のために使う機能か明確にした
- [ ] **保護すべき資産**: 個人情報、認証情報、機密データを特定した
- [ ] **信頼境界**: クライアント/サーバー、外部API連携の境界を定義した
- [ ] **権限設計**: 各機能に必要な権限レベルを定義した

#### 攻撃ベクトル分析

- [ ] **想定される攻撃**: SQLi, XSS, CSRF, 認証バイパス等のリスクを洗い出した
- [ ] **攻撃経路**: どの入力値から攻撃可能かマッピングした
- [ ] **影響範囲**: 攻撃が成功した場合の影響を評価した
- [ ] **優先度**: リスクレベルに基づき対策の優先度を決定した

### 認証・認可設計

#### 認証要件

- [ ] **認証方式**: セッション/トークン/OAuth等の方式を決定した
- [ ] **認証強度**: パスワードポリシー、多要素認証の要否を決定した
- [ ] **セッション管理**: タイムアウト、更新、破棄のポリシーを定義した
- [ ] **ログアウト**: 適切なセッション破棄処理を設計した

#### 認可設計

- [ ] **認可モデル**: RBAC/ABAC等のモデルを選択した
- [ ] **権限チェックポイント**: どこで誰の権限をチェックするか定義した
- [ ] **デフォルト拒否**: 明示的に許可されない限り拒否する設計にした
- [ ] **水平権限チェック**: 同権限レベルでのリソースアクセス制御を設計した

### データ設計

- [ ] **機密データ特定**: パスワード、トークン、個人情報等を明確化した
- [ ] **暗号化方針**: どのデータをどの方式で暗号化するか決定した
- [ ] **保存期間**: データの保持期間と削除ポリシーを定義した
- [ ] **マスキング方針**: ログや画面表示でのマスキング対象を決定した

---

## 実装フェーズ

### IPAセキュリティ対策（根本的解決）

#### 1. SQLインジェクション対策

**IPA基準**: パラメータ化クエリまたはプリペアドステートメント必須

##### Infrastructure層（Repository実装）

- [ ] **Prisma使用**: 全てのDB操作でPrismaを使用している
- [ ] **Raw Query禁止**: `$queryRaw`使用時は必ずパラメータバインドしている
- [ ] **検索値サニタイズ**: LIKE演算子使用時に`%`, `_`をエスケープしている
- [ ] **結果数制限**: `take`で取得件数を制限している

```typescript
// NG: 文字列連結
await prisma.$queryRaw`SELECT * FROM users WHERE name = '${unsafeInput}'`;

// OK: パラメータバインド
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${safeInput}`;

// OK: Prismaの標準API
await prisma.user.findMany({
  where: { name: { contains: sanitizedQuery } },
  take: 50,
});
```

#### 2. XSS（クロスサイトスクリプティング）対策

**IPA基準**: 出力時のHTMLエスケープ必須

##### Presentation層（UI Component）

- [ ] **自動エスケープ**: React JSXの自動エスケープを活用している
- [ ] **dangerouslySetInnerHTML禁止**: 使用する場合は必ずサニタイズ済み
- [ ] **DOMPurify使用**: HTMLを表示する場合は`isomorphic-dompurify`でサニタイズ
- [ ] **URL検証**: ユーザー入力URLは`javascript:`スキーム等を除外

```typescript
// OK: 自動エスケープ
<div>{userInput}</div>

// NG: サニタイズなしのHTML挿入
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// OK: サニタイズ後のHTML挿入
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

##### Application層（UseCase）

- [ ] **入力サニタイズ**: HTML含む入力値は処理前にサニタイズ
- [ ] **出力準備**: レスポンスデータにスクリプトタグ等が含まれないよう検証

#### 3. CSRF（クロスサイトリクエストフォージェリ）対策

**IPA基準**: トークンによる正規リクエスト検証

##### Presentation層（Server Actions）

- [ ] **Server Actions使用**: Next.js Server Actionsの自動CSRF保護を利用
- [ ] **'use server'宣言**: 全てのServer Actionsに`'use server'`を記述
- [ ] **カスタムトークン**: 機密操作には追加のCSRFトークン検証を実装
- [ ] **Referrerチェック**: 必要に応じてRefererヘッダー検証

```typescript
// OK: 自動CSRF保護
'use server';
export async function updateProfileAction(formData: FormData) {
  // Next.jsが自動的にCSRF保護
}

// OK: 追加検証
'use server';
export async function deleteAccountAction(formData: FormData, csrfToken: string) {
  if (!validateCSRFToken(csrfToken)) {
    return { success: false, error: 'Invalid CSRF token' };
  }
}
```

#### 4. HTTP Header Injection対策

**IPA基準**: 改行コードの除去またはエラー処理

##### Presentation層（Header設定）

- [ ] **改行除去**: ユーザー入力をヘッダーに含む場合は`\r\n`を除去
- [ ] **ホワイトリスト**: 許可された値のみヘッダーに設定
- [ ] **Content-Type固定**: レスポンスのContent-Typeを適切に設定

```typescript
// OK: 改行除去
const sanitizedValue = userInput.replace(/[\r\n]/g, '');
response.setHeader('X-Custom-Header', sanitizedValue);

// OK: ホワイトリスト
const allowedTypes = ['json', 'xml', 'csv'];
const type = allowedTypes.includes(userType) ? userType : 'json';
```

#### 5. メールヘッダインジェクション対策

**IPA基準**: 改行コード除去とホワイトリスト検証

##### Infrastructure層（メール送信）

- [ ] **改行除去**: メールアドレス、件名から`\r\n`を除去
- [ ] **形式検証**: メールアドレスの形式を正規表現で検証
- [ ] **ドメイン検証**: 許可されたドメインのみ送信先として許可（必要に応じて）
- [ ] **BCCヘッダー禁止**: ユーザー入力からBCCヘッダーを構築しない

```typescript
// OK: 検証とサニタイズ
export class EmailService {
  async send(to: string, subject: string, body: string) {
    // 改行除去
    const safeTo = to.replace(/[\r\n]/g, '');
    const safeSubject = subject.replace(/[\r\n]/g, '');

    // 形式検証
    if (!this.isValidEmail(safeTo)) {
      throw new ValidationError('Invalid email address');
    }

    // 送信
    await this.mailer.send({ to: safeTo, subject: safeSubject, body });
  }
}
```

#### 6. ディレクトリトラバーサル対策

**IPA基準**: ファイル名固定またはホワイトリスト検証

##### Infrastructure層（ファイル操作）

- [ ] **パス正規化**: `path.resolve()`でパスを正規化
- [ ] **ベースディレクトリ検証**: 処理対象がベースディレクトリ配下か確認
- [ ] **ファイル名ホワイトリスト**: 許可されたファイル名のみ処理
- [ ] **拡張子チェック**: 許可された拡張子のみ処理

```typescript
// OK: 安全なファイルアクセス
export class FileService {
  private readonly baseDir = '/app/uploads';

  async readFile(filename: string): Promise<Buffer> {
    // パス正規化
    const safePath = path.resolve(this.baseDir, filename);

    // ベースディレクトリ配下か検証
    if (!safePath.startsWith(this.baseDir)) {
      throw new SecurityError('Invalid file path');
    }

    // 拡張子チェック
    const allowedExtensions = ['.jpg', '.png', '.pdf'];
    const ext = path.extname(safePath);
    if (!allowedExtensions.includes(ext)) {
      throw new ValidationError('Invalid file type');
    }

    return fs.readFile(safePath);
  }
}
```

#### 7. OSコマンドインジェクション対策

**IPA基準**: OSコマンド呼び出しを使用しない、または引数を配列で渡す

##### Infrastructure層（外部コマンド実行）

- [ ] **シェル呼び出し禁止**: `shell: true`オプションを使用しない
- [ ] **引数配列化**: コマンドと引数を配列で分離
- [ ] **入力値検証**: コマンド引数のホワイトリスト検証
- [ ] **代替API使用**: 可能な限りNode.js APIで代替

```typescript
// NG: シェル経由の実行
exec(`convert ${userInput}.jpg output.png`);

// OK: 引数を配列で指定
execFile('convert', [sanitizedInput + '.jpg', 'output.png']);

// BEST: Node.js APIで代替
import sharp from 'sharp';
await sharp(inputPath).toFile(outputPath);
```

#### 8. パストラバーサル対策

**IPA基準**: ファイル名のホワイトリスト検証

##### Infrastructure層（アップロード処理）

- [ ] **ファイル名サニタイズ**: `../`等のパストラバーサル文字列を除去
- [ ] **UUID使用**: ユーザー入力を使わず、UUIDでファイル名生成
- [ ] **MIMEタイプ検証**: Content-Typeとファイル実体の整合性確認
- [ ] **サイズ制限**: アップロードサイズを制限

```typescript
// OK: 安全なファイルアップロード
export class UploadService {
  async upload(file: File): Promise<string> {
    // MIMEタイプ検証
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError('Invalid file type');
    }

    // サイズ制限（10MB）
    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError('File too large');
    }

    // UUIDでファイル名生成
    const ext = path.extname(file.name);
    const filename = `${uuidv4()}${ext}`;
    const safePath = path.resolve(this.uploadDir, filename);

    await fs.writeFile(safePath, Buffer.from(await file.arrayBuffer()));
    return filename;
  }
}
```

#### 9. 認証・認可の欠陥対策

**IPA基準**: 認証機能の適切な実装

##### Application層（UseCase）

- [ ] **認証チェック**: 全ての保護エンドポイントで認証確認
- [ ] **認可チェック**: リソースアクセス前に権限確認
- [ ] **セッション管理**: タイムアウト、更新、破棄を適切に実装
- [ ] **パスワードハッシュ**: Argon2idでハッシュ化（memoryCost:19456, timeCost:2, parallelism:1）

```typescript
// OK: 認証・認可チェック
export class UpdateUserProfileUseCase {
  async execute(
    request: UpdateUserProfileRequest,
    currentUserId: string,
  ): Promise<Result<UpdateUserProfileResponse, AppError>> {
    // 認証チェック
    if (!currentUserId) {
      return err({ message: '認証が必要です', code: 'AUTHENTICATION_REQUIRED' });
    }

    // 認可チェック
    if (request.targetUserId !== currentUserId) {
      const hasPermission = await this.checkPermission(
        currentUserId,
        request.targetUserId,
      );
      if (!hasPermission) {
        return err({ message: '権限がありません', code: 'AUTHORIZATION_FAILED' });
      }
    }

    // 処理実行
  }
}
```

##### Domain層（Password Value Object）

- [ ] **パスワード強度**: 最低8文字、大小文字・数字・記号の組み合わせ
- [ ] **ハッシュ化**: Argon2id（memoryCost:19456, timeCost:2, parallelism:1）
- [ ] **定数時間比較**: タイミング攻撃対策

```typescript
// OK: 安全なパスワード処理
// ARGON2_OPTIONS は @/layers/infrastructure/services/HashService 内で定義
// パスワードハッシュは IHashService 経由で HashService に委譲すること
import { IHashService } from '@/layers/domain/services/IHashService';

// 直接使用する場合は HashService を DI 経由で注入する
// import { HashService } from '@/layers/infrastructure/services/HashService';

export class Password {
  static async create(plain: string, hashService: IHashService): Promise<Password> {
    // 強度チェック
    if (!this.isStrongPassword(plain)) {
      throw new DomainError('パスワードが弱すぎます', 'PASSWORD_TOO_WEAK');
    }

    // Argon2idでハッシュ化（HashService が ARGON2_OPTIONS を内部で保持）
    const hashedValue = await hashService.hash(plain);
    return new Password(hashedValue);
  }

  async verify(plain: string, hashService: IHashService): Promise<boolean> {
    // verify は定数時間比較を実装済み
    return hashService.verify(this.hashedValue, plain);
  }
}
```

#### 10. セッション管理の欠陥対策

**IPA基準**: セッションIDの適切な管理

##### Application層（SessionService）

- [ ] **セッションID生成**: 暗号論的に安全な乱数で生成
- [ ] **セッション固定化対策**: ログイン成功時にセッションIDを再生成
- [ ] **タイムアウト**: アイドルタイムアウトと絶対タイムアウトを設定
- [ ] **ログアウト**: セッション破棄を適切に実装

```typescript
// OK: 安全なセッション管理
export class SessionService {
  async createSession(userId: string): Promise<Session> {
    // 暗号論的に安全なランダム生成
    const sessionId = crypto.randomBytes(32).toString('hex');

    // タイムアウト設定
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分

    return this.sessionRepository.create({
      id: sessionId,
      userId,
      expiresAt,
    });
  }

  async renewSession(oldSessionId: string): Promise<Session> {
    // 古いセッション破棄
    await this.sessionRepository.delete(oldSessionId);

    // 新しいセッション生成
    const session = await this.sessionRepository.findById(oldSessionId);
    return this.createSession(session.userId);
  }
}
```

#### 11. リダイレクト処理の脆弱性対策

**IPA基準**: リダイレクト先URLのホワイトリスト検証

##### Presentation層（リダイレクト処理）

- [ ] **ホワイトリスト**: 許可されたドメイン/パスのみリダイレクト
- [ ] **相対URL**: 可能な限り相対URLを使用
- [ ] **javascript:禁止**: `javascript:`スキームを拒否
- [ ] **オープンリダイレクト防止**: 外部サイトへの無制限リダイレクト禁止

```typescript
// OK: 安全なリダイレクト
export function safeRedirect(url: string): string {
  // 相対URLのみ許可
  if (url.startsWith('/')) {
    return url;
  }

  // ホワイトリストのドメインのみ許可
  const allowedDomains = ['example.com', 'app.example.com'];
  try {
    const parsed = new URL(url);
    if (allowedDomains.includes(parsed.hostname)) {
      return url;
    }
  } catch {
    // 不正なURL
  }

  // デフォルトリダイレクト先
  return '/';
}
```

### レイヤー別セキュリティ実装

#### Domain層

- [ ] **Value Object検証**: Email, Password等のValue Objectで入力検証
- [ ] **不変性**: Entityの状態変更は専用メソッド経由のみ
- [ ] **ビジネスルール**: 権限チェックをドメインロジックとして実装
- [ ] **定数時間比較**: トークン比較は`crypto.timingSafeEqual`を使用

```typescript
// OK: Value Objectでの検証
export class Email {
  constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new DomainError('Invalid email format', 'VALIDATION_INVALID_EMAIL');
    }
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

#### Application層

- [ ] **Result型使用**: 全UseCaseで`Result<T>`を返却
- [ ] **入力検証**: リクエストDTOでバリデーション
- [ ] **認証確認**: 保護UseCaseで認証チェック
- [ ] **認可確認**: リソースアクセス前に権限チェック
- [ ] **Rate Limiting**: `IRateLimitService`でリクエスト制限
- [ ] **ログイン試行制限**: `ILoginAttemptService`でアカウントロック

```typescript
// OK: UseCase実装
export class UpdatePostUseCase {
  async execute(
    request: UpdatePostRequest,
    currentUserId: string,
  ): Promise<Result<UpdatePostResponse, AppError>> {
    // 認証チェック
    if (!currentUserId) {
      return err({ message: '認証が必要です', code: 'AUTHENTICATION_REQUIRED' });
    }

    // Rate Limitチェック
    const rateLimitResult = await this.rateLimitService.checkLimit(
      `update_post:${currentUserId}`,
    );
    if (!rateLimitResult.allowed) {
      return err({ message: 'リクエストが多すぎます', code: 'RATE_LIMIT_EXCEEDED' });
    }

    // 投稿取得
    const post = await this.postRepository.findById(new PostId(request.postId));
    if (!post) {
      return err({ message: '投稿が見つかりません', code: 'POST_NOT_FOUND' });
    }

    // 認可チェック
    const user = await this.userRepository.findById(new UserId(currentUserId));
    if (!user.canEditPost(post)) {
      return err({ message: '権限がありません', code: 'AUTHORIZATION_FAILED' });
    }

    // 更新実行
    post.update(request);
    await this.postRepository.save(post);

    return ok({ post: this.toResponse(post) });
  }
}
```

#### Infrastructure層

- [ ] **パラメータ化クエリ**: Prismaの標準API使用
- [ ] **接続文字列保護**: 環境変数でDB接続情報を管理
- [ ] **API Key保護**: 環境変数で外部APIキーを管理
- [ ] **タイムアウト設定**: 外部API呼び出しにタイムアウト設定
- [ ] **セキュアログ**: 機密情報をログに出力しない

```typescript
// OK: Prisma使用
export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value }, // 自動的にパラメータ化
    });
    return user ? this.toDomain(user) : null;
  }
}

// OK: セキュアログ
export class SecureLogger implements ILogger {
  private sensitiveFields = ['password', 'token', 'apiKey', 'creditCard'];

  info(message: string, context?: LogContext): void {
    const sanitized = this.sanitizeContext(context);
    this.baseLogger.info(message, sanitized);
  }

  private sanitizeContext(context?: LogContext): LogContext {
    if (!context) return {};
    const sanitized = { ...context };
    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
```

#### Presentation層

- [ ] **Server Actions使用**: 'use server'でCSRF保護
- [ ] **認証チェック**: Server Actionsで認証確認
- [ ] **入力サニタイズ**: FormDataを処理前にサニタイズ
- [ ] **エラーメッセージ**: 技術的詳細を含まない汎用エラー
- [ ] **Content Security Policy**: next.config.jsで設定
- [ ] **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options等

```typescript
// OK: Server Action実装
'use server';
import { resolve } from '@/di/resolver';

export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  // 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return { success: false, error: authResult.error.message };
  }
  const currentUser = authResult.value;

  // UseCase実行
  const useCase = resolve('UpdateUserProfileUseCase');
  const result = await useCase.execute(
    {
      targetUserId: currentUser.id,
      name: formData.get('name') as string,
    },
    currentUser.id,
  );

  // Result型をActionResultに変換
  if (result.isErr()) {
    // 技術的詳細を含まない汎用エラー
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}
```

### コーディング時の注意点

#### 機密情報の取り扱い

- [ ] **環境変数使用**: API Key、接続文字列等を環境変数で管理
- [ ] **ハードコード禁止**: ソースコードに機密情報を埋め込まない
- [ ] **ログ出力禁止**: パスワード、トークン等をログに出力しない
- [ ] **エラーメッセージ**: スタックトレースを本番環境で表示しない

#### タイミング攻撃対策

- [ ] **定数時間比較**: トークン/パスワード比較は定数時間で実行
- [ ] **ダミー処理**: ユーザー不存在時もダミー処理で時間を統一
- [ ] **最小処理時間**: 認証処理に最低処理時間を設定
- [ ] **統一エラー**: 失敗原因を特定できないエラーメッセージ

```typescript
// OK: タイミング攻撃対策
export class SignInUseCase {
  async execute(request: SignInRequest): Promise<Result<SignInResponse, AppError>> {
    const startTime = Date.now();

    // ユーザー検索
    const user = await this.userRepository.findByEmail(new Email(request.email));

    let isValid = false;
    if (user) {
      isValid = await this.authService.verifyPassword(
        request.password,
        user.passwordHash,
      );
    } else {
      // ダミーのパスワード検証で時間を統一
      await this.authService.verifyPassword(request.password, '');
    }

    // 最低処理時間（500ms）
    const elapsed = Date.now() - startTime;
    if (elapsed < 500) {
      await this.sleep(500 - elapsed);
    }

    if (!isValid) {
      // ユーザー存在有無を漏らさない統一エラー
      return err({
        message: 'メールアドレスまたはパスワードが正しくありません',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // 認証成功処理
  }
}
```

#### ユーザー列挙攻撃対策

- [ ] **統一エラーメッセージ**: ユーザー存在有無を特定できないメッセージ
- [ ] **処理時間統一**: 存在/非存在で処理時間を統一
- [ ] **メール送信**: パスワードリセット等で成功メッセージのみ表示

---

## テストフェーズ

### セキュリティテスト

#### 認証テスト

- [ ] **未認証拒否**: 認証なしでアクセスした場合にエラーが返る
- [ ] **無効トークン拒否**: 無効なトークンでアクセスした場合にエラーが返る
- [ ] **期限切れトークン拒否**: 期限切れトークンでアクセスした場合にエラーが返る
- [ ] **ログアウト後拒否**: ログアウト後のトークンでアクセスできない

```typescript
// OK: 認証テスト
describe('UpdateUserProfileUseCase', () => {
  it('未認証ユーザーはエラーになる', async () => {
    const result = await useCase.execute(validRequest, null);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });
});
```

#### 認可テスト

- [ ] **水平権限エスカレーション**: 同権限レベルの他人リソースにアクセス拒否
- [ ] **垂直権限エスカレーション**: 上位権限が必要な操作を拒否
- [ ] **リソース所有者確認**: 自分のリソースのみアクセス可能
- [ ] **管理者権限確認**: 管理者のみ実行可能な操作を確認

```typescript
// OK: 認可テスト
describe('UpdatePostUseCase', () => {
  it('他人の投稿は編集できない', async () => {
    const result = await useCase.execute(
      { postId: 'other-user-post', title: 'New Title' },
      'current-user-id',
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AUTHORIZATION_FAILED');
    }
  });
});
```

#### 入力値境界テスト

- [ ] **境界値**: 最小値・最大値での動作確認
- [ ] **異常値**: 負の数、空文字、null/undefined等での動作確認
- [ ] **特殊文字**: `<script>`, `' OR '1'='1`, `../`等での動作確認
- [ ] **エンコーディング**: UTF-8以外のエンコーディングでの動作確認

```typescript
// OK: 入力値境界テスト
describe('Email Value Object', () => {
  it('空文字は拒否される', () => {
    expect(() => new Email('')).toThrow(DomainError);
  });

  it('スクリプトタグは拒否される', () => {
    expect(() => new Email('<script>alert("XSS")</script>@example.com'))
      .toThrow(DomainError);
  });

  it('正常な形式は受け入れられる', () => {
    expect(() => new Email('user@example.com')).not.toThrow();
  });
});
```

#### XSS/SQLインジェクションテスト

- [ ] **XSS**: `<script>`, `<img>`, イベントハンドラー等が除去される
- [ ] **SQLインジェクション**: `' OR '1'='1`, `; DROP TABLE`等が無効化される
- [ ] **コマンドインジェクション**: `; rm -rf`, `| cat /etc/passwd`等が無効化される
- [ ] **パストラバーサル**: `../`, `..\\`等が無効化される

```typescript
// OK: XSSテスト
describe('sanitizeHtml', () => {
  it('スクリプトタグが除去される', () => {
    const result = sanitizeHtml('<script>alert("XSS")</script><p>Text</p>');
    expect(result).toBe('<p>Text</p>');
    expect(result).not.toContain('<script>');
  });

  it('イベントハンドラーが除去される', () => {
    const result = sanitizeHtml('<p onclick="alert(\'XSS\')">Text</p>');
    expect(result).toBe('<p>Text</p>');
    expect(result).not.toContain('onclick');
  });
});
```

#### Rate Limiting・ロックアウトテスト

- [ ] **Rate Limit超過**: 制限回数を超えたリクエストが拒否される
- [ ] **アカウントロック**: 連続失敗でアカウントがロックされる
- [ ] **ロック解除**: 時間経過でロックが解除される
- [ ] **成功後リセット**: 成功ログインで失敗カウントがリセットされる

```typescript
// OK: Rate Limitingテスト
describe('SignInUseCase - Rate Limiting', () => {
  it('Rate Limit超過時はエラーを返す', async () => {
    mockRateLimitService.checkLimit.mockResolvedValue({
      allowed: false,
      current: 5,
      limit: 5,
      remaining: 0,
      retryAfterMs: 30000,
    });

    const result = await useCase.execute(validRequest);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
```

#### タイミング攻撃テスト

- [ ] **処理時間統一**: ユーザー存在/非存在で処理時間が統一されている
- [ ] **定数時間比較**: トークン比較が定数時間で実行される
- [ ] **最小処理時間**: 認証処理が最低処理時間を満たす

```typescript
// OK: タイミング攻撃テスト
describe('SignInUseCase - タイミング攻撃対策', () => {
  it('ユーザー存在有無で処理時間が統一される', async () => {
    // 存在するユーザー
    const start1 = Date.now();
    await useCase.execute({ email: 'exists@example.com', password: 'wrong' });
    const elapsed1 = Date.now() - start1;

    // 存在しないユーザー
    const start2 = Date.now();
    await useCase.execute({ email: 'notexists@example.com', password: 'wrong' });
    const elapsed2 = Date.now() - start2;

    // 処理時間の差が100ms以内（最小処理時間500msの場合）
    expect(Math.abs(elapsed1 - elapsed2)).toBeLessThan(100);
  });
});
```

### E2Eセキュリティテスト

#### Playwrightでのセキュリティテスト

- [ ] **認証フロー**: ログイン、ログアウト、セッション管理
- [ ] **権限確認**: 異なる権限レベルでのアクセス制御
- [ ] **CSRF**: Server Actionsのフォーム送信
- [ ] **XSS**: ユーザー入力が適切にエスケープされる

```typescript
// OK: E2Eセキュリティテスト
describe('認証フロー E2E', () => {
  test('未認証ユーザーは保護ページにアクセスできない', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/signin');
  });

  test('ログアウト後は保護ページにアクセスできない', async ({ page }) => {
    // ログイン
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // ログアウト
    await page.click('button[data-testid="logout"]');
    await expect(page).toHaveURL('/signin');

    // 再度ダッシュボードにアクセス
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/signin');
  });
});
```

---

## デプロイ前チェック

### 環境変数

- [ ] **本番環境設定**: 全ての必須環境変数が設定されている
- [ ] **機密情報保護**: APIキー、DB接続文字列等がSecrets管理されている
- [ ] **デバッグモード無効**: `NODE_ENV=production`が設定されている
- [ ] **エラー表示無効**: 詳細なエラーメッセージが無効化されている

### HTTPS・セキュリティヘッダー

- [ ] **HTTPS強制**: 全通信がHTTPSで行われる
- [ ] **HSTS**: Strict-Transport-Securityヘッダーが設定されている
- [ ] **CSP**: Content-Security-Policyが適切に設定されている
- [ ] **X-Frame-Options**: クリックジャッキング対策が設定されている
- [ ] **X-Content-Type-Options**: MIMEタイプスニッフィング対策が設定されている

### 依存関係

- [ ] **脆弱性スキャン**: `npm audit`で既知の脆弱性がない
- [ ] **更新確認**: 重要なセキュリティアップデートが適用されている
- [ ] **不要な依存関係**: 使用していない依存関係を削除している

### ログ・監視

- [ ] **セキュリティログ**: 認証失敗、権限エラー等を記録
- [ ] **異常検知**: 異常なアクセスパターンを検知できる
- [ ] **アラート設定**: セキュリティイベント発生時のアラート設定

---

## チェックリスト活用方法

### 機能開発時

1. **設計フェーズ**: 脅威モデリング・認証認可設計を実施
2. **実装フェーズ**: IPAセキュリティ対策・レイヤー別実装を確認
3. **テストフェーズ**: セキュリティテスト・E2Eテストを実施
4. **デプロイ前**: 環境変数・HTTPS・依存関係を確認

### コードレビュー時

- [ ] **IPAセキュリティ対策**: 各対策項目が実装されているか確認
- [ ] **Result型使用**: 全UseCaseでResult型が返却されているか確認
- [ ] **認証・認可**: 適切なチェックが実装されているか確認
- [ ] **機密情報保護**: ログやエラーメッセージに機密情報が含まれていないか確認

### 定期レビュー

- [ ] **月次**: 依存関係の脆弱性スキャン
- [ ] **四半期**: セキュリティテストの網羅性確認
- [ ] **半期**: 脅威モデルの見直し

---

## 関連ドキュメント

- **[セキュリティ実装ガイド](../security.md)** - 各レイヤーの実装詳細
- **[セキュリティサービス](../../layers/components/security-services.md)** - Rate Limit・ロックアウトサービス
- **[エラーハンドリング](../error-handling.md)** - セキュアなエラー処理
- **[ロギング戦略](../logging-strategy.md)** - セキュアなログ出力
- **[テスト戦略](../../../../testing/strategy.md)** - セキュリティテスト

---

## 参考資料

### IPA「安全なウェブサイトの作り方」

- **SQLインジェクション**: 1-1
- **XSS**: 1-5
- **CSRF**: 1-6
- **HTTPヘッダインジェクション**: 1-3
- **メールヘッダインジェクション**: 1-4
- **ディレクトリトラバーサル**: 1-2
- **OSコマンドインジェクション**: 1-7
- **認証・認可**: 1-8, 1-9
- **セッション管理**: 1-10
- **リダイレクト**: 1-11

### OWASP Top 10

- **A01:2021 – Broken Access Control**: 認証・認可の欠陥
- **A02:2021 – Cryptographic Failures**: 暗号化の失敗
- **A03:2021 – Injection**: SQLインジェクション等
- **A05:2021 – Security Misconfiguration**: セキュリティ設定ミス
- **A07:2021 – Identification and Authentication Failures**: 認証の失敗

---

このチェックリストを活用して、IPAセキュリティ基準に準拠した安全なアプリケーションを開発しましょう。
