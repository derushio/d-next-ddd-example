# 🤔 よくある質問とトラブルシューティング

**「従来のReact開発」から「モダンアーキテクチャ」への学習でよくある疑問・問題を解決！**

---

## 🚨 緊急度別：よくある問題

### 🔥 今すぐ解決したい問題

#### Q1: 「'use client'をどこに書けばいいかわからない！」

**症状：**

```typescript
// エラーが出る...
export default function MyComponent() {
  const [state, setState] = useState(); // ReferenceError: useState is not defined
  return <div>...</div>;
}
```

**解決策：**

```typescript
// ✅ Client Component が必要な場合
'use client'; // ファイルの最上部に記述
import { useState } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(); // OK！
  return <div>...</div>;
}
```

**判断基準：**

```
📝 'use client' が必要な場合：
✓ useState, useEffect を使う
✓ イベントハンドラー（onClick等）を使う
✓ ブラウザAPI（localStorage等）を使う
✓ リアルタイム更新が必要

📡 Server Component のままでOKな場合：
✓ データ取得のみ
✓ 静的な表示のみ
✓ SEOが重要
```

#### Q2: 「resolve() って何？どこから来てるの？」

**症状：**

```typescript
// resolve is not defined エラー
export default async function Page() {
 const useCase = resolve('GetProductsUseCase'); // ReferenceError
}
```

**解決策：**

```typescript
// ✅ 正しいインポート
import { resolve } from '@/di/resolver';

export default async function Page() {
 const useCase = resolve('GetProductsUseCase'); // OK！
}
```

**DIコンテナの仕組み：**

```typescript
// 1. サービスを登録（一度だけ）
container.register('GetProductsUseCase', GetProductsUseCase);

// 2. 必要な時に取得
const useCase = resolve('GetProductsUseCase');
```

#### Q3: 「Result型ってなに？普通にreturnしちゃダメ？」

**従来の書き方（問題あり）：**

```typescript
// ❌ 従来の方法
export async function getUsers() {
 try {
  const users = await userRepository.findAll();
  return users; // 成功時の型
 } catch (error) {
  throw error; // エラーが予期しない場所で発生
 }
}
```

**Result型の書き方（推奨）：**

```typescript
// ✅ Result型使用
export async function getUsers(): Promise<Result<User[]>> {
 try {
  const users = await userRepository.findAll();
  return success(users); // 成功時
 } catch (error) {
  return failure('ユーザー取得に失敗', 'USER_FETCH_ERROR'); // 失敗時
 }
}

// 使用時
const result = await getUsers();
if (isSuccess(result)) {
 console.log(result.data); // 型安全にアクセス
} else {
 console.error(result.error.message); // エラー情報
}
```

---

### ⚠️ よくある混乱ポイント

#### Q4: 「ディレクトリが多すぎて、どこに何を置けばいいかわからない！」

**簡単な判別法：**

```mermaid
flowchart TD
    Start[新しい機能を追加したい] --> Question1{何を作る？}

    Question1 -->|UI表示| UI[📱 src/components/ または src/app/]
    Question1 -->|データ取得・操作| Logic[📋 src/layers/application/usecases/]
    Question1 -->|ビジネスルール| Business[🧠 src/layers/domain/entities/]
    Question1 -->|データベース操作| Data[🗄️ src/layers/infrastructure/repositories/]

    UI --> UIDetail[Server Component: src/app/<br>Client Component: src/components/]
    Logic --> LogicDetail[UseCase: ビジネスフローを制御]
    Business --> BusinessDetail[Entity: ビジネスルール・検証]
    Data --> DataDetail[Repository: データの保存・取得]
```

**実例でわかる配置場所：**

```
「商品検索機能」を追加する場合：

1. 🧠 商品とは何か？ → src/layers/domain/entities/Product.ts
2. 🗄️ 商品をどう保存？ → src/layers/infrastructure/repositories/ProductRepository.ts
3. 📋 検索の流れは？ → src/layers/application/usecases/SearchProductsUseCase.ts
4. 📱 画面はどう見せる？ → src/app/products/search/page.tsx
5. 🎨 検索フォームは？ → src/components/products/SearchForm.tsx
```

