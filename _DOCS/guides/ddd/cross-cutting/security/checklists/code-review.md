# コードレビュー時セキュリティチェックリスト

コードレビュー時に確認すべきIPAセキュリティ基準のチェックリスト。

本チェックリストはIPA「安全なウェブサイトの作り方」およびClean Architecture + DDDプロジェクトのセキュリティ原則に基づいています。

---

## 概要

### チェックリストの目的

- コードレビュー時のセキュリティ観点の見落とし防止
- IPAセキュリティ基準への準拠確認
- プロジェクト固有のセキュリティパターン適用確認
- セキュリティインシデントの早期発見

### 使用タイミング

- Pull Request作成時のセルフチェック
- コードレビュアーによる確認時
- コミット前の最終チェック
- セキュリティ監査時

### チェック結果の記録

レビュー結果は以下の形式で記録してください。

```markdown
## セキュリティレビュー結果

**レビュー日**: YYYY-MM-DD
**レビュアー**: name
**対象PR**: #123
**リスクレベル**: Low / Medium / High / Critical

### チェック結果サマリー

- 必須項目: XX/XX 合格
- 変更種別項目: XX/XX 合格
- 指摘事項: X件
- ブロッカー: X件

### 指摘事項

1. [High] ファイルパス - 具体的な指摘内容
2. [Medium] ファイルパス - 具体的な指摘内容
```

---

## 必須チェック項目（全コード変更対象）

全てのコード変更で必ずチェックする基本項目。

### 1. 入力値検証

#### 1-1. FormDataのバリデーション実装

- [ ] Server Actionsで全てのFormData入力値を検証している
- [ ] Value Objectのコンストラクタでバリデーションを実施している
- [ ] バリデーションエラーはResult型で適切に返却している
- [ ] エラーメッセージにユーザー入力値をそのまま含めていない

**確認箇所**:

- `src/app/server-actions/` - Server Actions
- `src/layers/domain/value-objects/` - Value Object

**良い例**:

```typescript
// Server Action
export async function createUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = formData.get('email') as string;
    const emailVO = new Email(email); // バリデーション実施
    // ...
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
  }
}
```

**悪い例**:

```typescript
// バリデーション無し
const email = formData.get('email') as string;
await userRepository.save({ email }); // 危険
```

#### 1-2. クエリパラメータの検証

- [ ] URLクエリパラメータを検証している
- [ ] 数値型は適切な範囲チェックをしている
- [ ] 列挙型は許可された値のみ受け入れている
- [ ] 未定義の場合のデフォルト値を設定している

**確認箇所**:

- `src/app/**/page.tsx` - Server Component

**良い例**:

```typescript
export default async function UsersPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const limit = 20;
  // ...
}
```

#### 1-3. パスパラメータの検証

- [ ] 動的ルートパラメータを検証している
- [ ] UUIDやIDの形式チェックを実施している
- [ ] 不正なパラメータは404を返している

**確認箇所**:

- `src/app/**/[id]/page.tsx` - 動的ルート

**良い例**:

```typescript
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  // UUIDバリデーション
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    notFound();
  }
  // ...
}
```

#### 1-4. JSONボディの型検証

- [ ] APIエンドポイントでJSONボディを型チェックしている
- [ ] zodやtypebox等のバリデーションライブラリを使用している
- [ ] 必須フィールドの存在チェックをしている
- [ ] ネストしたオブジェクトも検証している

---

### 2. 機密情報

#### 2-1. APIキー、パスワードのハードコード禁止

- [ ] ソースコード内にAPIキー、パスワード、トークンをハードコードしていない
- [ ] 接続文字列をハードコードしていない
- [ ] 秘密鍵をハードコードしていない

**NG例**:

```typescript
const API_KEY = 'sk_live_xxxxxxxxxxxxx'; // 絶対NG
const password = 'admin123'; // 絶対NG
```

#### 2-2. 環境変数の適切な使用

- [ ] 機密情報は全て環境変数から取得している
- [ ] `Env`クラス経由でアクセスしている
- [ ] 環境変数の存在チェックを起動時に実施している
- [ ] クライアントサイドで機密情報を使用していない

**確認箇所**:

- `src/lib/env.ts` - 環境変数定義

**良い例**:

```typescript
import { env } from '@/lib/env';

const apiClient = new ExternalApiService(env.EXTERNAL_API_KEY);
```

#### 2-3. .envファイルのgitignore確認

