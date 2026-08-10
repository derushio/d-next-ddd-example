# バッファオーバーフロー対策ガイド

## 概要

バッファオーバーフロー（Buffer Overflow）は、固定長のバッファ領域に対して、容量を超えるデータを書き込むことで、隣接するメモリ領域を破壊してしまう脆弱性です。

### 脆弱性の説明

プログラムが確保したメモリ領域（バッファ）のサイズを超えるデータを書き込むことで、隣接するメモリ領域を上書きしてしまいます。攻撃者はこの脆弱性を悪用し、プログラムの実行フローを制御したり、任意のコードを実行したりすることが可能です。

**典型的な発生パターン:**

- C/C++での `strcpy()`, `sprintf()`, `gets()` などの境界チェックがない関数の使用
- 固定長配列への過大なデータコピー
- ポインタ演算のミスによるメモリ領域の破壊
- ヒープやスタック領域への意図しない書き込み

**JavaScript/TypeScript環境での特殊性:**

JavaScriptはメモリ管理が自動化されており、配列やオブジェクトのサイズは動的に拡張されるため、従来のバッファオーバーフローは発生しにくい設計になっています。ただし、以下のケースでは注意が必要です。

### 発生しうる脅威

バッファオーバーフローが成功すると、以下のような深刻な被害が発生します。

| 脅威 | 説明 | 影響度 |
|------|------|--------|
| 任意コード実行 | 攻撃者が用意したシェルコードを実行され、サーバーを完全に制御される | 致命的 |
| DoS攻撃 | プログラムのクラッシュやリソース枯渇によるサービス停止 | 高 |
| 権限昇格 | プログラムの実行権限を悪用し、管理者権限を取得される | 高 |
| データ改竄 | メモリ上の重要データ（認証情報、設定値等）が上書きされる | 中 |
| 情報漏洩 | メモリダンプから機密情報（パスワード、トークン等）が窃取される | 高 |

### 特に注意が必要なケース

Node.js/TypeScript環境では、以下のような状況でバッファオーバーフロー関連の脆弱性が発生する可能性があります。

- **ネイティブアドオンの使用**
  - C/C++で記述されたネイティブモジュール
  - N-API、NAN等のNode.jsバインディング
  - ネイティブライブラリのラッパーパッケージ

- **Bufferオブジェクトの不適切な操作**
  - `Buffer.allocUnsafe()` の使用（初期化されていないメモリ）
  - `Buffer.write()` のオフセット指定ミス
  - `Buffer.concat()` のサイズ計算ミス

- **古い依存パッケージ**
  - セキュリティパッチ未適用のパッケージ
  - メンテナンスされていないネイティブアドオン
  - 脆弱性が報告されているバージョンの使用

- **バイナリデータ処理**
  - 画像、動画、音声ファイルのパース
  - プロトコルバッファ、MessagePackのデコード
  - 圧縮ファイルの展開処理

## IPA/OWASP対応

本脆弱性は、以下の国際的なセキュリティ基準に分類されています。

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| IPA | 10. バッファオーバーフロー | 「安全なウェブサイトの作り方」第11版 |
| OWASP Top 10 2021 | A06:2021-Vulnerable and Outdated Components | 脆弱な依存コンポーネントの使用 |
| CWE | CWE-120: Buffer Copy without Checking Size of Input | バッファオーバーフロー全般 |
| CWE | CWE-787: Out-of-bounds Write | 境界外書き込み |

**優先度**: 高（CVSSスコア 7.5以上の脆弱性が多い）

## Next.js + TypeScript での対策

### 前提

JavaScript/TypeScriptは以下の理由により、直接的なバッファオーバーフローは発生しにくい環境です。

- **自動メモリ管理**: ガベージコレクションにより、メモリの確保・解放が自動化
- **境界チェック**: 配列アクセス時に自動的に境界チェックが行われる
- **動的型付け**: 配列やオブジェクトのサイズが動的に拡張される

**しかし、以下のケースでは注意が必要です:**

1. ネイティブアドオン（C/C++）の使用
2. Node.js `Buffer` オブジェクトの不適切な操作
3. 依存パッケージの脆弱性（特にネイティブモジュール）
4. WebAssembly（WASM）の使用