#### Q5: 「テストファイルをどこに置くの？」

**配置パターン：**

```
✅ 推奨：隣接配置パターン
src/
├── layers/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Product.ts
│   │   │   └── Product.test.ts          ← 隣接
│   │   └── repositories/
│   │       ├── IProductRepository.ts
│   │       └── IProductRepository.test.ts ← 隣接
│   └── application/
│       ├── usecases/
│       │   ├── GetProductsUseCase.ts
│       │   └── GetProductsUseCase.test.ts ← 隣接
```

#### Q6: 「@injectable() って何？なんで必要？」

**DIコンテナの魔法を理解：**

```typescript
// ❌ DI無し：手動でインスタンス作成（大変）
const userRepository = new UserRepository();
const logger = new ConsoleLogger();
const hashService = new BcryptHashService();
const useCase = new CreateUserUseCase(userRepository, logger, hashService);

// ✅ DI有り：自動でインスタンス作成（楽々）
@injectable() // これがあると...
export class CreateUserUseCase {
 constructor(
  @inject(INJECTION_TOKENS.UserRepository)
  private readonly userRepository: IUserRepository,
  @inject(INJECTION_TOKENS.Logger)
  private readonly logger: ILogger,
  @inject(INJECTION_TOKENS.HashService)
  private readonly hashService: IHashService,
 ) {}
}

// 使用時：1行で取得！
const useCase = resolve('CreateUserUseCase'); // 自動で依存関係解決
```

---

### 💭 概念的な疑問

#### Q7: 「なぜこのような設計にするのでしょうか？」

**プロジェクト規模別比較：**

```mermaid
graph LR
    subgraph "🔴 小規模プロジェクト（1-3ヶ月）"
        S1[従来のReact: 簡単] --> S2[モダンアーキテクチャ: 複雑]
        S2 --> S3[結論: オーバーエンジニアリング]
    end

    subgraph "🟡 中規模プロジェクト（6ヶ月-1年）"
        M1[従来のReact: ごちゃごちゃ] --> M2[モダンアーキテクチャ: 整理されてる]
        M2 --> M3[結論: ちょうど良い]
    end

    subgraph "🟢 大規模プロジェクト（1年以上）"
        L1[従来のReact: 破綻] --> L2[モダンアーキテクチャ: スケールする]
        L2 --> L3[結論: 必須]
    end
```

**具体的なメリット実感例：**

```typescript
// ❌ 従来の問題：同じロジックがあちこちに...
// UserProfile.tsx
const validateEmail = (email) => {
 /* 検証ロジック */
};

// UserRegistration.tsx
const validateEmail = (email) => {
 /* また同じ検証ロジック... */
};

// UserEdit.tsx
const validateEmail = (email) => {
 /* またまた同じ... */
};

// ✅ モダンアーキテクチャ：ロジックが1箇所に集約
// src/layers/domain/value-objects/Email.ts
export class Email {
 constructor(value: string) {
  this.validate(value); // 検証ロジックは1箇所だけ！
 }
}

// どのコンポーネントからでも使用可能
const email = new Email(inputValue); // 型安全 & 検証済み
```

#### Q8: 「Server Actions って何がいいの？API Routeと何が違う？」

**比較表：**

| 項目                   | 従来（API Route + fetch）    | Server Actions      |
| ---------------------- | ---------------------------- | ------------------- |
| **ファイル数**         | 2個（API Route + Component） | 1個（Action のみ）  |
| **型安全性**           | ❌ fetchの型チェックなし     | ✅ 完全な型安全性   |
| **エラーハンドリング** | 手動でtry-catch              | ✅ Result型で統一   |
| **パフォーマンス**     | ネットワーク経由             | ✅ サーバー内で完結 |

**実装比較：**

