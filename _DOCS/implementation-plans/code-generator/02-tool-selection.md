# ツール選定詳細比較

## 候補ツール

### 1. Hygen

**概要**: プロジェクトローカルで動作する軽量コードジェネレーター

- **GitHub**: [jondot/hygen](https://github.com/jondot/hygen)
- **npm**: 週間 137K ダウンロード
- **Stars**: 5,965
- **ライセンス**: MIT

**特徴**:

- EJS テンプレート
- `_templates/` フォルダでプロジェクト内管理
- inject（既存ファイルへの挿入）機能
- 対話式プロンプト対応
- 設定ファイル不要（テンプレート内で完結）

---

### 2. Plop.js

**概要**: マイクロジェネレーターフレームワーク

- **GitHub**: [plopjs/plop](https://github.com/plopjs/plop)
- **npm**: 週間 573K ダウンロード
- **Stars**: 7,602
- **ライセンス**: MIT

**特徴**:

- Handlebars テンプレート
- `plopfile.js/ts` で設定を一元管理
- append/prepend アクション
- TypeScript ネイティブ対応
- より広い採用実績

---

## 詳細比較

### テンプレート形式

| 観点 | Hygen (EJS) | Plop (Handlebars) |
|------|-------------|-------------------|
| 構文 | `<%= name %>`, `<%- html %>` | `{{ name }}`, `{{{ html }}}` |
| JavaScript埋め込み | `<% if (x) { %>` | `{{#if x}}` |
| ループ | `<% items.forEach(...) %>` | `{{#each items}}` |
| ヘルパー | JavaScriptそのまま | 登録が必要 |

**判定**: EJS の方が JavaScript 開発者に馴染みやすい。TypeScript プロジェクトとの相性が良い。

---

### 設定方法

**Hygen**:

```
_templates/
└── usecase/
    └── new/
        ├── usecase.ejs.t     ← テンプレート（設定込み）
        ├── test.ejs.t
        └── prompt.js         ← 対話式プロンプト（オプション）
```

テンプレートファイル内で frontmatter として設定:

```ejs
---
to: src/layers/application/usecases/<%= domain %>/<%= Name %>UseCase.ts
---
```

**Plop**:

```javascript
// plopfile.ts
export default function (plop) {
  plop.setGenerator('usecase', {
    prompts: [...],
    actions: [
      { type: 'add', path: '...', templateFile: '...' },
      { type: 'append', path: '...', pattern: /.../ },
    ],
  });
}
```

**判定**: Hygen はテンプレートと設定が同じファイル内で完結し、シンプル。Plop は設定が一元管理されるが、ファイル間の行き来が必要。

---

### inject（既存ファイルへの挿入）

**Hygen**:

```ejs
---
to: src/di/tokens.ts
inject: true
after: "// Use Cases"
skip_if: <%= Name %>UseCase
---
  <%= Name %>UseCase: Symbol.for('<%= Name %>UseCase'),
```

**Plop**:

```javascript
{
  type: 'append',
  path: 'src/di/tokens.ts',
  pattern: /(\/\/ Use Cases)/g,
  template: "  {{Name}}UseCase: Symbol.for('{{Name}}UseCase'),",
}
```

**判定**: 両者とも同等の機能。Hygen の方が直感的な記述。

---

### CLI 体験

**Hygen**:

```bash
# 基本
npx hygen usecase new --name CreateOrder --domain order

# 対話式
npx hygen usecase new
? Name: CreateOrder
? Domain: order
```

**Plop**:

```bash
# 対話式（デフォルト）
npx plop usecase
? Name: CreateOrder
? Domain: order

# 引数指定
npx plop usecase CreateOrder order
```

**判定**: Plop は1コマンドで起動、Hygen は generator/action を明示。どちらも十分シンプル。

---

### プロジェクト管理

| 観点 | Hygen | Plop |
|------|-------|------|
| テンプレート配置 | `_templates/` | `plop-templates/` |
| 設定ファイル | なし（テンプレート内） | `plopfile.ts` |
| Git管理 | ✅ テンプレートごとコミット | ✅ 設定+テンプレートでコミット |
| PRレビュー | テンプレート変更が見やすい | 設定変更とテンプレートが分離 |

**判定**: Hygen はテンプレートの変更が1ファイルで完結し、PRレビューしやすい。

---

## このプロジェクトでの評価

### 重要度の重み付け

| 観点 | 重要度 | Hygen | Plop |
|------|--------|-------|------|
| EJS/JS親和性 | 高 | ⭐⭐⭐ | ⭐⭐ |
| inject機能 | 高 | ⭐⭐⭐ | ⭐⭐⭐ |
| 設定シンプルさ | 中 | ⭐⭐⭐ | ⭐⭐ |
| PRレビュー容易性 | 中 | ⭐⭐⭐ | ⭐⭐ |
| 採用実績 | 低 | ⭐⭐ | ⭐⭐⭐ |
| ドキュメント | 低 | ⭐⭐ | ⭐⭐⭐ |

---

## 最終判定

### 採用: **Hygen**

**決め手**:

1. **テンプレートと設定の一体管理**
   - Clean Architecture では複数ファイル同時生成が多い
   - 各テンプレートが独立しているため、メンテナンスしやすい

2. **EJS テンプレート**
   - TypeScript 開発者が馴染みやすい
   - 複雑なロジック（条件分岐、ループ）が書きやすい

3. **inject の直感性**
   - DI登録の自動化に必要
   - frontmatter で宣言的に記述できる

4. **PRレビューの容易さ**
   - テンプレート変更が1ファイルで完結
   - コードとテンプレートを同じPRでレビューできる

### Plop が適しているケース

- チームで設定を一元管理したい場合
- Handlebars に慣れているチーム
- より広いコミュニティサポートが必要な場合

---

## 参考リンク

- [npm-compare: Hygen vs Plop vs Yeoman](https://npm-compare.com/hygen,plop,yeoman-generator)
- [GitHub Issue: How does Hygen compare to Plop?](https://github.com/jondot/hygen/issues/1)
- [Code Scaffolding Tools Comparison](https://overctrl.com/code-scaffolding-tools-which-one-should-you-choose/)
- [Hygen 公式ドキュメント](https://www.hygen.io/)
- [Plop 公式ドキュメント](https://plopjs.com/documentation/)

---

## 次のステップ

→ [03-architecture.md](./03-architecture.md) でテンプレートアーキテクチャを確認
