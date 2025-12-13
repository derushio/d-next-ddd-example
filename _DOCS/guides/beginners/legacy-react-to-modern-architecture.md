# 🌟 従来のReactからモダンアーキテクチャへの入門

**「従来のReact開発」から「Clean Architecture + DDD」への学習ガイド**

このドキュメントは、これまで従来のReact開発（useState、useEffect中心）をされてきた方が、モダンなアーキテクチャを学び、実践できるようになることを目指しています。

---

## 🔄 従来 vs モダン：何が変わったの？

### 従来のReact開発（よく使われている方法）

```typescript
// 従来の方法：コンポーネント内で全て処理
export function UserProfile() {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);

 const fetchUser = async (id: string) => {
  setLoading(true);
  try {
   const response = await fetch(`/api/users/${id}`);
   const userData = await response.json();
   setUser(userData);
  } catch (err) {
   setError(err.message);
  } finally {
   setLoading(false);
  }
 };

 const updateUser = async (userData) => {
  setLoading(true);
  try {
   await fetch(`/api/users/${user.id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
   });
   // 更新処理...
  } catch (err) {
   setError(err.message);
  }
 };

 // JSX...
}
```

**問題点：**

- ビジネスロジックがコンポーネント内に混在
- データ取得・エラーハンドリングが散在
- テストが困難
- 再利用性が低い

### モダンなアーキテクチャ（このプロジェクトで採用している方法）

```typescript
// 1. Server Component（データ取得担当）
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const getUserUseCase = resolve('GetUserUseCase');
  const result = await getUserUseCase.execute({ userId: params.id });

  if (isFailure(result)) {
    return <ErrorDisplay message={result.error.message} />;
  }

  return <UserProfileDisplay user={result.data} />;
}

// 2. Client Component（インタラクション担当）
'use client';
export function UserProfileActions({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    startTransition(async () => {
      await updateUserAction(userId, formData);
    });
  };

  return <Button onClick={handleUpdate} loading={isPending}>更新</Button>;
}

// 3. Server Action（データ変更担当）
export async function updateUserAction(userId: string, formData: FormData) {
  const updateUserUseCase = resolve('UpdateUserUseCase');
  const result = await updateUserUseCase.execute({
    userId,
    name: formData.get('name') as string,
  });

  if (isFailure(result)) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}
```

**メリット：**

- 責務が明確に分離されている
- ビジネスロジックが再利用可能
- テストしやすい
- 型安全でエラーハンドリングが統一されている

---

## 🏗️ アーキテクチャ理解：なぜこんなに分けるの？

### 従来の問題：「何でもコンポーネント」

```
components/
├── UserProfile.tsx        // データ取得、表示、更新、エラー処理... 全部入り！
├── ProductList.tsx        // またもや全部入り！
└── OrderHistory.tsx       // またまた全部入り！
```

**結果：**

- コンポーネントが巨大化
- 同じロジックが各所に散在
- テストが困難
- 修正時の影響範囲が不明

### モダンなアーキテクチャ：「責務分離」

```
📱 Presentation Layer（画面・UI）
    ↓ 「データください」
📋 Application Layer（UseCase・ビジネスフロー）
    ↓ 「ビジネスルールをチェック」
🧠 Domain Layer（ビジネスルール・エンティティ）
    ↓ 「データを保存してください」
🗄️ Infrastructure Layer（データベース・外部API）
```

**各層の役割：**

| 層                 | 責務                 | あなたが書くもの                                           |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| **Presentation**   | 画面表示・操作       | Server Component、Client Component、Server Action          |
| **Application**    | ビジネスフローの制御 | UseCase（「ユーザー登録する」「商品を検索する」）          |
| **Domain**         | ビジネスルール       | Entity（「ユーザーとは何か」「有効なメールアドレスとは」） |
| **Infrastructure** | データ保存・取得     | Repository実装（「データベースに保存する方法」）           |

---

## 🤔 Server Components vs Client Components：いつ何を使う？

### 簡単な判断基準

```typescript
// ✅ Server Component を使う場合
export default async function ProductListPage() {
  // - データ取得がメイン
  // - インタラクションが不要
  // - SEOが重要
  // - 初期表示が重要

  const getProductsUseCase = resolve('GetProductsUseCase');
  const result = await getProductsUseCase.execute();

  return <ProductList products={result.data} />;
}