```typescript
// ❌ 従来の方法
// 1. API Route作成
export async function POST(request: Request) {
 const data = await request.json();
 // 処理...
 return Response.json(result);
}

// 2. フロントエンドでfetch
const handleSubmit = async () => {
 try {
  const response = await fetch('/api/users', {
   method: 'POST',
   body: JSON.stringify(data),
  });
  const result = await response.json();
 } catch (error) {
  // エラーハンドリング
 }
};

// ✅ Server Actions の方法
// 1. Server Action作成（1ファイル）
export async function createUserAction(formData: FormData) {
 const useCase = resolve('CreateUserUseCase');
 const result = await useCase.execute({
  name: formData.get('name') as string,
  email: formData.get('email') as string,
 });

 if (isFailure(result)) {
  return failure(result.error.message, result.error.code);
 }

 return success(undefined);
}

// 2. フロントエンドで直接使用
const handleSubmit = async (formData: FormData) => {
 const result = await createUserAction(formData); // 型安全！
 if (isFailure(result)) {
  setError(result.error.message);
 }
};
```

---

### 🧪 テスト関連の疑問

#### Q9: 「vitest-mock-extended って何？普通のモックと何が違う？」

**従来のモック（大変）：**

```typescript
// ❌ 手動モック作成（めんどくさい...）
const mockUserRepository = {
 findById: jest.fn(),
 save: jest.fn(),
 delete: jest.fn(),
 findByEmail: jest.fn(),
 // ... 他にも20個のメソッドを手動で書く必要 😱
} as jest.Mocked<IUserRepository>;
```

**vitest-mock-extended（楽々）：**

```typescript
// ✅ 自動モック生成（1行で完了！）
import { mock, MockProxy } from 'vitest-mock-extended';

const mockUserRepository: MockProxy<IUserRepository> = mock<IUserRepository>();
// すべてのメソッドが自動生成 & 型安全！ 🎉
```

#### Q10: 「どのレイヤーで何をテストすればいいの？」

**レイヤー別テスト責務：**

```mermaid
graph TD
    subgraph "🧪 テスト戦略"
        subgraph "🧠 Domain Layer"
            D1[Entity Test<br>- ビジネスルール<br>- バリデーション<br>- 不変条件]
        end

        subgraph "📋 Application Layer"
            A1[UseCase Test<br>- ビジネスフロー<br>- エラーハンドリング<br>- Result型]
        end

        subgraph "🗄️ Infrastructure Layer"
            I1[Repository Test<br>- データアクセス<br>- 外部API連携<br>- エラー変換]
        end

        subgraph "📱 Presentation Layer"
            P1[E2E Test<br>- ユーザー操作<br>- 画面表示<br>- フロー全体]
        end
    end
```

**実例：**

```typescript
// 🧠 Domain Test：ビジネスルール
describe('Product Entity', () => {
 it('価格は0円以上である必要がある', () => {
  expect(() => new Product('商品', -100)).toThrow();
 });
});

// 📋 Application Test：ビジネスフロー
describe('CreateProductUseCase', () => {
 it('商品作成が成功する', async () => {
  mockRepository.save.mockResolvedValue(undefined);
  const result = await useCase.execute(validInput);
  expect(isSuccess(result)).toBe(true);
 });
});

// 🗄️ Infrastructure Test：データアクセス
describe('ProductRepository', () => {
 it('商品データを正しく保存できる', async () => {
  await repository.save(product);
  // public readonly プロパティに直接アクセス
  const saved = await repository.findById(product.id);
  expect(saved).toEqual(product);
 });
});
```

---

### 🚀 実践的な問題解決

#### Q11: 「新機能を追加したいけど、どこから始めればいい？」

**段階的アプローチ：**

