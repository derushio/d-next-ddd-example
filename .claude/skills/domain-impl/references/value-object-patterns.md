# Value Object実装パターン詳細リファレンス

Value Objectの高度な実装パターンと設計手法を解説します。

## 複合Value Objectの実装

### 住所Value Object

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';

export class Address {
  public readonly postalCode: string;
  public readonly prefecture: string;
  public readonly city: string;
  public readonly streetAddress: string;
  public readonly building?: string;

  constructor(
    postalCode: string,
    prefecture: string,
    city: string,
    streetAddress: string,
    building?: string,
  ) {
    this.validatePostalCode(postalCode);
    this.validatePrefecture(prefecture);
    this.validateCity(city);
    this.validateStreetAddress(streetAddress);

    this.postalCode = postalCode.replace(/[^0-9]/g, '');
    this.prefecture = prefecture.trim();
    this.city = city.trim();
    this.streetAddress = streetAddress.trim();
    this.building = building?.trim();
  }

  // 値による等価性
  equals(other: Address): boolean {
    if (!(other instanceof Address)) {
      return false;
    }

    return (
      this.postalCode === other.postalCode &&
      this.prefecture === other.prefecture &&
      this.city === other.city &&
      this.streetAddress === other.streetAddress &&
      this.building === other.building
    );
  }

  // フォーマット済み住所
  getFormattedAddress(): string {
    const parts = [
      `〒${this.postalCode}`,
      this.prefecture,
      this.city,
      this.streetAddress,
    ];

    if (this.building) {
      parts.push(this.building);
    }

    return parts.join(' ');
  }

  // ビジネスロジック
  isDeliverable(): boolean {
    const nonDeliverableAreas = ['離島', '山間部'];
    return !nonDeliverableAreas.some(
      (area) => this.city.includes(area) || this.streetAddress.includes(area),
    );
  }

  isSamePrefecture(other: Address): boolean {
    return this.prefecture === other.prefecture;
  }

  private validatePostalCode(postalCode: string): void {
    const cleanedCode = postalCode.replace(/[^0-9]/g, '');
    if (cleanedCode.length !== 7) {
      throw new DomainError(
        '郵便番号は7桁である必要があります',
        'INVALID_POSTAL_CODE',
      );
    }
  }

  private validatePrefecture(prefecture: string): void {
    if (!prefecture || prefecture.trim().length === 0) {
      throw new DomainError('都道府県は必須です', 'PREFECTURE_REQUIRED');
    }
  }

  private validateCity(city: string): void {
    if (!city || city.trim().length === 0) {
      throw new DomainError('市区町村は必須です', 'CITY_REQUIRED');
    }
  }

  private validateStreetAddress(streetAddress: string): void {
    if (!streetAddress || streetAddress.trim().length === 0) {
      throw new DomainError('番地は必須です', 'STREET_ADDRESS_REQUIRED');
    }
  }
}
```

### 金額Value Object

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';

export class Money {
  public readonly amount: number;
  public readonly currency: string;

  constructor(amount: number, currency: string) {
    this.validateAmount(amount);
    this.validateCurrency(currency);

    this.amount = Math.round(amount * 100) / 100; // 小数点2桁に丸め
    this.currency = currency.toUpperCase();
  }

  // 算術演算（新しいインスタンスを返す）
  add(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.validateSameCurrency(other);
    const newAmount = this.amount - other.amount;

    if (newAmount < 0) {
      throw new DomainError('残高不足です', 'INSUFFICIENT_BALANCE');
    }

    return new Money(newAmount, this.currency);
  }

  multiply(multiplier: number): Money {
    if (multiplier < 0) {
      throw new DomainError(
        '乗数は0以上である必要があります',
        'INVALID_MULTIPLIER',
      );
    }

    return new Money(this.amount * multiplier, this.currency);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new DomainError(
        '除数は正の値である必要があります',
        'INVALID_DIVISOR',
      );
    }

    return new Money(this.amount / divisor, this.currency);
  }

  // 比較演算
  isGreaterThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this.amount < other.amount;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  equals(other: Money): boolean {
    if (!(other instanceof Money)) {
      return false;
    }

    return this.amount === other.amount && this.currency === other.currency;
  }

  // 通貨変換
  convertTo(targetCurrency: string, exchangeRate: number): Money {
    if (exchangeRate <= 0) {
      throw new DomainError(
        '為替レートは正の値である必要があります',
        'INVALID_EXCHANGE_RATE',
      );
    }

    const convertedAmount = this.amount * exchangeRate;
    return new Money(convertedAmount, targetCurrency);
  }

  // 税込み価格計算
  withTax(taxRate: number): Money {
    if (taxRate < 0 || taxRate > 1) {
      throw new DomainError(
        '税率は0-1の範囲である必要があります',
        'INVALID_TAX_RATE',
      );
    }

    return new Money(this.amount * (1 + taxRate), this.currency);
  }

  // フォーマット
  format(): string {
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: this.currency,
    });
    return formatter.format(this.amount);
  }

  private validateAmount(amount: number): void {
    if (isNaN(amount) || amount < 0) {
      throw new DomainError(
        '金額は0以上の数値である必要があります',
        'INVALID_AMOUNT',
      );
    }
  }

  private validateCurrency(currency: string): void {
    const validCurrencies = ['USD', 'EUR', 'JPY', 'GBP'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      throw new DomainError(
        'サポートされていない通貨です',
        'UNSUPPORTED_CURRENCY',
      );
    }
  }

  private validateSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError(
        `異なる通貨での操作はできません: ${this.currency} と ${other.currency}`,
        'CURRENCY_MISMATCH',
      );
    }
  }
}
```