### 根本的解決策（必須）

#### 1. 依存パッケージの定期更新

ネイティブアドオンを含む依存パッケージのセキュリティパッチを適用します。

```bash
# パッケージの脆弱性スキャン
pnpm audit

# 修正可能な脆弱性を自動修正
pnpm audit --fix

# 脆弱性レポートの詳細表示
pnpm audit --json > audit-report.json
```

**pnpm の推奨設定 (package.json)**

```json
{
  "scripts": {
    "audit:check": "pnpm audit --audit-level=moderate",
    "audit:fix": "pnpm audit --fix",
    "deps:update": "pnpm update --latest"
  }
}
```

**CI/CDでの自動チェック**

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 1' # 毎週月曜日

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Run security audit
        run: pnpm audit --audit-level=moderate
```

#### 2. 信頼できるパッケージのみ使用

ネイティブアドオンを含むパッケージは特に慎重に選定します。

**パッケージ選定基準:**

| 項目 | 確認内容 |
|------|---------|
| メンテナンス状況 | 最終更新が6ヶ月以内、アクティブなIssue対応 |
| ダウンロード数 | npm週間ダウンロード数が10,000以上 |
| セキュリティ実績 | 過去の脆弱性報告と修正履歴 |
| 依存関係 | 依存パッケージ数が少ない |
| TypeScript対応 | 型定義ファイルの有無 |

**ネイティブアドオンの確認方法:**

```bash
# パッケージがネイティブアドオンを含むか確認
pnpm list --depth=0 | grep -E "(bcrypt|sharp|canvas|sqlite3|node-gyp)"

# 特定パッケージの依存関係を確認
pnpm why <package-name>
```

**推奨パッケージ例:**

| 用途 | 避けるべきパッケージ | 推奨パッケージ |
|------|---------------------|----------------|
| 画像処理 | imagemagick（ネイティブ依存） | sharp（最新版、定期更新） |
| 暗号化 | bcrypt | @node-rs/argon2（Argon2id、推奨） |
| データベース | 古いsqlite3 | @prisma/client（ORM推奨） |

#### 3. Buffer操作の安全な実装

Node.jsの `Buffer` オブジェクトを使用する際は、安全なAPIを使用します。

**悪い例: 初期化されていないメモリの使用**

```typescript
// 危険: メモリが初期化されていないため、前の実行データが残る可能性
const buf = Buffer.allocUnsafe(10);
console.log(buf); // <Buffer 00 00 00 00 f0 3f 00 00 ...> ← ランダムデータ
```

**良い例: 初期化されたメモリの使用**

```typescript
// 安全: メモリがゼロクリアされる
const buf = Buffer.alloc(10);
console.log(buf); // <Buffer 00 00 00 00 00 00 00 00 00 00>

// 初期値を指定
const buf2 = Buffer.alloc(10, 0xFF);
console.log(buf2); // <Buffer ff ff ff ff ff ff ff ff ff ff>
```

**境界チェック付きの書き込み**

```typescript
// Domain層: 安全なBuffer操作のValue Object
export class SafeBuffer {
  private constructor(private readonly buffer: Buffer) {}

  static create(size: number): Result<SafeBuffer, AppError> {
    if (size <= 0 || size > 1024 * 1024) {
      return err({ message: 'バッファサイズは1byte～1MBの範囲で指定してください', code: 'INVALID_BUFFER_SIZE' });
    }

    // 初期化されたバッファを確保
    const buffer = Buffer.alloc(size);
    return ok(new SafeBuffer(buffer));
  }

  static fromString(str: string, encoding: BufferEncoding = 'utf8'): Result<SafeBuffer, AppError> {
    try {
      const buffer = Buffer.from(str, encoding);
      return ok(new SafeBuffer(buffer));
    } catch (error) {
      return err({ message: `文字列のエンコードに失敗しました: ${error}`, code: 'ENCODING_ERROR' });
    }
  }

