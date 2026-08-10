# クリックジャッキング対策ガイド

## 概要

クリックジャッキング（Clickjacking）は、透明なiframeで正規サイトのページを覆い、ユーザに意図しないクリックを誘導する攻撃手法です。ユーザは攻撃者のサイト上で正規サイトの操作を行っていると錯覚し、知らないうちに重要な操作を実行してしまいます。

### 発生しうる脅威

クリックジャッキング攻撃により、以下のような被害が発生する可能性があります。

- **意図しない操作の実行**: ユーザが気付かないうちにボタンやリンクをクリックさせられる
- **設定変更の強制**: プライバシー設定やセキュリティ設定を攻撃者に有利な状態に変更される
- **不正な購入や送金**: ECサイトや銀行サイトで意図しない購入や送金を実行される
- **アカウントの権限変更**: ソーシャルメディアでフォローやいいね、投稿の実行を強制される
- **ファイルアップロード**: マルウェアなど悪意のあるファイルをアップロードさせられる

### 特に注意が必要なケース

以下のような機能を持つページは、クリックジャッキング攻撃の標的になりやすく、特に注意が必要です。

- **重要な操作ボタン**
  - 削除、変更、承認などの操作ボタン
  - アカウント設定の変更（メールアドレス、パスワード）
  - プライバシー設定の変更
- **決済フロー**
  - 商品購入の確定ボタン
  - 送金の実行ボタン
  - クレジットカード情報の登録
- **権限変更**
  - 管理者権限の付与
  - アクセス権限の変更
  - アプリケーション連携の許可
- **ソーシャル機能**
  - フォロー、いいね、シェア
  - コメントや投稿の公開
  - 友達申請の承認

## IPA/OWASP対応

本脆弱性は、以下の国際的なセキュリティ基準に分類されています。

| 基準 | カテゴリ |
|------|---------|
| IPA  | 6. クリックジャッキング |
| OWASP Top 10 2021 | A05:2021-Security Misconfiguration |
| CWE | CWE-1021: Improper Restriction of Rendered UI Layers or Frames |

## Next.js での対策

### 根本的解決策（必須）

クリックジャッキングを根本的に防ぐためには、HTTPレスポンスヘッダーで自サイトがiframe内に表示されることを禁止する必要があります。

#### 1. X-Frame-Options ヘッダの設定

`X-Frame-Options` ヘッダは、ブラウザにページがframe、iframe、embed、object内で表示されることを許可するかどうかを指示します。

**推奨設定**:

- `DENY`: すべてのframeでの表示を禁止（最も安全）
- `SAMEORIGIN`: 同一オリジンのframeでのみ表示を許可（社内システム等で使用）

**非推奨**:

- `ALLOW-FROM uri`: 特定のURIからのみ許可（一部ブラウザで非対応、CSPの使用を推奨）

#### 2. Content-Security-Policy の frame-ancestors ディレクティブ

`Content-Security-Policy` の `frame-ancestors` ディレクティブは、`X-Frame-Options` の後継として推奨される仕様です。より柔軟な制御が可能で、複数のオリジンを指定できます。

**推奨設定**:

- `frame-ancestors 'none'`: すべてのframeでの表示を禁止（X-Frame-Options: DENY と同等）
- `frame-ancestors 'self'`: 同一オリジンのframeでのみ表示を許可（X-Frame-Options: SAMEORIGIN と同等）
- `frame-ancestors 'self' https://trusted.example.com`: 自サイトと特定のサイトからのみ許可

**両方設定する理由**:

- 古いブラウザは `frame-ancestors` に対応していない場合がある
- `X-Frame-Options` は広くサポートされている
- 両方設定することで最大限の互換性を確保

### 保険的対策（推奨）

根本的解決策を実装した上で、さらに以下の対策を実施することで、多層防御を実現できます。

#### 1. 重要操作での確認ダイアログ

削除や購入など重要な操作を実行する前に、JavaScriptの確認ダイアログを表示します。

```typescript
// 例: 削除ボタンのクリックイベント
const handleDelete = () => {
  if (window.confirm('本当に削除してもよろしいですか？')) {
    // 削除処理を実行
  }
};
```

**注意点**:

- これだけではクリックジャッキングを防げない（確認ダイアログもiframe内で表示される）
- HTTPヘッダーによる根本的対策と併用する

#### 2. Frame Busting JavaScript（レガシー対策）

古いブラウザや特殊な環境向けのフォールバック対策として、JavaScriptでframe内での表示を検出し、トップレベルにリダイレクトします。

