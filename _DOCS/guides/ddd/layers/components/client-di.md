# Client Component設計 - Server Actions中心アプローチ

## 📋 概要

このドキュメントでは、Next.js Client ComponentにおけるServer Actions中心の設計方針を説明します。

### 従来の課題

Client ComponentでのDI（依存性注入）使用は以下の問題を引き起こしていました：

- **複雑性の増大**: 環境判定やClient/Server DIコンテナの二重管理
- **Clean Architecture違反**: UIコンポーネントがInfrastructure層に直接依存
- **バンドルサイズ増大**: 不要なサービスがクライアントサイドに含まれる
- **保守コストの増加**: 157行の複雑なuseServicesフックの維持

### 新しい設計方針

**Server Actions中心アーキテクチャ**により、シンプルで保守しやすい構成を実現：

- Client ComponentはUIとユーザーアクションのみに責任を限定
- ビジネスロジックや外部サービス連携は全てServer Actionsに委譲
- Clean Architectureの依存関係ルールを厳密に遵守

## 🏗️ アーキテクチャ構成

### 責務分離システム

```typescript
// ❌ 従来: Client ComponentでDI使用
'use client';
const { logger, config, utils } = useServices(); // 複雑で不要

// ✅ 新設計: Server Actions中心
('use server');
async function handleUserAction(formData: FormData) {
 const userService = resolve('UserService'); // DIはServer側のみ
 return await userService.processAction(formData);
}
```

### 責務分離構成

| 層               | 責任範囲                           | 使用技術                |
| ---------------- | ---------------------------------- | ----------------------- |
| Client Component | UI表示、ユーザーイベント処理       | React Hook、State管理   |
| Server Actions   | ビジネスロジック、外部サービス連携 | DI、UseCase、Repository |

## 🎯 Server Actions中心パターンの実装方法

### 基本実装例

```tsx
// ✅ Server Action: ビジネスロジック処理
'use server';

import { failure, Result, success } from '@/layers/application/types/Result';
import { resolve } from '@/di/resolver';

export async function handleUserAction(data: {
 buttonId: string;
}): Promise<Result<string>> {
 const logger = resolve('Logger');
 const userService = resolve('UserService');

 try {
  logger.info('ユーザーアクション処理開始', { buttonId: data.buttonId });
  const result = await userService.processUserAction(data);
  return success(result);
 } catch (error) {
  logger.error('ユーザーアクション処理エラー', { error });
  return failure('処理に失敗しました', 'ACTION_FAILED');
 }
}
```

```tsx
// ✅ Client Component: UIとイベント処理のみ
'use client';

import { useState } from 'react';

import { handleUserAction } from './actions';

export function MyClientComponent() {
 const [isLoading, setIsLoading] = useState(false);
 const [message, setMessage] = useState('');

 const handleClick = async () => {
  setIsLoading(true);
  const result = await handleUserAction({ buttonId: 'submit' });

  if (result.success) {
   setMessage('処理が完了しました');
  } else {
   setMessage('エラーが発生しました');
  }
  setIsLoading(false);
 };

 return (
  <div>
   <button onClick={handleClick} disabled={isLoading}>
    {isLoading ? '処理中...' : 'クリック'}
   </button>
   {message && <p>{message}</p>}
  </div>
 );
}
```

### 責務分離構成

| 要素                 | 責任                             | 利用可能な機能                  |
| -------------------- | -------------------------------- | ------------------------------- |
| **Server Actions**   | ビジネスロジック、外部サービス   | DI、UseCase、Repository、Logger |
| **Client Component** | UI表示、ユーザーインタラクション | React Hook、State、イベント処理 |

### 複雑な操作の実装例

```tsx
// ✅ Server Action: データ処理とログ
'use server';

import { resolve } from '@/di/resolver';

export async function processAdvancedSearch(
 query: string,
): Promise<Result<SearchResult[]>> {
 const logger = resolve('Logger');
 const searchService = resolve('SearchService');

 try {
  logger.info('高度検索処理開始', {
   query,
   timestamp: new Date().toISOString(),
  });

  const results = await searchService.performAdvancedSearch(query);

  logger.info('高度検索処理完了', {
   query,
   resultCount: results.length,
   duration: Date.now(),
  });

  return success(results);
 } catch (error) {
  logger.error('高度検索処理エラー', { query, error });
  return failure('検索に失敗しました', 'SEARCH_FAILED');
 }
}

export async function fetchUserData(userId: string): Promise<Result<UserData>> {
 const logger = resolve('Logger');
 const userRepository = resolve('UserRepository');

 try {
  const userData = await userRepository.findById(userId);
  logger.info('ユーザーデータ取得完了', { userId });
  return success(userData);
 } catch (error) {
  logger.error('ユーザーデータ取得エラー', { userId, error });
  return failure('データの取得に失敗しました', 'FETCH_FAILED');
 }
}
```

