# 実装ステップ

このドキュメントはAIが段階的に実装を進めるためのガイドです。

---

## Phase 1: 基盤構築

### Step 1.1: Hygen インストール

```bash
pnpm add -D hygen
```

**検証**:

```bash
npx hygen --help
```

---

### Step 1.2: Hygen 初期化

```bash
npx hygen init self
```

これにより `_templates/` ディレクトリが作成されます。

**生成されるファイル**:

```
_templates/
├── generator/
│   ├── help/
│   │   └── index.ejs.t
│   ├── new/
│   │   └── hello.ejs.t
│   └── with-prompt/
│       ├── hello.ejs.t
│       └── prompt.js
└── init/
    └── repo/
        └── new-repo.ejs.t
```

---

### Step 1.3: ヘルパー関数作成

**ファイル**: `_templates/_helpers.js`

```javascript
/**
 * Hygen テンプレートヘルパー関数
 */
module.exports = {
  /**
   * camelCase → PascalCase
   * @example toPascalCase('createOrder') => 'CreateOrder'
   */
  toPascalCase: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * PascalCase → camelCase
   * @example toCamelCase('CreateOrder') => 'createOrder'
   */
  toCamelCase: (str) => {
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  /**
   * PascalCase → UPPER_SNAKE_CASE
   * @example toUpperSnake('CreateOrder') => 'CREATE_ORDER'
   */
  toUpperSnake: (str) => {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '');
  },

  /**
   * PascalCase → kebab-case
   * @example toKebabCase('CreateOrder') => 'create-order'
   */
  toKebabCase: (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  },
};
```

---

### Step 1.4: tokens.ts に注入マーカー追加

**ファイル**: `src/di/tokens.ts`

既存のファイルに以下のコメントマーカーを追加:

```typescript
export const INJECTION_TOKENS = {
  // Infrastructure Services
  PrismaClient: Symbol.for('PrismaClient'),
  // ... existing ...

  // Use Cases
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
  // ... existing ...
  // [HYGEN:USECASE_TOKENS]
} as const;

// ... 中略 ...

export interface ServiceTypeMap {
  // ... existing ...

  // Use Cases
  CreateUserUseCase: CreateUserUseCase;
  // ... existing ...
  // [HYGEN:USECASE_TYPEMAP]
}
```

---

### Step 1.5: container に注入マーカー追加

**ファイル**: `src/di/containers/application.container.ts`

```typescript
// ... existing imports ...
// [HYGEN:USECASE_IMPORTS]

// ... existing code ...

// UseCase registrations
safeRegister(INJECTION_TOKENS.CreateUserUseCase, CreateUserUseCase);
// ... existing ...
// [HYGEN:USECASE_REGISTER]
```

---

### Step 1.6: package.json スクリプト追加

```json
{
  "scripts": {
    "gen": "hygen",
    "gen:usecase": "hygen usecase new",
    "gen:entity": "hygen entity new",
    "gen:vo": "hygen value-object new",
    "gen:repo": "hygen repository new",
    "gen:action": "hygen server-action new",
    "gen:service": "hygen domain-service new"
  }
}
```

---

## Phase 2: UseCase テンプレート実装

### Step 2.1: ディレクトリ作成

```bash
mkdir -p _templates/usecase/new
```

---

### Step 2.2: プロンプトファイル作成

**ファイル**: `_templates/usecase/new/prompt.js`

```javascript
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'UseCase名（例: CreateOrder）:',
    validate: (input) => {
      if (!input) return 'UseCase名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input)) return 'PascalCaseで入力してください';
      return true;
    },
  },
  {
    type: 'input',
    name: 'domain',
    message: 'ドメイン名（例: order）:',
    validate: (input) => {
      if (!input) return 'ドメイン名は必須です';
      if (!/^[a-z]+$/.test(input)) return '小文字で入力してください';
      return true;
    },
  },
  {
    type: 'confirm',
    name: 'withRepository',
    message: 'Repositoryを注入しますか？',
    default: true,
  },
  {
    type: 'input',
    name: 'repository',
    message: 'Repository名（例: Order）:',
    when: (answers) => answers.withRepository,
    validate: (input) => input ? true : 'Repository名は必須です',
  },
];
```

---

### Step 2.3: UseCase テンプレート作成

**ファイル**: `_templates/usecase/new/usecase.ejs.t`

[04-templates.md の UseCase テンプレートを参照]

---

### Step 2.4: テストテンプレート作成

**ファイル**: `_templates/usecase/new/test.ejs.t`

[04-templates.md の UseCase テストテンプレートを参照]

---

### Step 2.5: Token 注入テンプレート作成

**ファイル**: `_templates/usecase/new/inject-token.ejs.t`

```ejs
---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_TOKENS\]
skip_if: <%= name %>UseCase
---
  <%= name %>UseCase: Symbol.for('<%= name %>UseCase'),
```

---

### Step 2.6: TypeMap 注入テンプレート作成

**ファイル**: `_templates/usecase/new/inject-typemap.ejs.t`

```ejs
---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_TYPEMAP\]
skip_if: <%= name %>UseCase:
---
  <%= name %>UseCase: <%= name %>UseCase;
```

---

### Step 2.7: Import 注入テンプレート作成

**ファイル**: `_templates/usecase/new/inject-import.ejs.t`

```ejs
---
to: src/di/containers/application.container.ts
inject: true
after: \[HYGEN:USECASE_IMPORTS\]
skip_if: <%= name %>UseCase
---
import { <%= name %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= name %>UseCase';
```

---

### Step 2.8: Container 登録注入テンプレート作成

