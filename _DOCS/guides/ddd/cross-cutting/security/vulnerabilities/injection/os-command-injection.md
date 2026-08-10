# OSコマンドインジェクション対策ガイド

## 概要

OSコマンドインジェクション（OS Command Injection）は、Webアプリケーションがユーザからの入力値を適切に検証せずにOSコマンドの一部として使用することで、攻撃者が任意のOSコマンドを実行できてしまう脆弱性です。

### 脆弱性の説明

攻撃者がシェルのメタ文字（`;`, `|`, `&`, `$()`, `` ` ``, `\n` など）を含む入力値を送信することで、意図しないコマンドを注入・実行できます。

**脆弱な例:**

```typescript
// 危険: ユーザ入力を直接シェルコマンドに埋め込む
import { exec } from 'node:child_process';

export async function convertFile(filename: string) {
  // filename = "file.txt; rm -rf /" のような入力で任意コマンド実行
  exec(`convert ${filename} output.pdf`, (error, stdout, stderr) => {
    // ...
  });
}
```

### 発生しうる脅威

OSコマンドインジェクションが成功すると、以下のような深刻な被害が発生します。

| 脅威 | 説明 | 影響度 |
|------|------|--------|
| サーバー制御の乗っ取り | 管理者権限でのコマンド実行により、サーバー全体が制御される | 致命的 |
| データ窃取 | データベースファイル、設定ファイル、ソースコードの窃取 | 高 |
| マルウェア設置 | バックドア、ボットネットクライアントの設置 | 高 |
| サービス妨害 | システムリソースの枯渇、サービス停止 | 中 |
| 踏み台化 | 他のシステムへの攻撃の起点として悪用 | 高 |

### 特に注意が必要なケース

以下の機能実装時は、OSコマンドインジェクションのリスクが高いため、特に慎重な設計が必要です。

- **ファイル操作**
  - 画像変換（ImageMagick, FFmpeg など）
  - PDF生成（Ghostscript, wkhtmltopdf など）
  - ファイル圧縮・解凍（zip, tar など）

- **外部コマンド呼び出し**
  - Git操作
  - システムコマンド実行（ping, nslookup など）
  - スクリプト言語インタープリタ呼び出し

- **サードパーティツール連携**
  - レポート生成ツール
  - バッチ処理システム
  - データ変換ツール

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| IPA | 2. OSコマンドインジェクション | 「安全なウェブサイトの作り方」第11版 |
| OWASP Top 10 | A03:2021-Injection | Injection 全般（SQL, OS Command, LDAP等） |
| CWE | CWE-78: Improper Neutralization of Special Elements used in an OS Command | OS Command Injection |

**優先度**: 高（CWE Top 25 2023年版で7位）

## Next.js + TypeScript での対策

### 根本的解決策（必須）

OSコマンドインジェクションの根本的な対策は、**外部コマンド実行を避け、ライブラリで実現する**ことです。

#### 1. シェルコマンド実行を避ける

可能な限り、Node.jsの標準ライブラリや専用のnpmパッケージを使用してください。

```typescript
// 悪い例: シェル経由でファイル削除
import { exec } from 'node:child_process';
exec(`rm ${filepath}`); // 危険

// 良い例: Node.js標準ライブラリを使用
import { unlink } from 'node:fs/promises';
await unlink(filepath); // 安全
```

#### 2. 専用ライブラリを使用

外部コマンドが必要な場合でも、専用のNode.jsライブラリが存在するケースが多いです。

| 用途 | 避けるべきコマンド | 推奨ライブラリ |
|------|-------------------|----------------|
| 画像処理 | `convert`, `ffmpeg` | `sharp`, `jimp` |
| PDF生成 | `wkhtmltopdf` | `puppeteer`, `jsPDF` |
| 圧縮・解凍 | `zip`, `tar` | `archiver`, `tar-fs` |
| ファイル操作 | `cp`, `mv`, `rm` | `fs-extra` |
| Git操作 | `git` コマンド | `simple-git`, `isomorphic-git` |

**実装例: 画像変換**

```typescript
// 悪い例: ImageMagick をシェル経由で実行
import { exec } from 'node:child_process';