```mermaid
flowchart TD
    Start[新機能追加したい] --> Step1[ステップ1: 既存の似た機能を探す]
    Step1 --> Step2[ステップ2: その機能のファイル構成を確認]
    Step2 --> Step3[ステップ3: 同じパターンで新機能を作成]
    Step3 --> Step4[ステップ4: テストをコピー&修正]
    Step4 --> Step5[ステップ5: 動作確認]

    style Step1 fill:#e1f5fe
    style Step2 fill:#e8f5e8
    style Step3 fill:#fff3e0
    style Step4 fill:#fce4ec
    style Step5 fill:#f3e5f5
```

**具体例：「商品お気に入り機能」を追加したい場合**

```
1. 既存の「ユーザー登録機能」を参考にする
   📁 src/layers/application/usecases/SignUpUseCase.ts

2. 同じパターンで作成
   📁 src/layers/domain/entities/Favorite.ts        ← Product参考
   📁 src/layers/application/usecases/AddFavoriteUseCase.ts ← SignUpUseCase参考
   📁 src/actions/favorite-actions.ts               ← user-actions.ts参考

3. テストも同じパターン
   📁 Favorite.test.ts                              ← Product.test.ts参考
   📁 AddFavoriteUseCase.test.ts                    ← SignUpUseCase.test.ts参考
```

#### Q12: 「エラーが出ても、どこが原因かわからない！」

**デバッグ手順：**

```mermaid
flowchart TD
    Error[エラー発生] --> Check1{コンパイルエラー?}

    Check1 -->|Yes| Compile[型エラー・インポートエラー<br>- 型定義確認<br>- インポートパス確認]
    Check1 -->|No| Check2{実行時エラー?}

    Check2 -->|Yes| Runtime[実行時エラー<br>- ログ確認<br>- Result型確認<br>- DI設定確認]
    Check2 -->|No| Logic[ロジックエラー<br>- テスト実行<br>- デバッガー使用]

    style Compile fill:#ffcdd2
    style Runtime fill:#fff3e0
    style Logic fill:#e8f5e8
```

**よくあるエラーと解決法：**

```typescript
// 🚨 よくあるエラー1：DI設定忘れ
// Error: No matching bindings found for serviceIdentifier: CreateUserUseCase

// ✅ 解決法：DI Container に登録
container.register('CreateUserUseCase', CreateUserUseCase);

// 🚨 よくあるエラー2：Result型のチェック忘れ
// TypeError: Cannot read property 'data' of undefined

// ❌ 危険なコード
const result = await useCase.execute();
console.log(result.data); // エラー！

// ✅ 安全なコード
const result = await useCase.execute();
if (isSuccess(result)) {
 console.log(result.data); // OK！
}

// 🚨 よくあるエラー3：Server Component で useState
// ReferenceError: useState is not defined

// ✅ 解決法：'use client' 追加
('use client');
import { useState } from 'react';
```

---

### 🎯 パフォーマンス・最適化の疑問

#### Q13: 「このアーキテクチャのパフォーマンスはどうでしょうか？」

**パフォーマンス比較：**

```mermaid
graph LR
    subgraph "⚡ パフォーマンス指標"
        subgraph "🔴 従来のReact"
            L1[初期開発: 早い]
            L2[保守・拡張: 遅い]
            L3[バンドルサイズ: 大きい]
            L4[ランタイム: 重い]
        end

        subgraph "🟢 モダンアーキテクチャ"
            M1[初期開発: やや遅い]
            M2[保守・拡張: 早い]
            M3[バンドルサイズ: 小さい*]
            M4[ランタイム: 軽い*]
        end
    end
```

**実際の効果：**

- **Server Components**: クライアントJavaScriptが削減
- **レイヤー分離**: 不要なコードの読み込み削減
- **Tree Shaking**: 使用されないコードの自動除去

#### Q14: 「Server Actions って本当に早いの？」

**レスポンス時間比較：**

```typescript
// 📊 実測値（目安）
従来（API Route + fetch）:
  クライアント → ネットワーク → API Route → UseCase → Response
  50ms        → 20ms        → 5ms      → 10ms   → 85ms total

Server Actions:
  Server Action → UseCase → Response
  5ms          → 10ms    → 15ms total

// 約70ms（約82%）の短縮！
```