  write(data: string, offset: number = 0, encoding: BufferEncoding = 'utf8'): Result<number, AppError> {
    // 境界チェック
    if (offset < 0 || offset >= this.buffer.length) {
      return err({ message: `オフセットが範囲外です: ${offset}`, code: 'OFFSET_OUT_OF_RANGE' });
    }

    try {
      const bytesWritten = this.buffer.write(data, offset, encoding);
      return ok(bytesWritten);
    } catch (error) {
      return err({ message: `書き込みに失敗しました: ${error}`, code: 'WRITE_ERROR' });
    }
  }

  slice(start: number, end?: number): Result<SafeBuffer, AppError> {
    if (start < 0 || start >= this.buffer.length) {
      return err({ message: '開始位置が範囲外です', code: 'START_OUT_OF_RANGE' });
    }
    if (end !== undefined && (end < start || end > this.buffer.length)) {
      return err({ message: '終了位置が範囲外です', code: 'END_OUT_OF_RANGE' });
    }

    const sliced = this.buffer.slice(start, end);
    return ok(new SafeBuffer(sliced));
  }

  getBuffer(): Buffer {
    return this.buffer;
  }

  toString(encoding: BufferEncoding = 'utf8'): string {
    return this.buffer.toString(encoding);
  }

  getLength(): number {
    return this.buffer.length;
  }
}
```

**UseCase での使用例**

```typescript
// Application層: バイナリデータ処理UseCase
@injectable()
export class ProcessBinaryDataUseCase {
  async execute(request: { data: string }): Promise<Result<string, AppError>> {
    // 安全なBuffer生成
    const bufferResult = SafeBuffer.fromString(request.data);
    if (bufferResult.isErr()) {
      return bufferResult;
    }

    const buffer = bufferResult.value;

    // 安全な部分取得
    const sliceResult = buffer.slice(0, 10);
    if (sliceResult.isErr()) {
      return sliceResult;
    }

    return ok(sliceResult.value.toString('hex'));
  }
}
```

### 保険的対策（推奨）

根本的対策に加えて、多層防御の観点から以下の対策を実施します。

#### 1. 入力サイズの制限

外部からの入力データに対して、サイズ上限を設定します。

**Server Actionでのサイズ制限**

```typescript
// Presentation層: Server Action
'use server';

import { processData } from '@/layers/application/useCases/processData';

const MAX_INPUT_SIZE = 1024 * 1024; // 1MB

export async function uploadFileAction(formData: FormData) {
  const file = formData.get('file') as File;

  // ファイルサイズチェック
  if (file.size > MAX_INPUT_SIZE) {
    return {
      success: false,
      error: `ファイルサイズが上限（1MB）を超えています: ${file.size} bytes`,
    };
  }

  // バッファに読み込み
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // UseCase実行
  const result = await processData({ buffer });
  return result;
}
```

**next.config.ts でのボディサイズ制限**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // APIルートのボディサイズ制限
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },

  // Server Actionsのペイロードサイズ制限
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

export default nextConfig;
```

#### 2. セキュリティ監視ツールの導入

パッケージの脆弱性を継続的に監視するツールを導入します。

**Snyk の導入**

```bash
# Snykのインストール
pnpm add -D snyk

# 認証（初回のみ）
pnpm snyk auth

# 脆弱性スキャン
pnpm snyk test

# 修正可能な脆弱性の自動修正
pnpm snyk wizard
```

**package.json への追加**

```json
{
  "scripts": {
    "security:check": "snyk test",
    "security:monitor": "snyk monitor",
    "security:fix": "snyk wizard"
  }
}
```

**Dependabot の設定（GitHub）**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    # セキュリティアップデートを優先
    versioning-strategy: increase-if-necessary
    labels:
      - "dependencies"
      - "security"
