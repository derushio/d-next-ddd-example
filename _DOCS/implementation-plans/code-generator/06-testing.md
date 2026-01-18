# テスト・検証計画

## 検証の観点

### 1. テンプレート生成の正確性

生成されたコードが以下を満たすことを確認:

- [ ] 構文エラーがない
- [ ] TypeScript型エラーがない
- [ ] プロジェクトのコーディング規約に準拠
- [ ] 既存コードとの一貫性

---

### 2. inject（注入）の正確性

- [ ] 正しい位置に注入される
- [ ] 重複注入が発生しない（skip_if が機能）
- [ ] 既存コードを破壊しない

---

### 3. DI 統合

- [ ] Token が正しく登録される
- [ ] ServiceTypeMap が正しく更新される
- [ ] Container に正しく登録される
- [ ] `resolve()` で取得できる

---

## テストシナリオ

### シナリオ 1: UseCase 生成（新規ドメイン）

```bash
pnpm gen:usecase --name CreateProduct --domain product
```

**期待結果**:

```
✅ src/layers/application/usecases/product/CreateProductUseCase.ts
✅ tests/unit/usecases/product/CreateProductUseCase.test.ts
✅ src/di/tokens.ts (Token追加)
✅ src/di/tokens.ts (TypeMap追加)
✅ src/di/containers/application.container.ts (import追加)
✅ src/di/containers/application.container.ts (登録追加)
```

**検証コマンド**:

```bash
# 型チェック
pnpm type-check

# テスト実行
pnpm test:unit tests/unit/usecases/product/CreateProductUseCase.test.ts

# DI確認
pnpm tsx -e "import { resolve } from './src/di/resolver'; console.log(resolve('CreateProductUseCase'));"
```

---

### シナリオ 2: UseCase 生成（既存ドメイン）

```bash
pnpm gen:usecase --name UpdateUser --domain user
```

**期待結果**:

- 既存の user ドメインに追加される
- 既存ファイルに影響しない

---

### シナリオ 3: 重複生成の防止

```bash
# 1回目
pnpm gen:usecase --name CreateProduct --domain product

# 2回目（同じ名前）
pnpm gen:usecase --name CreateProduct --domain product
```

**期待結果**:

- 2回目は `skip_if` によりスキップされる
- 既存ファイルが上書きされない

---

### シナリオ 4: Entity + Repository 連携生成

```bash
# Entity生成
pnpm gen:entity --name Product

# Repository生成（Entity依存）
pnpm gen:repo --name Product

# UseCase生成（Repository依存）
pnpm gen:usecase --name CreateProduct --domain product --repository Product
```

**期待結果**:

- 全ファイルが正しく連携
- 型エラーなし

---

### シナリオ 5: Server Action 生成

```bash
pnpm gen:action --name createProduct --domain product --usecase CreateProduct
```

**期待結果**:

- Server Action が正しいパスに生成
- UseCase を正しく呼び出す

---

## 回帰テスト

### 既存機能への影響確認

```bash
# 全テスト実行
pnpm test:unit

# 型チェック
pnpm type-check

# lint
pnpm lint

# E2Eテスト
pnpm test:e2e
```

---

## エッジケーステスト

### 1. 特殊文字を含む名前

```bash
pnpm gen:usecase --name Create123Order --domain order
# → バリデーションエラーが出ること
```

### 2. 空の入力

```bash
pnpm gen:usecase --name "" --domain order
# → バリデーションエラーが出ること
```

### 3. 予約語との衝突

```bash
pnpm gen:usecase --name Class --domain test
# → 警告または正しく処理されること
```

---

## パフォーマンステスト

### 生成速度

```bash
time pnpm gen:usecase --name TestPerformance --domain test
```

**期待**: 3秒以内に完了

---

## 検証チェックリスト

### Phase 2 完了時（UseCase）

- [ ] 対話式プロンプトが動作する
- [ ] 引数指定が動作する
- [ ] ファイルが正しいパスに生成される
- [ ] テンプレート変数が正しく展開される
- [ ] inject が正しく動作する
- [ ] `pnpm type-check` が通る
- [ ] 生成されたテストが通る

### Phase 3 完了時（Entity）

- [ ] Entity が正しく生成される
- [ ] EntityId が正しく生成される
- [ ] ファクトリーメソッドが正しい
- [ ] テストが通る

### Phase 4 完了時（Repository）

- [ ] Interface が正しく生成される
- [ ] Prisma実装が正しく生成される
- [ ] DI登録が正しい
- [ ] テストが通る

### Phase 5 完了時（Server Action）

- [ ] 'use server' ディレクティブがある
- [ ] Zod バリデーションが正しい
- [ ] UseCase 呼び出しが正しい
- [ ] テストが通る

### 全 Phase 完了時

- [ ] `pnpm check` が通る
- [ ] 既存テストが全て通る
- [ ] E2E テストが通る

---

## トラブルシューティング

### 問題: inject が動作しない

**原因**: マーカーコメントが見つからない

**解決**:

1. tokens.ts / container.ts のマーカーを確認
2. 正規表現のエスケープを確認
3. `after:` の文字列が正確か確認

---

### 問題: skip_if が機能しない

**原因**: 検索パターンが一致しない

**解決**:

1. skip_if の値が生成されるコードと一致するか確認
2. 大文字小文字を確認

---

### 問題: テンプレート変数が展開されない

**原因**: EJS 構文エラー

**解決**:

1. `<%= %>` の構文を確認
2. 変数名が prompt.js と一致するか確認

---

### 問題: 型エラーが発生する

**原因**: import パスが間違っている

**解決**:

1. テンプレート内の import パスを確認
2. `@/` エイリアスが正しいか確認

---

## 継続的検証

### CI/CD への統合

```yaml
# .github/workflows/test.yml に追加
- name: Test Code Generator
  run: |
    pnpm gen:usecase --name CITest --domain citest
    pnpm type-check
    rm -rf src/layers/application/usecases/citest
    # tokens.ts からCITest関連を削除
```

---

## 完了基準

以下を全て満たすこと:

1. 全ジェネレーターが動作する
2. `pnpm check` が通る
3. 既存機能に影響がない
4. ドキュメントが整備されている
5. チームにハンドオフ可能

---

## 参考

- [Hygen Testing](https://www.hygen.io/docs/testing)
- [Vitest Mock Extended](https://github.com/eratio08/vitest-mock-extended)
