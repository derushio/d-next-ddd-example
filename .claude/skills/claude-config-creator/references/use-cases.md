# ユースケース別推奨

具体的なユースケースに対して、どの機能を使うべきかの推奨一覧。

---

## 開発ワークフロー

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| コードレビュー実行 | **Agent** | 独立コンテキストで詳細分析、メインを汚染しない |
| PR作成 | **Command** | `/create-pr`で明示的に実行 |
| テスト作成ガイド | **Skill** | テストを書くときに自動適用 |
| コミットメッセージ生成 | **Command** | `/commit`で明示的に実行 |
| ブランチ保護 | **Hook** | mainへの編集を事前ブロック |
| 自動フォーマット | **Hook** | ファイル保存後に自動実行 |

## ドキュメント

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| README生成 | **Command** | `/readme`で明示的に実行 |
| API仕様書作成 | **Skill** | テンプレート+ガイドラインを提供 |
| ドキュメント校正 | **Agent** | 専門家として独立レビュー |
| CHANGELOG更新 | **Command** | リリース時に明示的に実行 |

## 品質管理

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| Lint実行 | **Hook** | ファイル保存時に自動 |
| セキュリティ監査 | **Agent** | 専門的分析を独立実行 |
| コーディング規約 | **Skill** | コード作成時に自動適用 |
| パフォーマンス分析 | **Agent** | 独立コンテキストで詳細分析 |
| 依存関係チェック | **Hook** or **Agent** | 自動なら Hook、詳細なら Agent |

## プロジェクト管理

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| プロジェクト初期化 | **Command** | `/init`で明示的に実行 |
| チケット連携 | **Skill + MCP** | 知識（Skill）+ API接続（MCP） |
| 進捗レポート | **Agent** | 独立してリサーチ・集計 |
| リリースノート作成 | **Command** | `/release-notes`で明示的に実行 |

---

## 判断に迷うケース

### 「コードレビュー」

- **詳細なレビューを独立して行う** → Agent（code-reviewer）
- **レビューの観点・チェックリストを提供** → Skill（review-checklist）
- **`/review`で呼び出してレビュー実行** → Command + Agent委譲

### 「テスト」

- **テストの書き方・パターンを教える** → Skill（testing-patterns）
- **テスト作成を専門家に任せる** → Agent（test-writer）
- **テストファイル保存後に自動実行** → Hook（PostToolUse）
- **`/test`でテスト実行** → Command

### 「ドキュメント」

- **ドキュメントのフォーマット・規約** → Skill
- **ドキュメント生成を専門家に任せる** → Agent
- **`/docs`で生成** → Command

---

## 組み合わせパターン詳細

### パターン1: Command → Agent委譲

ユーザーが明示的に呼び出し、専門的な作業はAgentに委譲。

```
.claude/commands/full-review.md
---
description: コードベース全体のレビューを実行
---
# Full Review
1. code-reviewer エージェントを呼び出してコードレビュー
2. security-checker エージェントを呼び出してセキュリティチェック
3. 結果を統合してレポート出力
```

### パターン2: Skill + Hook連携

Skillで知識を提供し、Hookで自動アクションを実行。

```
.claude/skills/testing-patterns/SKILL.md
→ テストの書き方を提供

.claude/settings.json (hooks)
→ テストファイル保存後にテスト自動実行
```

### パターン3: Skill + Agent連携

Skillで規約を提供し、Agentがそれに従って作業。

```
.claude/skills/coding-standards/SKILL.md
→ コーディング規約を定義

.claude/agents/refactorer.md
→ 規約に従ってリファクタリング
```

---

## やってはいけない組み合わせ

### ❌ Hook内でAgentを呼び出す

```json
{
  "hooks": {
    "PostToolUse": [{
      "command": "claude agent code-reviewer"
    }]
  }
}
```

→ Hookは軽量な処理向け。重い処理はCommandから呼び出す。

### ❌ Skillに複数の独立したタスクを詰め込む

```markdown
# Bad
name: everything-skill
description: すべてをやるスキル
---
1. コードレビュー
2. テスト作成
3. ドキュメント生成
```

→ 機能ごとにSkill/Agent/Commandを分離する。

### ❌ Commandで知識だけを提供

```markdown
# Bad
/coding-standards
→ コーディング規約の内容を表示するだけ
```

→ 知識提供はSkillにすべき。Commandはアクションを実行。
