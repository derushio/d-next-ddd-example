# UseCase バリデーションロジック問題

## 問題症状

UseCaseでのバリデーションロジックが想定通りに動作しない。特に、空文字列と`undefined`の判定で問題が発生する。

```typescript
// ❌ 問題のあるロジック例
if (request.name && request.name.trim()) {
 // 空文字列 "" が渡されても this block が実行されない
 user.updateProfile({ name: request.name.trim() });
}
// 結果：空文字列で更新されずにスキップされる
```

## 原因分析

### 1. JavaScript の Falsy 値の落とし穴

```typescript
// Falsy values in JavaScript
console.log(!!undefined); // false
console.log(!!null); // false
console.log(!!''); // false ← 空文字列も falsy!
console.log(!!0); // false
console.log(!!false); // false
```

### 2. 不明確な意図

- **空文字列を許可したい**のか？
- **空文字列を拒否したい**のか？
- **undefinedの場合は更新しない**のか？

## 解決方法

### パターン1: 明示的な undefined チェック（推奨）

```typescript
// ✅ 明示的に undefined をチェック
export class UpdateUserUseCase {
 async execute(request: UpdateUserRequest): Promise<UpdateUserResponse> {
  const user = await this.userRepository.findById(new UserId(request.userId));
  if (!user) {
   return failure('ユーザーが見つかりません', 'USER_NOT_FOUND');
  }

  const updateData: any = {};

  // name が明示的に指定された場合のみ更新（空文字列も含む）
  if (request.name !== undefined) {
   if (request.name.trim().length === 0) {
    return failure('名前は空にできません', 'EMPTY_NAME');
   }
   updateData.name = request.name.trim();
  }

  // email が明示的に指定された場合のみ更新
  if (request.email !== undefined) {
   try {
    const newEmail = new Email(request.email);
    if (!(await this.userDomainService.isEmailDuplicate(newEmail))) {
     updateData.email = newEmail;
    } else {
     return failure('このメールアドレスは既に使用されています', 'EMAIL_ALREADY_EXISTS');
    }
   } catch (error) {
    return failure('無効なメールアドレスです', 'INVALID_EMAIL');
   }
  }

  // 更新データがある場合のみ更新実行
  if (Object.keys(updateData).length > 0) {
   user.updateProfile(updateData);
   await this.userRepository.update(user.id, user);
  }

  return success(user);
 }
}
```

### パターン2: バリデーション関数の分離

```typescript
// ✅ バリデーションロジックを分離
class UserUpdateValidator {
 static validateName(name: string | undefined): {
  isValid: boolean;
  error?: string;
 } {
  // undefined の場合は更新しない（有効とする）
  if (name === undefined) {
   return { isValid: true };
  }

  // 空文字列チェック
  if (name.trim().length === 0) {
   return { isValid: false, error: '名前は空にできません' };
  }

  // 長さチェック
  if (name.trim().length > 100) {
   return { isValid: false, error: '名前は100文字以内で入力してください' };
  }

  return { isValid: true };
 }

 static validateEmail(email: string | undefined): {
  isValid: boolean;
  error?: string;
 } {
  if (email === undefined) {
   return { isValid: true };
  }

  try {
   new Email(email);
   return { isValid: true };
  } catch {
   return { isValid: false, error: '無効なメールアドレスです' };
  }
 }
}

// UseCase での使用
export class UpdateUserUseCase {
 async execute(request: UpdateUserRequest): Promise<UpdateUserResponse> {
  // バリデーション
  const nameValidation = UserUpdateValidator.validateName(request.name);
  if (!nameValidation.isValid) {
   return failure(nameValidation.error!, 'VALIDATION_ERROR');
  }

  const emailValidation = UserUpdateValidator.validateEmail(request.email);
  if (!emailValidation.isValid) {
   return failure(emailValidation.error!, 'VALIDATION_ERROR');
  }

  // 実際の更新処理...
 }
}
```

### テストケースの充実

```typescript
describe('UpdateUserUseCase', () => {
 describe('name フィールドの更新', () => {
  test('undefined の場合は更新しない', async () => {
   const request = { userId: 'user1', name: undefined, email: undefined };

   const result = await updateUserUseCase.execute(request);

   expect(result.success).toBe(true);
   expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  test('空文字列の場合はエラー', async () => {
   const request = { userId: 'user1', name: '', email: undefined };

   const result = await updateUserUseCase.execute(request);

   expect(result.success).toBe(false);
   expect(result.error.message).toBe('名前は空にできません');
  });

  test('空白文字のみの場合はエラー', async () => {
   const request = { userId: 'user1', name: '   ', email: undefined };

   const result = await updateUserUseCase.execute(request);

   expect(result.success).toBe(false);
   expect(result.error.message).toBe('名前は空にできません');
  });

  test('有効な名前の場合は更新', async () => {
   const request = { userId: 'user1', name: 'New Name', email: undefined };

   const result = await updateUserUseCase.execute(request);

   expect(result.success).toBe(true);
   expect(mockUser.updateProfile).toHaveBeenCalledWith({
    name: 'New Name',
   });
  });
 });
});
```

## ベストプラクティス

1. **明示的な比較**: `value !== undefined` を使用
2. **バリデーション関数の分離**: UseCaseの可読性向上
3. **包括的なテスト**: 境界条件をすべてテスト
4. **エラーメッセージの統一**: ユーザーフレンドリーなメッセージ
5. **型定義の活用**: `string | undefined` で意図を明確化

## よくある間違い

```typescript
// ❌ よくある間違い
if (value) {
} // 空文字列が falsy
if (value && value.trim()) {
} // 同上
if (!!value) {
} // 同上

// ✅ 正しい書き方
if (value !== undefined) {
} // 明示的
if (typeof value === 'string') {
} // 型チェック
```

## 関連する問題

- Optional fields での partial update
- Form validation との連携
- Frontend からの null/undefined 値の扱い

## 検証済み環境

- TypeScript 5.x
- Vitest 3.2.3
- Clean Architecture + DDD