// ✅ Client Component を使う場合
'use client';
export function SearchForm() {
  // - useState、useEffectが必要
  // - ユーザーインタラクションが必要
  // - リアルタイム更新が必要
  // - ブラウザAPIが必要

  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### 実践的な組み合わせパターン

```typescript
// Server Component（親：データ取得）
export default async function UserDashboardPage() {
  const user = await getUserData();

  return (
    <div>
      <UserProfile user={user} />          {/* Server Component */}
      <UserActions userId={user.id} />     {/* Client Component */}
    </div>
  );
}

// Client Component（子：インタラクション）
'use client';
export function UserActions({ userId }: { userId: string }) {
  return <Button onClick={() => deleteUser(userId)}>削除</Button>;
}
```

---

## 💉 依存性注入（DI）：なぜpropsじゃダメなの？

### 従来の方法：propsでの依存渡し

```typescript
// 😰 props地獄が始まる...
export function App() {
  const userService = new UserService();
  const logger = new Logger();

  return (
    <UserDashboard
      userService={userService}
      logger={logger}
    />
  );
}

export function UserDashboard({ userService, logger }) {
  return (
    <UserProfile
      userService={userService}  // またpropsで渡す...
      logger={logger}           // またpropsで渡す...
    />
  );
}

export function UserProfile({ userService, logger }) {
  // やっと使える...
}
```

### DIコンテナを使った方法

```typescript
// 😊 スッキリ！
export function UserProfile() {
 // 必要な時に必要なサービスを取得
 const userService = resolve('UserService');
 const logger = resolve('Logger');

 // すぐに使える！
}
```

**DIのメリット：**

- props地獄を回避
- テスト時にモックに簡単に差し替え可能
- 設定が一箇所に集約される

### DIの設定（一度だけやれば OK）

```typescript
// 1. サービスの登録（プロジェクト開始時に一度だけ）
container.register('UserService', UserService);
container.register('Logger', Logger);

// 2. 使用時（いつでも好きな時に）
const userService = resolve('UserService');
```

---

## 🎯 Result型パターン：try-catchと何が違うの？

### 従来のエラーハンドリング（try-catch）

```typescript
// 😰 エラーハンドリングが各所に散在
export async function createUser(userData) {
 try {
  const user = await userService.create(userData);
  return user;
 } catch (error) {
  if (error instanceof ValidationError) {
   // バリデーションエラー処理
   throw new Error('入力値が不正です');
  } else if (error instanceof DatabaseError) {
   // データベースエラー処理
   throw new Error('データベースエラーです');
  } else {
   // その他のエラー処理
   throw new Error('予期しないエラーです');
  }
 }
}

// 呼び出し側でまたtry-catch...
try {
 const user = await createUser(userData);
 // 成功処理
} catch (error) {
 // エラー処理
}
```

### Result型パターン

```typescript
// 😊 エラーハンドリングが統一されている
export async function createUser(userData): Promise<Result<User>> {
 try {
  const user = await userService.create(userData);
  return success(user); // 成功時
 } catch (error) {
  if (error instanceof ValidationError) {
   return failure('入力値が不正です', 'VALIDATION_ERROR');
  } else if (error instanceof DatabaseError) {
   return failure('データベースエラーです', 'DATABASE_ERROR');
  } else {
   return failure('予期しないエラーです', 'UNEXPECTED_ERROR');
  }
 }
}

// 呼び出し側：型安全なパターンマッチング
const result = await createUser(userData);

if (isSuccess(result)) {
 // 成功時：result.data で値にアクセス
 console.log('ユーザー作成成功:', result.data.name);
} else {
 // 失敗時：result.error でエラー情報にアクセス
 console.error('エラー:', result.error.message);
 console.error('エラーコード:', result.error.code);
}
```

**Result型のメリット：**

- エラーハンドリングが強制される（コンパイル時にチェック）
- エラーの種類が明確
- テストしやすい
- 統一されたエラーレスポンス

---

## 📁 ファイル配置：どこに何を書けばいいの？

### 機能追加の基本フロー

新しい機能「商品検索」を追加する場合：

```
1. 🧠 Domain Layer から開始
   src/layers/domain/entities/Product.ts          // 商品エンティティ
   src/layers/domain/repositories/IProductRepository.ts  // Repository Interface

2. 🗄️ Infrastructure Layer で実装
   src/layers/infrastructure/repositories/ProductRepository.ts  // Repository実装

3. 📋 Application Layer でビジネスフロー
   src/layers/application/usecases/SearchProductsUseCase.ts  // UseCase

4. 🎨 Presentation Layer で画面
   src/app/products/search/page.tsx               // Server Component
   src/components/products/SearchForm.tsx         // Client Component
   src/actions/product-actions.ts                 // Server Actions
```

### ディレクトリ構造の読み方

```
src/
├── app/                    # 📱 ページ（Next.js App Router）
│   ├── products/
│   │   └── search/
│   │       └── page.tsx    # 商品検索ページ
│
├── layers/                 # 🏗️ Clean Architecture の各層
│   ├── application/        # 📋 UseCase（ビジネスフロー）
│   │   └── usecases/
│   │       └── SearchProductsUseCase.ts
│   │
│   ├── domain/            # 🧠 ビジネスルール・エンティティ
│   │   ├── entities/
│   │   │   └── Product.ts
│   │   └── repositories/
│   │       └── IProductRepository.ts
│   │
│   └── infrastructure/    # 🗄️ データアクセス・外部連携
│       └── repositories/
│           └── ProductRepository.ts
│
├── components/            # 🎨 再利用可能なUIコンポーネント
│   └── products/
│       └── SearchForm.tsx
│
└── actions/              # 🔄 Server Actions（フォーム処理）
    └── product-actions.ts
```

---

## 🧪 テスト：何をどうテストするの？

### レイヤー別テスト責務

| レイヤー           | テスト内容                                      | 従来との違い                  |
| ------------------ | ----------------------------------------------- | ----------------------------- |
| **Domain**         | ビジネスルール<br>エンティティの不変条件        | UIと分離してテスト可能        |
| **Application**    | UseCase（ビジネスフロー）<br>エラーハンドリング | モックを使って外部依存を排除  |
| **Infrastructure** | データアクセス<br>外部API連携                   | 実際のDBやAPIとの統合テスト   |
| **Presentation**   | UI表示<br>ユーザーインタラクション              | E2Eテストで実際の操作をテスト |

### 実践的なテスト例

```typescript
// Domain Layer テスト：ビジネスルールのテスト
describe('Product Entity', () => {
 it('価格は0円以上である必要がある', () => {
  expect(() => new Product('商品名', -100)).toThrow(
   '価格は0円以上である必要があります',
  );
 });
});

// Application Layer テスト：UseCaseのテスト
describe('SearchProductsUseCase', () => {
 let mockProductRepository: MockProxy<IProductRepository>;
 let useCase: SearchProductsUseCase;

 beforeEach(() => {
  // 😊 自動モック生成（1行で完了！）
  mockProductRepository = mock<IProductRepository>();
  useCase = new SearchProductsUseCase(mockProductRepository);
 });

 it('商品検索が成功する', async () => {
  // モックの設定
  mockProductRepository.search.mockResolvedValue([product1, product2]);

  // テスト実行
  const result = await useCase.execute({ query: 'テスト商品' });

  // 検証
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
   expect(result.data).toHaveLength(2);
  }
 });
});
```

---

## 🚀 実践：最初の一歩

### Step 1: 既存コードを読んでみる

1. `src/layers/application/usecases/SignInUseCase.ts` を開く
2. どんな処理をしているか理解する
3. `src/app/auth/sign-in/page.tsx` でどう使われているか確認

### Step 2: 簡単な機能を真似して作ってみる

1. 既存の「ユーザー一覧表示」機能を参考に
2. 「商品一覧表示」機能を作ってみる
3. 同じ構造・同じパターンで実装

### Step 3: テストを書いてみる

1. 既存のテストファイルを参考に
2. 作った機能のテストを書いてみる
3. `pnpm test` でテストを実行

---

## 💡 よくある質問（FAQ）

### Q: 「なぜこのような設計にするのでしょうか？」

**A:** 小さなプロジェクトでは確かに複雑に感じられるかもしれません。一方で、以下のようなメリットがあります：

- **保守性**: 機能追加・修正時の影響範囲が明確
- **テスタビリティ**: 各層を独立してテスト可能
- **チーム開発**: 責務が明確で並行開発しやすい
- **スケーラビリティ**: プロジェクトが大きくなっても破綻しない

### Q: 「useState/useEffect はもう使わないの？」

**A:** 使います！ただし適切な場所で：

- **Server Component**: データ取得がメイン → useState不要
- **Client Component**: インタラクションがメイン → useState使用OK

### Q: 「Server Actions って何がいいの？」

**A:** 従来のAPI Route + fetchよりも：

- 型安全（TypeScriptの恩恵をフルに受けられる）
- 簡単（API Route定義不要）
- パフォーマンス（サーバーサイドで完結）

### Q: 「Result型のメリットは何ですか？」

**A:** エラーハンドリングが統一され、型安全になります：

- コンパイル時にエラーハンドリング漏れを検出
- エラーの種類が明確
- テストしやすい

---

## 🎯 次のステップ

1. **[簡単なチュートリアル](./simple-tutorial.md)** - 実際に手を動かして機能を作ってみる
2. **[アーキテクチャ図解](./architecture-diagrams.md)** - 視覚的にアーキテクチャを理解する
3. **[実践的なサンプル集](./practical-examples.md)** - よくあるパターンの実装例
4. **[よくある質問集](./legacy-react-faq.md)** - よくある疑問・トラブル解決

---

**🌟 このアーキテクチャを学ぶことで、開発効率や品質の向上が期待できます！**

**あなたのペースで、一歩ずつ進んでいきましょう** 💪✨