- [ ] `.env`、`.env.local`が`.gitignore`に含まれている
- [ ] `.env.example`のみをコミットしている
- [ ] 実際の機密情報が含まれていない

---

### 3. エラーハンドリング

#### 3-1. スタックトレースの非公開

- [ ] 本番環境でスタックトレースをクライアントに返していない
- [ ] エラー詳細はサーバーログのみに出力している
- [ ] catchブロックでconsole.errorのみ使用している

**良い例**:

```typescript
catch (error) {
  this.logger.error('Unexpected error', { error: error.message });
  return err({ message: 'システムエラーが発生しました', code: 'UNEXPECTED_ERROR' });
}
```

**悪い例**:

```typescript
catch (error) {
  return err({ message: error.stack, code: 'ERROR' }); // スタックトレース露出
}
```

#### 3-2. 統一エラーメッセージ使用

- [ ] 認証失敗時は「メールアドレスまたはパスワードが正しくありません」を使用
- [ ] ユーザー存在有無を判別できるメッセージを返していない
- [ ] データベースエラー等の技術詳細を隠蔽している

**良い例**:

```typescript
if (!user || !isPasswordValid) {
  return err({
    message: 'メールアドレスまたはパスワードが正しくありません',
    code: 'INVALID_CREDENTIALS',
  });
}
```

**悪い例**:

```typescript
if (!user) {
  return err({ message: 'ユーザーが見つかりません', code: 'USER_NOT_FOUND' }); // 列挙攻撃可能
}
```

#### 3-3. Result型の適切な使用

- [ ] 全UseCaseでResult型を返している
- [ ] 例外スローではなくerr()を返している
- [ ] result.isOk()/result.isErr()でパターンマッチングしている

**確認箇所**:

- `src/layers/application/use-cases/`

---

## 変更種別ごとのチェック項目

変更されたコードの種別に応じて確認する項目。

### A. 認証・認可関連変更時

auth()、権限チェック、セッション管理、ログイン/ログアウト処理の変更時。

#### A-1. 認証チェック

- [ ] 保護されたエンドポイントで`requireAuthentication()`を呼び出している
- [ ] セッションが無い場合は適切にリダイレクトまたはエラーを返している
- [ ] Server Actionsでもセッションチェックをしている

**確認箇所**:

- `src/app/**/page.tsx` - 保護されたページ
- `src/app/server-actions/` - 保護されたServer Actions

**良い例**:

```typescript
// Server Action での認証チェック（推奨パターン）
import { resolve } from '@/di/resolver';

export async function protectedAction(formData: FormData) {
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return { error: authResult.error.message, code: authResult.error.code };
  }
  const currentUser = authResult.value;
  // ...
}
```

#### A-2. 認可チェック

- [ ] ドメインレベルで権限チェックを実装している
- [ ] UseCaseで認可ロジックを実行している
- [ ] 他人のリソースへのアクセスを防止している

**確認箇所**:

- `src/layers/domain/entities/` - 権限メソッド
- `src/layers/application/use-cases/` - 認可チェック

**良い例**:

```typescript
export class UpdateUserProfileUseCase {
  async execute(request: UpdateUserProfileRequest, currentUserId: string): Promise<Result<...>> {
    if (request.targetUserId !== currentUserId) {
      const hasPermission = await this.permissionService.canUpdateUser(
        currentUserId,
        request.targetUserId
      );
      if (!hasPermission) {
        return err({ message: 'このユーザーを更新する権限がありません', code: 'AUTHORIZATION_FAILED' });
      }
    }
    // ...
  }
}
```

#### A-3. セッション管理

- [ ] セッショントークンを安全に保存している（httpOnly Cookie推奨）
- [ ] セッション有効期限を適切に設定している
- [ ] ログアウト時にセッションを完全に破棄している

#### A-4. パスワード処理

- [ ] パスワードをArgon2idでハッシュ化している（memoryCost:19456, timeCost:2, parallelism:1）
- [ ] パスワード強度チェックを実装している（8文字以上、大小英数記号）
- [ ] パスワードをログに出力していない

**確認箇所**:

- `src/layers/domain/value-objects/Password.ts`

#### A-5. タイミング攻撃対策

- [ ] トークン比較に`crypto.timingSafeEqual()`を使用している
- [ ] ユーザー不存在時もダミー処理で処理時間を統一している
- [ ] 認証処理に最低処理時間（500ms推奨）を設定している

**確認箇所**:

- `src/layers/application/use-cases/auth/SignInUseCase.ts`

**良い例**:

