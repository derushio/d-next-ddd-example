# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Next.js 15 + TypeScript + Clean Architecture + DDDベースのWebアプリケーションテンプレート。Server Actions優先でクライアントコンポーネントは最小限に抑える設計。shadcn/ui統合によりモダンなUI開発環境を提供。

### 🚀 重要な技術選択

**Result型パターン採用** - 本プロジェクトでは例外処理の代わりにResult型パターンを採用し、型安全で統一的なエラーハンドリングを実現しています。

**shadcn/ui統合システム** - 既存システムとの完全互換性を保ちながら、Enhanced Components、Bridge System、HSL変数システムによる次世代UI開発環境を提供しています。

```typescript
// Result型パターンの基本使用法
import { Result, success, failure } from '@/layers/application/types/Result';

async function createUser(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
  try {
    // ... ビジネスロジック
    return success(response);
  } catch (error) {
    if (error instanceof DomainError) {
      return failure(error.message, error.code);
    }
    return failure('予期しないエラー', 'UNEXPECTED_ERROR');
  }
}
```

### 🧩 shadcn/ui統合システム

**Enhanced Components Bridge System** - 既存システムとshadcn/ui標準機能の統合による最適なUI開発体験を提供。

```typescript
// Bridge System経由での統合コンポーネント使用（推奨）
import { Button, Card, Alert, Dialog, Form } from '@/components/ui-bridge';

// Enhanced Button: 既存機能（gradient、loading）+ shadcn/ui標準機能
<Button variant="primary" gradient={true} loading={isLoading} fullWidth={true}>
  統合機能ボタン
</Button>

// 🌟 2024年トレンド：現代的Aurora Gradientシステム
<Button variant="aurora">Aurora Gradient</Button>
<Button variant="sunset">Sunset Gradient</Button>
<Button variant="ocean">Ocean Gradient</Button>
<Button variant="cosmic">Cosmic Gradient</Button>
<Button variant="solar">Solar Gradient</Button>
<Button variant="animated">Animated Gradient</Button>
<Button variant="glass">Glass Morphism</Button>

// shadcn/ui標準variants
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>

// Enhanced Card: Compound Pattern + shadcn/ui互換 + Aurora Gradients
<Card variant="elevated" padding="lg">
  <Card.Header>
    <h2>タイトル</h2>
  </Card.Header>
  <Card.Content>
    <p>コンテンツ</p>
  </Card.Content>
</Card>

// 🌟 Aurora Gradient Cards
<Card variant="aurora" hover={true}>
  <Card.Header>
    <Card.Title>Aurora Card</Card.Title>
    <Card.Description>美しいオーロラグラデーション</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>次世代UI体験を提供</p>
  </Card.Content>
  <Card.Footer>
    <Button variant="glass">アクション</Button>
  </Card.Footer>
</Card>
```

**テーマシステム v2.0** - Aurora Gradient System + HEX/HSL変数デュアルシステム。

```typescript
// shadcn/ui標準パターン（HSL変数）
<div className="bg-primary text-primary-foreground">
  shadcn/ui標準スタイリング
</div>

// 既存システムパターン（HEX変数）
<div className="bg-[var(--primary)] text-[var(--text-inverse)]">
  既存システム互換スタイリング  
</div>

// 🌟 2024年トレンド：Aurora Gradient System（実装済み）
<div className="gradient-aurora">
  Aurora - Purple to Pink to Blue
</div>
<div className="gradient-sunset">
  Sunset - Orange to Pink to Purple
</div>
<div className="gradient-ocean">
  Ocean - Teal to Green to Blue
</div>
<div className="gradient-cosmic">
  Cosmic - Red to Magenta to Purple
</div>
<div className="gradient-solar">
  Solar - Yellow to Orange to Red
</div>

// アニメーション・特殊効果
<div className="gradient-animated">
  動的グラデーション（6秒アニメーション）
</div>
<div className="gradient-glass">
  Glass Morphism効果
</div>

// 従来グラデーション（互換性）
<div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
  ブランドグラデーション
</div>
```

**Form統合パターン** - react-hook-form + zod + shadcn/ui Formの完全統合。

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui-bridge';

const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export function EnhancedForm() {
  const form = useForm({ resolver: zodResolver(schema) });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="primary" gradient={true}>
          送信
        </Button>
      </form>
    </Form>
  );
}
```

## 🚨 重要：実行前必読システム

**任意の開発タスクを実行する前に、必ず対応するドキュメントを読み込んでからコード実装を開始してください。** このシステムにより、アーキテクチャ違反やベストプラクティス違反を事前に防止します。

## 開発コマンド

### 基本コマンド

```bash
# 開発サーバー起動（next:dev + db:generate:watch + db:studio を並列実行）
pnpm dev

# ビルド（db:generate → next:build の順次実行）
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# Lintチェック
pnpm lint

# フォーマット（package.json と src 配下 + markdown）
pnpm format
pnpm format:prettier    # Prettier（package.json + src）
pnpm format:markdown    # Markdownlintによるドキュメント整形

# プロジェクトクリーン（.next, out, dist, coverage を削除）
pnpm clean

# Next.js個別コマンド
pnpm next:dev           # 開発サーバー（Turbopack）
pnpm next:build         # ビルド
pnpm next:build:turbo   # Turbopackビルド
pnpm next:start         # 本番サーバー
pnpm next:lint          # Next.js Lint
```

### テストコマンド

```bash
# 全テスト実行（unit + e2e を順次実行）
pnpm test

# ユニットテストのみ実行
pnpm test:unit

# ウォッチモードでテスト
pnpm test:watch

# テストUI起動
pnpm test:ui

# カバレッジ付きテスト
pnpm test:coverage

# E2Eテスト実行
pnpm test:e2e

# E2EテストUI起動
pnpm test:e2e:ui

# E2Eテストデバッグモード
pnpm test:e2e:debug

# E2Eテストレポート表示
pnpm test:e2e:report

# E2Eテストtraceモード
pnpm test:e2e:trace

# E2Eテストheadedモード（ブラウザ表示）
pnpm test:e2e:headed
```

### 📊 テストカバレッジ分析

**カバレッジ分析ツール**: `@vitest/coverage-v8`による高精度カバレッジ計測

```bash
# カバレッジ付きテスト実行
pnpm test:coverage

# 詳細なカバレッジレポート生成
pnpm test:unit --coverage --reporter=verbose

# 特定ディレクトリのカバレッジ確認
pnpm test:unit --coverage -- "src/layers/application/**/*.test.ts"
```

#### 🎯 カバレッジ品質基準

**プロジェクト品質目標:**

| レイヤー | カバレッジ目標 | 重要度 |
|---------|-------------|--------|
| **Application Layer (UseCases)** | **94%以上** | ⭐⭐⭐ |
| **Domain Layer** | **90%以上** | ⭐⭐⭐ |
| **Infrastructure Layer** | **85%以上** | ⭐⭐ |
| **Presentation Layer** | **80%以上** | ⭐ |

#### 📈 カバレッジ分析ワークフロー

**1. 現状調査フェーズ**

```bash
# 全体カバレッジ確認
pnpm test:coverage --reporter=text-summary

