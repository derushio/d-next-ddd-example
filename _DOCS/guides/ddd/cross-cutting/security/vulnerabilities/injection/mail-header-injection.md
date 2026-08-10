# メールヘッダインジェクション対策ガイド

## 概要

メールヘッダインジェクションは、メール送信処理において改行コード（`\r\n`）を挿入することで、メールヘッダを改ざんし、追加の宛先設定やメール本文の書き換えを可能にする脆弱性です。

### 脆弱性の説明

攻撃者がメールアドレスや件名などのヘッダフィールドに改行コードを挿入することで、以下のような不正操作が可能になります。

- Bcc、Ccフィールドへの任意の宛先追加（スパム送信）
- メール件名の改ざん
- メール本文の書き換え
- 追加のメールヘッダ設定（X-Priorityなど）

**攻撃例**:

```
入力値: user@example.com\r\nBcc: spam@attacker.com
結果のヘッダ:
To: user@example.com
Bcc: spam@attacker.com  # 攻撃者が挿入した不正なヘッダ
Subject: お問い合わせありがとうございます
```

### 発生しうる脅威

1. **スパムメールの大量送信**: サーバが踏み台として悪用される
2. **フィッシング攻撃**: 正規のサーバから不正なメールが送信される
3. **情報漏洩**: 本来の宛先以外に機密情報が送信される
4. **サービス信頼性の低下**: 送信元ドメインがスパム判定される
5. **法的リスク**: 特定電子メール法違反の可能性

### 特に注意が必要なケース

- **お問い合わせフォーム**: ユーザが入力したメールアドレスを使用する場合
- **通知メール送信**: 動的に生成されるメール内容を送信する場合
- **パスワードリセット**: メールアドレスベースでの認証を行う場合
- **招待メール**: ユーザが他のユーザにメールを送信できる機能

## IPA/OWASP対応

| 基準 | カテゴリ | 詳細 |
|------|---------|------|
| IPA  | 11. メールヘッダインジェクション | 安全なウェブサイトの作り方 第7版 |
| OWASP Top 10 | A03:2021-Injection | インジェクション攻撃の一種 |
| CWE | CWE-93 | Improper Neutralization of CRLF Sequences |

**重要度**: 中（スパム送信の踏み台となるリスクがあるため対策必須）

## Next.js + TypeScript での対策

### 根本的解決策（必須）

#### 1. 信頼できるメールライブラリの使用

Node.js環境では `nodemailer` などの信頼できるライブラリを使用します。これらのライブラリは内部的にヘッダインジェクション対策を実装しています。

```typescript
// src/layers/infrastructure/mail/NodemailerMailService.ts
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { injectable } from 'tsyringe';

export interface SendMailRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@injectable()
export class NodemailerMailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async send(request: SendMailRequest): Promise<void> {
    // nodemailerは内部的に改行コードを適切に処理する
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: request.to, // nodemailerがエスケープ処理を行う
      subject: request.subject, // nodemailerがエスケープ処理を行う
      text: request.text,
      html: request.html,
    });
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 2. 改行コード（\r\n）の除去

ライブラリを使用する前に、入力値から改行コードを明示的に除去します。

```typescript
// src/layers/domain/value-objects/Email.ts
import { DomainError } from '@/layers/domain/errors/DomainError';

export class Email {
  public readonly value: string;

  constructor(value: string) {
    this.validateEmail(value);
    // 改行コードを除去（メールヘッダインジェクション対策）
    const sanitized = this.removeNewlines(value);
    this.value = sanitized.toLowerCase();
  }

  toString(): string {
    return this.value;
  }

  private removeNewlines(value: string): string {
    // \r, \n, \r\n を全て除去
    return value.replace(/[\r\n]+/g, '');
  }