## ファクトリーメソッドパターン

### 多様な生成方法を提供

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';
import { randomUUID } from 'node:crypto';

export type UserId = string & { readonly __brand: 'UserId' };

export function generateUserId(): UserId {
  return randomUUID() as UserId;
}

export function createUserId(value: string): UserId {
  if (!value || value.trim().length === 0) {
    throw new DomainError('ユーザーIDは必須です', 'USER_ID_REQUIRED');
  }

  if (value.length > 50) {
    throw new DomainError('ユーザーIDが長すぎます', 'USER_ID_TOO_LONG');
  }

  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(value)) {
    throw new DomainError(
      'ユーザーIDに不正な文字が含まれています',
      'USER_ID_INVALID_FORMAT',
    );
  }

  return value as UserId;
}

// 数値からの変換
export function userIdFromNumber(num: number): UserId {
  return createUserId(`user-${num}`);
}

// 安全な変換（失敗時はnull）
export function tryCreateUserId(value: string): UserId | null {
  try {
    return createUserId(value);
  } catch {
    return null;
  }
}
```

### Emailのファクトリーパターン

```typescript
import { DomainError } from '@/layers/domain/errors/DomainError';

export class Email {
  public readonly value: string;

  constructor(value: string) {
    this.validateEmail(value);
    this.value = value.toLowerCase();
  }

  // 標準ファクトリー
  static of(value: string): Email {
    return new Email(value);
  }

  // 安全なファクトリー
  static tryCreate(value: string): Email | null {
    try {
      return new Email(value);
    } catch {
      return null;
    }
  }

  // バリデーション付きファクトリー
  static createWithValidation(value: string): { email: Email | null; error: string | null } {
    try {
      return { email: new Email(value), error: null };
    } catch (error) {
      if (error instanceof DomainError) {
        return { email: null, error: error.message };
      }
      return { email: null, error: '不明なエラーが発生しました' };
    }
  }

  // ドメイン指定ファクトリー
  static fromLocalPartAndDomain(localPart: string, domain: string): Email {
    return new Email(`${localPart}@${domain}`);
  }

  toString(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  // ドメイン変更（新しいインスタンスを返す）
  withDomain(domain: string): Email {
    const localPart = this.getLocalPart();
    return new Email(`${localPart}@${domain}`);
  }

  private validateEmail(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError('メールアドレスは必須です', 'EMAIL_REQUIRED');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
    if (!emailRegex.test(value)) {
      throw new DomainError(
        'メールアドレスの形式が正しくありません',
        'EMAIL_INVALID_FORMAT',
      );
    }

    if (value.length > 254) {
      throw new DomainError('メールアドレスが長すぎます', 'EMAIL_TOO_LONG');
    }
  }
}
```

## Null Objectパターン

```typescript
export class Email {
  private static readonly EMPTY = new Email('empty@internal.null');
  private readonly _isEmpty: boolean;

  constructor(value: string, isEmpty = false) {
    if (!isEmpty) {
      this.validateEmail(value);
    }
    this.value = value.toLowerCase();
    this._isEmpty = isEmpty;
  }

  static empty(): Email {
    return Email.EMPTY;
  }

  isEmpty(): boolean {
    return this._isEmpty;
  }

  static isValid(value: string): boolean {
    try {
      new Email(value);
      return true;
    } catch {
      return false;
    }
  }