# HTMLレポート生成（詳細分析用）
pnpm test:coverage --reporter=html
```

**2. 問題特定・優先度判定**

```text
- 50%未満: 🔥 Critical - 即座対応必須
- 50-70%: ⚠️ Warning - 優先対応推奨
- 70-85%: 📝 Note - 改善検討
- 85%以上: ✅ Good - 現状維持
```

**3. テスト実装・品質向上**

```typescript
// vitest-mock-extended使用例（高品質テスト実装）
import { createAutoMockUserRepository } from '@tests/utils/mocks/autoMocks';
import { isSuccess, isFailure } from '@/layers/application/types/Result';

const mockUserRepository = createAutoMockUserRepository();
mockUserRepository.findById.mockResolvedValue(mockUser);

const result = await useCase.execute(validInput);
expect(isSuccess(result)).toBe(true);
```

**4. 継続的品質監視**

```bash
# CI/CDでのカバレッジ閾値チェック
pnpm test:coverage --threshold=85

# カバレッジ変化追跡
pnpm test:coverage --reporter=json > coverage-report.json
```

### 🎨 shadcn/ui関連コマンド

```bash
# shadcn/uiコンポーネントの追加
pnpm ui:add

# shadcn/uiコンポーネントの更新確認
pnpm ui:update

# 利用可能なshadcn/uiコンポーネント一覧
pnpm ui:list

# 特定コンポーネントの追加例
pnpx shadcn@latest add button
pnpx shadcn@latest add card
pnpx shadcn@latest add form
pnpx shadcn@latest add dialog
pnpx shadcn@latest add alert
```

### データベース関連

```bash
# Prismaクライアント生成
pnpm db:generate

# Prismaクライアント生成（ウォッチモード）
pnpm db:generate:watch

# Prismaスキーマフォーマット
pnpm db:format

# DBスキーマプッシュ
pnpm db:push

# マイグレーション実行（開発環境）
pnpm db:migrate:dev

# マイグレーション実行（本番デプロイ）
pnpm db:migrate:deploy

# シード実行
pnpm db:seed

# Prisma Studio起動（ブラウザ無効）
pnpm db:studio
```

### その他のツール

```bash
# ハッシュ生成ツール実行
pnpm hash:generate

# Mermaid図検証ツール
pnpm mermaid:validate       # 変更されたMermaid図を検証
pnpm mermaid:validate-all   # 全てのMermaid図を検証
```

## アーキテクチャ概要

### レイヤー構成

1. **Presentation層** (`src/components`, `src/app`)
   - UI Components: React Server Components優先
   - Server Actions: ユーザー入力処理
   - shadcn/ui統合: Enhanced Components、Bridge System による統一UI

2. **Application層** (`src/layers/application`)
   - Use Cases: ビジネスフローの制御（Result<T>型を返す）
   - DTOs: レイヤー間データ転送オブジェクト
   - Result型: 型安全な統一エラーハンドリング
   - Services: アプリケーション固有のサービス

3. **Domain層** (`src/layers/domain`)
   - Entities: ビジネスエンティティ（不変条件を保証）
   - Value Objects: 値オブジェクト（バリデーション込み）
   - Domain Services: ドメインロジック
   - Repository Interfaces: 抽象化されたデータアクセス
   - Domain Errors: ドメイン固有のエラー定義

4. **Infrastructure層** (`src/layers/infrastructure`)
   - Repository実装: Prismaを使用したデータアクセス
   - 外部サービス実装: メール、ファイルストレージ等
   - ログサービス: 構造化ログ出力
   - ハッシュサービス: パスワードハッシュ化

### DI Container構成

TSyringeを使用した依存性注入:

- `src/diContainer.ts`: Presentation層の依存性注入設定
- `src/layers/application/di/container.ts`: Application層サービス登録
- `src/layers/infrastructure/di/container.ts`: Infrastructure層サービス登録
- `src/layers/infrastructure/di/tokens.ts`: 依存性注入トークン定義
- `src/layers/infrastructure/di/resolver.ts`: サービス解決ヘルパー

### 🧪 包括的テスト戦略

#### 🚀 高品質テスト実装手法

**1. vitest-mock-extended によるタイプセーフな自動モック生成**

```typescript
// 自動モック生成パターン（推奨）- 実装済み
import {
  createAutoMockUserRepository,
  createAutoMockLogger,
  createAutoMockHashService,
  createAutoMockUserDomainService,
} from '@tests/utils/mocks/autoMocks';
import type { MockProxy } from 'vitest-mock-extended';

let mockUserRepository: MockProxy<IUserRepository>;
let mockLogger: MockProxy<ILogger>;
let mockHashService: MockProxy<IHashService>;

beforeEach(() => {
  // 🚀 自動モック生成（完全実装済み）
  mockUserRepository = createAutoMockUserRepository();
  mockLogger = createAutoMockLogger();
  mockHashService = createAutoMockHashService();
  
  // DIコンテナにモック登録（実装済みパターン）
  container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);
  container.registerInstance(INJECTION_TOKENS.HashService, mockHashService);
  
  // UseCaseインスタンスをDIコンテナから取得
  useCase = container.resolve(SignInUseCase);
});
```

**2. Result型パターン対応テスト実装**

```typescript
// Result型の型安全なテスト（実装済み高品質パターン）
import { isSuccess, isFailure } from '@/layers/application/types/Result';

// ✅ 成功ケーステスト
it('should successfully sign in user', async () => {
  const mockUser = User.create(new Email('john@example.com'), 'John Doe', 'hashed_password_123');
  mockUserRepository.findByEmail.mockResolvedValue(mockUser);
  mockHashService.compareHash.mockResolvedValue(true);

  const result = await signInUseCase.execute({ email: 'john@example.com', password: 'password123' });
  
  // 型安全なパターンマッチング
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data).toEqual({
      user: {
        id: mockUser.getId().toString(),
        name: mockUser.getName(),
        email: mockUser.getEmail().toString(),
      },
    });
  }
  
  // モック呼び出し確認（実装済み詳細パターン）
  expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.any(Email));
  expect(mockHashService.compareHash).toHaveBeenCalledWith('password123', mockUser.getPasswordHash());
  expect(mockLogger.info).toHaveBeenCalledWith('サインイン試行開始', { email: 'john@example.com' });
  expect(mockLogger.info).toHaveBeenCalledWith('サインイン成功', { userId: mockUser.getId().toString() });
});

// ❌ 失敗ケーステスト
it('should return failure when user not found', async () => {
  mockUserRepository.findByEmail.mockResolvedValue(null);
  
  const result = await signInUseCase.execute({ email: 'john@example.com', password: 'password123' });
  
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.message).toBe('メールアドレスまたはパスワードが正しくありません');
    expect(result.error.code).toBe('INVALID_CREDENTIALS');
  }
  
  expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(expect.any(Email));
  expect(mockHashService.compareHash).not.toHaveBeenCalled();
});

// 🚨 バリデーションエラーテスト
it('should return failure for invalid email format', async () => {
  const result = await signInUseCase.execute({ email: 'invalid-email', password: 'password123' });
  
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.message).toBe('メールアドレスの形式が正しくありません');
    expect(result.error.code).toBe('EMAIL_INVALID_FORMAT');
  }
  
  expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
});