  private validateEmail(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    // 改行コードが含まれていないかチェック
    if (/[\r\n]/.test(value)) {
      throw new DomainError(
        'メールアドレスに改行コードが含まれています',
        'EMAIL_CONTAINS_NEWLINE',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
    if (!emailRegex.test(value) || value.includes('..')) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    if (value.length > 254) {
      throw new DomainError(
        'メールアドレスが長すぎます（254文字以内である必要があります）',
        'EMAIL_TOO_LONG',
      );
    }

    // 禁止文字チェック（ヘッダインジェクション対策）
    const forbiddenChars = /[<>\\"'&]/;
    if (forbiddenChars.test(value)) {
      throw new DomainError(
        'メールアドレスに使用できない文字が含まれています',
        'EMAIL_INVALID_CHARACTERS',
      );
    }
  }
}
```

#### 3. 宛先のホワイトリスト管理

特定のドメインや検証済みメールアドレスのみに送信を許可します。

```typescript
// src/layers/domain/services/EmailWhitelistService.ts
import { injectable } from 'tsyringe';
import { Email } from '@/layers/domain/value-objects/Email';

@injectable()
export class EmailWhitelistService {
  private allowedDomains: string[];

  constructor() {
    // 環境変数から許可ドメインリストを取得
    this.allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',');
  }

  isAllowed(email: Email): boolean {
    // ホワイトリストが設定されていない場合は全て許可（開発環境）
    if (this.allowedDomains.length === 0) {
      return true;
    }

    const domain = email.getDomain();
    return this.allowedDomains.some(
      (allowedDomain) => domain === allowedDomain.toLowerCase(),
    );
  }

  getAllowedDomains(): string[] {
    return [...this.allowedDomains];
  }
}
```

### 保険的対策（推奨）

#### 1. 入力値からの改行除去（複数箇所での防御）

Domain層のValue Objectだけでなく、Presentation層でも改行除去を実施します。

```typescript
// src/app/server-actions/contact/sendContactMailAction.ts
'use server';

import { resolve } from '@/di/resolver';
import { SendContactMailUseCase } from '@/layers/application/use-cases/contact/SendContactMailUseCase';
export interface SendContactMailInput {
  email: string;
  subject: string;
  message: string;
}

export async function sendContactMailAction(input: SendContactMailInput) {
  // 改行コードの除去（Presentation層での防御）
  const sanitizedInput = {
    email: input.email.replace(/[\r\n]+/g, ''),
    subject: input.subject.replace(/[\r\n]+/g, ''),
    message: input.message, // 本文は改行を許可
  };

  const useCase = resolve(SendContactMailUseCase);
  const result = await useCase.execute({
    email: sanitizedInput.email,
    subject: sanitizedInput.subject,
    message: sanitizedInput.message,
  });

  if (result.isErr()) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}
```

#### 2. メールアドレス形式の厳格な検証

RFC 5322準拠の厳格な検証を実施します。

```typescript
// src/layers/domain/value-objects/Email.ts（追加実装）
export class Email {
  // ... 既存のコード

  private validateEmailStrict(value: string): void {
    // RFC 5322準拠の厳格な正規表現（簡略版）
    const strictEmailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!strictEmailRegex.test(value)) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    // ローカル部の長さチェック（最大64文字）
    const [localPart, domain] = value.split('@');
    if (localPart.length > 64) {
      throw new DomainError(
        'メールアドレスのローカル部が長すぎます（64文字以内）',
        'EMAIL_LOCAL_PART_TOO_LONG',
      );
    }

    // ドメイン部の長さチェック（最大255文字）
    if (domain.length > 255) {
      throw new DomainError(
        'メールアドレスのドメイン部が長すぎます（255文字以内）',
        'EMAIL_DOMAIN_TOO_LONG',
      );
    }

    // 連続するドット、先頭・末尾のドットをチェック
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      throw new DomainError(
        'メールアドレスのローカル部に不正なドットが含まれています',
        'EMAIL_INVALID_DOT_USAGE',
      );
    }
  }
}
```

#### 3. レート制限

メール送信処理にレート制限を実装し、スパム送信の踏み台となることを防ぎます。

```typescript
// src/layers/infrastructure/mail/RateLimitedMailService.ts
import { injectable, inject } from 'tsyringe';
import type { NodemailerMailService, SendMailRequest } from './NodemailerMailService';
import { DI_TOKENS } from '@/di/tokens';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