async function convertImageBad(inputPath: string, outputPath: string) {
  return new Promise((resolve, reject) => {
    exec(`convert ${inputPath} ${outputPath}`, (error) => {
      if (error) reject(error);
      else resolve(outputPath);
    });
  });
}

// 良い例: sharp ライブラリを使用
import sharp from 'sharp';

async function convertImageGood(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(800, 600)
    .toFile(outputPath);
  return outputPath;
}
```

#### 3. やむを得ず実行する場合は execFile を使用

シェルを経由せず、引数を配列で分離して渡す `execFile` を使用します。

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// 良い例: execFile で引数を分離
async function runSafeCommand(filename: string) {
  // シェルを経由しないため、メタ文字がコマンドとして解釈されない
  const { stdout } = await execFileAsync('file', ['-b', filename]);
  return stdout.trim();
}

// 悪い例: exec でシェルを経由
async function runUnsafeCommand(filename: string) {
  const { stdout } = await execAsync(`file -b ${filename}`); // 危険
  return stdout.trim();
}
```

**execFile の安全性**

- `exec` はシェルを経由するため、メタ文字が解釈される
- `execFile` はシェルを経由せず、直接プログラムを実行
- 引数が配列で分離されているため、インジェクションが発生しない

```typescript
// execFile の内部動作イメージ
execFile('command', ['arg1', 'arg2']); // command arg1 arg2
// ↓ シェルを経由しない
// command プロセスに直接 arg1, arg2 を渡す

exec('command arg1 arg2'); // シェル経由
// ↓ /bin/sh -c "command arg1 arg2"
// シェルがメタ文字を解釈してしまう
```

### 保険的対策（推奨）

根本的対策に加えて、多層防御の観点から以下の対策を実施します。

#### 1. ホワイトリスト検証

実行可能なコマンドや引数を事前に定義し、それ以外を拒否します。

```typescript
// Domain層: Value Object でホワイトリスト検証
export class AllowedCommand {
  private static readonly ALLOWED_COMMANDS = [
    'file',
    'identify',
    'pdfinfo',
  ] as const;

  private constructor(private readonly value: string) {}

  static create(command: string): Result<AllowedCommand, AppError> {
    if (!this.ALLOWED_COMMANDS.includes(command as any)) {
      return err({ message: `許可されていないコマンド: ${command}`, code: 'DISALLOWED_COMMAND' });
    }
    return ok(new AllowedCommand(command));
  }

  getValue(): string {
    return this.value;
  }
}

// Application層: UseCase で使用
export class AnalyzeFileUseCase {
  async execute(request: { command: string; filePath: string }): Promise<Result<string, AppError>> {
    const commandResult = AllowedCommand.create(request.command);
    if (commandResult.isErr()) {
      return commandResult;
    }

    const filePathResult = SafeFilePath.create(request.filePath);
    if (filePathResult.isErr()) {
      return filePathResult;
    }

    // execFile で安全に実行
    const { stdout } = await execFileAsync(
      commandResult.value.getValue(),
      [filePathResult.value.getValue()]
    );
    return ok(stdout);
  }
}
```

#### 2. 入力値の厳格な制限

ファイルパスやパラメータに使用可能な文字を制限します。

```typescript
// Domain層: ファイルパスの検証
export class SafeFilePath {
  private constructor(private readonly value: string) {}

  static create(filePath: string): Result<SafeFilePath, AppError> {
    // 1. null文字チェック
    if (filePath.includes('\0')) {
      return err({ message: 'ファイルパスにnull文字を含めることはできません', code: 'INVALID_FILE_PATH' });
    }

    // 2. ディレクトリトラバーサル対策
    if (filePath.includes('..')) {
      return err({ message: 'ファイルパスに相対パス指定を含めることはできません', code: 'INVALID_FILE_PATH' });
    }

    // 3. 英数字、ハイフン、アンダースコア、ドット、スラッシュのみ許可
    if (!/^[a-zA-Z0-9_\-./]+$/.test(filePath)) {
      return err({ message: 'ファイルパスに使用できない文字が含まれています', code: 'INVALID_FILE_PATH' });
    }

    // 4. パスの正規化
    const normalized = path.normalize(filePath);

    // 5. 絶対パス化して許可ディレクトリ配下かチェック
    const resolved = path.resolve(normalized);
    const allowedDir = path.resolve('/var/app/uploads');
    if (!resolved.startsWith(allowedDir)) {
      return err({ message: '許可されたディレクトリ外のファイルです', code: 'PATH_OUT_OF_ALLOWED_DIR' });
    }

    return ok(new SafeFilePath(resolved));
  }

  getValue(): string {
    return this.value;
  }
}
```