// 🔧 インフラエラーテスト
it('should return failure when repository throws error', async () => {
  mockUserRepository.findByEmail.mockRejectedValue(new Error('Database connection failed'));
  
  const result = await signInUseCase.execute({ email: 'john@example.com', password: 'password123' });
  
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.message).toBe('サインイン処理中にエラーが発生しました');
    expect(result.error.code).toBe('UNEXPECTED_ERROR');
  }
});
```

**3. 包括的エラーケーステスト戦略**

```typescript
// 各UseCaseで必須実装するテストパターン
describe('ChangePasswordUseCase', () => {
  // ✅ 成功ケース
  it('should successfully change password', async () => { /* ... */ });
  
  // ❌ バリデーションエラー
  it('should return failure when current password is empty', async () => { /* ... */ });
  it('should return failure when new password is too short', async () => { /* ... */ });
  
  // ❌ ビジネスルールエラー  
  it('should return failure when user not found', async () => { /* ... */ });
  it('should return failure when current password is incorrect', async () => { /* ... */ });
  it('should return failure when new password is same as current', async () => { /* ... */ });
  
  // ❌ インフラストラクチャエラー
  it('should return failure when repository throws error', async () => { /* ... */ });
});
```

#### 📊 レイヤー別テスト責務分離

| レイヤー | テスト観点 | カバレッジ目標 | 重点実装パターン |
|---------|----------|-------------|-----------------|
| **Application** | ビジネスフロー・UseCase・Result型 | **94%以上** | エラーケース網羅・DomainError変換 |
| **Domain** | ビジネスルール・不変条件・Value Object | **90%以上** | 境界値・バリデーション・ドメインロジック |
| **Infrastructure** | 外部システム連携・Repository実装 | **85%以上** | モック設定・データ変換・エラーハンドリング |
| **Presentation** | Server Actions・UI状態管理 | **80%以上** | フォーム処理・エラー表示・ユーザビリティ |

#### 🔄 テスト自動化・継続的品質向上

**DI Container と自動セットアップ**

```typescript
import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';

describe('UseCase Tests', () => {
  // 🚀 テスト環境の自動セットアップ（DI Container リセット）
  setupTestEnvironment();

  beforeEach(() => {
    // DIコンテナにモックを自動登録
    container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);
    
    // UseCaseインスタンスをDIコンテナから取得
    useCase = container.resolve(ChangePasswordUseCase);
  });
});
```

**セキュリティ観点のテスト実装**

```typescript
// セキュリティテストパターン（必須）
it('should mask sensitive data in logs', async () => {
  await refreshTokenUseCase.execute({ refreshToken: 'sensitive_token' });
  
  // 機密情報のマスク確認
  expect(mockLogger.info).toHaveBeenCalledWith(
    'リフレッシュトークン処理開始',
    { refreshToken: '***' }
  );
  
  // 実際の値がログに出力されていないことを確認
  expect(mockLogger.info).not.toHaveBeenCalledWith(
    expect.anything(),
    { refreshToken: 'sensitive_token' }
  );
});

