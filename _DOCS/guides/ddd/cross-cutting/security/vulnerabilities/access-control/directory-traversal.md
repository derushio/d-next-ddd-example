# ディレクトリトラバーサル対策ガイド

## 概要

### 脆弱性の説明

ディレクトリトラバーサル（Directory Traversal）は、Webアプリケーションがファイルパスを適切に検証せずに処理することで、
攻撃者が意図しないディレクトリやファイルにアクセスできてしまう脆弱性です。
パストラバーサル（Path Traversal）とも呼ばれます。

**発生メカニズム:**

攻撃者が相対パス指定（`../`）やシンボリックリンク、特殊なエンコーディングを使用することで、本来アクセスすべきでないファイルやディレクトリにアクセスします。

```typescript
// 脆弱なコード例
export async function downloadFile(filename: string) {
  // filename = "../../etc/passwd" のような入力で任意ファイル読み取り
  const filePath = path.join('/var/app/uploads', filename);
  return fs.readFileSync(filePath);
}
```

攻撃者が `filename` に `../../etc/passwd` を指定すると、以下のパスが生成されます。

```
/var/app/uploads/../../etc/passwd
↓ 正規化後
/var/etc/passwd
```

### 発生しうる脅威

ディレクトリトラバーサルが成功すると、以下のような被害が発生します。

| 脅威 | 影響度 | 説明 |
|------|--------|------|
| 機密情報漏洩 | 高 | 設定ファイル（.env, database.yml）の窃取 |
| ソースコード漏洩 | 高 | アプリケーションロジック、APIキーの流出 |
| システム情報収集 | 中 | /etc/passwd, /proc/等からの情報収集 |
| 認証情報窃取 | 高 | パスワードファイル、秘密鍵の取得 |
| 任意ファイル削除 | 高 | 削除操作が可能な場合、重要ファイルの破壊 |
| 任意ファイル書き込み | 致命的 | Webシェル設置による完全なシステム制御 |

### 特に注意が必要なケース

以下の機能実装時は、ディレクトリトラバーサルのリスクが高いため、特に慎重な対策が必要です。

1. **ファイルダウンロード機能**
   - ユーザーアップロードファイルの取得
   - 添付ファイル、レポートファイルのダウンロード
   - 画像ファイル、PDFの表示

2. **ファイルアップロード機能**
   - ファイル保存先パスの指定
   - ファイル名の自動生成
   - 一時ファイルの管理

3. **インポート/エクスポート機能**
   - CSVインポート、JSONエクスポート
   - 設定ファイルのインポート
   - バックアップファイルの作成・復元

4. **画像・メディア配信**
   - 動的な画像表示
   - ユーザーアバター、プロフィール画像
   - サムネイル生成

5. **テンプレートエンジン**
   - ファイルベースのテンプレート読み込み
   - 部分テンプレート（partial）の動的ロード

## IPA/OWASP対応

| 基準 | カテゴリ | 重要度 |
|------|---------|--------|
| IPA | 9. ディレクトリトラバーサル | 中 |
| OWASP Top 10 2021 | A01:2021-Broken Access Control | 高 |
| CWE | CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal') | 高 |

**参考資料:**

