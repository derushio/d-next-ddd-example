# Driver Adapters 詳細ガイド

Prisma v7からDriver Adaptersが必須。RustエンジンからTypeScript実装に移行し、
アダプター経由でDB接続を行う。

## @prisma/adapter-pg 設定パターン

### connectionString直接渡し（PJ採用方式）

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/lib/env';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
```

最もシンプル。PrismaPgが内部でPoolを管理。
小〜中規模アプリケーション向け。

### Pool利用（接続プール制御が必要な場合）

```typescript
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({
  // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
  connectionString: process.env.DATABASE_URL,
  max: 10,                        // 最大接続数
  connectionTimeoutMillis: 5000,  // 接続取得タイムアウト
  idleTimeoutMillis: 30000,       // アイドル接続タイムアウト
  allowExitOnIdle: true,          // アイドル時にプロセス終了を許可
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### 環境別の推奨設定

| 環境 | max | 備考 |
|---|---|---|
| 開発 | 3 | HMR時の接続増加を考慮 |
| 本番 | 10〜20 | CPUコア数 * 2 + 1 が目安 |
| サーバーレス | 1〜3 | 関数ごとに接続が必要 |

### サーバーレス環境

```typescript
const pool = new Pool({
  // ※ Prisma初期化はt3-env(env.ts)より前に実行されるため、process.env直接参照が必要
  connectionString: process.env.DATABASE_URL,
  max: 1,  // 最小限から開始
  connectionTimeoutMillis: 3000,
});
```

サーバーレスでは接続数が爆発しやすい。以下を検討:
- PgBouncer等の外部プーラー
- Prisma Accelerate（グローバルキャッシュ + コネクションプーリング）

### PgBouncer経由の接続

```
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/db?pgbouncer=true"
```

PgBouncer使用時はプリペアドステートメントが使えない場合がある。
`pgbouncer=true` パラメータで対応。

## v6以前との違い

| 項目 | v6以前 | v7 |
|---|---|---|
| 接続 | Rustエンジンが直接管理 | Driver Adapter経由 |
| プール設定 | URL パラメータ | Pool オブジェクトで設定 |
| エンジン | Rustバイナリ | TypeScript実装 |
| node_modules | バイナリダウンロード必要 | 不要（軽量化） |

## globalThisシングルトンの重要性

```typescript
// ✅ 必須: 開発時のHMRで多重インスタンスを防止
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

Pool利用時はPoolも含めてglobalThisで管理:

```typescript
const globalForPrisma = globalThis as unknown as {
  pool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool = globalForPrisma.pool ?? new Pool({...});
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
```

## Edge Runtime での制限

`@prisma/adapter-pg` はNode.jsの `net` モジュールに依存するため、
Edge Runtime（Cloudflare Workers等）では動作しない。

Edge対応が必要な場合:
- Prisma Accelerateを使用
- Neon Serverless Driver（`@prisma/adapter-neon`）を使用
- proxy.tsからはDB直接アクセスしない設計（PJ採用方式）
