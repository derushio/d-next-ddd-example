# IPAセキュリティチェックリスト詳細

## 概要

IPA「安全なウェブサイトの作り方」に基づく11脆弱性カテゴリのチェックリスト。
各項目について、必須チェック項目、推奨チェック項目、および確認用コマンドを提供します。

---

## 1. SQLインジェクション

### 必須チェック項目

- [ ] Prisma ORMを使用してすべてのデータベースクエリを実行
- [ ] `$queryRaw`/`$executeRaw`を使用していない
- [ ] ユーザー入力をそのままクエリに埋め込んでいない
- [ ] Prismaの型安全なクエリビルダーを使用
- [ ] 動的なテーブル名やカラム名を使用していない

### 推奨チェック項目

- [ ] Repository層でのみデータベースアクセスを実行
- [ ] ユーザー入力は必ずValue Objectで検証
- [ ] WHERE句のパラメータはPrismaのフィルターオブジェクトを使用
- [ ] データベース接続は最小権限の原則に従う

### 確認コマンド

```bash
# 生SQLの使用を検出
grep -rn '\$queryRaw\|\$executeRaw' src/

# Prisma以外のDB接続を検出
grep -rn 'mysql\|pg\|sqlite3' src/ --include="*.ts" --exclude-dir=node_modules

# 文字列連結によるクエリ構築を検出
grep -rn 'SELECT.*\+\|INSERT.*\+\|UPDATE.*\+\|DELETE.*\+' src/
```

---

## 2. OSコマンドインジェクション

### 必須チェック項目

- [ ] `child_process.exec()`を使用していない
- [ ] ユーザー入力を直接コマンドに渡していない
- [ ] シェル経由のコマンド実行を避けている
- [ ] 外部コマンド実行が必要な場合は引数を配列で渡す

### 推奨チェック項目

- [ ] `child_process.execFile()`または`spawn()`を使用（shell: false）
- [ ] コマンド引数のホワイトリスト検証
- [ ] コマンド実行は専用のサービス層に隔離
- [ ] 外部コマンド実行のログ記録

### 確認コマンド

```bash
# 危険なコマンド実行を検出
grep -rn 'exec\|spawn\|execFile' src/ --include="*.ts"

# evalの使用を検出
grep -rn '\beval\(' src/ --include="*.ts"

# Functionコンストラクタの使用を検出
grep -rn 'new Function\(' src/ --include="*.ts"
```

---

## 3. HTTPヘッダインジェクション

### 必須チェック項目

- [ ] ユーザー入力を直接HTTPヘッダーに設定していない
- [ ] 改行文字（\r\n）を含む入力を拒否
- [ ] Next.jsの組み込みヘッダー設定APIを使用
- [ ] `proxy.ts`（旧middleware.ts）でのヘッダー操作を検証

### 推奨チェック項目

- [ ] カスタムヘッダー値のホワイトリスト検証
- [ ] Content-Typeヘッダーの適切な設定
- [ ] X-Content-Type-Options: nosniffの設定
- [ ] レスポンスヘッダーの一貫性チェック

### 確認コマンド

```bash
# ヘッダー設定を検出
grep -rn 'headers\.set\|headers\.append\|setHeader' src/

# proxy.ts（Next.js 16のmiddleware）を確認
cat src/proxy.ts

# next.configでのヘッダー設定を確認
grep -A 20 'headers:' next.config.ts
```

---

## 4. クロスサイトスクリプティング（XSS）

### 必須チェック項目

- [ ] ユーザー入力を`dangerouslySetInnerHTML`に渡していない
- [ ] ReactのJSX構文で自動エスケープを活用
- [ ] URLパラメータをそのままHTMLに出力していない
- [ ] `<script>`タグの動的生成を避ける
- [ ] イベントハンドラーに動的な文字列を使用していない

### 推奨チェック項目

- [ ] Content-Security-Policy（CSP）ヘッダーの設定
- [ ] DOMPurifyなどのサニタイザーライブラリの使用（必要な場合）
- [ ] Server ComponentとClient Componentの適切な分離
- [ ] 外部スクリプトの整合性検証（integrity属性）
- [ ] JSONデータのエスケープ処理