#### 3. サンドボックス環境での実行

外部コマンド実行が必須の場合、以下の対策を検討します。

- **Dockerコンテナでの分離実行**
  - ネットワークアクセスの制限
  - ファイルシステムの読み取り専用マウント
  - リソース制限（CPU, メモリ）

- **VM2やisolated-vmの使用**
  - JavaScriptの安全な実行環境
  - Node.js標準機能へのアクセス制限

```typescript
// Docker経由での安全な実行例
import Docker from 'dockerode';

const docker = new Docker();

async function runInSandbox(command: string, args: string[]): Promise<string> {
  const container = await docker.createContainer({
    Image: 'alpine:latest',
    Cmd: [command, ...args],
    HostConfig: {
      NetworkMode: 'none', // ネットワークアクセス禁止
      ReadonlyRootfs: true, // 読み取り専用
      Memory: 128 * 1024 * 1024, // 128MB制限
    },
  });

  await container.start();
  const output = await container.logs({ stdout: true, stderr: true });
  await container.remove();

  return output.toString();
}
```

## チェックリスト

開発・レビュー時に以下の項目を確認してください。

### コード実装チェック

- [ ] `child_process.exec()` が使用されていないか
- [ ] シェルを経由するコマンド実行（`` `command` ``, `$(command)` 等）が存在しないか
- [ ] ユーザ入力値が直接コマンド文字列に埋め込まれていないか
- [ ] `execFile` を使用し、引数が配列で分離されているか
- [ ] 専用ライブラリで代替可能な処理が存在しないか

### 入力検証チェック

- [ ] コマンド名がホワイトリストで検証されているか
- [ ] ファイルパスがディレクトリトラバーサル対策されているか
- [ ] シェルメタ文字（`;`, `|`, `&`, `$`, `` ` ``, `\n` 等）が含まれていないか
- [ ] null文字（`\0`）のチェックが実施されているか

### アーキテクチャチェック

- [ ] Domain層で入力値が Value Object として検証されているか
- [ ] Application層で認可チェックが実装されているか
- [ ] Infrastructure層で外部コマンド実行が適切に隔離されているか
- [ ] エラーメッセージに内部情報（ファイルパス、コマンド等）が含まれていないか

## テストパターン

OSコマンドインジェクション対策のテストは、攻撃パターンを網羅的に検証する必要があります。

### 1. ユニットテスト: 入力検証

```typescript
import { describe, it, expect } from 'vitest';
import { SafeFilePath } from '@/layers/domain/valueObjects/SafeFilePath';