---

### 🎓 学習・キャリア関連

#### Q15: 「この技術は他のプロジェクトでも活用できますか？」

**技術の汎用性：**

```mermaid
graph TB
    subgraph "🏗️ アーキテクチャパターン（汎用）"
        A1[Clean Architecture]
        A2[DDD]
        A3[依存性注入]
        A4[Repository Pattern]
    end

    subgraph "⚛️ React生態系（React特化）"
        R1[Server Components]
        R2[Server Actions]
        R3[Next.js App Router]
    end

    subgraph "🌍 他の技術スタックでも使える"
        O1[Vue.js + Nuxt]
        O2[Angular]
        O3[Node.js + Express]
        O4[Spring Boot]
        O5[ASP.NET Core]
    end

    A1 --> O1
    A2 --> O2
    A3 --> O3
    A4 --> O4
    A1 --> O5
```

**キャリア価値：**

- **Clean Architecture**: 言語・フレームワーク問わず適用可能
- **DDD**: エンタープライズ開発で重宝される
- **テスト戦略**: 品質重視の現場で評価される

#### Q16: 「学習内容が多いのですが、どこから始めるのがおすすめでしょうか？」

**優先順位付き学習パス：**

```mermaid
graph TD
    Week1[Week 1: 必須] --> Week2[Week 2: 重要]
    Week2 --> Week3[Week 3: 応用]
    Week3 --> Week4[Week 4: 熟練]

    subgraph "Week 1: 必須（これだけは覚える）"
        W1_1[Server/Client Components使い分け]
        W1_2[Result型パターン]
        W1_3[基本的なDI使用法]
    end

    subgraph "Week 2: 重要（慣れてきたら）"
        W2_1[UseCase実装パターン]
        W2_2[Entity/Repository作成]
        W2_3[基本的なテスト書き方]
    end

    subgraph "Week 3: 応用（余裕があれば）"
        W3_1[複雑なビジネスロジック]
        W3_2[トランザクション管理]
        W3_3[パフォーマンス最適化]
    end

    subgraph "Week 4: 熟練（目指すレベル）"
        W4_1[アーキテクチャ設計]
        W4_2[チーム開発での運用]
        W4_3[独自パターンの創造]
    end
```

---

## 🆘 緊急時のチートシート

### コマンド集

```bash
# 🚨 エラーが出たらまず実行
pnpm type-check          # 型エラーチェック
pnpm lint               # コード品質チェック
pnpm test:unit          # ユニットテスト実行

# 🔧 開発中によく使う
pnpm dev                # 開発サーバー起動
pnpm test:watch         # テストウォッチモード
pnpm prisma studio      # データベース確認

# 🧹 困った時のクリーニング
pnpm clean              # ビルドファイル削除
rm -rf node_modules && pnpm install  # 依存関係リセット
```

### よく使うインポート

```typescript
// Result型関連
import {
 failure,
 isFailure,
 isSuccess,
 Result,
 success,
} from '@/layers/application/types/Result';
// DI関連
import { resolve } from '@/di/resolver';

import { inject, injectable } from 'tsyringe';
// テスト関連
import { beforeEach, describe, expect, it } from 'vitest';
import { mock, MockProxy } from 'vitest-mock-extended';
```

---

## 📞 さらなるサポート

### 困った時の相談先

1. **📚 ドキュメント確認**

   - [基本概念](./legacy-react-to-modern-architecture.md)
   - [図解ガイド](./architecture-diagrams.md)
   - [実践チュートリアル](./simple-tutorial.md)

2. **🔍 コード例参照**

   - 既存の実装を参考にする
   - テストファイルでパターンを学ぶ

3. **🧪 実験してみる**
   - 小さな機能で試してみる
   - テストを書いて動作確認

---

**🌟 あなたのペースで一歩ずつ！** 最初は慣れないかもしれませんが、必ず「あ、これは便利だ！」と感じる瞬間があると思います 💪✨