@injectable()
export class RateLimitedMailService {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly maxRequestsPerHour = 10; // 1時間あたり10通まで

  constructor(
    @inject(DI_TOKENS.MAIL_SERVICE)
    private mailService: NodemailerMailService,
  ) {}

  async send(request: SendMailRequest): Promise<void> {
    const key = request.to;

    // レート制限チェック
    if (this.isRateLimited(key)) {
      throw new Error('メール送信のレート制限に達しています。しばらく待ってから再試行してください。');
    }

    // メール送信
    await this.mailService.send(request);

    // カウンター更新
    this.incrementCounter(key);
  }

  private isRateLimited(key: string): boolean {
    const entry = this.rateLimitMap.get(key);
    if (!entry) {
      return false;
    }

    // リセット時刻を過ぎていればカウンターをクリア
    if (new Date() > entry.resetAt) {
      this.rateLimitMap.delete(key);
      return false;
    }

    return entry.count >= this.maxRequestsPerHour;
  }

  private incrementCounter(key: string): void {
    const entry = this.rateLimitMap.get(key);
    const now = new Date();
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1時間後

    if (!entry) {
      this.rateLimitMap.set(key, { count: 1, resetAt });
    } else {
      entry.count += 1;
    }
  }

  // テスト用: レート制限をリセット
  resetRateLimit(key: string): void {
    this.rateLimitMap.delete(key);
  }
}
```

## チェックリスト

### 実装前チェックリスト

- [ ] メール送信機能の要件を明確化（誰が、誰に、何を送信するか）
- [ ] nodemailerなどの信頼できるメールライブラリを選定
- [ ] 環境変数でSMTP設定を管理（.envファイルに記載しない）
- [ ] メールアドレスのホワイトリストが必要か検討
- [ ] レート制限の実装が必要か検討

### 実装中チェックリスト

- [ ] Email Value Objectで改行コードの検証を実装
- [ ] メールアドレス形式の厳格な検証を実装（RFC 5322準拠）
- [ ] 件名（Subject）からも改行コードを除去
- [ ] nodemailerなどのライブラリを正しく使用
- [ ] メール送信失敗時のエラーハンドリングを実装
- [ ] レート制限を実装（必要に応じて）

### テスト時チェックリスト

- [ ] 改行コード（`\r\n`、`\n`、`\r`）を含むメールアドレスで送信できないことを確認
- [ ] 改行コードを含む件名で送信できないことを確認
- [ ] 正常なメールアドレスでメール送信が成功することを確認
- [ ] レート制限が正しく機能することを確認（連続送信をブロック）
- [ ] メール送信失敗時に適切なエラーメッセージが返されることを確認

### デプロイ前チェックリスト

- [ ] 本番環境のSMTP設定が正しく設定されている
- [ ] メールアドレスのホワイトリストが適切に設定されている（必要な場合）
- [ ] レート制限の閾値が適切に設定されている
- [ ] 送信元メールアドレス（FROM）が正しく設定されている
- [ ] SPF、DKIM、DMARCなどのメール認証設定が完了している

## テストパターン

### ユニットテスト

```typescript
// tests/unit/domain/value-objects/Email.test.ts
import { describe, it, expect } from 'vitest';
import { Email } from '@/layers/domain/value-objects/Email';
import { DomainError } from '@/layers/domain/errors/DomainError';