```javascript
// レガシーブラウザ向けのFrame Busting
if (top !== self) {
  top.location = self.location;
}
```

**注意点**:

- JavaScriptが無効な環境では動作しない
- 攻撃者がJavaScriptを無効化する手法が存在する
- あくまで保険的対策として実装し、HTTPヘッダーによる対策を優先する

## next.config.ts 設定例

Next.js 16（App Router）では、`next.config.ts` でセキュリティヘッダーを設定します。

### 基本設定（全ページ共通）

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 全ページに適用
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 一部ページのみframe許可が必要な場合

特定のページ（例: OAuth認証のコールバックページ）のみframeでの表示を許可する必要がある場合は、個別に設定します。

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 通常ページ: frame禁止
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
      {
        // 特定ページ: 同一オリジンのみ許可
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 既存設定への追加方法

既にheaders設定が存在する場合は、配列に追加します。

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 既存のヘッダー
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          // クリックジャッキング対策を追加
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## 動作確認方法

### 1. ブラウザ開発者ツールで確認

1. 対象ページをブラウザで開く
2. 開発者ツール（F12）を開く
3. Networkタブを選択
4. ページをリロード
5. HTMLドキュメントのレスポンスヘッダーを確認

**確認項目**:

```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

### 2. 簡易テストページでの確認

以下のHTMLファイルを作成し、ブラウザで開いて対象サイトがiframe内に表示されないことを確認します。

```html
<!DOCTYPE html>
<html>
<head>
  <title>Clickjacking Test</title>
</head>
<body>
  <h1>Clickjacking Protection Test</h1>
  <p>下記にiframeが表示されなければ対策成功</p>
  <iframe src="https://your-site.example.com" width="800" height="600"></iframe>
</body>
</html>
```

**期待結果**:

- iframeが空白で表示される
- ブラウザコンソールに「Refused to display ... in a frame」エラーが表示される

### 3. オンラインツールでの確認

以下のツールを使用して、HTTPヘッダーが正しく設定されているか確認できます。

- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## チェックリスト

実装時には以下のチェックリストを確認してください。

### 設計段階

- [ ] クリックジャッキングのリスクがあるページを特定
- [ ] 重要な操作ボタンや決済フローがあるページをリストアップ
- [ ] iframe内での表示が必要なページ（OAuth等）を確認
- [ ] セキュリティヘッダーの設定方針を決定

### 実装段階

- [ ] `next.config.ts` に `X-Frame-Options: DENY` を設定
- [ ] `next.config.ts` に `Content-Security-Policy: frame-ancestors 'none'` を設定
- [ ] iframe許可が必要なページがあれば個別設定を追加
- [ ] 重要操作に確認ダイアログを実装（保険的対策）
- [ ] 開発環境・本番環境の両方で設定を確認

### テスト段階

- [ ] ブラウザ開発者ツールでレスポンスヘッダーを確認
- [ ] テストHTMLページでiframe表示がブロックされることを確認
- [ ] 複数ブラウザ（Chrome, Firefox, Safari, Edge）で動作確認
- [ ] OAuth等iframe許可ページが正常に動作することを確認
- [ ] セキュリティスキャンツールでヘッダー設定を検証

### デプロイ前

- [ ] 本番環境の設定ファイルにセキュリティヘッダーが含まれているか確認
- [ ] 環境変数による設定の切り替えが必要な場合は動作確認
- [ ] ステージング環境でE2Eテストを実行
- [ ] セキュリティレビューで第三者チェックを実施

## 参考資料

### 公式ドキュメント

- [IPA 安全なウェブサイトの作り方 - 6. クリックジャッキング](https://www.ipa.go.jp/security/vuln/websecurity/clickjacking.html)
- [OWASP - Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [MDN - X-Frame-Options](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/X-Frame-Options)
- [MDN - CSP: frame-ancestors](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
- [Next.js - Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

### 技術仕様

- [RFC 7034 - HTTP Header Field X-Frame-Options](https://datatracker.ietf.org/doc/html/rfc7034)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [CWE-1021: Improper Restriction of Rendered UI Layers or Frames](https://cwe.mitre.org/data/definitions/1021.html)

### プロジェクト内関連ドキュメント

- [セキュリティ概要](../../README.md)
- [IPA-OWASP-CWE 対応表](../../references/ipa-owasp-mapping.md)
- [セキュリティ設定のベストプラクティス](../../references/external-links.md)
- Next.js 16 proxy.ts 設定ガイド

## 更新履歴

- 2026-01-18: 初版作成（Next.js 16対応、IPA/OWASP準拠）