describe('SafeFilePath', () => {
  describe('正常系', () => {
    it('英数字のファイル名を受け入れる', () => {
      const result = SafeFilePath.create('document.pdf');
      expect(result.isOk()).toBe(true);
    });

    it('サブディレクトリを含むパスを受け入れる', () => {
      const result = SafeFilePath.create('uploads/2024/file.txt');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('異常系: シェルメタ文字', () => {
    it.each([
      ['file.txt; rm -rf /', 'セミコロンによるコマンド連結'],
      ['file.txt | cat /etc/passwd', 'パイプによるコマンド実行'],
      ['file.txt && cat /etc/passwd', '論理ANDによるコマンド実行'],
      ['$(cat /etc/passwd)', 'コマンド置換'],
      ['`cat /etc/passwd`', 'バッククォートによるコマンド置換'],
      ['file.txt\nrm -rf /', '改行によるコマンド連結'],
    ])('"%s" を拒否する（%s）', (input, _description) => {
      const result = SafeFilePath.create(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('異常系: ディレクトリトラバーサル', () => {
    it.each([
      ['../../etc/passwd', '相対パスによる上位ディレクトリアクセス'],
      ['uploads/../../../etc/passwd', 'サブディレクトリ経由のトラバーサル'],
      ['file\0.txt', 'null文字による拡張子偽装'],
    ])('"%s" を拒否する（%s）', (input, _description) => {
      const result = SafeFilePath.create(input);
      expect(result.isErr()).toBe(true);
    });
  });
});
```

### 2. ユニットテスト: コマンド実行の安全性

```typescript
import { describe, it, expect, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AnalyzeFileUseCase } from '@/layers/application/useCases/AnalyzeFileUseCase';

vi.mock('node:child_process');

const execFileAsync = promisify(execFile);

describe('AnalyzeFileUseCase', () => {
  it('execFile が正しい引数で呼び出される', async () => {
    const mockExecFile = vi.mocked(execFileAsync);
    mockExecFile.mockResolvedValue({ stdout: 'PDF document', stderr: '' });

    const useCase = new AnalyzeFileUseCase();
    await useCase.execute({
      command: 'file',
      filePath: 'uploads/document.pdf',
    });

    expect(mockExecFile).toHaveBeenCalledWith('file', [
      expect.stringContaining('uploads/document.pdf'),
    ]);
  });

  it('不正なコマンドを拒否する', async () => {
    const useCase = new AnalyzeFileUseCase();
    const result = await useCase.execute({
      command: 'rm', // 許可されていないコマンド
      filePath: 'uploads/document.pdf',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('許可されていないコマンド');
    }
  });
});
```

### 3. E2Eテスト: Server Action経由の検証

```typescript
import { test, expect } from '@playwright/test';

test.describe('ファイル分析機能', () => {
  test('正常なファイルパスで分析が成功する', async ({ page }) => {
    await page.goto('/analyze');
    await page.fill('[name="filePath"]', 'uploads/document.pdf');
    await page.click('button[type="submit"]');

    await expect(page.locator('.result')).toContainText('PDF document');
  });

  test('シェルメタ文字を含む入力を拒否する', async ({ page }) => {
    await page.goto('/analyze');
    await page.fill('[name="filePath"]', 'file.txt; rm -rf /');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText(
      '使用できない文字が含まれています'
    );
  });

  test('ディレクトリトラバーサルを拒否する', async ({ page }) => {
    await page.goto('/analyze');
    await page.fill('[name="filePath"]', '../../etc/passwd');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText(
      '許可されたディレクトリ外'
    );
  });
});
```

### 4. セキュリティテスト: ペネトレーションテスト

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeFile } from '@/layers/presentation/actions/analyzeFile';

describe('Security: OSコマンドインジェクション対策', () => {
  const attackVectors = [
    // コマンド連結
    'file.txt; cat /etc/passwd',
    'file.txt & cat /etc/passwd',
    'file.txt && cat /etc/passwd',
    'file.txt | cat /etc/passwd',
    'file.txt || cat /etc/passwd',

    // コマンド置換
    '$(cat /etc/passwd)',
    '`cat /etc/passwd`',
    '${IFS}cat${IFS}/etc/passwd',

    // 改行文字
    'file.txt\ncat /etc/passwd',
    'file.txt\rcat /etc/passwd',
    'file.txt\r\ncat /etc/passwd',

    // null文字
    'file.txt\0.pdf',

    // ディレクトリトラバーサル
    '../../etc/passwd',
    '....//....//etc/passwd',

    // エンコード回避
    'file.txt%0acat%20/etc/passwd',
    'file.txt%00.pdf',
  ];

  it.each(attackVectors)(
    '攻撃ベクトル "%s" を防御する',
    async (attackVector) => {
      const result = await analyzeFile({
        command: 'file',
        filePath: attackVector,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeDefined();
      }
    }
  );
});
```

## 参考資料

### 公式ドキュメント

- [IPA: 安全なウェブサイトの作り方 - OSコマンドインジェクション](https://www.ipa.go.jp/security/vuln/websecurity/os-command.html)
- [OWASP: OS Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: Improper Neutralization of Special Elements used in an OS Command](https://cwe.mitre.org/data/definitions/78.html)
- [Node.js: Child Process | execFile](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback)

### プロジェクト内関連ドキュメント

- [セキュリティガイドライン全般](../../README.md)
- 入力検証パターン
- [IPA-OWASP対応表](../../references/ipa-owasp-mapping.md)
- [Domain層Value Object実装](../../../layers/components/value-objects.md)

### 外部リソース

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Cheat Sheet: OS Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [HackTricks: Command Injection](https://book.hacktricks.xyz/pentesting-web/command-injection)