```tsx
// ✅ Client Component: UIと状態管理
'use client';

import { useEffect, useState } from 'react';

import { fetchUserData, processAdvancedSearch } from './actions';

export function AdvancedSearchComponent() {
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<SearchResult[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSearch = async () => {
  if (!query.trim()) return;

  setIsLoading(true);
  setError(null);

  const result = await processAdvancedSearch(query);

  if (result.success) {
   setResults(result.data);
  } else {
   setError(result.error.message);
  }

  setIsLoading(false);
 };

 const handleDataFetch = async (userId: string) => {
  const result = await fetchUserData(userId);

  if (result.success) {
   console.log('データ取得成功:', result.data);
  } else {
   console.error('データ取得失敗:', result.error.message);
  }
 };

 return (
  <div>
   <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder='検索クエリを入力'
   />
   <button onClick={handleSearch} disabled={isLoading}>
    {isLoading ? '検索中...' : '検索実行'}
   </button>

   {error && <p className='error'>{error}</p>}

   <div>
    {results.map((result) => (
     <div key={result.id}>
      {result.title}
      <button onClick={() => handleDataFetch(result.userId)}>詳細取得</button>
     </div>
    ))}
   </div>
  </div>
 );
}
```

## 🔧 新しいサービスの追加方法

### Server Action向けサービス実装

```typescript
// src/layers/application/services/MyBusinessService.ts
import type { IUserRepository } from '@/layers/domain/repositories/IUserRepository';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';

import { inject, injectable } from 'tsyringe';

export interface IMyBusinessService {
 performBusinessOperation(data: BusinessData): Promise<Result<string>>;
}

@injectable()
export class MyBusinessService implements IMyBusinessService {
 constructor(
  @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  @inject(INJECTION_TOKENS.UserRepository)
  private userRepository: IUserRepository,
 ) {}

 async performBusinessOperation(data: BusinessData): Promise<Result<string>> {
  this.logger.info('ビジネス処理開始', { data });

  try {
   // ビジネスロジック実装
   const result = await this.userRepository.performComplexOperation(data);

   this.logger.info('ビジネス処理完了', { result });
   return success(result);
  } catch (error) {
   this.logger.error('ビジネス処理エラー', { error });
   return failure('処理に失敗しました', 'OPERATION_FAILED');
  }
 }
}
```

### DI Containerへの登録

```typescript
// src/layers/infrastructure/di/containers/application.container.ts
import { MyBusinessService } from '@/layers/application/services/MyBusinessService';

// 新しいサービスを登録
container.registerSingleton(MyBusinessService);
container.register(INJECTION_TOKENS.MyBusinessService, {
 useToken: MyBusinessService,
});
```

### Tokensファイルへの追加

```typescript
// src/layers/infrastructure/di/tokens.ts
export const INJECTION_TOKENS = {
 // ... 既存のトークン
 MyBusinessService: Symbol.for('MyBusinessService'),
} as const;

export interface ServiceTypeMap {
 // ... 既存のマッピング
 MyBusinessService: IMyBusinessService;
}
```

## ⚡ パフォーマンス最適化

### Server Actions最適化

Server ActionsでのDI使用は自動的に最適化されます：

```typescript
// ✅ Server Action: DIコンテナはシングルトン管理で効率的
'use server';

export async function optimizedAction(
 data: ActionData,
): Promise<Result<ActionResult>> {
 // resolve()は内部でキャッシュされたサービスを返す
 const userService = resolve('UserService'); // 高速
 const logger = resolve('Logger'); // 高速

 return await userService.processOptimizedOperation(data);
}
```

### Client Component最適化パターン

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';

import { optimizedAction } from './actions';

