---
name: portless-hmr-fix
description: |
  portless経由のNext.js devサーバーでWebSocket HMR接続が失敗する問題の診断と修正。
  Next.js 15.2.3+のCSRF originチェックによりportless proxyのオリジンがブロックされる。
  allowedDevOriginsの設定パターンとテンプレート適用時の注意事項を提供。

  トリガー例:
  - 「HMRが動かない」「WebSocket接続エラー」「hydrationが完了しない」
  - 「portless経由でフォームが動かない」「ログインできない」
  - 「allowedDevOrigins」「Blocked cross-origin request」
  - 「Connection closed before receiving a handshake response」
  - テンプレートセットアップ、Makefile、portless設定
---

# portless + Next.js HMR WebSocket 修正ガイド

## 問題

portless proxy 経由で Next.js devサーバーにアクセスすると、HMR WebSocket 接続が失敗する。

```
WebSocket connection to 'ws://xxx.yyy.localhost:1355/_next/webpack-hmr' failed:
Connection closed before receiving a handshake response
```

**影響:**
- Hot Module Replacement が動かない（コード変更が反映されない）
- React hydration が完了しない → クライアント側 JS（フォーム送信、イベントハンドラ等）が動作しない
- 直接ポートアクセス（`localhost:XXXX`）では正常動作する

## 原因

**Next.js 15.2.3+ で導入された CSRF origin チェック。**

Next.js devサーバーは `/_next/webpack-hmr` WebSocket endpoint へのクロスオリジン接続をブロックする。

```
ブラウザ Origin:  http://worktree-xxx.my-app.localhost:1355  ← portless URL
Next.js listen:   localhost:4609                                ← 実際のポート
→ オリジン不一致 → WebSocket handshake 拒否
```

**portless はWebSocket proxyを完全サポートしている（v0.6.0+ の handleUpgrade 実装済み）。問題は portless ではなく Next.js 側。**

## 修正: `allowedDevOrigins` を `next.config.ts` に追加

### ハードコード + make setup 自動置換（このテンプレートの方式）

```typescript
const nextConfig: NextConfig = {
  // NOTE: "d-next-resources" は make setup 時に package.json の name で自動置換される
  allowedDevOrigins: [
    '*.d-next-resources.localhost',  // worktree経由
    'd-next-resources.localhost',    // main直接アクセス
  ],
};
```

**`make setup` の仕組み:**
```bash
# Makefile の setup ターゲット末尾で全ファイルを一括置換
PROJECT_NAME=$(jq -r '.name' package.json)
fd --hidden --no-ignore -t f -E node_modules -E .next -E dist -E .git \
  -x sed -i "s/d-next-resources/${PROJECT_NAME}/g" {}
```

→ `package.json` の `name` を変更して `make setup` を実行すれば、
`next.config.ts` の `allowedDevOrigins` も自動的に新プロジェクト名に置換される。

**portless URL体系:**
- main: `http://<package-name>.localhost:1355`
- worktree: `http://<branch>.<package-name>.localhost:1355`

## ワイルドカードの注意

- `*.localhost` は **効かない** — `*` は1サブドメインセグメントのみマッチ
- `worktree-xxx.my-app.localhost` は2セグメント → `*.my-app.localhost` が必要
- Next.js公式ドキュメント: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins

## テンプレートセットアップ時のチェックリスト

`make setup` が自動処理するが、手動セットアップの場合は以下を確認:

- [ ] `package.json` の `name` を新プロジェクト名に変更
- [ ] `make setup` を実行（`d-next-resources` が全ファイルで自動置換される）
- [ ] `next.config.ts` の `allowedDevOrigins` にプロジェクト名が反映されていること
- [ ] Makefile の `PROJECT_BASE` が `jq -r '.name' package.json` で動的取得していること

## 診断手順

HMR WebSocket が失敗している場合:

1. **ターミナルログを確認** — Next.js が `Blocked cross-origin request` を出力している
2. **正確なオリジンを確認** — ログに `allowedDevOrigins: ['<origin>']` の推奨値が表示される
3. **`next.config.ts` に `allowedDevOrigins` を追加**
4. **devサーバーを再起動**（設定変更はホットリロードされない）
5. **WebSocket接続を確認** — ブラウザDevToolsのConsoleでWebSocketエラーが消えていること

## 関連

- `dev-server` スキル（グローバル）: portless/Traefik の起動方法
- `worktree-setup` スキル: worktree作成時の環境セットアップ
- Next.js公式: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
