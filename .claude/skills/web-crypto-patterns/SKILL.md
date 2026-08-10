---
name: web-crypto-patterns
description: |
  Web Crypto API vs node:crypto の使い分けガイド。
  Edge Runtime互換性が必要な場合は Web Crypto API を使用する。

  トリガー例:
  - crypto, randomBytes, randomUUID, uuid, ランダム生成, トークン生成
  - Edge Runtime, proxy.ts でのランダム値
  - セキュリティトークン生成
---

# Web Crypto API パターン

Web Crypto API vs node:crypto の使い分けガイド。
Edge Runtime互換性が必要な場合は Web Crypto API を使用する。

## トリガー

- crypto, randomBytes, randomUUID, uuid, ランダム生成, トークン生成
- Edge Runtime, proxy.ts でのランダム値
- セキュリティトークン生成

## UUID 生成

```typescript
// ✅ 推奨: ネイティブAPI（uuidパッケージ不要）
const id = crypto.randomUUID();

// ❌ 非推奨: uuidパッケージ
import { v4 as uuidv4 } from 'uuid';
```

プロジェクトでは `@/utils/uuidv4` ラッパー経由で使用する。

## ランダムバイト生成

### Edge Runtime / ブラウザ互換

```typescript
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// 使用例: セキュリティトークン
const token = `access_${Date.now()}_${randomHex(32)}`;
```

### Node.js 専用コンテキスト

CLIツール、シードスクリプト、SHA-256ハッシュ等のNode.js専用コンテキストでは `node:crypto` を使用:

```typescript
import { createHash, randomBytes } from 'node:crypto';

// ハッシュ計算
const hash = createHash('sha256').update(data).digest('hex');

// ランダムバイト
const bytes = randomBytes(32).toString('hex');
```

## 使い分けガイド

| ユースケース | API | 理由 |
|-------------|-----|------|
| UUID生成 | `crypto.randomUUID()` | ネイティブ、パッケージ不要 |
| トークン生成（UseCaseレイヤー） | `crypto.getRandomValues()` | Edge Runtime互換 |
| SHA-256ハッシュ（インフラレイヤー） | `node:crypto createHash` | ストリーム対応 |
| シードスクリプト | `node:crypto` | Node.js専用コンテキスト |
| proxy.ts内 | `crypto.*` (グローバル) | Edge Runtime |

## 注意

- `Math.random()` はセキュリティ用途に使用禁止（予測可能）
- パスワードハッシュは `@node-rs/argon2` を使用（`password-hashing` スキル参照）
- 暗号化タイミング比較は `crypto.timingSafeEqual()` を使用（Node.js API）