**ファイル**: `_templates/usecase/new/inject-register.ejs.t`

```ejs
---
to: src/di/containers/application.container.ts
inject: true
after: \[HYGEN:USECASE_REGISTER\]
skip_if: <%= name %>UseCase
---
safeRegister(INJECTION_TOKENS.<%= name %>UseCase, <%= name %>UseCase);
```

---

### Step 2.9: 動作確認

```bash
# 対話式で実行
pnpm gen:usecase

# 引数指定で実行
npx hygen usecase new --name TestOrder --domain test
```

**確認ポイント**:

- [ ] UseCase ファイルが生成される
- [ ] テストファイルが生成される
- [ ] tokens.ts に Token が追加される
- [ ] tokens.ts に TypeMap が追加される
- [ ] container に import が追加される
- [ ] container に登録が追加される

---

## Phase 3: Entity テンプレート実装

### Step 3.1: ディレクトリ作成

```bash
mkdir -p _templates/entity/new
```

---

### Step 3.2: Entity テンプレート群作成

以下のファイルを作成:

- `prompt.js`
- `entity.ejs.t`
- `entity-id.ejs.t`
- `test.ejs.t`

[04-templates.md を参照]

---

## Phase 4: Repository テンプレート実装

### Step 4.1: ディレクトリ作成

```bash
mkdir -p _templates/repository/new
```

---

### Step 4.2: tokens.ts に Repository マーカー追加

```typescript
// Repository Layer
UserRepository: Symbol.for('UserRepository'),
// [HYGEN:REPO_TOKENS]
```

---

### Step 4.3: Repository テンプレート群作成

以下のファイルを作成:

- `prompt.js`
- `interface.ejs.t`
- `implementation.ejs.t`
- `test.ejs.t`
- `inject-token.ejs.t`
- `inject-typemap.ejs.t`
- `inject-import.ejs.t`
- `inject-register.ejs.t`

---

## Phase 5: Server Action テンプレート実装

### Step 5.1: ディレクトリ作成

```bash
mkdir -p _templates/server-action/new
```

---

### Step 5.2: Server Action テンプレート群作成

以下のファイルを作成:

- `prompt.js`
- `action.ejs.t`
- `test.ejs.t`

---

## Phase 6: Value Object テンプレート実装

### Step 6.1: ディレクトリ作成

```bash
mkdir -p _templates/value-object/new
```

---

### Step 6.2: Value Object テンプレート群作成

以下のファイルを作成:

- `prompt.js`
- `value-object.ejs.t`
- `test.ejs.t`

---

## Phase 7: ドキュメント・仕上げ

### Step 7.1: 使用方法ドキュメント作成

**ファイル**: `_DOCS/guides/code-generator.md`

```markdown
# コード生成ツール使用ガイド

## コマンド一覧

| コマンド | 説明 |
|----------|------|
| `pnpm gen:usecase` | UseCase生成 |
| `pnpm gen:entity` | Entity生成 |
| `pnpm gen:vo` | Value Object生成 |
| `pnpm gen:repo` | Repository生成 |
| `pnpm gen:action` | Server Action生成 |

## 使用例

### UseCase 生成

```bash
pnpm gen:usecase
# 対話式プロンプトに従って入力
```

...

```

---

### Step 7.2: CLAUDE.md 更新

Commands セクションに追記:

```markdown
### Code Generation

```bash
pnpm gen:usecase            # UseCase生成
pnpm gen:entity             # Entity生成
pnpm gen:vo                 # Value Object生成
pnpm gen:repo               # Repository生成
pnpm gen:action             # Server Action生成
```

```

---

### Step 7.3: 最終動作確認

全ジェネレーターの動作を確認:

```bash
# 各ジェネレーターをテスト
pnpm gen:usecase --name TestFeature --domain test
pnpm gen:entity --name TestEntity
pnpm gen:vo --name TestValue --type string
pnpm gen:repo --name TestEntity
pnpm gen:action --name testAction --domain test --usecase TestFeature
```

---

## 実装チェックリスト

### Phase 1: 基盤構築

- [ ] Hygen インストール
- [ ] Hygen 初期化
- [ ] ヘルパー関数作成
- [ ] tokens.ts マーカー追加
- [ ] container マーカー追加
- [ ] package.json スクリプト追加

### Phase 2: UseCase テンプレート

- [ ] ディレクトリ作成
- [ ] prompt.js
- [ ] usecase.ejs.t
- [ ] test.ejs.t
- [ ] inject-token.ejs.t
- [ ] inject-typemap.ejs.t
- [ ] inject-import.ejs.t
- [ ] inject-register.ejs.t
- [ ] 動作確認

### Phase 3: Entity テンプレート

- [ ] prompt.js
- [ ] entity.ejs.t
- [ ] entity-id.ejs.t
- [ ] test.ejs.t

### Phase 4: Repository テンプレート

- [ ] prompt.js
- [ ] interface.ejs.t
- [ ] implementation.ejs.t
- [ ] test.ejs.t
- [ ] inject系テンプレート

### Phase 5: Server Action テンプレート

- [ ] prompt.js
- [ ] action.ejs.t
- [ ] test.ejs.t

### Phase 6: Value Object テンプレート

- [ ] prompt.js
- [ ] value-object.ejs.t
- [ ] test.ejs.t

### Phase 7: ドキュメント

- [ ] 使用方法ドキュメント
- [ ] CLAUDE.md 更新
- [ ] 最終動作確認

---

## 次のステップ

→ [06-testing.md](./06-testing.md) でテスト・検証計画を確認