  // ... その他のメソッド
}

// 使用例
const email = user.email;
if (!email.isEmpty()) {
  await emailService.send(email.value, 'Welcome!');
}
```

## Type Safety強化パターン

### 型安全なValue Object

```typescript
export class Temperature {
  public readonly value: number;
  public readonly unit: 'celsius' | 'fahrenheit';

  private constructor(value: number, unit: 'celsius' | 'fahrenheit') {
    this.validateValue(value, unit);
    this.value = value;
    this.unit = unit;
  }

  static celsius(value: number): Temperature {
    return new Temperature(value, 'celsius');
  }

  static fahrenheit(value: number): Temperature {
    return new Temperature(value, 'fahrenheit');
  }

  toCelsius(): Temperature {
    if (this.unit === 'celsius') {
      return this;
    }

    const celsiusValue = ((this.value - 32) * 5) / 9;
    return Temperature.celsius(celsiusValue);
  }

  toFahrenheit(): Temperature {
    if (this.unit === 'fahrenheit') {
      return this;
    }

    const fahrenheitValue = (this.value * 9) / 5 + 32;
    return Temperature.fahrenheit(fahrenheitValue);
  }

  equals(other: Temperature): boolean {
    const thisCelsius = this.toCelsius();
    const otherCelsius = other.toCelsius();
    return Math.abs(thisCelsius.value - otherCelsius.value) < 0.01;
  }

  private validateValue(value: number, unit: 'celsius' | 'fahrenheit'): void {
    const minTemp = unit === 'celsius' ? -273.15 : -459.67;
    if (value < minTemp) {
      throw new DomainError(
        `温度が絶対零度を下回っています (${unit}: ${minTemp})`,
        'TEMPERATURE_BELOW_ABSOLUTE_ZERO',
      );
    }
  }
}
```

## テストパターン

### Value Object単体テスト

```typescript
import { describe, it, expect } from 'vitest';
import { Email } from '@/layers/domain/value-objects/Email';
import { Money } from '@/layers/domain/value-objects/Money';
import { DomainError } from '@/layers/domain/errors/DomainError';

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('正常なメールアドレスでEmailを作成できる', () => {
      const email = new Email('test@example.com');
      expect(email.value).toBe('test@example.com');
    });

    it('メールアドレスが正規化される', () => {
      const email = new Email('  Test@Example.COM  ');
      expect(email.value).toBe('test@example.com');
    });

    it('不正なメールアドレスでエラーが発生する', () => {
      expect(() => new Email('invalid-email')).toThrow(DomainError);
      expect(() => new Email('invalid-email')).toThrow('メールアドレスの形式が正しくありません');
    });

    it('空のメールアドレスでエラーが発生する', () => {
      expect(() => new Email('')).toThrow(DomainError);
      expect(() => new Email('')).toThrow('メールアドレスは必須です');
    });
  });

  describe('equals', () => {
    it('同じ値のEmailは等価である', () => {
      const email1 = new Email('test@example.com');
      const email2 = new Email('test@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('異なる値のEmailは等価でない', () => {
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('getDomain', () => {
    it('ドメイン部分を取得できる', () => {
      const email = new Email('test@example.com');
      expect(email.getDomain()).toBe('example.com');
    });
  });
});

describe('Money Value Object', () => {
  describe('arithmetic operations', () => {
    it('同じ通貨の金額を加算できる', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'USD');

      const result = money1.add(money2);

      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    it('異なる通貨の金額を加算するとエラーが発生する', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'JPY');

      expect(() => money1.add(money2)).toThrow(DomainError);
      expect(() => money1.add(money2)).toThrow('異なる通貨での操作はできません');
    });

    it('減算で残高不足の場合はエラーが発生する', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(150, 'USD');

      expect(() => money1.subtract(money2)).toThrow(DomainError);
      expect(() => money1.subtract(money2)).toThrow('残高不足です');
    });
  });

  describe('immutability', () => {
    it('算術演算は新しいインスタンスを返す', () => {
      const originalMoney = new Money(100, 'USD');
      const newMoney = originalMoney.add(new Money(50, 'USD'));

      // 元のインスタンスは変更されない
      expect(originalMoney.amount).toBe(100);
      expect(newMoney.amount).toBe(150);
    });
  });

  describe('comparison', () => {
    it('金額の比較ができる', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'USD');

      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money1.isLessThan(money2)).toBe(false);
    });
  });
});
```

詳細な実装例は`_DOCS/guides/ddd/layers/components/value-objects.md`を参照してください。