### 確認コマンド

```bash
# 危険なHTML操作を検出
grep -rn 'dangerouslySetInnerHTML\|innerHTML\|outerHTML' src/

# evalの使用を検出
grep -rn '\beval\(' src/ --include="*.ts" --include="*.tsx"

# 動的なscriptタグ生成を検出
grep -rn 'createElement.*script' src/

# CSP設定を確認
grep -rn 'Content-Security-Policy' src/ next.config.ts
```

---

## 5. クロスサイトリクエストフォージェリ（CSRF）

### 必須チェック項目

- [ ] Server ActionsにCSRF保護が適用されている（Next.js 16組み込み）
- [ ] 状態変更操作はPOST/PUT/DELETEメソッドを使用
- [ ] GETリクエストで状態変更を行っていない
- [ ] 外部サイトからのフォーム送信を検証

### 推奨チェック項目

- [ ] Same-Site Cookie属性の設定（Lax/Strict）
- [ ] カスタムヘッダーによる検証（X-Requested-With）
- [ ] Originヘッダーの検証（proxy.ts）
- [ ] 重要な操作には再認証を要求
- [ ] トークンベースの二重送信Cookie

### 確認コマンド

```bash
# Server Actionsの定義を確認
grep -rn 'use server' src/

# Cookie設定を確認
grep -rn 'cookies()\|Set-Cookie\|sameSite' src/

# proxy.tsでのOrigin検証を確認
grep -n 'origin\|referer' src/proxy.ts
```

---

## 6. クリックジャッキング

### 必須チェック項目

- [ ] X-Frame-Optionsヘッダーの設定（DENY/SAMEORIGIN）
- [ ] Content-Security-Policy frame-ancestorsディレクティブの設定
- [ ] iframeでの表示が必要なページを明確化

### 推奨チェック項目

- [ ] 管理画面やログインページは特に厳格に保護
- [ ] iframe内での動作を検出するJavaScriptの実装（補助的）
- [ ] レスポンスヘッダーの一貫性テスト

### 確認コマンド

```bash
# X-Frame-Options設定を確認
grep -rn 'X-Frame-Options' src/ next.config.ts

# CSP frame-ancestors設定を確認
grep -rn 'frame-ancestors' src/ next.config.ts

# next.configのヘッダー設定を確認
grep -A 30 'headers:' next.config.ts
```

---

## 7. セッション管理の欠陥

### 必須チェック項目

- [ ] セッションIDは暗号学的に安全な乱数生成器で生成
- [ ] ログイン後にセッションIDを再生成
- [ ] セッションタイムアウトの実装
- [ ] ログアウト時にセッションを完全に破棄
- [ ] セッションIDをURLパラメータに含めない

### 推奨チェック項目

- [ ] セッションCookieにHttpOnly属性を設定
- [ ] セッションCookieにSecure属性を設定（HTTPS環境）
- [ ] セッションCookieにSameSite属性を設定
- [ ] 同時ログインセッション数の制限
- [ ] セッション固定攻撃への対策
- [ ] アイドルタイムアウトと絶対タイムアウトの両方を実装

### 確認コマンド

```bash
# Cookie設定を確認
grep -rn 'cookies()\|setCookie\|httpOnly\|secure\|sameSite' src/

# セッション管理ロジックを確認
grep -rn 'session\|auth' src/layers/application/ src/layers/infrastructure/

# 認証関連のServer Actionsを確認
grep -rn 'login\|logout\|signIn\|signOut' src/app/server-actions/
```

---

## 8. 認可制御の欠落

### 必須チェック項目

- [ ] すべての保護されたエンドポイントで認証チェック実施
- [ ] 認証と認可を混同していない（認証=誰か、認可=何ができるか）
- [ ] リソースアクセス前に所有者確認を実施
- [ ] URLパラメータのIDだけで認可判断していない
- [ ] Server Actionsで必ず認可チェックを実行

### 推奨チェック項目

- [ ] ロールベースアクセス制御（RBAC）の実装
- [ ] 最小権限の原則に従う
- [ ] 認可ロジックをドメイン層またはアプリケーション層に集約
- [ ] 認可失敗時のログ記録
- [ ] 横方向アクセス制御（他ユーザーのデータアクセス）の防止
- [ ] 縦方向アクセス制御（権限昇格）の防止