describe('Email Value Object - メールヘッダインジェクション対策', () => {
  describe('改行コード検証', () => {
    it('\\r\\nを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user@example.com\r\nBcc: spam@attacker.com')).toThrow(
        DomainError,
      );
    });

    it('\\nを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user@example.com\nBcc: spam@attacker.com')).toThrow(
        DomainError,
      );
    });

    it('\\rを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user@example.com\rBcc: spam@attacker.com')).toThrow(
        DomainError,
      );
    });

    it('複数の改行コードを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user@example.com\r\n\r\nBcc: spam@attacker.com')).toThrow(
        DomainError,
      );
    });

    it('改行コードを含まない正常なメールアドレスは許可される', () => {
      expect(() => new Email('user@example.com')).not.toThrow();
    });
  });

  describe('禁止文字検証', () => {
    it('<>を含むメールアドレスは拒否される', () => {
      expect(() => new Email('<user@example.com>')).toThrow(DomainError);
    });

    it('バックスラッシュを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user\\@example.com')).toThrow(DomainError);
    });

    it('クォートを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user"@example.com')).toThrow(DomainError);
    });
  });

  describe('RFC 5322準拠検証', () => {
    it('ローカル部が64文字を超える場合は拒否される', () => {
      const longLocal = 'a'.repeat(65);
      expect(() => new Email(`${longLocal}@example.com`)).toThrow(DomainError);
    });

    it('ドメイン部が255文字を超える場合は拒否される', () => {
      const longDomain = 'a'.repeat(256);
      expect(() => new Email(`user@${longDomain}.com`)).toThrow(DomainError);
    });

    it('連続するドットを含むメールアドレスは拒否される', () => {
      expect(() => new Email('user..name@example.com')).toThrow(DomainError);
    });
  });
});
```

```typescript
// tests/unit/infrastructure/mail/NodemailerMailService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { Transporter } from 'nodemailer';
import { NodemailerMailService } from '@/layers/infrastructure/mail/NodemailerMailService';

describe('NodemailerMailService - メールヘッダインジェクション対策', () => {
  let service: NodemailerMailService;
  let mockTransporter: MockProxy<Transporter>;

  beforeEach(() => {
    mockTransporter = mock<Transporter>();
    service = new NodemailerMailService();
    // @ts-expect-error - private property access for testing
    service.transporter = mockTransporter;
  });

  describe('メール送信', () => {
    it('正常なメールアドレスでメール送信が成功する', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.send({
        to: 'user@example.com',
        subject: 'テスト件名',
        text: 'テスト本文',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'テスト件名',
          text: 'テスト本文',
        }),
      );
    });

    it('メール送信失敗時はエラーがスローされる', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('送信失敗'));

      await expect(
        service.send({
          to: 'user@example.com',
          subject: 'テスト件名',
          text: 'テスト本文',
        }),
      ).rejects.toThrow('送信失敗');
    });
  });
});
```

```typescript
// tests/unit/infrastructure/mail/RateLimitedMailService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { RateLimitedMailService } from '@/layers/infrastructure/mail/RateLimitedMailService';
import type { NodemailerMailService } from '@/layers/infrastructure/mail/NodemailerMailService';

describe('RateLimitedMailService - レート制限', () => {
  let service: RateLimitedMailService;
  let mockMailService: MockProxy<NodemailerMailService>;

  beforeEach(() => {
    mockMailService = mock<NodemailerMailService>();
    service = new RateLimitedMailService(mockMailService);
  });

  it('レート制限内であればメール送信が成功する', async () => {
    mockMailService.send.mockResolvedValue(undefined);

    await service.send({
      to: 'user@example.com',
      subject: 'テスト',
      text: 'テスト',
    });

    expect(mockMailService.send).toHaveBeenCalledTimes(1);
  });

  it('レート制限を超えるとエラーがスローされる', async () => {
    mockMailService.send.mockResolvedValue(undefined);

    // 10回送信（レート制限内）
    for (let i = 0; i < 10; i++) {
      await service.send({
        to: 'user@example.com',
        subject: 'テスト',
        text: 'テスト',
      });
    }

    // 11回目はレート制限エラー
    await expect(
      service.send({
        to: 'user@example.com',
        subject: 'テスト',
        text: 'テスト',
      }),
    ).rejects.toThrow('レート制限');
  });

  it('異なる宛先はそれぞれ独立してカウントされる', async () => {
    mockMailService.send.mockResolvedValue(undefined);

    await service.send({
      to: 'user1@example.com',
      subject: 'テスト',
      text: 'テスト',
    });

    await service.send({
      to: 'user2@example.com',
      subject: 'テスト',
      text: 'テスト',
    });

    expect(mockMailService.send).toHaveBeenCalledTimes(2);
  });
});
```

### E2Eテスト

```typescript
// tests/e2e/contact-form.spec.ts
import { test, expect } from '@playwright/test';

