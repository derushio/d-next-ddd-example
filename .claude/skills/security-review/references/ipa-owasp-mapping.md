# IPA 11脆弱性とOWASP Top 10 2021マッピング

IPAが定める11種類の脆弱性とOWASP Top 10 2021の対応関係、本プロジェクトでの対策実装箇所を示します。

---

## マッピング表

| IPA脆弱性分類 | IPA項番 | OWASP Top 10 2021 | 重要度 | 本プロジェクト対策箇所 |
|--------------|---------|-------------------|--------|----------------------|
| SQLインジェクション | 1-1 | A03:2021-Injection | High | Prisma（Infrastructure層） |
| OSコマンドインジェクション | 1-7 | A03:2021-Injection | High | execFile使用、shell禁止 |
| HTTPヘッダインジェクション | 1-3 | A03:2021-Injection | Medium | proxy.ts、改行除去 |
| XSS（クロスサイトスクリプティング） | 1-5 | A03:2021-Injection | High | React自動エスケープ、DOMPurify |
| CSRF（クロスサイトリクエストフォージェリ） | 1-6 | A01:2021-Broken Access Control | High | Server Actions自動保護 |
| クリックジャッキング | - | A05:2021-Security Misconfiguration | Medium | X-Frame-Options: DENY |
| セッション管理の欠陥 | 1-10 | A07:2021-Identification and Authentication Failures | High | SessionService、タイムアウト |
| 認可制御の欠落 | 1-9 | A01:2021-Broken Access Control | High | UseCase層権限チェック |
| ディレクトリトラバーサル | 1-2 | A01:2021-Broken Access Control | Medium | パス正規化、ホワイトリスト |
| バッファオーバーフロー | - | A06:2021-Vulnerable and Outdated Components | Medium | Node.js自動管理、pnpm audit |
| メールヘッダインジェクション | 1-4 | A03:2021-Injection | Medium | 改行除去、形式検証 |

---

## IPA脆弱性詳細

### 1. SQLインジェクション（IPA 1-1）

**OWASP**: A03:2021-Injection

**本プロジェクト対策**:
- Prisma ORMによるパラメータ化クエリ
- `$queryRaw`使用時は必ずパラメータバインド
- Biome Linterで文字列連結SQL検出

**実装箇所**:
- `src/layers/infrastructure/repositories/implementations/`

**検証方法**:
```bash
# 危険なパターン検出
git grep -E "\$queryRaw.*\$\{" src/
```

### 2. XSS（クロスサイトスクリプティング）（IPA 1-5）

**OWASP**: A03:2021-Injection

**本プロジェクト対策**:
- React 19の自動エスケープ機能
- DOMPurifyによるサニタイゼーション
- `dangerouslySetInnerHTML`使用時のレビュー必須

**実装箇所**:
- `src/components/**/*.tsx`
- `src/app/**/*.tsx`

**検証方法**:
```bash
# dangerouslySetInnerHTML使用箇所確認
git grep -n "dangerouslySetInnerHTML" src/
```

### 3. CSRF（クロスサイトリクエストフォージェリ）（IPA 1-6）

**OWASP**: A01:2021-Broken Access Control

**本プロジェクト対策**:
- Next.js Server Actionsの自動CSRF保護
- `'use server'`宣言必須
- SameSite Cookie属性設定

**実装箇所**:
- `src/app/server-actions/`

**検証方法**:
```bash
# Server Actionsの'use server'宣言確認
git grep -L "'use server'" src/app/server-actions/*.ts
```

### 4. 認可制御の欠落（IPA 1-9）

**OWASP**: A01:2021-Broken Access Control

**本プロジェクト対策**:
- UseCase層での権限チェック
- Entity層の権限メソッド（canEdit, canDelete等）
- デフォルト拒否原則

**実装箇所**:
- `src/layers/application/use-cases/`
- `src/layers/domain/entities/`

**検証方法**:
```bash
# 権限チェック実装確認
git grep -E "(canEdit|canDelete|hasPermission|isOwner)" src/layers/
```

### 5. セッション管理の欠陥（IPA 1-10）

**OWASP**: A07:2021-Identification and Authentication Failures

**本プロジェクト対策**:
- SessionServiceでの暗号論的に安全なセッションID生成
- セッション固定化対策（ログイン時に再生成）
- タイムアウト設定（アイドル30分、絶対24時間）
- httpOnly, Secure, SameSite Cookie属性

**実装箇所**:
- `src/layers/application/services/SessionService.ts`
- `src/app/api/auth/[...nextauth]/route.ts`

**検証方法**:
```bash
# セッション管理実装確認
git grep -n "sessionId\|session\.id\|renewSession" src/layers/application/
```

### 6. HTTPヘッダインジェクション（IPA 1-3）

**OWASP**: A03:2021-Injection

**本プロジェクト対策**:
- リクエストヘッダー設定時の改行除去
- ホワイトリスト検証
- proxy.tsでのセキュアヘッダー設定

**実装箇所**:
- `src/proxy.ts`
- `next.config.ts`

**検証方法**:
```bash
# ヘッダー設定箇所確認
git grep -E "setHeader|headers\[" src/
```

### 7. OSコマンドインジェクション（IPA 1-7）

**OWASP**: A03:2021-Injection

**本プロジェクト対策**:
- シェル呼び出し禁止（`shell: false`）
- `execFile`で引数を配列化
- 可能な限りNode.js APIで代替

**実装箇所**:
- `src/layers/infrastructure/services/`

**検証方法**:
```bash
# コマンド実行箇所確認
git grep -E "(exec|spawn|execFile)" src/
```

