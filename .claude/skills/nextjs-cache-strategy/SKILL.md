---
name: nextjs-cache-strategy
description: |
  Next.js 16 のキャッシュ無効化戦略を統一するスキル。
  revalidateTag 優先ルール、タグ命名規約、revalidatePath との使い分けを提供。

  トリガー例:
  - 「revalidatePath」「revalidateTag」「キャッシュ」「cache invalidation」
  - revalidatePath(, revalidateTag(, unstable_cache(, cacheTag( を書こうとしたとき
  - src/app/server-actions/ 配下のファイル編集時
globs:
  - "src/app/server-actions/**/*.ts"
---

# Next.js Cache Strategy

## 目的

Server Action でのキャッシュ無効化を `revalidateTag` 中心に統一し、
きめ細かなキャッシュ制御を実現する。

## 戦略比較

| 方法 | 粒度 | 用途 |
|------|------|------|
| `revalidatePath(path)` | パス単位 | 特定ページの再検証 |
| `revalidateTag(tag)` | タグ単位 | エンティティ関連の全キャッシュ再検証 |
| `revalidatePath('/', 'layout')` | サイト全体 | 全ページ再検証（非推奨） |

## ルール

1. **`revalidateTag` を優先**: エンティティ操作（CRUD）では `revalidateTag` を使用
2. **`revalidatePath` も併用**: 特定ページの即時更新が必要な場合に併用
3. **`revalidatePath('/')` は禁止**: サイト全体再検証は粒度が粗すぎる

## タグ命名規約

| パターン | 例 | 用途 |
|---------|-----|------|
| `{entity}` | `'users'` | エンティティ一覧 |
| `{entity}-{id}` | `` `user-${id}` `` | 個別エンティティ |

## 正しいパターン

```typescript
// Server Action: ユーザー作成
if (actionResult.success) {
  revalidatePath('/users');
  revalidateTag('users');
}

// Server Action: ユーザー更新
if (actionResult.success) {
  revalidatePath('/users');
  revalidatePath(`/users/${input.userId}`);
  revalidateTag('users');
  revalidateTag(`user-${input.userId}`);
}
```

## 禁止パターン

```typescript
// ❌ サイト全体再検証
revalidatePath('/', 'layout');

// ❌ revalidateTag なしの CRUD 操作
if (actionResult.success) {
  revalidatePath('/users'); // revalidateTag も必要
}
```

## React.cache() との関係

- `React.cache()` はレンダーツリー内のリクエストデデュプリケーション（per-render）
- `revalidateTag` は Next.js フレームワークレベルのキャッシュ無効化（cross-request）
- 両者は独立して動作し、併用可能

## `unstable_cacheTag` / `'use cache'` について

Next.js 16 の `'use cache'` ディレクティブと `unstable_cacheTag` は、
cross-request キャッシュのタグ付けに使用する。
`React.cache()` からの移行は別途検討（アーキテクチャ変更を伴うため）。

## チェックリスト

- [ ] CRUD Server Action に `revalidateTag` を追加したか
- [ ] タグ命名規約に従っているか
- [ ] `revalidatePath` も併用しているか（UX即時性のため）
- [ ] `revalidatePath('/')` を使っていないか

## ❌ revalidatePath 単独使用の禁止

Server Action でキャッシュ無効化を行う際、`revalidatePath` のみの使用は禁止。
必ず `revalidateTag` を使用すること。

```typescript
// ❌ revalidatePath のみ
revalidatePath('/users');

// ❌ revalidatePath と revalidateTag の混在（二重無効化で冗長）
revalidatePath('/users');
revalidateTag('users');

// ✅ revalidateTag のみ
revalidateTag('users');
revalidateTag(`user-${userId}`);
```

**理由**: `revalidateTag` はタグ単位の粒度が高く、`revalidatePath` はパス単位で粗い。
Tag ベースに統一することで、キャッシュ無効化の制御が明確になる。

## 関連スキル

- `react-cache-dedup` — React.cache() デデュプリケーション
- `next16-after-api` — after() レスポンス後処理
- `server-action-result-mapping` — Server Action Result 変換
