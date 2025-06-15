# Email Value Object バリデーション問題

## 問題症状

Email Value Objectのバリデーションテストで、一部の不正なメールアドレスが正当と判定されてしまう。

```typescript
// ❌ 通ってしまう不正なテスト例
test('連続ドットは無効', () => {
  expect(() => new Email('user@domain..com')).toThrow();
  // ❌ エラーが投げられずテストが失敗
});
```

## 原因

### 1. 正規表現の不備

基本的な正規表現では複雑なケースをカバーできない：

```typescript
// ❌ 不十分な正規表現
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// → user@domain..com が通ってしまう
```

### 2. エッジケースの見落とし

- 連続ドット（`..`）
- ドメイン部分の先頭・末尾ドット
- 特殊文字の組み合わせ

## 解決方法

### 改良されたバリデーション実装

```typescript
export class Email {
  private readonly value: string;
  // 改良された正規表現（連続ドットを避ける）
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;

  constructor(email: string) {
    if (!email?.trim()) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 基本的な正規表現チェック
    if (!Email.EMAIL_REGEX.test(trimmedEmail)) {
      throw new DomainError('無効なメールアドレス形式です', 'INVALID_EMAIL_FORMAT');
    }

    // 連続ドットチェック
    if (trimmedEmail.includes('..')) {
      throw new DomainError('無効なメールアドレス形式です', 'INVALID_EMAIL_FORMAT');
    }

    // その他の詳細チェック
    const [local, domain] = trimmedEmail.split('@');
    
    if (local.length > 64 || domain.length > 255) {
      throw new DomainError('メールアドレスが長すぎます', 'EMAIL_TOO_LONG');
    }

    this.value = trimmedEmail;
  }
}
```

### テストケースの充実

```typescript
describe('Email Value Object', () => {
  describe('無効なメールアドレス', () => {
    const invalidEmails = [
      'user@domain..com',      // 連続ドット
      'user@.domain.com',      // ドメイン先頭ドット
      'user@domain.com.',      // ドメイン末尾ドット
      'user@@domain.com',      // 連続@
      'user@',                 // ドメイン部分なし
      '@domain.com',           // ローカル部分なし
      'user@domain',           // TLD なし
      'user name@domain.com',  // スペース含む
      '',                      // 空文字
      '   ',                   // 空白のみ
    ];

    test.each(invalidEmails)('"%s" は無効', (email) => {
      expect(() => new Email(email)).toThrow();
    });
  });

  describe('有効なメールアドレス', () => {
    const validEmails = [
      'user@domain.com',
      'user.name@domain.co.jp',
      'user+tag@domain.com',
      'user123@domain-name.org',
    ];

    test.each(validEmails)('"%s" は有効', (email) => {
      expect(() => new Email(email)).not.toThrow();
    });
  });
});
```

## 改良ポイント

1. **正規表現の強化**: `[^\s@.]+$` でドメイン末尾の連続ドットを防止
2. **明示的な連続ドットチェック**: `includes('..')`
3. **長さ制限の追加**: RFC準拠の長さチェック
4. **包括的なテストケース**: エッジケースを網羅

## 参考情報

- RFC 5322: Internet Message Format
- 一般的なメールアドレス検証のベストプラクティス

## 検証済み環境

- Vitest 3.2.3
- TypeScript 5.x
- DDD Value Object パターン