```typescript
const startTime = Date.now();
// 認証処理...
const elapsed = Date.now() - startTime;
if (elapsed < 500) {
  await this.sleep(500 - elapsed);
}
```

#### A-6. レート制限・ロックアウト

- [ ] RateLimitServiceでリクエスト頻度を制限している
- [ ] LoginAttemptServiceでアカウントロックアウトを実装している
- [ ] 失敗回数と残り試行回数を適切に通知している

**確認箇所**:

- `src/layers/application/use-cases/auth/SignInUseCase.ts`

---

### B. データ操作関連変更時

データベースクエリ、ユーザー入力の保存、検索機能の変更時。

#### B-1. SQLインジェクション対策

- [ ] Prismaのパラメータ化クエリを使用している
- [ ] 生SQLを使用していない（使用する場合は必ずパラメータ化）
- [ ] LIKE検索でワイルドカードをエスケープしている

**確認箇所**:

- `src/layers/infrastructure/repositories/`

**良い例**:

```typescript
const users = await this.prisma.user.findMany({
  where: {
    name: { contains: sanitizedQuery, mode: 'insensitive' }
  }
});
```

**悪い例**:

```typescript
const users = await this.prisma.$queryRaw`SELECT * FROM users WHERE name = ${query}`; // 危険
```

#### B-2. XSS対策

- [ ] ユーザー入力をHTMLに出力する前にエスケープしている
- [ ] `dangerouslySetInnerHTML`使用時はDOMPurifyでサニタイズしている
- [ ] 許可するHTMLタグを最小限に制限している

**確認箇所**:

- `src/components/**/*.tsx`

**良い例**:

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: []
});

<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

**悪い例**:

```typescript
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // 危険
```

#### B-3. CSRF対策

- [ ] Server Actionsを使用している（自動CSRF保護）
- [ ] カスタムAPIエンドポイントではCSRFトークンを検証している
- [ ] GET以外のメソッドで状態変更を行っている

**確認箇所**:

- `src/app/server-actions/` - Server Actions

#### B-4. データサニタイゼーション

- [ ] Value Objectでバリデーション・正規化を実施している
- [ ] 制御文字や特殊文字を除去している
- [ ] 長さ制限を適切に設定している

**確認箇所**:

- `src/layers/domain/value-objects/`

---

### C. 外部連携関連変更時

外部API呼び出し、Webhook処理、サードパーティSDK統合の変更時。

#### C-1. APIキー管理

- [ ] APIキーを環境変数から取得している
- [ ] APIキーの存在チェックを起動時に実施している
- [ ] APIキーをログに出力していない

**確認箇所**:

- `src/layers/infrastructure/services/`

**良い例**:

```typescript
export class ExternalApiService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.EXTERNAL_API_KEY!;
    if (!this.apiKey) {
      throw new Error('External API credentials not configured');
    }
  }
}
```

#### C-2. URL検証

- [ ] 外部URL呼び出し時にホワイトリスト検証をしている
- [ ] リダイレクト先URLを検証している
- [ ] SSRF攻撃を防止している（内部IPへのアクセス禁止）

**良い例**:

```typescript
private isValidEndpoint(endpoint: string): boolean {
  const allowedEndpoints = ['/users', '/posts', '/notifications'];
  return allowedEndpoints.some((allowed) => endpoint.startsWith(allowed));
}
```

#### C-3. タイムアウト設定

- [ ] 外部API呼び出しにタイムアウトを設定している（10秒推奨）
- [ ] リトライ処理に最大回数を設定している
- [ ] タイムアウト時は適切なエラーを返している

#### C-4. ログ出力確認

- [ ] 機密情報をログに出力していない
- [ ] APIキー、パスワード、トークンをマスクしている
- [ ] ユーザーの個人情報を適切に扱っている

**確認箇所**:

- `src/layers/infrastructure/logger/SecureLogger.ts`

**良い例**:

```typescript
this.logger.error('External API call failed', {
  endpoint,
  error: error.message,
  // APIキーは絶対にログに出力しない
});
```

---

### D. UI/フロントエンド変更時

Reactコンポーネント、Client Component、フォーム処理の変更時。

#### D-1. CSP対応

- [ ] インラインスクリプトを使用していない（または nonce 使用）
- [ ] eval()、Function()を使用していない
- [ ] 外部リソース読み込み時にCSPヘッダーを確認している

**確認箇所**:

- `next.config.js` - CSP設定

#### D-2. dangerouslySetInnerHTML確認