test.describe('お問い合わせフォーム - メールヘッダインジェクション対策', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('正常なメールアドレスでフォーム送信が成功する', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="subject"]', 'お問い合わせ');
    await page.fill('textarea[name="message"]', 'テストメッセージ');

    await page.click('button[type="submit"]');

    await expect(page.getByText('送信が完了しました')).toBeVisible();
  });

  test('改行コードを含むメールアドレスでフォーム送信が失敗する', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com\nBcc: spam@attacker.com');
    await page.fill('input[name="subject"]', 'お問い合わせ');
    await page.fill('textarea[name="message"]', 'テストメッセージ');

    await page.click('button[type="submit"]');

    await expect(page.getByText('メールアドレスの形式が正しくありません')).toBeVisible();
  });

  test('改行コードを含む件名でフォーム送信が失敗する', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="subject"]', 'お問い合わせ\nBcc: spam@attacker.com');
    await page.fill('textarea[name="message"]', 'テストメッセージ');

    await page.click('button[type="submit"]');

    // 件名から改行コードが除去されるため、送信は成功するが改行は無視される
    await expect(page.getByText('送信が完了しました')).toBeVisible();
  });

  test('連続送信はレート制限により拒否される', async ({ page }) => {
    // 10回送信
    for (let i = 0; i < 10; i++) {
      await page.fill('input[name="email"]', 'user@example.com');
      await page.fill('input[name="subject"]', `お問い合わせ ${i + 1}`);
      await page.fill('textarea[name="message"]', 'テストメッセージ');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // 11回目はレート制限エラー
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="subject"]', 'お問い合わせ 11');
    await page.fill('textarea[name="message"]', 'テストメッセージ');
    await page.click('button[type="submit"]');

    await expect(page.getByText('レート制限に達しています')).toBeVisible();
  });
});
```

## 参考資料

### 公式ドキュメント

- [IPA 安全なウェブサイトの作り方 - メールヘッダインジェクション](https://www.ipa.go.jp/security/vuln/websecurity/mail-header-injection.html)
- [OWASP Top 10 2021 - A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [CWE-93: Improper Neutralization of CRLF Sequences in HTTP Headers](https://cwe.mitre.org/data/definitions/93.html)
- [RFC 5322 - Internet Message Format](https://tools.ietf.org/html/rfc5322)

### ライブラリドキュメント

- [Nodemailer Documentation](https://nodemailer.com/)
- [Nodemailer - Security Considerations](https://nodemailer.com/extras/mailparser/)

### プロジェクト内参照

- [セキュリティ対策概要](../../README.md)
- [IPA-OWASP対応表](../../references/ipa-owasp-mapping.md)
- [Email Value Object実装](/src/layers/domain/value-objects/Email.ts)

### 関連する脆弱性対策

- [HTTPヘッダインジェクション](./http-header-injection.md) - 同様の改行コード挿入攻撃
- [XSS対策](./xss.md) - メール本文のサニタイゼーション
- [CSRF対策](../web-attacks/csrf.md) - メール送信フォームの保護

## 更新履歴

- 2026-01-18: 初版作成（IPA 11脆弱性対応、nodemailer実装パターン、レート制限実装例を追加）