### 8. ディレクトリトラバーサル（IPA 1-2）

**OWASP**: A01:2021-Broken Access Control

**本プロジェクト対策**:
- `path.resolve()`でパス正規化
- ベースディレクトリ配下確認
- ファイル名ホワイトリスト検証

**実装箇所**:
- `src/layers/infrastructure/services/FileService.ts`
- `src/layers/infrastructure/services/UploadService.ts`

**検証方法**:
```bash
# ファイルパス操作箇所確認
git grep -E "(readFile|writeFile|path\.resolve)" src/layers/infrastructure/
```

### 9. メールヘッダインジェクション（IPA 1-4）

**OWASP**: A03:2021-Injection

**本プロジェクト対策**:
- メールアドレス・件名の改行除去
- 形式検証（正規表現）
- nodemailer使用時のパラメータ分離

**実装箇所**:
- `src/layers/infrastructure/services/EmailService.ts`

**検証方法**:
```bash
# メール送信箇所確認
git grep -E "(sendMail|email|mailer)" src/layers/infrastructure/
```

### 10. クリックジャッキング

**OWASP**: A05:2021-Security Misconfiguration

**本プロジェクト対策**:
- `X-Frame-Options: DENY`ヘッダー設定
- CSP `frame-ancestors 'none'`設定

**実装箇所**:
- `next.config.ts`

**検証方法**:
```bash
# セキュリティヘッダー確認
git grep -E "X-Frame-Options|frame-ancestors" next.config.ts
```

### 11. バッファオーバーフロー

**OWASP**: A06:2021-Vulnerable and Outdated Components

**本プロジェクト対策**:
- Node.js自動メモリ管理
- 依存パッケージの定期更新
- `pnpm audit`による脆弱性スキャン

**実装箇所**:
- `package.json`
- CI/CDパイプライン

**検証方法**:
```bash
# 脆弱性スキャン
pnpm audit
pnpm outdated
```

---

## OWASP Top 10 2021詳細

### A01:2021 – Broken Access Control

**対応IPA項目**: 認可制御の欠落（1-9）、CSRF（1-6）、ディレクトリトラバーサル（1-2）

**本プロジェクト対策**:
- UseCase層での認可チェック必須
- デフォルト拒否原則
- Server Actions自動CSRF保護
- ファイルアクセスのパス正規化

### A02:2021 – Cryptographic Failures

**対応IPA項目**: パスワード処理（間接的）

**本プロジェクト対策**:
- Argon2idでパスワードハッシュ化（OWASP 2026推奨設定）
- HTTPS必須化
- 環境変数での機密情報管理

### A03:2021 – Injection

**対応IPA項目**: SQLi（1-1）、XSS（1-5）、OSコマンドi（1-7）、HTTPヘッダi（1-3）、メールヘッダi（1-4）

**本プロジェクト対策**:
- Prismaパラメータ化クエリ
- React自動エスケープ
- DOMPurifyサニタイゼーション
- execFileで引数配列化
- ヘッダー改行除去

### A04:2021 – Insecure Design

**対応IPA項目**: 設計段階の脆弱性全般

**本プロジェクト対策**:
- Clean Architecture + DDD
- 脅威モデリング
- セキュリティレビュープロセス

### A05:2021 – Security Misconfiguration

**対応IPA項目**: クリックジャッキング

**本プロジェクト対策**:
- セキュリティヘッダー設定
- CSP設定
- デフォルト設定の見直し

### A06:2021 – Vulnerable and Outdated Components

**対応IPA項目**: バッファオーバーフロー

**本プロジェクト対策**:
- `pnpm audit`定期実行
- 依存パッケージ自動更新（Dependabot/Renovate）
- Critical/High脆弱性の即座対応

### A07:2021 – Identification and Authentication Failures

**対応IPA項目**: セッション管理（1-10）、認証（1-8）

**本プロジェクト対策**:
- NextAuth.js使用
- セッション固定化対策
- Rate Limiting
- アカウントロックアウト

### A08:2021 – Software and Data Integrity Failures

**対応IPA項目**: 間接的関連

**本プロジェクト対策**:
- パッケージの署名検証
- CI/CDパイプラインのセキュリティ
- 環境変数の適切な管理

### A09:2021 – Security Logging and Monitoring Failures

**対応IPA項目**: 間接的関連

**本プロジェクト対策**:
- SecureLoggerで機密情報マスキング
- 認証失敗ログ記録
- 異常アクセスパターン検知

### A10:2021 – Server-Side Request Forgery (SSRF)

**対応IPA項目**: 間接的関連

**本プロジェクト対策**:
- 外部URL呼び出し時のホワイトリスト検証
- 内部IPへのアクセス禁止
- リダイレクト先URL検証

---

## チェックリスト活用方法

### コミット前セルフチェック

1. リスク分類を確認（Critical/High/Medium/Low）
2. 該当するIPA項目を確認
3. 対応するOWASP Top 10を参照
4. 本プロジェクト対策箇所を確認
5. 検証コマンドで自動検出

### コードレビュー時

1. 変更ファイルから該当IPA項目を特定
2. OWASP Top 10との対応を確認
3. 本プロジェクト対策が実装されているか検証
4. 検証コマンドで自動検出
5. レビュー結果を記録

---

## 参考資料

- **IPA「安全なウェブサイトの作り方」**: https://www.ipa.go.jp/security/vuln/websecurity/about.html
- **OWASP Top 10 2021**: https://owasp.org/www-project-top-ten/
- **本プロジェクトセキュリティガイド**: `_DOCS/guides/ddd/cross-cutting/security/README.md`
