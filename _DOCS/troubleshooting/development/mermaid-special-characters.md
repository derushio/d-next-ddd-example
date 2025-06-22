# Mermaid特殊文字エスケープ問題 🎨

Mermaid図で特殊文字（`@`、`()`、`'"`など）を表示する際のエスケープ方法とトラブルシューティングガイドです。

---

## 🚨 問題の概要

Mermaid図内で関数名やコード例を表示する際、特殊文字が正しく表示されない問題や、「Unsupported markdown: list」エラーが発生する問題があります。

### 典型的な問題例

#### 1. **「Unsupported markdown: list」エラー**

最も頻発する問題の一つです。

```markdown
❌ 番号付きリスト記法による問題
```mermaid
graph LR
    A["1. Domain Layer"] --> B["2. Application Layer"]
    B --> C["3. Infrastructure Layer"]
```

```markdown
❌ 箇条書きリスト記法による問題  
```mermaid
graph TD
    A["- 項目1"] --> B["- 項目2"]
    C["* 項目3"] --> D["* 項目4"]
```

**問題点**：

- `1.`, `2.` などの番号付きリスト記法がMarkdownパーサーに誤認識される
- `- 項目`, `* 項目` などの箇条書き記法も同様の問題を引き起こす
- 「Unsupported markdown: list」エラーが表示される
- Mermaid図が正しく描画されない

#### 2. **特殊文字エスケープ問題**

```markdown
❌ 間違ったエスケープ方法
```mermaid
graph TD
    A[UserService] --> B["@injectable() デコレータ"]
    A --> C["resolve('UserService')"]
```

**問題点**：

- `&#64;` は `@` の正しいエスケープではない
- `&#40;&#41;` は `()` の正しいエスケープではない  
- `&#39;` は `'` の正しいエスケープではない
- 表示時に文字化けや解析エラーが発生

---

## ✅ 正しい解決方法

### 1. **「Unsupported markdown: list」エラーの解決**

#### 解決方法A：ダブルクォートで囲む

```markdown
✅ 番号付きリスト記法をダブルクォートで囲む
```mermaid
graph LR
    A["1. Domain Layer"] --> B["2. Application Layer"]
    B --> C["3. Infrastructure Layer"]
```

```markdown
✅ 箇条書きリスト記法をダブルクォートで囲む
```mermaid
graph TD
    A["- 項目1"] --> B["- 項目2"]
    C["* 項目3"] --> D["* 項目4"]
```

#### 解決方法B：別の表現に変更する（推奨）

```markdown
✅ より分かりやすい表現に変更
```mermaid
graph LR
    A[Step1: Domain Layer] --> B[Step2: Application Layer]
    B --> C[Step3: Infrastructure Layer]
```

```markdown
✅ アイコンや記号で代替
```mermaid
graph TD
    A[🧠 Domain Layer] --> B[📋 Application Layer]
    B --> C[🔧 Infrastructure Layer]
```

### 2. **特殊文字エスケープ：ダブルクォートで囲む**

最も簡単で信頼性の高い方法です。

```markdown
✅ 正しいエスケープ方法
```mermaid
graph TD
    A[UserService] --> B["@injectable() デコレータ"]
    A --> C["resolve('UserService')"]
    D[Component] --> E["@inject(INJECTION_TOKENS.Service)"]
    F[Test] --> G["expect.any(UserRepository)"]
    H[Container] --> I["container.resolve(CreateUserUseCase)"]
```

### 2. **HTMLエンティティコード（必要時のみ）**

ダブルクォートでも解決しない場合の代替手段：

```markdown
特殊なケースでのエスケープ
```mermaid
graph TD
    A[Node] --> B["Function#35;with#35;hash"]  
    C[Node] --> D["Text#59;with#59;semicolon"]
```

**よく使用するHTMLエンティティ**：

- `#35;` → `#` (ハッシュ)
- `#59;` → `;` (セミコロン)
- `#40;` → `(` (開き括弧)
- `#41;` → `)` (閉じ括弧)

---

## 🔧 実際の修正例

### 例1：「Unsupported markdown: list」エラーの修正

#### Before（エラーが発生）

```mermaid
graph LR
    A["1. 🧠 Domain Layer"] --> B["2. 🗄️ Infrastructure Layer"]
    B --> C["3. 📋 Application Layer"]
    C --> D["4. 🎨 Presentation Layer"]
```

#### After（修正後）

```mermaid
graph LR
    A[Step1: 🧠 Domain Layer] --> B[Step2: 🗄️ Infrastructure Layer]
    B --> C[Step3: 📋 Application Layer]
    C --> D[Step4: 🎨 Presentation Layer]
```

または

