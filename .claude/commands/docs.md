# ドキュメント検索

_DOCS/ディレクトリからプロジェクトドキュメントを検索・表示します。

## ドキュメント構造

```
_DOCS/
├── architecture/        # アーキテクチャ・設計原則
├── guides/
│   ├── beginners/      # 初心者向けガイド
│   ├── ddd/            # DDD詳細ガイド
│   ├── development/    # 開発フロー
│   └── implementation/ # 実装パターン
├── testing/            # テスト戦略
├── troubleshooting/    # トラブルシューティング
└── reference/          # リファレンス
```

## カテゴリ別ドキュメント

| カテゴリ | パス | 内容 |
|---------|------|------|
| 全体理解 | `architecture/overview.md` | プロジェクト全体像 |
| 設計原則 | `architecture/principles.md` | Clean Architecture原則 |
| UseCase | `guides/ddd/layers/components/use-cases.md` | UseCase実装ガイド |
| Entity | `guides/ddd/layers/components/entities.md` | Entity実装ガイド |
| Repository | `guides/ddd/layers/components/repository-implementations.md` | Repository実装ガイド |
| Server Action | `guides/ddd/layers/components/server-actions.md` | Server Action実装ガイド |
| テスト | `testing/strategy.md` | テスト戦略 |
| トラブル | `troubleshooting/common-issues.md` | よくある問題 |

## 使い方

1. キーワードで検索: `/docs UseCase`
2. カテゴリ指定: `/docs architecture`
3. 特定ファイル: `/docs guides/ddd/layers/components/use-cases.md`

---

**質問**: 何について調べますか？（キーワードまたはカテゴリを入力）