```

#### 3. ネイティブアドオンの使用状況確認

プロジェクト内でネイティブアドオンを使用している場合、定期的に確認します。

```typescript
// scripts/check-native-modules.ts
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function checkNativeModules(): void {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules が見つかりません');
    return;
  }

  // .node ファイル（ネイティブアドオン）を検索
  const result = execSync(
    `find ${nodeModulesPath} -name "*.node" -type f`,
    { encoding: 'utf8' }
  );

  const nativeModules = result
    .split('\n')
    .filter(Boolean)
    .map((filePath) => {
      const match = filePath.match(/node_modules\/([^/]+)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const uniqueModules = [...new Set(nativeModules)];

  if (uniqueModules.length === 0) {
    console.log('ネイティブアドオンは使用されていません');
    return;
  }

  console.log('=== ネイティブアドオンを含むパッケージ ===');
  uniqueModules.forEach((moduleName) => {
    console.log(`  - ${moduleName}`);
  });

  console.log('\n定期的にセキュリティ更新を確認してください。');
}

checkNativeModules();
```

**実行コマンド追加**

```json
{
  "scripts": {
    "check:native": "tsx scripts/check-native-modules.ts"
  }
}
```

#### 4. コンテンツセキュリティポリシー（CSP）の設定

WebAssembly実行を制限するCSPを設定します。

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // WASMには'unsafe-eval'が必要
              "worker-src 'self' blob:", // Web Workerの許可
              // WebAssemblyの実行を明示的に許可（必要な場合のみ）
              // "script-src 'self' 'wasm-unsafe-eval'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## チェックリスト

開発・レビュー時に以下の項目を確認してください。

### 設計段階

- [ ] ネイティブアドオンを使用する必要性を検討
- [ ] Pure JavaScriptのライブラリで代替できないか確認
- [ ] バイナリデータ処理の要件を明確化
- [ ] セキュリティ監視ツールの導入計画を策定

### 実装段階

- [ ] `Buffer.allocUnsafe()` を使用していないか
- [ ] `Buffer.alloc()` で初期化されたバッファを使用しているか
- [ ] Buffer操作時に境界チェックを実施しているか
- [ ] 入力データのサイズ制限を実装しているか
- [ ] Domain層でSafeBufferなどのValue Objectを使用しているか

### 依存パッケージ管理

- [ ] `pnpm audit` を定期的に実行しているか
- [ ] 脆弱性が報告されたパッケージを速やかに更新しているか
- [ ] ネイティブアドオンを含むパッケージのバージョンを把握しているか
- [ ] CI/CDでセキュリティスキャンを自動実行しているか
- [ ] Dependabotまたは類似ツールを設定しているか

### テスト段階

- [ ] Buffer操作の境界値テストを実施しているか
- [ ] 過大なサイズのデータ入力テストを実施しているか
- [ ] エラーハンドリングが適切に機能するか確認しているか

### 運用段階

- [ ] 定期的な依存パッケージの更新スケジュールを設定しているか
- [ ] セキュリティアラートの通知を受け取る体制を整えているか
- [ ] インシデント発生時の対応手順を準備しているか

## テストパターン

### 1. ユニットテスト: Buffer操作の安全性

```typescript
import { describe, it, expect } from 'vitest';
import { SafeBuffer } from '@/layers/domain/valueObjects/SafeBuffer';

describe('SafeBuffer', () => {
  describe('正常系', () => {
    it('指定サイズのバッファを作成できる', () => {
      const result = SafeBuffer.create(10);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLength()).toBe(10);
      }
    });

    it('文字列からバッファを作成できる', () => {
      const result = SafeBuffer.fromString('Hello, World!');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('Hello, World!');
      }
    });

    it('データを安全に書き込める', () => {
      const bufferResult = SafeBuffer.create(20);
      expect(bufferResult.isOk()).toBe(true);

      if (bufferResult.isOk()) {
        const writeResult = bufferResult.value.write('Test', 0);
        expect(writeResult.isOk()).toBe(true);
        if (writeResult.isOk()) {
          expect(writeResult.value).toBe(4); // "Test" = 4 bytes
        }
      }
    });
  });

  describe('異常系: サイズ制限', () => {
    it('負のサイズを拒否する', () => {
      const result = SafeBuffer.create(-1);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('1byte～1MBの範囲');
      }
    });

    it('過大なサイズ（1MB超）を拒否する', () => {
      const result = SafeBuffer.create(2 * 1024 * 1024); // 2MB
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('1byte～1MBの範囲');
      }
    });
  });

  describe('異常系: 境界チェック', () => {
    it('範囲外のオフセットへの書き込みを拒否する', () => {
      const bufferResult = SafeBuffer.create(10);
      expect(bufferResult.isOk()).toBe(true);

      if (bufferResult.isOk()) {
        const writeResult = bufferResult.value.write('Test', 20);
        expect(writeResult.isErr()).toBe(true);
        if (writeResult.isErr()) {
          expect(writeResult.error.message).toContain('範囲外');
        }
      }
    });

    it('不正な範囲のsliceを拒否する', () => {
      const bufferResult = SafeBuffer.create(10);
      expect(bufferResult.isOk()).toBe(true);

      if (bufferResult.isOk()) {
        const sliceResult = bufferResult.value.slice(5, 15);
        expect(sliceResult.isErr()).toBe(true);
        if (sliceResult.isErr()) {
          expect(sliceResult.error.message).toContain('範囲外');
        }
      }
    });
  });
});
```

### 2. ユニットテスト: ファイルサイズ制限

```typescript
import { describe, it, expect } from 'vitest';
import { validateFileSize } from '@/layers/domain/valueObjects/FileSize';