- [ ] 使用箇所を最小限にしている
- [ ] DOMPurifyでサニタイズしている
- [ ] 許可するHTMLタグを明示的に制限している

**確認箇所**:

- `src/components/**/*.tsx`

#### D-3. Client Componentでのシークレット

- [ ] 環境変数に`NEXT_PUBLIC_`プレフィックスが付いていることを確認
- [ ] クライアント側で機密情報を扱っていない
- [ ] APIキーをClient Componentで使用していない

**悪い例**:

```typescript
'use client';
const API_KEY = process.env.API_KEY; // クライアントで使用不可
```

#### D-4. フォーム処理

- [ ] Server Actionsでバリデーションを実施している
- [ ] エラーメッセージを適切に表示している
- [ ] submitボタンの二重送信を防止している

**確認箇所**:

- `src/components/features/` - フォームコンポーネント

---

## レビュー結果の記録形式

### リスクレベルの定義

| レベル | 説明 | 対応 |
|--------|------|------|
| **Critical** | セキュリティインシデントの直接的原因となる | 即座に修正（マージブロック） |
| **High** | 深刻な脆弱性につながる可能性がある | 優先的に修正 |
| **Medium** | セキュリティベストプラクティス違反 | 次回リリースまでに修正 |
| **Low** | 軽微な改善提案 | 時間があれば修正 |

### 指摘事項のテンプレート

```markdown
### [リスクレベル] ファイルパス:行番号

**問題**: 具体的な問題の説明

**影響**: このセキュリティ問題が引き起こす可能性のある影響

**推奨対応**:
\`\`\`typescript
// 修正例のコード
\`\`\`

**参考**: 関連するIPAガイドラインやドキュメントへのリンク
```

### 記録例

```markdown
## セキュリティレビュー結果

**レビュー日**: 2026-01-18
**レビュアー**: security-team
**対象PR**: #456
**リスクレベル**: Medium

### チェック結果サマリー

- 必須項目: 12/12 合格
- 変更種別項目: 8/10 合格
- 指摘事項: 2件
- ブロッカー: 0件

### 指摘事項

#### [Medium] src/app/server-actions/user/createUser.ts:15

**問題**: FormDataのバリデーションが不十分

**影響**: 不正な入力値がDomain層まで到達する可能性

**推奨対応**:
\`\`\`typescript
const email = formData.get('email') as string;
const emailVO = new Email(email); // Value Objectでバリデーション
\`\`\`

**参考**: `_DOCS/guides/ddd/cross-cutting/security.md`

#### [Low] src/layers/infrastructure/services/ExternalApiService.ts:42

**問題**: タイムアウト設定が未設定

**影響**: 外部API障害時にレスポンスが返らない

**推奨対応**:
\`\`\`typescript
const response = await fetch(url, {
  timeout: 10000 // 10秒
});
\`\`\`

**参考**: IPA「安全なウェブサイトの作り方」
```

---

## チェックリスト活用のヒント

### レビュー前の準備

1. 変更されたファイルの種別を確認（認証、データ操作、外部連携、UI）
2. 該当する変更種別のチェック項目を重点的に確認
3. 必須チェック項目は全て確認

### 効率的なレビュー方法

- GitHubのPR Reviewテンプレートに本チェックリストを組み込む
- 自動化可能な項目はCIで検出（例: hardcoded secrets detection）
- 本チェックリストの更新はテンプレ配布リポジトリ側で行う（`_DOCS/` は適用先では読み取り専用）

### チームでの共有

- セキュリティレビュー結果をチーム内で共有
- よくある指摘事項をプロジェクト固有ドキュメント（`_DOCS/` の外）に記録
- 定期的にセキュリティ勉強会を開催

---

## 参考資料

### IPA公式ドキュメント

- [IPA「安全なウェブサイトの作り方」](https://www.ipa.go.jp/security/vuln/websecurity/about.html)
- [IPA ソースコードレビュー](https://www.ipa.go.jp/archive/security/vuln/programming/cc/chapter2/cc2-3.html)
- [IPA 情報セキュリティ10大脅威 2025](https://www.ipa.go.jp/security/10threats/10threats2025.html)

### プロジェクト内ドキュメント

- [セキュリティ実装ガイド](../../../cross-cutting/security.md)
- [エラーハンドリング](../../../cross-cutting/error-handling.md)
- [セキュリティサービス](../../../layers/components/security-services.md)

---

**コードレビューでセキュリティを確保し、安全なアプリケーションを構築しましょう。**
