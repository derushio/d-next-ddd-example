# Hooks リファレンス

Claude Code Hooksの設定方法と実用例。

---

## 基本構造

```json
{
  "hooks": {
    "{EventName}": [
      {
        "matcher": "{ToolPattern}",
        "hooks": [
          {
            "type": "command",
            "command": "{シェルコマンド}",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

---

## イベント一覧

| イベント | タイミング | 主な用途 |
|---------|-----------|---------|
| `PreToolUse` | ツール使用前 | バリデーション、ブロック |
| `PostToolUse` | ツール使用後 | フォーマット、Lint、通知 |
| `UserPromptSubmit` | プロンプト送信時 | ログ記録、前処理 |
| `Stop` | セッション終了時 | 自動コミット、通知、クリーンアップ |
| `SubagentStop` | サブエージェント終了時 | 次のステップ提案、ログ |

---

## Matcherパターン

| パターン | マッチするツール |
|---------|----------------|
| `Write` | ファイル作成 |
| `Edit` | ファイル編集 |
| `Write\|Edit` | ファイル作成または編集 |
| `Bash` | コマンド実行 |
| `.*` | すべてのツール |
| `Read\|Glob\|Grep` | 読み取り系のみ |

---

## Hook タイプ

### command タイプ

シェルコマンドを実行:

```json
{
  "type": "command",
  "command": "npm run lint",
  "timeout": 30
}
```

### prompt タイプ

Claudeにプロンプトを渡す:

```json
{
  "type": "prompt",
  "prompt": "変更内容を確認して、問題があれば指摘してください"
}
```

---

## 実用例

### 1. mainブランチ保護

mainブランチでのファイル編集をブロック:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "[ \"$(git branch --show-current 2>/dev/null)\" != \"main\" ] || { echo '{\"block\": true, \"message\": \"mainブランチでは編集できません\"}' >&2; exit 2; }",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 2. 自動フォーマット（Prettier）

ファイル保存後にPrettierを実行:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 3. 自動Lint（ESLint）

JS/TSファイル編集後にESLintを実行:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "if [[ \"$CLAUDE_FILE_PATH\" =~ \\.(js|ts|jsx|tsx)$ ]]; then npx eslint --fix \"$CLAUDE_FILE_PATH\" 2>/dev/null || true; fi",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 4. 特定ディレクトリの編集禁止

vendor/, node_modules/ への編集をブロック:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_FILE_PATH\" | grep -qE '^(vendor|node_modules)/' && { echo '{\"block\": true, \"message\": \"このディレクトリは編集禁止です\"}' >&2; exit 2; } || true",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 5. セッション終了時の自動コミット

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "git add -A && git commit -m 'Auto-commit: Claude Code session' --allow-empty 2>/dev/null || true",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 6. デスクトップ通知（macOS）

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Codeのセッションが完了しました\" with title \"Claude Code\"'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 7. テスト自動実行

テストファイル編集後にテストを実行:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "if [[ \"$CLAUDE_FILE_PATH\" =~ \\.(test|spec)\\.(js|ts)$ ]]; then npm test -- --findRelatedTests \"$CLAUDE_FILE_PATH\" 2>/dev/null || true; fi",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### 8. プロンプトログ記録

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date '+%Y-%m-%d %H:%M:%S')\" >> ~/.claude/prompt.log",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

---

## 環境変数

Hook内で使用可能な環境変数:

| 変数 | 説明 | 利用可能イベント |
|------|------|-----------------|
| `CLAUDE_FILE_PATH` | 操作対象ファイルパス | PreToolUse, PostToolUse |
| `CLAUDE_TOOL_NAME` | 使用ツール名 | PreToolUse, PostToolUse |
| `CLAUDE_SESSION_ID` | セッションID | 全イベント |
| `CLAUDE_PROJECT_DIR` | プロジェクトディレクトリ | 全イベント |

---

## ブロック応答

ツール使用をブロックする場合:

```bash
# stderrにJSONを出力してexit 2
echo '{"block": true, "message": "理由"}' >&2
exit 2
```

**重要**: `exit 2` + stderrへのJSON出力が必須。

---

## ベストプラクティス

### タイムアウト設定

| 処理タイプ | 推奨timeout |
|-----------|------------|
| 軽量チェック | 5秒 |
| フォーマット・Lint | 30秒 |
| テスト実行 | 60-120秒 |
| ビルド | 120秒以上 |

### エラーハンドリング

失敗してもセッションを止めないように:

```bash
some_command || true
some_command 2>/dev/null || true
```

### デバッグ

Hook実行のログを確認:

```bash
# ~/.claude/projects/{project}/sessions/ にトランスクリプトがある
```

---

## 複数Hookの組み合わせ

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATH\"",
            "timeout": 30
          },
          {
            "type": "command",
            "command": "npx eslint --fix \"$CLAUDE_FILE_PATH\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

→ 複数のhooksは順番に実行される。
