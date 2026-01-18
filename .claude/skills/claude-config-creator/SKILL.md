---
name: claude-config-creator
description: |
  Claude Codeの.claude設定（commands, skills, agents, hooks）を作成・管理するスキル。
  ユーザーの要望を分析し、最適な機能を選択して正しい構造で作成する。
  
  トリガー例:
  - 「コマンドを作りたい」「/xxxを作って」
  - 「スキルを作成」「自動で適用されるようにしたい」
  - 「エージェントを作りたい」「専門家として動いてほしい」「並列で実行したい」
  - 「フック/hookを設定」「ファイル保存時に自動で」「イベント駆動で」
  - 「Claude Codeをカスタマイズ」「自動化したい」「設定を作って」
  - 「.claudeディレクトリを設定」
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Claude Config Creator

`.claude`ディレクトリの設定ファイルを適切に作成するスキル。

---

## 機能選択クイックリファレンス

| 要望のキーワード | 選択する機能 |
|-----------------|-------------|
| `/xxx`で呼び出したい、明示的に実行 | **Command** |
| 自動で適用、判断して使って、知識を教えたい | **Skill** |
| 別コンテキスト、並列実行、専門家として | **Agent** |
| ファイル保存時、ツール実行前後、イベント駆動 | **Hook** |

---

## 機能選択の判断フロー

```
ユーザーの要望を分析
    │
    ├─ 明示的に呼び出したい？ ─────────────────→ Command
    │
    ├─ 知識・手順を自動適用したい？
    │   └─ スクリプト/テンプレートをバンドルする？ ─→ Skill
    │
    ├─ 独立コンテキストで実行したい？
    │   └─ 専門家として / 並列で？ ──────────────→ Agent
    │
    └─ イベントに反応して自動実行したい？ ────────→ Hook
```

---

## 各機能の特徴

### Command
- **呼び出し**: `/command-name` で明示的に
- **ファイル**: `.claude/commands/{name}.md`
- **用途**: 定型作業、引数を渡す処理、ワークフローの起点
- **例**: `/review`, `/deploy`, `/init-project`, `/create-pr`

### Skill
- **呼び出し**: Claudeが自動判断で適用
- **ファイル**: `.claude/skills/{name}/SKILL.md` + サポートファイル
- **用途**: ドメイン知識、コーディング規約、テンプレート提供
- **例**: testing-patterns, api-design-guide, security-checklist

### Agent
- **呼び出し**: 自動 or 明示的、独立コンテキストで実行
- **ファイル**: `.claude/agents/{name}.md`
- **用途**: 専門的タスクの委譲、並列実行、コンテキスト分離
- **例**: code-reviewer, security-auditor, doc-writer

### Hook
- **呼び出し**: イベント駆動で自動実行
- **ファイル**: `.claude/settings.json` の `hooks` セクション
- **用途**: 品質ゲート、自動フォーマット、通知、ガードレール
- **例**: mainブランチ保護、Lint実行、自動コミット

---

## 作成手順

### Step 1: 要望を分析して機能を選択

上記のクイックリファレンスとフローで判断。迷ったら:
- 「呼び出し方法」で判断 → 明示的ならCommand、自動ならSkill/Agent/Hook
- 「コンテキスト」で判断 → 分離したいならAgent、共有でいいならSkill

### Step 2: テンプレートを参照して作成

```
./templates/command-template.md   - Commandのテンプレート
./templates/skill-template.md     - Skillのテンプレート  
./templates/agent-template.md     - Agentのテンプレート
./templates/hooks-template.json   - Hookのテンプレート
```

### Step 3: 適切な場所に配置

| スコープ | 配置場所 |
|---------|---------|
| プロジェクト固有 | `.claude/{commands\|skills\|agents}/` |
| ユーザー全体 | `~/.claude/{commands\|skills\|agents}/` |

### Step 4: 作成後の確認

- [ ] YAMLフロントマターの構文エラーがないか
- [ ] descriptionが具体的で、適切なトリガーワードを含むか
- [ ] 必要なファイルがすべて配置されているか
- [ ] （Skill）スクリプトに実行権限があるか（`chmod +x`）
- [ ] （Hook）JSONの構文が正しいか

---

## よくある間違い

### ❌ SkillにタスクのStepを書く

```markdown
# Bad
---
name: create-readme
description: READMEを作成する
---
1. プロジェクト構造を分析
2. READMEを生成
```

→ **Command** にすべき。Skillは「知識」であって「タスク」ではない。

### ❌ 単純な知識提供にAgentを使う

```markdown
# Bad
あなたはTypeScriptの専門家です。
ベストプラクティスを教えてください。
```

→ **Skill** にすべき。独立コンテキストが不要なら無駄。

### ❌ Hookに複雑なロジックを詰め込む

```json
{
  "command": "analyze.py && notify.sh && update_db.py && ..."
}
```

→ 複雑な処理は **Skill+スクリプト** または **Agent** に分離。

### ❌ descriptionが曖昧

```markdown
---
description: 便利なツール
---
```

→ 具体的に書く。Claudeの自動判断に直接影響する。

---

## 参照ドキュメント

詳細なユースケースや実例は以下を参照:

- `./references/use-cases.md` - ユースケース別の推奨機能
- `./references/hooks-examples.md` - Hookの実用パターン集
- `./examples/` - 実際の作成例

---

## 複合パターン

複雑な要望は複数機能を組み合わせる:

**パターン1: Command → Agent委譲**
```
/full-review (Command)
  └→ code-reviewer (Agent) - 独立コンテキストで分析
```

**パターン2: Skill + Hook連携**
```
testing-patterns (Skill) - テストの書き方
  +
PostToolUse Hook - テスト保存後に自動実行
```

**パターン3: Command → 複数Agent並列**
```
/analyze (Command)
  ├→ security-checker (Agent)
  ├→ performance-analyzer (Agent)
  └→ 結果を統合
```