// 🛡️ E2Eセキュリティ監視テスト（実装済み）
test('サインインページでNextエラーが発生しないことを確認', async ({ page }) => {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  // コンソールエラー監視
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // ネットワークエラー監視
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()}: ${response.url()}`);
    }
  });

  await page.goto('/auth/sign-in');
  await page.waitForTimeout(3000);

  // クリティカルエラー検証
  const criticalErrors = consoleErrors.filter(error => 
    error.includes('JWT_SESSION_ERROR') ||
    error.includes('NEXTAUTH_SECRET') ||
    error.includes('decryption operation failed')
  );

  expect(criticalErrors).toHaveLength(0);
  expect(networkErrors.filter(error => error.startsWith('5'))).toHaveLength(0);
});
```

#### 🎯 品質保証・継続的改善

**高品質テスト実装の要点**

- **Result型統一**: 全UseCaseでの型安全なエラーハンドリング実装
- **自動モック**: vitest-mock-extendedによる効率的なテスト実装
- **エラーケース網羅**: 成功・バリデーション・ビジネスルール・インフラエラーの包括的テスト
- **セキュリティ観点**: 機密情報マスク等のセキュリティテスト実装

### 重要な設計原則

1. **Server Components優先**: Client Componentsは最小限に抑制
2. **Server Actions中心**: フォーム処理とユーザー入力の統一的な処理
3. **Result型パターン**: 例外処理を排除し型安全なエラーハンドリング統一
4. **レイヤー責務分離**: Clean Architecture + DDDによる明確な境界
5. **依存性注入**: TSyringeによるテスタブルな設計
6. **自動モックテスト**: vitest-mock-extendedによる効率的なテスト
7. **構造化ログ**: デバッグと監視のための包括的ログ出力
8. **shadcn/ui統合**: Enhanced Components、Bridge System、デュアル変数システムによるモダンUI
9. **段階的移行**: Bridge Systemによる既存システムとの完全互換性
10. **テーマシステム統一**: HSL/HEX変数のハイブリッドシステム

### エラーハンドリング戦略

**統一的なResult型パターン**により、以下を実現：

- **型安全性**: コンパイル時のエラー処理漏れ防止
- **一貫性**: 全UseCaseで統一されたエラーレスポンス
- **テスタビリティ**: エラーケースの網羅的なテスト
- **保守性**: エラー分類の明確化（Domain/Validation/Infrastructure）

### shadcn/ui統合による開発体験向上

**🚀 実現された品質向上**

- **統合開発体験**: Enhanced Componentsによる既存機能とshadcn/ui標準機能の融合
- **段階的移行**: Bridge Systemによる無理のない移行プロセス
- **テーマ統一**: HSL/HEX変数ハイブリッドシステムによる柔軟なスタイリング
- **Form統合**: react-hook-form + zod + shadcn/ui Formの完全統合
- **開発効率**: タイプセーフなコンポーネント設計による開発速度向上
- **保守性**: 明確なnamespace分離による長期保守性確保

## 🔄 事前読み込み必須：タスク別ドキュメント参照システム

### 📖 実行前必読指示

以下の開発タスクを実行する際は、**必ず対応するドキュメントを事前に読み込んでから**実装を開始してください。

---

### 🏗️ アーキテクチャ・設計理解

#### プロジェクト全体理解

**必読順序：**

1. **`_DOCS/guides/ddd/layers/layer.md`** - レイヤードアーキテクチャ全体ガイド
2. **`_DOCS/architecture-overview.md`** - プロジェクト全体のアーキテクチャ詳細
3. **`_DOCS/guides/ddd/concepts/clean-architecture.md`** - クリーンアーキテクチャ概念解説
4. **`_DOCS/guides/ddd/concepts/domain-driven-design.md`** - DDD概念・理論

#### DI・依存性注入理解

**必読順序：**

1. **`_DOCS/guides/ddd/concepts/whats-di.md`** - 依存性注入の概念・メリット
2. **`_DOCS/dependency-injection.md`** - DI設定・サービス取得方法・分離コンテナ設計
3. **`_DOCS/guides/ddd/layers/components/di-container.md`** - DIコンテナ設定詳細

---

### 🎨 UI・フロントエンド開発

#### 📋 コンポーネント作成・UI実装時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/presentation-layer.md`** - プレゼンテーション層全体ガイド
2. **`_DOCS/guides/ddd/layers/presentation/presentation.md`** - Presentation Layer詳細概要
3. **`_DOCS/guides/frontend-best-practices.md`** - フロントエンド開発ベストプラクティス
4. **`_DOCS/guides/theme-system.md`** - テーマカラーシステム・統一デザインガイド
5. **`_DOCS/guides/nextjs-integration-patterns.md`** - Next.js統合パターン

#### 📝 Server Actions実装時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/components/server-actions.md`** - Server Actions実装パターン
2. **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング戦略
3. **`_DOCS/guides/ddd/layers/presentation-layer.md`** - プレゼンテーション層ガイド

#### 🎨 テーマカラー実装パターン

**統一されたテーマカラーシステム採用** - 全コンポーネントでCSS変数を使用した一貫したデザイン実現

```typescript
// ✅ 推奨：テーマ変数を使用したコンポーネント実装
const variantClasses = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)]',
  secondary: 'bg-[var(--surface-600)] hover:bg-[var(--surface-700)] text-[var(--text-inverse)]',
  success: 'bg-[var(--success)] hover:bg-[var(--success-hover)] text-[var(--text-inverse)]',
  error: 'bg-[var(--error)] hover:bg-[var(--error-hover)] text-[var(--text-inverse)]',
};

// ✅ グラデーション効果（ブランドカラー統一）
const gradientClasses = {
  brand: 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]',
  brandHover: 'hover:from-[var(--primary-hover)] hover:to-[var(--secondary-hover)]',
};

// ✅ ダークモード完全対応の実装例
<Card className="bg-[var(--surface)] border border-[var(--border)] shadow-lg">
  <div className="bg-[var(--surface-50)] text-[var(--text-primary)]">
    {/* ダークモードで自動的に適切な色に切り替わる */}
  </div>
</Card>
```

**必須確認事項：**

- CSS変数は `bg-[var(--primary)]` 形式で使用
- グラデーションはブランドカラー（プライマリ・セカンダリ）で統一
- ステート色（success/error/warning/info）を適切に使い分け
- ダークモード対応のため、ハードコードされた色は使用禁止

**詳細情報：** `_DOCS/guides/theme-system.md`

#### 🧩 shadcn/ui統合開発時

**実行前必読：**

1. **`_DOCS/guides/theme-system.md`** - shadcn/ui統合テーマシステム v2.0
2. **`_DOCS/guides/frontend-best-practices.md`** - shadcn/ui統合ベストプラクティス
3. **`shadcn-ui-migration-plan.md`** - shadcn/ui移行計画詳細
4. **`_DOCS/guides/nextjs-integration-patterns.md`** - Next.js + shadcn/ui統合パターン

**Enhanced Components使用パターン：**

```typescript
// ✅ 推奨：Bridge System経由での統合使用
import { Button, Card, Alert, Dialog, Form } from '@/components/ui-bridge';

// ✅ Enhanced Button（既存機能 + shadcn/ui標準機能）
<Button 
  variant="primary"          // 既存システム
  gradient={true}            // 既存システム機能
  loading={isLoading}        // 既存システム機能
  size="lg"                  // shadcn/ui標準
>
  統合ボタン
</Button>

// ✅ shadcn/ui標準variants活用
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>

// ✅ Enhanced Card（Compound Pattern + shadcn/ui互換）
<Card variant="elevated" padding="lg">
  <Card.Header>
    <h2>タイトル</h2>
  </Card.Header>
  <Card.Content>
    <p>コンテンツ</p>
  </Card.Content>
</Card>

// ✅ Form統合パターン（react-hook-form + zod + shadcn/ui）
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>メールアドレス</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

**テーマ変数使い分けガイド：**

```typescript
// ✅ shadcn/ui標準（HSL変数）- 新規実装推奨
<div className="bg-primary text-primary-foreground">
  shadcn/ui標準スタイリング
</div>

// ✅ 既存システム（HEX変数）- 互換性維持・グラデーション用
<div className="bg-[var(--primary)] text-[var(--text-inverse)]">
  既存システム互換
</div>

// ✅ グラデーション効果（HEX変数推奨）
<div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
  ブランドグラデーション
</div>
```

**必須確認事項：**

- Bridge System経由でのコンポーネント使用を優先
- Enhanced Componentsの既存機能（gradient、loading、Compound Pattern）活用
- shadcn/ui標準variantsとの併用による機能拡張
- HSL/HEX変数の適切な使い分け
- Form統合パターン（react-hook-form + zod + shadcn/ui）の活用

---

### 📋 ビジネスロジック・UseCase開発

#### 🎯 新しいUseCase作成時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/application-layer.md`** - アプリケーション層全体ガイド
2. **`_DOCS/guides/ddd/layers/application/application.md`** - Application Layer詳細概要
3. **`_DOCS/guides/ddd/layers/components/use-cases.md`** - UseCaseの詳細実装パターン
4. **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング戦略

#### 🔄 トランザクション・複数操作管理時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/application-layer.md`** - トランザクション管理含む
2. **`_DOCS/guides/ddd/layers/components/use-cases.md`** - UseCase実装パターン
3. **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング

---

### 👑 ドメインモデル開発

#### 🏛️ Entity作成・更新時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/domain-layer.md`** - ドメイン層全体ガイド
2. **`_DOCS/guides/ddd/layers/domain/domain.md`** - Domain Layer詳細概要
3. **`_DOCS/guides/ddd/layers/components/entities.md`** - Entityの詳細実装パターン
4. **`_DOCS/guides/ddd/concepts/domain-driven-design.md`** - DDD理論

#### 💎 Value Object作成・更新時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/domain-layer.md`** - ドメイン層ガイド
2. **`_DOCS/guides/ddd/layers/components/value-objects.md`** - Value Objectの詳細実装
3. **`_DOCS/guides/ddd/concepts/domain-driven-design.md`** - DDD概念理解

#### 🔧 Domain Service作成時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/domain-layer.md`** - ドメイン層ガイド
2. **`_DOCS/guides/ddd/layers/domain/domain.md`** - Domain Layer詳細
3. **`_DOCS/guides/ddd/concepts/domain-driven-design.md`** - DDD理論

---

### 🔧 インフラストラクチャ開発

#### 🗃️ Repository実装時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/infrastructure-layer.md`** - インフラ層全体ガイド
2. **`_DOCS/guides/ddd/layers/infrastructure/infrastructure.md`** - Infrastructure Layer詳細概要
3. **`_DOCS/guides/ddd/layers/components/repository-implementations.md`** - Repository実装パターン
4. **`_DOCS/guides/ddd/layers/components/repository-interfaces.md`** - Repository Interface設計

#### 🌐 外部サービス連携実装時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/infrastructure-layer.md`** - インフラ層ガイド
2. **`_DOCS/guides/ddd/layers/components/external-services.md`** - 外部サービス実装詳細ガイド
3. **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング戦略

#### ⚙️ 設定・環境管理実装時

**実行前必読：**

1. **`_DOCS/guides/ddd/layers/infrastructure-layer.md`** - インフラ層ガイド
2. **`_DOCS/guides/ddd/layers/components/configuration-management.md`** - 設定・環境管理詳細ガイド
3. **`_DOCS/guides/ddd/cross-cutting/security.md`** - セキュリティ実装

---

### 🧪 テスト開発

#### 🎯 単体テスト作成時

**実行前必読：**

1. **`_DOCS/testing-strategy.md`** - テスト戦略・vitest-mock-extended使用法
2. **`_DOCS/guides/testing-with-clean-architecture.md`** - クリーンアーキテクチャでのテスト手法
3. 対象レイヤーの実装ガイド（例：Domain Layer なら `domain-layer.md`）

#### 🔗 統合テスト作成時

**実行前必読：**

1. **`_DOCS/testing-strategy.md`** - テスト戦略全体
2. **`_DOCS/guides/testing-with-clean-architecture.md`** - テスト手法
3. **`_DOCS/guides/ddd/layers/application-layer.md`** - Application Layer（統合テストの中心）

#### 🎬 E2Eテスト作成・改善時

**実行前必読：**

1. **`_DOCS/guides/e2e-testing-guide.md`** - E2Eテスト実践ガイド・グラフィカル表示モード
2. **`_DOCS/testing-strategy.md`** - テスト戦略全体・Playwright設定
3. **`_DOCS/guides/frontend-best-practices.md`** - フロントエンド・UI実装パターン

#### 📊 カバレッジドリブンテスト開発

**カバレッジ分析による品質改善プロセス：**

**Step 1: カバレッジ現状分析**

```bash
# プロジェクト全体のカバレッジ分析
pnpm test:coverage --reporter=text-summary

# 低カバレッジファイルの特定
pnpm test:coverage --reporter=text | grep -E "^.*\.(ts|tsx).*[0-9]+\.[0-9]+%.*$" | sort -k4 -n
```

**Step 2: 優先度判定と対象特定**

```text
🔥 Critical (50%未満)
  ├─ UseCase・重要ビジネスロジック: 最優先対応
  ├─ Value Object・Entity: 高優先対応
  └─ Repository・Services: 中優先対応

⚠️ Warning (50-70%)
  ├─ 複雑な条件分岐: テストケース追加
  ├─ エラーハンドリング: 例外ケース追加
  └─ 境界値処理: エッジケーステスト

📝 Note (70-85%)
  └─ 網羅性確認: 未テストパスの検証
```

**Step 3: 高品質テスト実装**

```typescript
// カバレッジ向上のための包括的テストパターン
describe('UseCase Coverage Analysis', () => {
  // 🎯 Target: 95%+ Coverage
  
  // 成功パス（1ケース）
  it('should successfully change password', async () => { /* ... */ });
  
  // バリデーションエラー（3ケース）
  it('should return failure when current password is empty', async () => { /* ... */ });
  it('should return failure when new password is empty', async () => { /* ... */ });
  it('should return failure when new password is too short', async () => { /* ... */ });
  
  // ビジネスルールエラー（3ケース）
  it('should return failure when user not found', async () => { /* ... */ });
  it('should return failure when current password is incorrect', async () => { /* ... */ });
  it('should return failure when new password is same as current', async () => { /* ... */ });
  
  // インフラストラクチャエラー（1ケース）
  it('should return failure when repository throws error', async () => { /* ... */ });
  
  // エッジケース（1ケース）
  it('should return failure when user not found with valid userId format', async () => { /* ... */ });
});
```

**Step 4: カバレッジ検証・品質確認**

```bash
# 特定ファイルのカバレッジ詳細確認
pnpm test:unit --coverage -- YourUseCase.test.ts

# HTMLレポートで視覚的確認
pnpm test:coverage --reporter=html
open coverage/index.html

# 目標達成確認
pnpm test:coverage --threshold-statements=95 --threshold-functions=95
```

#### 🚀 高効率テスト実装戦略

**vitest-mock-extended を活用した効率化**

```typescript
// 🚀 自動モック生成による高速テスト実装
import { 
  createAutoMockUserRepository,
  createAutoMockLogger,
  createAutoMockHashService 
} from '@tests/utils/mocks/autoMocks';

beforeEach(() => {
  // 完全にタイプセーフなモック生成（手動設定不要）
  mockUserRepository = createAutoMockUserRepository();
  mockLogger = createAutoMockLogger();
  mockHashService = createAutoMockHashService();
  
  // DIコンテナにモック登録（自動化）
  container.registerInstance(INJECTION_TOKENS.UserRepository, mockUserRepository);
  container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);
  container.registerInstance(INJECTION_TOKENS.HashService, mockHashService);
});
```

**Result型対応の効率的テストパターン**

```typescript
// 🎯 Result型テストヘルパー活用
import { isSuccess, isFailure } from '@/layers/application/types/Result';

// 成功ケースの標準テストパターン
const testSuccessCase = async (input: any, expectedData: any) => {
  const result = await useCase.execute(input);
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data).toEqual(expectedData);
  }
};

// 失敗ケースの標準テストパターン
const testFailureCase = async (input: any, expectedMessage: string, expectedCode: string) => {
  const result = await useCase.execute(input);
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.message).toBe(expectedMessage);
    expect(result.error.code).toBe(expectedCode);
  }
};
```

---

### 🚨 問題解決・トラブルシューティング

#### 🐛 バグ修正・エラー解決時

**問題カテゴリ別必読：**

**📧 Email関連問題：**

1. **`_DOCS/troubleshootings/email-validation-issues.md`** - Email Value Objectバリデーション問題

**⏰ Entity・タイムスタンプ問題：**

1. **`_DOCS/troubleshootings/entity-timestamp-comparison.md`** - Entityタイムスタンプ比較問題

**🗃️ Prisma・Database関連問題：**

1. **`_DOCS/troubleshootings/prisma-mock-setup.md`** - Prisma Repositoryモック設定問題

**🎯 UseCase・バリデーション問題：**

1. **`_DOCS/troubleshootings/usecase-validation-logic.md`** - UseCaseバリデーションロジック問題

**🧪 テスト・Mock問題：**

1. **`_DOCS/troubleshootings/vitest-mock-extended-setup.md`** - vitest-mock-extended設定問題

**🎨 Mermaid図・ドキュメント問題：**

1. **`_DOCS/troubleshootings/mermaid-special-characters.md`** - Mermaid特殊文字エスケープ問題

---

### ♻️ リファクタリング・改善

#### 🔄 コード品質改善時

**実行前必読：**

1. **`_DOCS/guides/coding-standards.md`** - コーディング規約・命名規則
2. 対象レイヤーの実装ガイド
3. **`_DOCS/dependency-injection.md`** - DI設定確認

#### 🏗️ アーキテクチャ改善時

**実行前必読：**

1. **`_DOCS/guides/ddd/concepts/architecture-comparison.md`** - 他アーキテクチャとの比較
2. **`_DOCS/guides/project-architecture-decisions.md`** - プロジェクト設計判断・選択理由
3. **`_DOCS/guides/ddd/layers/layer.md`** - レイヤードアーキテクチャ理解

---

### 📚 包括的ドキュメント一覧

#### 🏗️ 基盤・概念理解

- **`_DOCS/guides/ddd/layers/layer.md`** - レイヤードアーキテクチャ全体ガイド
- **`_DOCS/architecture-overview.md`** - プロジェクト全体のアーキテクチャ理解
- **`_DOCS/dependency-injection.md`** - DI設定・サービス取得方法・分離コンテナ設計
- **`_DOCS/project-structure.md`** - ディレクトリ構成・技術スタック確認

#### 🛠️ 開発・実装ガイド

- **`_DOCS/development-guide.md`** - 新機能開発手順・ベストプラクティス
- **`_DOCS/testing-strategy.md`** - テスト戦略・vitest-mock-extended使用法
- **`_DOCS/guides/e2e-testing-guide.md`** - E2Eテスト実践ガイド・グラフィカル表示モード
- **`_DOCS/deployment-guide.md`** - デプロイ・本番運用ガイド

#### 🧠 DDD（ドメイン駆動設計）概念

- **`_DOCS/guides/ddd/concepts/domain-driven-design.md`** - DDD概念・理論・プロジェクトでの価値
- **`_DOCS/guides/ddd/concepts/clean-architecture.md`** - クリーンアーキテクチャ概念解説
- **`_DOCS/guides/ddd/concepts/architecture-comparison.md`** - 他アーキテクチャとの比較
- **`_DOCS/guides/ddd/concepts/whats-di.md`** - 依存性注入の概念・メリット

#### 📋 レイヤー別実装ガイド

**レイヤー概要：**

- **`_DOCS/guides/ddd/layers/presentation/presentation.md`** - Presentation Layer詳細概要
- **`_DOCS/guides/ddd/layers/application/application.md`** - Application Layer詳細概要
- **`_DOCS/guides/ddd/layers/domain/domain.md`** - Domain Layer詳細概要
- **`_DOCS/guides/ddd/layers/infrastructure/infrastructure.md`** - Infrastructure Layer詳細概要

**レイヤー実装ガイド：**

- **`_DOCS/guides/ddd/layers/presentation-layer.md`** - プレゼンテーション層：UI・Server Actions
- **`_DOCS/guides/ddd/layers/application-layer.md`** - アプリケーション層：UseCase・DTO・トランザクション管理
- **`_DOCS/guides/ddd/layers/domain-layer.md`** - ドメイン層：Entity・Value Object・Domain Service実装
- **`_DOCS/guides/ddd/layers/infrastructure-layer.md`** - インフラ層：Repository実装・外部サービス

#### 🔧 コンポーネント別詳細ガイド

- **`_DOCS/guides/ddd/layers/components/entities.md`** - Entityの詳細実装パターン
- **`_DOCS/guides/ddd/layers/components/value-objects.md`** - Value Objectの詳細実装
- **`_DOCS/guides/ddd/layers/components/use-cases.md`** - UseCaseの詳細実装パターン
- **`_DOCS/guides/ddd/layers/components/repository-interfaces.md`** - Repository Interface設計
- **`_DOCS/guides/ddd/layers/components/repository-implementations.md`** - Repository実装パターン
- **`_DOCS/guides/ddd/layers/components/server-actions.md`** - Server Actions実装パターン
- **`_DOCS/guides/ddd/layers/components/di-container.md`** - DIコンテナ設定詳細
- **`_DOCS/guides/ddd/layers/components/external-services.md`** - 外部サービス実装詳細ガイド
- **`_DOCS/guides/ddd/layers/components/configuration-management.md`** - 設定・環境管理詳細ガイド

#### 🚨 横断的関心事（Cross-Cutting Concerns）

- **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング戦略・全レイヤー対応
- **`_DOCS/guides/ddd/cross-cutting/logging-strategy.md`** - ログ出力戦略・構造化ログ
- **`_DOCS/guides/ddd/cross-cutting/security.md`** - セキュリティ実装・認証認可

#### 🔍 トラブルシューティング

- **`_DOCS/troubleshootings/email-validation-issues.md`** - Email Value Objectバリデーション問題
- **`_DOCS/troubleshootings/entity-timestamp-comparison.md`** - Entityタイムスタンプ比較問題
- **`_DOCS/troubleshootings/prisma-mock-setup.md`** - Prisma Repositoryモック設定問題
- **`_DOCS/troubleshootings/usecase-validation-logic.md`** - UseCaseバリデーションロジック問題
- **`_DOCS/troubleshootings/vitest-mock-extended-setup.md`** - vitest-mock-extended設定問題
- **`_DOCS/troubleshootings/mermaid-special-characters.md`** - Mermaid特殊文字エスケープ問題

#### ⭐ Best Practices・パターン集

- **`_DOCS/guides/coding-standards.md`** - コーディング規約・命名規則
- **`_DOCS/guides/frontend-best-practices.md`** - フロントエンド開発ベストプラクティス
- **`_DOCS/guides/theme-system.md`** - テーマカラーシステム・統一デザインガイド
- **`_DOCS/guides/nextjs-integration-patterns.md`** - Next.js統合パターン
- **`_DOCS/guides/testing-with-clean-architecture.md`** - クリーンアーキテクチャでのテスト手法
- **`_DOCS/guides/project-architecture-decisions.md`** - プロジェクト設計判断・選択理由

---

## 🎯 実践的開発シナリオ例

### 🌟 シナリオ1：新しいユーザー管理機能の追加

**タスク：** ユーザーのプロフィール画像アップロード機能を追加

**実行手順：**

1. **📖 事前読み込み（必須）**

   ```
   a. _DOCS/guides/ddd/layers/layer.md - アーキテクチャ全体理解
   b. _DOCS/guides/ddd/layers/domain-layer.md - Entity拡張方法
   c. _DOCS/guides/ddd/layers/components/entities.md - Entity実装詳細
   d. _DOCS/guides/ddd/layers/application-layer.md - UseCase実装方法
   e. _DOCS/guides/ddd/layers/components/use-cases.md - UseCase詳細パターン
   f. _DOCS/guides/ddd/layers/components/external-services.md - ファイルアップロード実装
   ```

2. **🏛️ Domain Layer実装**

   ```typescript
   // User Entityに画像URL Value Objectを追加
   // _DOCS/guides/ddd/layers/components/entities.md を参照
   ```

3. **📋 Application Layer実装**

   ```typescript
   // UploadUserAvatarUseCase を作成
   // _DOCS/guides/ddd/layers/components/use-cases.md を参照
   ```

4. **🔧 Infrastructure Layer実装**

   ```typescript
   // FileStorageService の実装
   // _DOCS/guides/ddd/layers/components/external-services.md を参照
   ```

5. **🎨 Presentation Layer実装**

   ```typescript
   // Server Action と UI コンポーネント
   // _DOCS/guides/ddd/layers/components/server-actions.md を参照
   ```

6. **🧪 テスト実装**

   ```typescript
   // 各層のテスト実装
   // _DOCS/testing-strategy.md を参照
   ```

### 🔄 シナリオ2：既存機能の修正・拡張

**タスク：** ユーザーレベルアップ通知機能の不具合修正

**実行手順：**

1. **📖 問題特定のための事前読み込み**

   ```
   a. _DOCS/troubleshootings/ - 関連するトラブルシューティング確認
   b. _DOCS/guides/ddd/cross-cutting/error-handling.md - エラー処理確認
   c. 対象レイヤーの実装ガイド確認
   ```

2. **🔍 デバッグ・原因特定**

   ```typescript
   // 該当するLayer特有のデバッグ手法を適用
   // _DOCS/guides/ddd/layers/[target-layer].md を参照
   ```

3. **🛠️ 修正実装**

   ```typescript
   // アーキテクチャに準拠した修正実装
   // 適切なLayer責務に基づく修正
   ```

### 🏗️ シナリオ3：アーキテクチャ改善・リファクタリング

**タスク：** レガシーコードのクリーンアーキテクチャ準拠への変更

**実行手順：**

1. **📖 アーキテクチャ理解のための事前読み込み**

   ```
   a. _DOCS/guides/ddd/concepts/architecture-comparison.md
   b. _DOCS/guides/project-architecture-decisions.md
   c. _DOCS/guides/coding-standards.md
   d. _DOCS/dependency-injection.md
   ```

2. **📋 現状分析と改善計画策定**

3. **🔄 段階的リファクタリング実行**

---

## 🚨 エラーリカバリー・トラブル解決システム

### ⚡ 緊急事態対応

#### 🔥 Critical Error（本番影響大）

**即座に確認すべきドキュメント順序：**

1. **`_DOCS/guides/ddd/cross-cutting/error-handling.md`** - エラーハンドリング戦略
2. **`_DOCS/troubleshootings/`** - 関連トラブルシューティング全体確認
3. **`_DOCS/guides/ddd/cross-cutting/logging-strategy.md`** - ログ分析方法
4. **該当レイヤーの実装ガイド** - 責務確認と適切な修正方針

#### ⚠️ Development Error（開発中の問題）

**段階的確認手順：**

1. **問題カテゴリの特定** → 対応するトラブルシューティングドキュメント確認
2. **アーキテクチャ違反の確認** → 該当レイヤーの実装ガイド確認
3. **依存性注入問題** → `_DOCS/dependency-injection.md` 確認
4. **テスト関連問題** → `_DOCS/testing-strategy.md` 確認

### 🎓 学習・教育リソース組み合わせ

#### 初心者向け学習パス

**Week 1: 基礎理解**

```
1. _DOCS/guides/ddd/layers/layer.md
2. _DOCS/architecture-overview.md
3. _DOCS/guides/ddd/concepts/clean-architecture.md
4. _DOCS/guides/ddd/concepts/domain-driven-design.md
```

**Week 2: 実装理解**

```
1. _DOCS/guides/ddd/concepts/whats-di.md
2. _DOCS/dependency-injection.md
3. 各レイヤー実装ガイド順次確認
4. _DOCS/testing-strategy.md
```

**Week 3: 実践**

```
1. 簡単なEntity実装
2. 基本的なUseCase実装
3. Repository Interface定義
4. テスト実装
```

#### 上級者向け深掘りパス

```
1. _DOCS/guides/ddd/concepts/architecture-comparison.md
2. _DOCS/guides/project-architecture-decisions.md
3. 横断的関心事ドキュメント全確認
4. コンポーネント別詳細ガイド全確認
```

---

## ⚠️ 絶対遵守ルール：実装時の必須確認事項

### 🎯 実装前チェックシステム

**任意のコード実装開始前に、以下を必ず確認してください：**

#### Step 1: 📖 適切なドキュメント事前読み込み完了

#### Step 2: 🏗️ アーキテクチャ準拠性確認

#### Step 3: 🔧 実装ルール遵守確認

#### Step 4: ✅ チェックリスト完了確認

---

### 🔧 核心実装ルール

#### 🔄 DI（依存性注入）関連 - 必読：`_DOCS/dependency-injection.md`

**事前確認必須ドキュメント：**

```text
_DOCS/guides/ddd/concepts/whats-di.md
_DOCS/dependency-injection.md  
_DOCS/guides/ddd/layers/components/di-container.md
```

**厳守ルール：**

- **サービス層**: コンストラクター注入（`@inject`）必須
- **Server Action/Component**: `resolve()` 関数使用OK  
- **DIトークン追加**: `tokens.ts`への型定義とインポート必須
- **分離コンテナ**: 適切な層のコンテナファイルに登録

#### 📁 モジュール・インポートルール - 必読：`_DOCS/guides/coding-standards.md`

**事前確認必須ドキュメント：**

```text
_DOCS/guides/coding-standards.md
_DOCS/guides/frontend-best-practices.md
```

**厳守ルール：**

- **index.ts ファイル作成禁止**: 個別インポート優先、`@/components/ui`等のindex.ts作成不可
- **個別インポート必須**: `import { Button } from '@/components/ui/Button'` 形式を使用
- **相対参照禁止**: `./` `../` 使用不可
- **alias参照必須**: `@/*` 使用（テストファイルでも同様）
- **テスト用**: `@tests/*` はテストユーティリティのみ

**具体例：**

```typescript
// ✅ 推奨：個別インポート
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// ❌ 禁止：index.ts経由のインポート
import { Button, Input, Card } from '@/components/ui';

// ❌ 禁止：相対パス
import { Button } from '../../ui/Button';
```

#### 🧪 テスト実装 - 必読：`_DOCS/testing-strategy.md`

**事前確認必須ドキュメント：**

```text
_DOCS/testing-strategy.md
_DOCS/guides/testing-with-clean-architecture.md
_DOCS/troubleshootings/vitest-mock-extended-setup.md
```

**厳守ルール：**

- **vitest-mock-extended必須**: 新規テストは自動モック使用
- **手動モック禁止**: 新規作成時は自動モック推奨
- **テスト環境**: `setupTestEnvironment()` でコンテナリセット

#### 🚨 エラーハンドリング - 必読：`_DOCS/guides/ddd/cross-cutting/error-handling.md`

**事前確認必須ドキュメント：**

```text
_DOCS/guides/ddd/cross-cutting/error-handling.md
_DOCS/guides/ddd/layers/application-layer.md
_DOCS/guides/ddd/layers/components/use-cases.md
```

**厳守ルール：**

- **Result型パターン必須**: 全UseCaseは`Promise<Result<T>>`を返却
- **例外処理禁止**: UseCase内での例外スローは禁止、Result型で統一
- **Domain Error**: ビジネスルール違反（DomainErrorをResult型に変換）
- **Validation Error**: 入力値検証エラー（ValidationErrorをResult型に変換）
- **Infrastructure Error**: 外部システム・技術的エラー（適切なエラーコードで返却）
- **成功・失敗判定**: `isSuccess/isFailure`ヘルパー使用必須

#### 🔄 Result型パターン実装 - 必読：`_DOCS/guides/ddd/cross-cutting/error-handling.md`

**必須インポート：**

```typescript
import { Result, success, failure, isSuccess, isFailure } from '@/layers/application/types/Result';
import { DomainError } from '@/layers/domain/errors/DomainError';
```

**厳守ルール：**

- **UseCase戻り値**: 必ず`Promise<Result<ResponseDTO>>`型
- **成功時**: `success(data)`で値を返却
- **失敗時**: `failure(message, code)`でエラー返却
- **DomainError変換**: `catch`節でDomainErrorを適切なResult型に変換
- **パターンマッチング**: Server Actionでは`isSuccess/isFailure`で判定
- **ログ出力**: エラー情報の構造化ログ出力必須

---

## 🚀 実装チェックリスト：必須確認システム

### 🔧 新しいサービス作成時

**事前必読：**

```text
_DOCS/dependency-injection.md
該当レイヤーの実装ガイド
_DOCS/guides/ddd/layers/components/di-container.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] `@injectable()` デコレータ追加
- [ ] `tokens.ts` にトークンと型定義追加
- [ ] 適切なコンテナファイルに登録
- [ ] インターフェース定義（必要に応じて）
- [ ] テストファイル作成（vitest-mock-extended使用）
- [ ] アーキテクチャ準拠性確認

### 🎯 新しいUseCase作成時

**事前必読：**

```text
_DOCS/guides/ddd/layers/application-layer.md
_DOCS/guides/ddd/layers/application/application.md
_DOCS/guides/ddd/layers/components/use-cases.md
_DOCS/guides/ddd/cross-cutting/error-handling.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] Application Layerに配置
- [ ] Request/Response DTO定義
- [ ] **Result型戻り値**: `Promise<Result<ResponseDTO>>`で定義
- [ ] **success/failure使用**: 適切な成功・失敗レスポンス実装
- [ ] **DomainError処理**: catch節でのDomainError → Result変換
- [ ] **構造化ログ出力**: 成功・失敗・エラーの詳細ログ実装
- [ ] トランザクション管理（必要に応じて）
- [ ] 依存性注入設定（`@injectable()`、コンストラクタ注入）
- [ ] **Result型対応テスト**: `isSuccess/isFailure`でのテスト実装