- [IPA「安全なウェブサイトの作り方」第7版](https://www.ipa.go.jp/security/vuln/websecurity/about.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)

## Next.js + TypeScript での対策

### 根本的解決策（必須）

#### 1. ファイルパスにユーザー入力を直接使用しない

最も安全な方法は、ファイルパスを直接扱わず、IDやハッシュ値によるマッピングを使用することです。

**推奨実装例:**

```typescript
// Domain層: ファイルIDによる管理
export class FileId {
  private constructor(private readonly value: string) {}

  static create(id: string): Result<FileId, AppError> {
    // UUIDまたはCUID2形式のみ許可
    if (!/^[a-z0-9]{25,}$/.test(id)) {
      return err({ message: '無効なファイルIDです', code: 'INVALID_FILE_ID' });
    }
    return ok(new FileId(id));
  }

  getValue(): string {
    return this.value;
  }
}

// Infrastructure層: ファイルメタデータをDBで管理
@injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
  ) {}

  async findById(fileId: FileId): Promise<FileMetadata | null> {
    const fileRecord = await this.prisma.uploadedFile.findUnique({
      where: { id: fileId.getValue() },
    });

    if (!fileRecord) {
      return null;
    }

    // DBに保存された安全なパスを返す
    return new FileMetadata({
      id: fileId,
      storedPath: fileRecord.storedPath, // '/var/app/uploads/abc123.pdf'
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
    });
  }
}

// Application層: IDベースのファイル取得UseCase
export class DownloadFileUseCase {
  async execute(request: { fileId: string }): Promise<Result<Buffer, AppError>> {
    const fileIdResult = FileId.create(request.fileId);
    if (fileIdResult.isErr()) {
      return fileIdResult;
    }

    const fileMetadata = await this.fileRepository.findById(fileIdResult.value);
    if (!fileMetadata) {
      return err({ message: 'ファイルが見つかりません', code: 'FILE_NOT_FOUND' });
    }

    // DBに保存されたパスを使用（ユーザー入力は一切含まれない）
    const fileBuffer = await fs.readFile(fileMetadata.storedPath);
    return ok(fileBuffer);
  }
}
```

**なぜ安全か:**

- ユーザーはファイルIDのみを指定（パス情報は含まれない）
- 実際のファイルパスはDBで管理され、ユーザーから隠蔽
- IDはUUID/CUID2形式で推測不可能
- ファイル取得時はDB経由でパスを解決

#### 2. ホワイトリストによるファイル名検証

ファイル名を直接扱う必要がある場合、厳格なホワイトリスト検証を実施します。

```typescript
// Domain層: 安全なファイル名の検証
export class SafeFileName {
  private static readonly ALLOWED_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.csv'
  ] as const;

  private static readonly MAX_LENGTH = 255;

  private constructor(private readonly value: string) {}

  static create(filename: string): Result<SafeFileName, AppError> {
    // 1. 長さ制限
    if (filename.length > this.MAX_LENGTH) {
      return err({ message: `ファイル名は${this.MAX_LENGTH}文字以内で指定してください`, code: 'FILENAME_TOO_LONG' });
    }

    // 2. null文字チェック（拡張子偽装対策）
    if (filename.includes('\0')) {
      return err({ message: '無効な文字が含まれています', code: 'FILENAME_INVALID_CHAR' });
    }

    // 3. ディレクトリトラバーサル文字列の禁止
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return err({ message: 'ファイル名にパス区切り文字を含めることはできません', code: 'FILENAME_PATH_SEPARATOR' });
    }

    // 4. 隠しファイル対策（.で始まるファイル名を禁止）
    if (filename.startsWith('.')) {
      return err({ message: '隠しファイルは指定できません', code: 'FILENAME_HIDDEN_FILE' });
    }

    // 5. 許可された拡張子のみ受け入れ
    const ext = path.extname(filename).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext as any)) {
      return err({ message: '許可されていないファイル形式です', code: 'FILENAME_INVALID_EXTENSION' });
    }

    // 6. 英数字、ハイフン、アンダースコア、ドットのみ許可
    const baseName = path.basename(filename, ext);
    if (!/^[a-zA-Z0-9_-]+$/.test(baseName)) {
      return err({ message: 'ファイル名に使用できない文字が含まれています', code: 'FILENAME_INVALID_CHAR' });
    }

    return ok(new SafeFileName(filename));
  }

  getValue(): string {
    return this.value;
  }
}
```

#### 3. path.basename() でファイル名のみ抽出

`path.basename()` を使用して、パス情報を完全に除去します。

```typescript
import path from 'node:path';

// 悪い例: ユーザー入力をそのまま使用
async function downloadFileBad(userInput: string) {
  const filePath = path.join('/var/app/uploads', userInput);
  // userInput = "../../etc/passwd" の場合、/var/etc/passwd が生成される
  return fs.readFile(filePath);
}

// 良い例: basename() でファイル名のみ抽出
async function downloadFileGood(userInput: string): Promise<Result<Buffer, AppError>> {
  // basename() はディレクトリ部分を完全に除去
  const safeFilename = path.basename(userInput);
  // "../../etc/passwd" → "passwd"
  // "uploads/../config.env" → "config.env"

  const filenameResult = SafeFileName.create(safeFilename);
  if (filenameResult.isErr()) {
    return filenameResult;
  }

  const filePath = path.join('/var/app/uploads', safeFilename);
  // 必ず /var/app/uploads/配下のファイルのみアクセス

  const fileBuffer = await fs.readFile(filePath);
  return ok(fileBuffer);
}
```

#### 4. path.resolve() で正規化後にベースディレクトリ確認

パスを正規化し、ベースディレクトリ配下であることを検証します。

```typescript
import path from 'node:path';

// Domain層: ベースディレクトリ検証
export class SecureFilePath {
  private static readonly BASE_DIR = path.resolve('/var/app/uploads');

  private constructor(private readonly value: string) {}

  static create(relativePath: string): Result<SecureFilePath, AppError> {
    // 1. パスの正規化（../, ./, シンボリックリンクを解決）
    const normalized = path.normalize(relativePath);

    // 2. 絶対パス化
    const resolved = path.resolve(this.BASE_DIR, normalized);

    // 3. ベースディレクトリ配下であることを確認
    if (!resolved.startsWith(this.BASE_DIR + path.sep)) {
      return err({ message: '許可されたディレクトリ外のファイルです', code: 'PATH_OUTSIDE_BASE_DIR' });
    }

    // 4. ファイルの存在確認（オプション）
    if (!fs.existsSync(resolved)) {
      return err({ message: 'ファイルが見つかりません', code: 'FILE_NOT_FOUND' });
    }

    // 5. 通常ファイルであることを確認（シンボリックリンク対策）
    const stats = fs.statSync(resolved);
    if (!stats.isFile()) {
      return err({ message: '指定されたパスはファイルではありません', code: 'PATH_NOT_FILE' });
    }

    return ok(new SecureFilePath(resolved));
  }

  getValue(): string {
    return this.value;
  }
}

// 使用例
async function secureFileAccess(userInput: string): Promise<Result<Buffer, AppError>> {
  const filePathResult = SecureFilePath.create(userInput);
  if (filePathResult.isErr()) {
    return filePathResult;
  }

  const fileBuffer = await fs.readFile(filePathResult.value.getValue());
  return ok(fileBuffer);
}
```

**path.resolve() の動作:**

```typescript
// ベースディレクトリ: /var/app/uploads

path.resolve('/var/app/uploads', 'document.pdf')
// → /var/app/uploads/document.pdf (安全)

path.resolve('/var/app/uploads', '../../etc/passwd')
// → /var/etc/passwd (ベースディレクトリ外 → 拒否)

path.resolve('/var/app/uploads', 'subdir/../config.env')
// → /var/app/uploads/config.env (正規化後チェック)
```

### 保険的対策（推奨）

根本的対策に加えて、多層防御として以下の対策を実施します。

#### 1. chroot環境での隔離

ファイル操作を実施するプロセスを、特定のディレクトリ配下に隔離します。

**Dockerコンテナでの実装例:**

```yaml
# docker-compose.yml
services:
  app:
    image: node:20-alpine
    volumes:
      # 読み取り専用マウント（アプリケーションコード）
      - ./src:/app/src:ro
      # 書き込み可能マウント（アップロードディレクトリのみ）
      - ./uploads:/var/app/uploads
    # ファイルシステムを読み取り専用に設定（uploadsは除外）
    read_only: true
    tmpfs:
      - /tmp
```

**セキュリティ上の利点:**

- コンテナ内では `/var/app/uploads` 以外への書き込みが不可能
- 攻撃者がディレクトリトラバーサルに成功しても、アクセス範囲が限定される
- ホストシステムへの影響を最小限に抑える

#### 2. 最小権限のファイルシステムアクセス

アプリケーションプロセスに必要最小限のファイルシステム権限を付与します。

**ファイルパーミッション設定例:**

```bash
# アップロードディレクトリ: アプリケーションユーザーのみ読み書き可能
chmod 700 /var/app/uploads
chown app:app /var/app/uploads

# アプリケーションコード: 読み取り専用
chmod -R 500 /var/app/src
chown -R root:root /var/app/src

# 設定ファイル: 読み取り専用（所有者のみ）
chmod 400 /var/app/.env
chown app:app /var/app/.env
```

**Node.jsプロセスの実行ユーザー:**

```dockerfile
# Dockerfile
FROM node:20-alpine

# 非rootユーザーの作成
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

# アプリケーションディレクトリの権限設定
WORKDIR /var/app
COPY --chown=app:app . .

# 非rootユーザーで実行
USER app

CMD ["node", "dist/server.js"]
```

#### 3. ファイルアクセスログの記録

全てのファイルアクセスをログに記録し、異常なアクセスパターンを検出します。

```typescript
// Infrastructure層: ファイルアクセスロガー
@injectable()
export class SecureFileService {
  constructor(
    @inject(INJECTION_TOKENS.Logger) private logger: Logger,
  ) {}

  async readFile(filePath: SecureFilePath, userId: string): Promise<Result<Buffer, AppError>> {
    const path = filePath.getValue();

    // アクセスログの記録
    this.logger.info('ファイルアクセス', {
      userId,
      filePath: path,
      action: 'read',
      timestamp: new Date().toISOString(),
    });

    try {
      const buffer = await fs.readFile(path);
      return ok(buffer);
    } catch (error) {
      // エラーログ（詳細な内部パス情報は含めない）
      this.logger.error('ファイル読み取りエラー', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err({ message: 'ファイルの読み取りに失敗しました', code: 'FILE_READ_ERROR' });
    }
  }
}
```

## コード例（安全なファイル操作）

### 完全な実装例: ファイルダウンロード機能

```typescript
// src/layers/domain/valueObjects/FileId.ts
export class FileId {
  private constructor(private readonly value: string) {}

  static create(id: string): Result<FileId, AppError> {
    if (!/^[a-z0-9]{25,}$/.test(id)) {
      return err({ message: '無効なファイルIDです', code: 'INVALID_FILE_ID' });
    }
    return ok(new FileId(id));
  }

  getValue(): string {
    return this.value;
  }
}

// src/layers/domain/entities/File.ts
export class File {
  constructor(
    public readonly id: FileId,
    public readonly originalName: string,
    public readonly storedPath: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: UserId,
  ) {}
}

// src/layers/domain/repositories/IFileRepository.ts
export interface IFileRepository {
  findById(fileId: FileId): Promise<File | null>;
  save(file: File): Promise<void>;
  delete(fileId: FileId): Promise<void>;
}

// src/layers/infrastructure/repositories/implementations/PrismaFileRepository.ts
@injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
  ) {}

  async findById(fileId: FileId): Promise<File | null> {
    const fileRecord = await this.prisma.uploadedFile.findUnique({
      where: { id: fileId.getValue() },
    });

    if (!fileRecord) {
      return null;
    }

    return new File(
      fileId,
      fileRecord.originalName,
      fileRecord.storedPath,
      fileRecord.mimeType,
      fileRecord.size,
      fileRecord.uploadedAt,
      new UserId(fileRecord.uploadedById),
    );
  }
}

// src/layers/application/useCases/DownloadFileUseCase.ts
@injectable()
export class DownloadFileUseCase {
  constructor(
    @inject(INJECTION_TOKENS.IFileRepository) private fileRepository: IFileRepository,
    @inject(INJECTION_TOKENS.SecureFileService) private fileService: SecureFileService,
  ) {}

  async execute(request: {
    fileId: string;
    userId: string;
  }): Promise<Result<{ buffer: Buffer; file: File }, AppError>> {
    // 1. ファイルIDの検証
    const fileIdResult = FileId.create(request.fileId);
    if (fileIdResult.isErr()) {
      return fileIdResult;
    }

    // 2. ファイルメタデータの取得
    const file = await this.fileRepository.findById(fileIdResult.value);
    if (!file) {
      return err({ message: 'ファイルが見つかりません', code: 'FILE_NOT_FOUND' });
    }

    // 3. 認可チェック（所有者のみダウンロード可能）
    if (file.uploadedBy.getValue() !== request.userId) {
      return err({ message: 'このファイルにアクセスする権限がありません', code: 'FORBIDDEN' });
    }

    // 4. ファイルパスの検証
    const filePathResult = SecureFilePath.create(file.storedPath);
    if (filePathResult.isErr()) {
      return filePathResult;
    }

    // 5. ファイルの読み取り（ログ記録付き）
    const bufferResult = await this.fileService.readFile(
      filePathResult.value,
      request.userId
    );
    if (bufferResult.isErr()) {
      return bufferResult;
    }

    return ok({ buffer: bufferResult.value, file });
  }
}

// src/app/server-actions/file/downloadFile.ts
export async function downloadFile(fileId: string) {
  // 認証確認（requireAuthentication() パターン）
  const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
  const authResult = await getCurrentUserUseCase.requireAuthentication();
  if (authResult.isErr()) {
    return { error: authResult.error.message };
  }
  const currentUser = authResult.value;

  const downloadFileUseCase = resolve('DownloadFileUseCase');
  const result = await downloadFileUseCase.execute({
    fileId,
    userId: currentUser.id,
  });

  if (result.isErr()) {
    return { error: result.error.message };
  }

  const { buffer, file } = result.value;

  // レスポンスヘッダーの設定
  return {
    buffer: buffer.toString('base64'),
    contentType: file.mimeType,
    filename: file.originalName,
  };
}
```

## チェックリスト

実装時およびコードレビュー時に以下の項目を確認してください。

### 実装チェックリスト

- [ ] ファイルアクセスにユーザー入力を直接使用していないか
- [ ] IDベースのファイル管理を採用しているか
- [ ] `path.basename()` でファイル名のみ抽出しているか
- [ ] `path.resolve()` で正規化し、ベースディレクトリ配下を確認しているか
- [ ] ファイル名のホワイトリスト検証が実装されているか
- [ ] `..`, `/`, `\`, null文字のチェックが実施されているか
- [ ] 許可されたファイル拡張子のみを受け入れているか
- [ ] ファイルアクセス時に認可チェックが実装されているか

### セキュリティチェック

- [ ] シンボリックリンクへの対策が実施されているか（`fs.statSync().isFile()`）
- [ ] 隠しファイル（`.`で始まるファイル）へのアクセスが禁止されているか
- [ ] ファイルアクセスログが記録されているか
- [ ] エラーメッセージに内部パス情報が含まれていないか
- [ ] Dockerコンテナで読み取り専用マウントが設定されているか
- [ ] アプリケーションプロセスが非rootユーザーで実行されているか

### アーキテクチャチェック

- [ ] Domain層でファイルパス検証が Value Object として実装されているか
- [ ] Application層でファイルアクセスの認可チェックが実装されているか
- [ ] Infrastructure層でファイルパス解決が適切に隔離されているか
- [ ] Presentation層でユーザー入力の検証が実施されているか

## テストパターン

ディレクトリトラバーサル対策の有効性を検証するテストパターンです。

### ユニットテスト: ファイル名検証

```typescript
import { describe, it, expect } from 'vitest';
import { SafeFileName } from '@/layers/domain/valueObjects/SafeFileName';

describe('SafeFileName', () => {
  describe('正常系', () => {
    it('英数字のファイル名を受け入れる', () => {
      const result = SafeFileName.create('document.pdf');
      expect(result.isOk()).toBe(true);
    });

    it('ハイフンとアンダースコアを含むファイル名を受け入れる', () => {
      const result = SafeFileName.create('my-file_name.txt');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('異常系: ディレクトリトラバーサル', () => {
    it.each([
      ['../../etc/passwd', '相対パス指定'],
      ['..\\..\\windows\\system32\\config\\sam', 'Windows形式の相対パス'],
      ['uploads/../../../etc/passwd', 'サブディレクトリ経由のトラバーサル'],
      ['/etc/passwd', '絶対パス指定'],
      ['file/name.txt', 'スラッシュを含む'],
      ['file\\name.txt', 'バックスラッシュを含む'],
    ])('"%s" を拒否する（%s）', (input, _description) => {
      const result = SafeFileName.create(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('異常系: 特殊文字', () => {
    it.each([
      ['file\0.txt', 'null文字（拡張子偽装）'],
      ['.env', '隠しファイル'],
      ['.htaccess', 'Apacheの設定ファイル'],
      ['file<script>.txt', 'HTMLタグ'],
      ['file;rm -rf /.txt', 'コマンド実行文字'],
    ])('"%s" を拒否する（%s）', (input, _description) => {
      const result = SafeFileName.create(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('異常系: 拡張子', () => {
    it.each([
      ['malware.exe', '実行ファイル'],
      ['script.sh', 'シェルスクリプト'],
      ['config.yml', 'YAMLファイル'],
      ['index.html', 'HTMLファイル'],
    ])('"%s" を拒否する（許可されていない拡張子）', (input) => {
      const result = SafeFileName.create(input);
      expect(result.isErr()).toBe(true);
    });
  });
});
```

### ユニットテスト: パス正規化と検証

```typescript
import { describe, it, expect } from 'vitest';
import { SecureFilePath } from '@/layers/domain/valueObjects/SecureFilePath';
import path from 'node:path';
import fs from 'node:fs';

describe('SecureFilePath', () => {
  const testBaseDir = '/tmp/test-uploads';

  beforeEach(() => {
    // テスト用ディレクトリとファイルの作成
    fs.mkdirSync(testBaseDir, { recursive: true });
    fs.writeFileSync(path.join(testBaseDir, 'test.txt'), 'content');
  });

  afterEach(() => {
    // クリーンアップ
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  });

  describe('正常系', () => {
    it('ベースディレクトリ配下のファイルを受け入れる', () => {
      const result = SecureFilePath.create('test.txt');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) { expect(result.value.getValue()).toBe(path.join(testBaseDir, 'test.txt')); }
    });
  });

  describe('異常系: ディレクトリトラバーサル', () => {
    it('相対パスでの上位ディレクトリアクセスを拒否する', () => {
      const result = SecureFilePath.create('../../etc/passwd');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) { expect(result.error.message).toContain('許可されたディレクトリ外'); }
    });

    it('正規化後にベースディレクトリ外になるパスを拒否する', () => {
      const result = SecureFilePath.create('subdir/../../outside.txt');
      expect(result.isErr()).toBe(true);
    });
  });

  describe('異常系: 存在しないファイル', () => {
    it('存在しないファイルを拒否する', () => {
      const result = SecureFilePath.create('nonexistent.txt');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) { expect(result.error.message).toContain('ファイルが見つかりません'); }
    });
  });

  describe('異常系: ディレクトリ', () => {
    it('ディレクトリへのアクセスを拒否する', () => {
      fs.mkdirSync(path.join(testBaseDir, 'subdir'));
      const result = SecureFilePath.create('subdir');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) { expect(result.error.message).toContain('ファイルではありません'); }
    });
  });
});
```

### E2Eテスト: ファイルダウンロード機能

```typescript
import { test, expect } from '@playwright/test';

test.describe('ファイルダウンロード機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('正常なファイルIDでダウンロードが成功する', async ({ page }) => {
    await page.goto('/files');

    // アップロード済みファイルをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-file-btn"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('document.pdf');
  });

  test('存在しないファイルIDでエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/files/nonexistent-file-id');
    await expect(page.locator('.error')).toContainText('ファイルが見つかりません');
  });

  test('他ユーザーのファイルにアクセスできない', async ({ page }) => {
    await page.goto('/files/other-user-file-id');
    await expect(page.locator('.error')).toContainText('アクセスする権限がありません');
  });

  test('ディレクトリトラバーサルを試みてもエラーが返る', async ({ page }) => {
    // API直接呼び出しで攻撃を試行
    const response = await page.request.post('/api/files/download', {
      data: { fileId: '../../etc/passwd' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('無効なファイルID');
  });
});
```

### セキュリティテスト: ペネトレーションテスト

```typescript
import { describe, it, expect } from 'vitest';
import { downloadFile } from '@/app/server-actions/file/downloadFile';

describe('Security: ディレクトリトラバーサル対策', () => {
  const attackVectors = [
    // 相対パス
    '../../etc/passwd',
    '../../../etc/shadow',
    '..\\..\\windows\\system32\\config\\sam',

    // 絶対パス
    '/etc/passwd',
    'C:\\Windows\\System32\\config\\sam',

    // URLエンコード
    '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%2F..%2F..%2Fetc%2Fpasswd',

    // 二重エンコード
    '%252e%252e%252f%252e%252e%252fetc%252fpasswd',

    // null文字
    'file.txt\0.pdf',
    'file.txt%00.pdf',

    // 正規化回避
    '....//....//etc/passwd',
    '..../..../etc/passwd',

    // シンボリックリンク（ファイル名として）
    'symlink-to-etc-passwd',

    // 隠しファイル
    '../.env',
    '../../.ssh/id_rsa',
  ];

  it.each(attackVectors)(
    '攻撃ベクトル "%s" を防御する',
    async (attackVector) => {
      const result = await downloadFile(attackVector);

      expect(result.error).toBeDefined();
      expect(result.buffer).toBeUndefined();
    }
  );
});
```

## 参考資料

### 公式ドキュメント

- [IPA「安全なウェブサイトの作り方」第7版 - ディレクトリトラバーサル](https://www.ipa.go.jp/security/vuln/websecurity/path-traversal.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- [Node.js: Path API](https://nodejs.org/api/path.html)

### プロジェクト内関連ドキュメント

- [セキュリティガイドライン全般](../../README.md)
- [OSコマンドインジェクション対策](../injection/os-command-injection.md)
- [認可制御の実装](./authorization.md)
- [IPA-OWASP対応表](../../references/ipa-owasp-mapping.md)

### 外部リソース

- [OWASP Cheat Sheet: File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [HackTricks: File Inclusion/Path Traversal](https://book.hacktricks.xyz/pentesting-web/file-inclusion)
- [Node.js Security Best Practices: File System Access](https://nodejs.org/en/docs/guides/security/)

## トラブルシューティング

### よくある問題と解決策

#### 問題1: Windowsとの互換性

**問題:**
Windowsではパス区切り文字が `\` のため、Unix系OSと挙動が異なる。

**解決策:**
`path.sep` を使用し、プラットフォームに依存しない実装を行う。

```typescript
// 良い例: プラットフォーム非依存
const baseDir = path.resolve('/var/app/uploads');
if (!resolved.startsWith(baseDir + path.sep)) {
  // Windows: 'C:\\var\\app\\uploads\\'
  // Unix: '/var/app/uploads/'
  return err({ message: '許可されたディレクトリ外', code: 'PATH_OUTSIDE_BASE_DIR' });
}

// 悪い例: Unix限定
if (!resolved.startsWith(baseDir + '/')) {
  // Windowsでは正常に動作しない
  return err({ message: '許可されたディレクトリ外', code: 'PATH_OUTSIDE_BASE_DIR' });
}
```

#### 問題2: シンボリックリンク対策

**問題:**
攻撃者がシンボリックリンクを作成し、許可されたディレクトリ外のファイルにアクセスする。

**解決策:**
`fs.lstatSync()` を使用し、シンボリックリンクを拒否する。

```typescript
import fs from 'node:fs';

export class SecureFilePath {
  static create(relativePath: string): Result<SecureFilePath, AppError> {
    const resolved = path.resolve(this.BASE_DIR, relativePath);

    // ベースディレクトリ配下であることを確認
    if (!resolved.startsWith(this.BASE_DIR + path.sep)) {
      return err({ message: '許可されたディレクトリ外', code: 'PATH_OUTSIDE_BASE_DIR' });
    }

    // シンボリックリンクを拒否
    const stats = fs.lstatSync(resolved); // statSync ではなく lstatSync
    if (stats.isSymbolicLink()) {
      return err({ message: 'シンボリックリンクはサポートされていません', code: 'PATH_SYMLINK' });
    }

    // 通常ファイルであることを確認
    if (!stats.isFile()) {
      return err({ message: 'ファイルではありません', code: 'PATH_NOT_FILE' });
    }

    return ok(new SecureFilePath(resolved));
  }
}
```

#### 問題3: 大文字小文字の区別

**問題:**
ファイルシステムが大文字小文字を区別しない場合（Windows, macOS）、検証をバイパスされる可能性がある。

**解決策:**
ファイル名を小文字に正規化してから検証する。

```typescript
export class SafeFileName {
  static create(filename: string): Result<SafeFileName, AppError> {
    // 小文字に正規化
    const normalized = filename.toLowerCase();

    // 拡張子チェック
    const ext = path.extname(normalized);
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return err({ message: '許可されていないファイル形式です', code: 'FILENAME_INVALID_EXTENSION' });
    }

    return ok(new SafeFileName(filename));
  }
}
```

## まとめ

ディレクトリトラバーサル対策は、ファイル操作機能を実装する際の最重要課題です。本プロジェクトでは以下の原則を遵守してください。

### 必ず実施すること

1. **IDベースのファイル管理を採用する**（根本的対策）
2. **ユーザー入力を直接ファイルパスに使用しない**（根本的対策）
3. **path.basename() でファイル名のみ抽出する**（根本的対策）
4. **path.resolve() で正規化し、ベースディレクトリ配下を確認する**（根本的対策）

### 推奨事項

5. **ホワイトリストによるファイル名検証を実施する**（保険的対策）
6. **chroot環境またはDockerで隔離する**（保険的対策）
7. **最小権限のファイルシステムアクセスを設定する**（保険的対策）
8. **ファイルアクセスログを記録する**（監視・検知）

### レビュー時の確認事項

- ファイルアクセスにユーザー入力が直接使用されていないか
- `path.basename()`, `path.resolve()` による検証が実装されているか
- `..`, `/`, `\`, null文字のチェックが実施されているか
- 認可チェックが適切に実装されているか

これらの対策を徹底することで、ディレクトリトラバーサルのリスクを最小限に抑えることができます。