describe('FileSize Validation', () => {
  const MAX_SIZE = 1024 * 1024; // 1MB

  it('許容サイズのファイルを受け入れる', () => {
    const result = validateFileSize(500 * 1024, MAX_SIZE); // 500KB
    expect(result.isOk()).toBe(true);
  });

  it('上限ちょうどのファイルを受け入れる', () => {
    const result = validateFileSize(MAX_SIZE, MAX_SIZE); // 1MB
    expect(result.isOk()).toBe(true);
  });

  it('上限を超えるファイルを拒否する', () => {
    const result = validateFileSize(2 * 1024 * 1024, MAX_SIZE); // 2MB
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('上限');
    }
  });

  it('負のサイズを拒否する', () => {
    const result = validateFileSize(-1, MAX_SIZE);
    expect(result.isErr()).toBe(true);
  });
});
```

### 3. E2Eテスト: ファイルアップロード制限

```typescript
import { test, expect } from '@playwright/test';

test.describe('ファイルアップロード機能', () => {
  test('正常サイズのファイルをアップロードできる', async ({ page }) => {
    await page.goto('/upload');

    // 100KBのテストファイルを作成
    const fileContent = 'x'.repeat(100 * 1024);
    const buffer = Buffer.from(fileContent);

    await page.setInputFiles('input[type="file"]', {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer,
    });

    await page.click('button[type="submit"]');

    await expect(page.locator('.success')).toContainText('アップロード完了');
  });

  test('過大なファイルのアップロードを拒否する', async ({ page }) => {
    await page.goto('/upload');

    // 2MBのテストファイルを作成（上限1MBを超過）
    const fileContent = 'x'.repeat(2 * 1024 * 1024);
    const buffer = Buffer.from(fileContent);

    await page.setInputFiles('input[type="file"]', {
      name: 'large.txt',
      mimeType: 'text/plain',
      buffer,
    });

    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('ファイルサイズが上限');
  });
});
```

### 4. セキュリティテスト: 依存パッケージの脆弱性

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Security: 依存パッケージの脆弱性チェック', () => {
  it('pnpm audit で重大な脆弱性が検出されない', () => {
    try {
      // audit-level=high で重大な脆弱性のみチェック
      execSync('pnpm audit --audit-level=high', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error: any) {
      // 脆弱性が検出された場合、エラーメッセージを表示
      console.error('依存パッケージに脆弱性が検出されました:');
      console.error(error.stdout || error.message);
      expect.fail('重大な脆弱性が存在します。pnpm audit で確認してください。');
    }
  });

  it('ネイティブアドオンの使用状況を把握している', () => {
    // この部分は開発チームがネイティブアドオンの一覧を維持する必要がある
    const knownNativeModules = [
      '@img/sharp-linux-x64', // sharp の依存
      // 他のネイティブモジュールをここに列挙
    ];

    // 実際のネイティブアドオンを検索
    let result: string;
    try {
      result = execSync(
        'find node_modules -name "*.node" -type f | sed "s|node_modules/||" | cut -d/ -f1 | sort -u',
        { encoding: 'utf8' }
      );
    } catch {
      result = '';
    }

    const actualModules = result.split('\n').filter(Boolean);

    // 既知のモジュール以外が検出された場合は警告
    const unknownModules = actualModules.filter(
      (mod) => !knownNativeModules.includes(mod)
    );

    if (unknownModules.length > 0) {
      console.warn('未確認のネイティブアドオンが検出されました:', unknownModules);
      console.warn('セキュリティレビューが必要な可能性があります。');
    }

    expect(unknownModules.length).toBe(0);
  });
});
```