### 🏛️ 新しいDomain Object作成時

**事前必読：**

```text
_DOCS/guides/ddd/layers/domain-layer.md
_DOCS/guides/ddd/layers/domain/domain.md
_DOCS/guides/ddd/layers/components/entities.md (Entity作成時)
_DOCS/guides/ddd/layers/components/value-objects.md (Value Object作成時)
_DOCS/guides/ddd/concepts/domain-driven-design.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] Entity または Value Object の適切な選択
- [ ] 不変条件の検証実装
- [ ] ビジネスロジックの実装
- [ ] フレームワーク非依存性確認
- [ ] ドメインイベント発行（必要に応じて）
- [ ] 包括的なテストケース作成

### 🗃️ 新しいRepository作成時

**事前必読：**

```text
_DOCS/guides/ddd/layers/infrastructure-layer.md
_DOCS/guides/ddd/layers/infrastructure/infrastructure.md
_DOCS/guides/ddd/layers/components/repository-interfaces.md
_DOCS/guides/ddd/layers/components/repository-implementations.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] Interface定義（Domain Layer）
- [ ] 実装クラス作成（Infrastructure Layer）
- [ ] ドメインオブジェクト変換実装
- [ ] エラーハンドリング実装
- [ ] 依存性注入設定
- [ ] モック対応テスト作成
- [ ] 適切なレイヤー配置確認