```mermaid
graph LR
    A["1. 🧠 Domain Layer"] --> B["2. 🗄️ Infrastructure Layer"]
    B --> C["3. 📋 Application Layer"]
    C --> D["4. 🎨 Presentation Layer"]
```

### 例2：特殊文字エスケープの修正

#### Before（間違ったエスケープ）

```mermaid
graph TD
    A[UserDomainService] --> B["@injectable() デコレータ"]
    C[Server Action] --> D["resolve('CreateUserUseCase')"]
    E[Test] --> F["expect.any(UserRepository)"]
```

#### After（正しいエスケープ）

```mermaid
graph TD
    A[UserDomainService] --> B["@injectable() デコレータ"]
    C[Server Action] --> D["resolve('CreateUserUseCase')"]
    E[Test] --> F["expect.any(UserRepository)"]
```

---

## 📋 特殊文字別対応表

| 文字 | ❌ 間違った書き方 | ✅ 正しい書き方 | 用途 |
|------|------------------|-----------------|------|
| `@` | `&#64;` | `"@injectable()"` | デコレータ |
| `()` | `&#40;&#41;` | `"function()"` | 関数呼び出し |
| `'` | `&#39;` | `"resolve('Service')"` | 文字列リテラル |
| `"` | `&#34;` | `'Text "quoted"'` | クォート内クォート |
| `.` | `&#46;` | `"object.method"` | プロパティアクセス |
| `#` | `&#35;` | `"hash#35;tag"` | ハッシュタグ（必要時のみ） |
| `;` | `&#59;` | `"code#59;statement"` | セミコロン（必要時のみ） |

---

## 🎯 ベストプラクティス

### ✅ 推奨事項

1. **ダブルクォート優先**: まずは `""` で囲んでみる
2. **シンプルに保つ**: 過度なエスケープは避ける
3. **テスト**: 変更後は実際にMermaid図が正しく表示されるか確認
4. **一貫性**: プロジェクト内で統一した書き方を使用

### ❌ 避けるべき事項

1. **HTMLエンティティの乱用**: `&#数字;` 形式は最終手段として使用
2. **混在エスケープ**: 同一図内で複数の方法を混在させない
3. **過度な複雑化**: 読みやすさを犠牲にしない

---

## 🐛 トラブルシューティング

### 問題：Mermaid図が表示されない

**原因**：

- 特殊文字の不正なエスケープ
- 構文エラー

**解決方法**：

1. 特殊文字をダブルクォートで囲む
2. Mermaidのライブプレビューでテスト
3. ブラウザの開発者ツールでエラーを確認

### 問題：文字化けが発生する

**原因**：

- HTMLエンティティコードの誤用
- 文字エンコーディングの問題

**解決方法**：

1. ダブルクォートエスケープに変更
2. ファイルエンコーディングをUTF-8に確認

### 問題：一部の文字だけ表示されない

**原因**：

- 予約語との衝突
- 特定文字の処理問題

**解決方法**：

1. 該当箇所をダブルクォートで囲む
2. 必要に応じてHTMLエンティティコードを使用

---

## 🔍 検証方法

### 1. **ripgrepでの問題検出**

```bash
# 問題のあるエスケープパターンを検索
rg "&#[0-9]+;" _DOCS --type md

# 特定の問題パターンを検索
rg "&#64;" _DOCS --type md    # @のエスケープ問題
rg "&#40;" _DOCS --type md    # (のエスケープ問題
```

### 2. **修正後の確認**

```bash
# 修正が完了したか確認
rg "&#[0-9]+;" _DOCS --type md
# 出力がなければ修正完了
```

### 3. **Mermaidプレビューツール**

- [Mermaid Live Editor](https://mermaid.live/)
- VS Code Mermaid Preview拡張
- GitHub/GitLabのMermaidプレビュー

---

## 📚 参考資料

### 公式ドキュメント

- [Mermaid Flowcharts Syntax](https://mermaid.js.org/syntax/flowchart.html)
- [Mermaid FAQ - Special Characters](https://mermaid.js.org/config/faq.html)

### Stack Overflow参考記事

- [Mermaid CLI - how do you escape characters?](https://stackoverflow.com/questions/28121525/mermaid-cli-how-do-you-escape-characters)
- [Mermaid diagram escape invalid characters](https://stackoverflow.com/questions/77964627/mermaid-diagram-escape-invalid-characters)

---

## 💡 今後の予防策

1. **テンプレート化**: よく使うパターンをテンプレート化
2. **リンター設定**: Markdownリンターでの自動検出
3. **CI/CD統合**: プルリクエスト時の自動チェック
4. **ドキュメント更新**: 新しい問題が見つかったら本ドキュメントを更新