export function OptimizedComponent() {
 const [data, setData] = useState<ActionData>();
 const [result, setResult] = useState<ActionResult | null>(null);

 // ✅ Server Action呼び出しをuseCallbackでメモ化
 const handleComplexOperation = useCallback(async () => {
  if (!data) return;

  const result = await optimizedAction(data);

  if (result.success) {
   setResult(result.data);
  }
 }, [data]);

 // ✅ 計算結果をuseMemoでキャッシュ
 const processedData = useMemo(() => {
  return result ? transformData(result) : null;
 }, [result]);

 // ✅ イベントハンドラーをuseCallbackでメモ化
 const handleDataChange = useCallback((newData: ActionData) => {
  setData(newData);
 }, []);

 return (
  <div>
   <DataInput onChange={handleDataChange} />
   <button onClick={handleComplexOperation}>処理実行</button>
   {processedData && <DataDisplay data={processedData} />}
  </div>
 );
}
```

## 🚨 注意事項とベストプラクティス

### ❌ 禁止事項

```typescript
// ❌ Client ComponentでDI使用（複雑性増大の原因）
'use client';

// 不要な複雑さ

// ❌ Client ComponentでServer専用サービス直接インポート

// ❌ Client ComponentでRepository層直接使用
import { UserRepository } from '@/layers/infrastructure/repositories';
import { prisma } from '@/lib/prisma'; // ビルドエラーの原因

const { logger, userService } = useServices();
```

### ✅ 推奨パターン

```typescript
// ✅ Server Actions: DIとビジネスロジック
'use server';
export async function processUserAction(data: UserData) {
 const userService = resolve('UserService'); // Server側でのみDI使用
 return await userService.process(data);
}

// ✅ Client Component: UIと状態管理のみ
('use client');
export function UserComponent() {
 const [state, setState] = useState();

 const handleAction = async () => {
  const result = await processUserAction(data); // Server Action呼び出し
  setState(result);
 };
}
```

### セキュリティ考慮事項

- **情報分離**: Server Actionsで機密情報処理、Client Componentは表示のみ
- **入力検証**: Server Actions内でバリデーション実装
- **ログ制限**: Client側では必要最小限のconsole.log使用

## 🛠️ トラブルシューティング

### よくあるエラーと解決方法

#### 1. "Module not found: Can't resolve 'node:fs'"

**原因**: Client ComponentでServer専用機能を直接使用

**解決方法**: Server Actionsに処理を移動

```typescript
// ❌ Client ComponentでNode.js依存機能使用
'use client';

import { readFile } from 'node:fs'; // エラーの原因

// ✅ Server Actionに移動
('use server');
export async function readFileAction(path: string) {
 const fs = await import('node:fs/promises');
 return await fs.readFile(path, 'utf-8');
}
```

#### 2. "useServices is not defined"

**原因**: 削除されたuseServicesフックの使用

**解決方法**: Server Actions中心パターンに変更

```typescript
// ❌ 削除されたuseServices使用
const { logger } = useServices();

// ✅ Server Actionでログ処理
('use server');
export async function logAction(message: string) {
 const logger = resolve('Logger');
 logger.info(message);
}
```

#### 3. Client ComponentでDI使用したい場合

**原因**: 従来のDI使用パターンの習慣

**解決方法**: 責務分離の再設計

```typescript
// ❌ Client ComponentでDI
'use client';
function Component() {
 const userService = resolve('UserService'); // 不適切
}

// ✅ Server Actionに分離
('use server');
export async function getUserData(id: string) {
 const userService = resolve('UserService');
 return await userService.findById(id);
}

('use client');
function Component() {
 const [user, setUser] = useState();

 useEffect(() => {
  getUserData(userId).then(setUser);
 }, [userId]);
}
```

## 📚 関連ドキュメント

- [DIコンテナ構成](./di-container.md) - Server側での基本的なDI構成
- [Server Actions](./server-actions.md) - Server Actions実装パターン
- [Frontend Best Practices](../../../frontend-best-practices.md) - フロントエンド開発指針
- [Clean Architecture](../../concepts/clean-architecture.md) - アーキテクチャ原則

## 🎯 まとめ

Server Actions中心アプローチにより以下を実現：

- ✅ **シンプル性**: Client ComponentはUIのみ、複雑なDI不要
- ✅ **Clean Architecture準拠**: 依存関係の方向性を厳密に遵守
- ✅ **保守性**: 責務分離により各層の責任が明確
- ✅ **Next.js 16最適化**: Server Actions活用でパフォーマンス向上
- ✅ **型安全性**: Server ActionsでのResult型パターン使用

Client ComponentではDIを使用せず、Server Actionsに処理を委譲することで、シンプルで保守しやすいアーキテクチャを実現できます。