### 確認コマンド

```bash
# Server Actionsの認証チェックを確認
grep -rn 'use server' src/app/server-actions/ -A 10 | grep -i 'auth\|session'

# proxy.tsでの認証チェックを確認
grep -n 'auth' src/proxy.ts

# UseCaseでの認可チェックを確認
grep -rn 'authorize\|checkPermission\|hasPermission' src/layers/application/
```

---

## 9. ディレクトリトラバーサル

### 必須チェック項目

- [ ] ファイルパスにユーザー入力を直接使用していない
- [ ] `../`や`..\\`を含むパスを拒否
- [ ] 絶対パスへの正規化後に許可ディレクトリ内かチェック
- [ ] Next.jsの静的ファイル配信機能（public/）のみを使用

### 推奨チェック項目

- [ ] ファイル名のホワイトリスト検証
- [ ] path.resolve()とpath.normalize()の使用
- [ ] 許可ディレクトリの明示的な定義
- [ ] ファイルアクセスのログ記録
- [ ] シンボリックリンクの制限

### 確認コマンド

```bash
# ファイルシステム操作を検出
grep -rn 'readFile\|writeFile\|createReadStream\|fs\.' src/ --include="*.ts"

# パス操作を確認
grep -rn 'path\.join\|path\.resolve' src/

# 動的なファイル読み込みを検出
grep -rn 'require.*\$\|import.*\$' src/
```

---

## 10. バッファオーバーフロー

### 必須チェック項目

- [ ] Node.js/TypeScript環境では主にメモリ枯渇への対策
- [ ] ファイルアップロードサイズの制限
- [ ] リクエストボディサイズの制限
- [ ] 大量データ処理時のストリーム処理の使用

### 推奨チェック項目

- [ ] Next.jsのbodySizeLimit設定
- [ ] メモリ使用量のモニタリング
- [ ] 再帰処理の深さ制限
- [ ] 配列やオブジェクトのサイズ制限
- [ ] DoS攻撃への対策（レート制限）

### 確認コマンド

```bash
# ファイルアップロード処理を確認
grep -rn 'upload\|multipart' src/

# next.configのボディサイズ設定を確認
grep -rn 'bodySizeLimit' next.config.ts

# 再帰処理を検出
grep -rn 'function.*\(.*\).*{.*\1\(' src/ --include="*.ts"
```

---

## 11. メールヘッダインジェクション

### 必須チェック項目

- [ ] メール送信ライブラリ（nodemailer等）を使用
- [ ] ユーザー入力を直接メールヘッダーに設定していない
- [ ] 改行文字（\r\n）を含む入力を拒否
- [ ] ToアドレスとFromアドレスの検証

### 推奨チェック項目

- [ ] メールアドレスのバリデーション（正規表現または専用ライブラリ）
- [ ] Subjectと本文の長さ制限
- [ ] メール送信レート制限
- [ ] DKIM/SPF/DMARCの設定（インフラ層）
- [ ] メール送信ログの記録

### 確認コマンド

```bash
# メール送信処理を検出
grep -rn 'nodemailer\|sendmail\|smtp' src/

# メールアドレス検証を確認
grep -rn 'email.*valid\|validateEmail' src/

# メール関連のValue Objectを確認
grep -rn 'class.*Email' src/layers/domain/
```

---

## チェックリスト実行手順

1. **静的解析**: 上記の確認コマンドを実行
2. **コードレビュー**: 検出されたコードを手動で確認
3. **設定ファイル確認**: `next.config.ts`, `proxy.ts`, `.env`を確認
4. **依存関係チェック**: `pnpm audit`で脆弱性確認
5. **動的テスト**: E2Eテストで実際の動作を検証
6. **ドキュメント**: セキュリティ対策をプロジェクトルートの `README.md` に記載（`_DOCS/` は不可侵のため書かない）

---

## 参考資料

- IPA「安全なウェブサイトの作り方」: https://www.ipa.go.jp/security/vuln/websecurity/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security
- Prisma Security: https://www.prisma.io/docs/concepts/components/prisma-client/security