### 🎨 新しいUI Component/Server Action作成時

**事前必読：**

```text
_DOCS/guides/ddd/layers/presentation-layer.md
_DOCS/guides/ddd/layers/presentation/presentation.md
_DOCS/guides/ddd/layers/components/server-actions.md
_DOCS/guides/frontend-best-practices.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] Presentation Layer適切配置
- [ ] Server Actions実装パターン準拠
- [ ] エラーハンドリング実装
- [ ] フォームバリデーション実装
- [ ] UI状態管理適切実装
- [ ] アクセシビリティ考慮

### 🌐 新しい外部サービス連携実装時

**事前必読：**

```text
_DOCS/guides/ddd/layers/infrastructure-layer.md
_DOCS/guides/ddd/layers/components/external-services.md
_DOCS/guides/ddd/layers/components/configuration-management.md
_DOCS/guides/ddd/cross-cutting/error-handling.md
_DOCS/guides/ddd/cross-cutting/security.md
```

**実装チェックリスト：**

- [ ] 📖 事前ドキュメント読み込み完了
- [ ] Domain Interface実装
- [ ] 適切なエラーハンドリング実装
- [ ] Circuit Breaker/Retry Pattern検討
- [ ] 設定値外部注入実装
- [ ] セキュリティ考慮事項確認
- [ ] 統合テスト実装

---

## 🎓 最終確認：品質保証システム

### ✅ 実装完了前の最終チェック

**すべての実装完了後、以下を必ず実行：**

1. **📋 アーキテクチャ準拠性確認**

   ```bash
   # 依存関係の方向性確認
   # 各レイヤーの責務遵守確認
   # DIP（依存性逆転の原則）準拠確認
   ```

2. **🧪 テスト実行・品質確認**

   ```bash
   pnpm test:unit      # 単体テスト実行（Result型パターン対応）
   pnpm test:coverage  # カバレッジ確認
   pnpm lint          # Lint チェック
   pnpm type-check    # 型チェック（Result型の型安全性確認）
   ```

3. **📊 カバレッジ品質要件確認**

   ```bash
   # レイヤー別カバレッジ詳細確認
   pnpm test:coverage --reporter=text-summary
   
   # カバレッジ閾値チェック（必須）
   pnpm test:coverage --threshold=85 --threshold-statements=85 --threshold-functions=85
   
   # 重要ファイルの個別確認
   pnpm test:unit --coverage -- "**/*UseCase*.test.ts"
   pnpm test:unit --coverage -- "**/*Entity*.test.ts"
   pnpm test:unit --coverage -- "**/*ValueObject*.test.ts"
   ```

   **📋 カバレッジ品質チェックリスト：**

   ```text
   ✅ Application Layer (UseCases): 94%以上
     ├─ 各UseCaseで7-10個のテストケース実装確認
     ├─ 成功・失敗・エラーケースの網羅性確認
     └─ Result型パターンでの型安全なテスト実装確認
   
   ✅ Domain Layer: 90%以上
     ├─ Entity・Value Objectの不変条件テスト確認
     ├─ ビジネスルール・バリデーションの境界値テスト確認
     └─ ドメインロジックの包括的テスト確認
   
   ✅ Infrastructure Layer: 85%以上
     ├─ Repository実装のモックテスト確認
     ├─ 外部サービス連携のエラーハンドリング確認
     └─ データ変換・設定管理の適切なテスト確認
   
   ✅ 特定パターンの品質確認
     ├─ vitest-mock-extended使用による自動モック実装確認
     ├─ セキュリティ観点のテスト（機密情報マスク等）確認
     └─ DI Container・テスト環境自動セットアップ確認
   ```

4. **🔄 Result型パターン品質確認**

   ```text
   - 全UseCaseがResult<T>型を返却することを確認
   - isSuccess/isFailureでのパターンマッチング実装確認
   - DomainError→Result型変換の適切な実装確認
   - エラーログの構造化出力確認
   - セキュリティ観点のログマスク処理確認
   ```

5. **🎯 継続的品質改善確認**

   ```bash
   # カバレッジトレンド確認（CI/CD連携）
   pnpm test:coverage --reporter=json > coverage-current.json
   
   # 品質退行チェック（前回比較）
   diff coverage-previous.json coverage-current.json
   
   # HTMLレポートでの視覚的品質確認
   pnpm test:coverage --reporter=html
   open coverage/index.html
   ```

4. **📖 ドキュメント更新確認**

   ```text
   必要に応じて関連ドキュメントの更新
   新しいパターンの記録
   トラブルシューティング情報の追加
   ```

---

**🎯 この拡充されたCLAUDE.mdシステムとResult型パターンにより、型安全で一貫性のある高品質な開発環境を実現します！**

### 🚀 実現された品質向上

- **型安全性**: Result型による静的エラーハンドリング
- **一貫性**: 全UseCaseで統一されたエラー処理
- **保守性**: 明確なエラー分類と構造化ログ
- **テスタビリティ**: vitest-mock-extendedによる効率的テスト
- **アーキテクチャ遵守**: Clean Architecture + DDD原則の厳格な実装

**開発効率と品質が飛躍的に向上する、次世代Webアプリケーション開発環境の完成です！** 📚✨🚀