## 動作確認方法

### 1. 依存パッケージの脆弱性スキャン

```bash
# 脆弱性スキャン実行
pnpm audit

# 重大度別フィルタリング
pnpm audit --audit-level=moderate  # moderate以上
pnpm audit --audit-level=high      # high以上
pnpm audit --audit-level=critical  # critical のみ

# JSON形式でレポート出力
pnpm audit --json > audit-report.json
```

**期待結果:**

```
audited 1234 packages in 2.5s

found 0 vulnerabilities
```

### 2. ネイティブアドオンの確認

```bash
# ネイティブアドオン（.nodeファイル）の検索
find node_modules -name "*.node" -type f

# パッケージごとに集計
find node_modules -name "*.node" -type f | \
  sed 's|node_modules/||' | \
  cut -d/ -f1 | \
  sort -u
```

### 3. Buffer操作の安全性確認

```typescript
// scripts/test-buffer-safety.ts
import { SafeBuffer } from '@/layers/domain/valueObjects/SafeBuffer';

function testBufferSafety(): void {
  console.log('=== Buffer安全性テスト ===\n');

  // 正常系テスト
  console.log('1. 正常なBuffer作成');
  const result1 = SafeBuffer.create(10);
  console.log(`結果: ${result1.isOk() ? '成功' : '失敗'}\n`);

  // 過大サイズテスト
  console.log('2. 過大なサイズ（2MB）の拒否');
  const result2 = SafeBuffer.create(2 * 1024 * 1024);
  console.log(`結果: ${result2.isErr() ? '成功（拒否した）' : '失敗（受け入れてしまった）'}`);
  if (result2.isErr()) {
    console.log(`エラー: ${result2.error.message}\n`);
  }

  // 境界外書き込みテスト
  console.log('3. 境界外への書き込み拒否');
  const bufferResult = SafeBuffer.create(10);
  if (bufferResult.isOk()) {
    const writeResult = bufferResult.value.write('Test', 20);
    console.log(`結果: ${writeResult.isErr() ? '成功（拒否した）' : '失敗（書き込めてしまった）'}`);
    if (writeResult.isErr()) {
      console.log(`エラー: ${writeResult.error.message}\n`);
    }
  }

  console.log('=== テスト完了 ===');
}

testBufferSafety();
```

```bash
# テスト実行
pnpm tsx scripts/test-buffer-safety.ts
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - バッファオーバーフロー](https://www.ipa.go.jp/security/vuln/websecurity/buffer-overflow.html)
- [OWASP: Buffer Overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)
- [CWE-120: Buffer Copy without Checking Size of Input](https://cwe.mitre.org/data/definitions/120.html)
- [CWE-787: Out-of-bounds Write](https://cwe.mitre.org/data/definitions/787.html)
- [Node.js: Buffer](https://nodejs.org/api/buffer.html)

### セキュリティガイド

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)

### プロジェクト内関連ドキュメント

- [セキュリティガイドライン全般](../../README.md)
- [IPA-OWASP対応表](../../references/ipa-owasp-mapping.md)
- 依存パッケージ管理ポリシー
- [Domain層Value Object実装](../../../layers/components/value-objects.md)

### ツール・サービス

- [Snyk](https://snyk.io/) - 依存パッケージの脆弱性スキャン
- [GitHub Dependabot](https://docs.github.com/ja/code-security/dependabot) - 自動セキュリティ更新
- [npm security advisories](https://www.npmjs.com/advisories) - 脆弱性データベース
- [Renovate](https://www.mend.io/renovate/) - 依存パッケージの自動更新

## 更新履歴

- 2026-01-18: 初版作成（Next.js 16 + TypeScript対応、IPA/OWASP準拠）
