# Claude Code Hooks 設定ガイド

Claude Code の `.claude/settings.json` で設定可能な Hooks の解説とオプション設定

---

## 概要

`.claude/settings.json` で定義されたHooksは、Claude CodeがWrite/Editツールを使用した際に自動実行されます。

**設定ファイル**: `/home/derushio/CommandResources/d-next-template-debug/d-next-resources/.claude/settings.json`

---

## 現在の設定

### PostToolUse - 自動フォーマット

TypeScript/JavaScriptファイルのWrite/Edit後に、Biomeフォーマッターを自動実行します。

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "if [[ \"$CLAUDE_FILE_PATH\" =~ \\.(ts|tsx|js|jsx)$ ]]; then pnpm biome format --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true; fi",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**動作詳細**:

- **トリガー**: Write または Edit ツール使用後
- **対象ファイル**: `.ts`, `.tsx`, `.js`, `.jsx`
- **実行内容**: `pnpm biome format --write` でフォーマット
- **エラーハンドリング**: `2>/dev/null || true` でエラーを抑制（ブロックしない）
- **タイムアウト**: 10秒

**環境変数**:

- `$CLAUDE_FILE_PATH`: Claude Codeが自動設定（編集されたファイルのパス）

---

## オプション設定

### PreToolUse - mainブランチ保護

mainブランチでのWrite/Edit操作をブロックします。

**使用ケース**:

- 本番環境のmainブランチを誤って編集するのを防ぐ
- チーム開発で機能ブランチ運用を徹底したい場合

**設定例**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "[ \"$(git branch --show-current 2>/dev/null)\" != \"main\" ] || { echo '{\"block\": true, \"message\": \"mainブランチでは編集できません\"}' >&2; exit 2; }"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "if [[ \"$CLAUDE_FILE_PATH\" =~ \\.(ts|tsx|js|jsx)$ ]]; then pnpm biome format --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true; fi",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**動作詳細**:

- **トリガー**: Write または Edit ツール使用前
- **チェック内容**: 現在のブランチが `main` でないか確認
- **ブロック方法**: `exit 2` で処理を中断し、エラーメッセージを表示
- **エラーメッセージ**: `{ "block": true, "message": "mainブランチでは編集できません" }`

**有効化手順**:

1. 上記の設定例を `.claude/settings.json` に反映
2. Claude Code を再起動（設定を再読み込み）
3. mainブランチで編集を試みると自動的にブロックされる

---

## Hook設定の構造

### matcher（ツール名指定）

パイプ区切りで複数のツールを指定可能:

```json
"matcher": "Write|Edit|Bash"
```

**指定可能なツール**:

- `Write`: ファイル新規作成
- `Edit`: ファイル編集
- `Bash`: シェルコマンド実行
- `Read`: ファイル読み込み
- `Glob`: ファイル検索
- `Grep`: コンテンツ検索

### hook type

```json
{
  "type": "command",
  "command": "実行するシェルコマンド",
  "timeout": 10
}
```

**パラメータ**:

- `type`: 常に `"command"`（シェルコマンド実行）
- `command`: 実行するBashコマンド（文字列）
- `timeout`: タイムアウト秒数（オプション、デフォルト: 120秒）

### 環境変数

Claude Codeが自動設定する環境変数:

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `$CLAUDE_FILE_PATH` | 編集されたファイルの絶対パス | `/home/user/project/src/index.ts` |
| `$CLAUDE_TOOL_NAME` | 使用されたツール名 | `Write`, `Edit`, `Bash` |

---

## トラブルシューティング

### フォーマットが実行されない

**原因**: pnpm や biome が PATH に含まれていない

**対処法**:

```bash
# pnpm のパスを確認
which pnpm

# 絶対パスを指定
"command": "if [[ \"$CLAUDE_FILE_PATH\" =~ \\.(ts|tsx|js|jsx)$ ]]; then /usr/local/bin/pnpm biome format --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true; fi"
```

### mainブランチ保護が動作しない

**原因**: Gitリポジトリ外で実行されている

**対処法**:

```bash
# Gitリポジトリ確認
git rev-parse --git-dir

# リポジトリルートに移動して実行
cd $(git rev-parse --show-toplevel) && [ブランチチェックコマンド]
```

### タイムアウトエラー

**原因**: 処理時間が timeout 値を超えた

**対処法**:

```json
{
  "type": "command",
  "command": "...",
  "timeout": 30  // 秒数を増やす
}
```

---

## ベストプラクティス

### エラーハンドリング

```bash
# ✅ 推奨: エラーを抑制してフックをブロックしない
command 2>/dev/null || true

# ❌ 非推奨: エラーでフック全体が失敗する
command
```

### 条件分岐

```bash
# ✅ 推奨: ファイル拡張子で分岐
if [[ "$CLAUDE_FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  # TypeScript/JavaScript用処理
fi

# ✅ 推奨: ブランチ名で分岐
if [ "$(git branch --show-current)" = "main" ]; then
  # mainブランチ用処理
fi
```

### パフォーマンス

```bash
# ✅ 推奨: 必要最小限の処理
pnpm biome format --write "$CLAUDE_FILE_PATH"

# ❌ 非推奨: 重い処理（全ファイルフォーマット）
pnpm format
```

---

## 関連ドキュメント

- **[開発環境セットアップ](setup.md)** - Git hooks設定含む
- **[コーディング規約](coding-standards.md)** - Biomeフォーマットルール
- **[開発フロー](development/workflow.md)** - ブランチ運用戦略

---

**このHooks設定により、Claude Code使用時のコード品質が自動的に保たれます。**
