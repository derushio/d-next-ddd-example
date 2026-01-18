# Entity 時刻比較テスト問題

## 問題症状

User entityなどのテストで、`updatedAt`フィールドの時刻比較が期待通りに動作しない。

```typescript
// ❌ 失敗するテスト例
test('プロフィール更新でupdatedAtが更新される', () => {
 const user = User.create(validData);
 const originalUpdatedAt = user.updatedAt;

 user.updateProfile({ name: 'New Name' });
 const newUpdatedAt = user.updatedAt;

 expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
 // ❌ 同じ時刻になってしまいテストが失敗
});
```

## 原因

JavaScript/TypeScriptの`new Date()`は**ミリ秒単位**で時刻を生成しますが、テスト実行速度が非常に早いため、**同一ミリ秒内で複数の操作が完了**してしまい、時刻が同じになってしまいます。

## 解決方法

### 方法1: 時間差を保証する（推奨）

テスト内で明示的に時間差を作る：

```typescript
// ✅ 正常に動作するテスト
test('プロフィール更新でupdatedAtが更新される', async () => {
 const user = User.create(validData);
 const originalUpdatedAt = user.updatedAt;

 // 10ms待機して時刻差を保証
 await new Promise((resolve) => setTimeout(resolve, 10));

 user.updateProfile({ name: 'New Name' });
 const newUpdatedAt = user.updatedAt;

 expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
});
```

### 方法2: モック時刻を使用

```typescript
test('プロフィール更新でupdatedAtが更新される', () => {
 let mockTime = Date.now();
 const mockDate = vi.spyOn(global, 'Date').mockImplementation(() => {
  return new Date(mockTime) as any;
 });

 const user = User.create(validData);
 const originalUpdatedAt = user.updatedAt;

 // 時刻を進める
 mockTime += 1000;

 user.updateProfile({ name: 'New Name' });
 const newUpdatedAt = user.updatedAt;

 expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

 mockDate.mockRestore();
});
```

## ベストプラクティス

1. **時刻比較テストでは必ず時間差を保証する**
2. **`setTimeout`の最小値は10ms程度がオススメ**（環境によって異なる）
3. **Entity の時刻フィールドテストではこの問題は頻出**
4. **CI環境でも再現する可能性が高いため必ず対処する**

## 関連する問題

- `createdAt` vs `updatedAt` の比較テスト
- 履歴管理機能での時刻順序テスト
- 並行処理でのタイムスタンプ重複

## 検証済み環境

- Vitest 3.2.3
- Node.js 22.16.0
- TypeScript 5.x
