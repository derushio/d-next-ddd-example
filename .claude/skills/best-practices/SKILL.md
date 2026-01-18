---
name: best-practices
description: |
  Clean Architecture + DDDのベストプラクティスを自動適用するスキル。
  レイヤー構造、DIP、DRY、SRP等の原則に基づいた実装ガイダンスを提供。
  Next.js 16 proxy.ts、shadcn/ui カスタマイズ済みコンポーネント等のフレームワーク固有注意事項も含む。

  トリガー例:
  - 「実装したい」「機能を作りたい」「コードを書きたい」
  - 「UseCase」「Entity」「Repository」「Server Action」
  - 「アーキテクチャ」「設計」「リファクタリング」
  - 「middleware」「proxy.ts」「shadcn/ui」
  - src/layers/ 配下のファイルを編集・作成するとき
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Best Practice Implementation Skill

このスキルは、以下のベストプラクティスに基づいた実装ガイダンスを提供します。

---

## 🎯 Phase 1: あるべき姿を考える（実装前必須）

### 1.1 要件の明確化

実装を始める**前に**、以下を確認・整理してください:

- [ ] **目的**: この機能は何を解決するのか？
- [ ] **スコープ**: 必要十分な範囲はどこまでか？（過剰実装を避ける）
- [ ] **既存コード**: 類似実装や再利用可能なコードはないか？
- [ ] **影響範囲**: 変更が及ぶファイル・モジュールはどこか？

### 1.2 設計の検討

コードを書く前に設計を固めてください:

```
質問:
- どのレイヤーに配置すべきか？
- 既存のパターンに沿っているか？
- 将来の拡張性は必要か？（必要以上に考慮しない）
- テスト可能な設計になっているか？
```

### 1.3 ベストプラクティスの調査

不明点がある場合は**実装前に**調べてください:

- [ ] `_DOCS/` 内の関連ドキュメントを確認
- [ ] 既存の類似実装コードを参照
- [ ] 必要に応じてWeb検索でベストプラクティスを確認

---

## 🏗️ Phase 2: アーキテクチャ原則

### 2.1 レイヤー構造の遵守

```
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer (app/, components/)                  │
│   - UI表示とユーザー入力処理のみ                        │
│   - ビジネスロジックを含まない                          │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ Application Layer (layers/application/)                 │
│   - UseCase: ビジネスフローの調整                       │
│   - DTO: レイヤー間データ変換                           │
│   - Result型で統一的エラーハンドリング                  │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ Domain Layer (layers/domain/)                           │
│   - Entity/Value Object: ビジネスルールをカプセル化     │
│   - Repository Interface: 永続化の抽象化                │
│   - フレームワーク非依存（純粋TypeScript）              │
└──────────────────────┬──────────────────────────────────┘
                       ↑（依存性逆転）
┌─────────────────────────────────────────────────────────┐
│ Infrastructure Layer (layers/infrastructure/)           │
│   - Repository実装: Prisma等を使用した具体実装          │
│   - 外部サービス連携                                    │
│   - DI設定                                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 DIP（依存性逆転の原則）

```typescript
// ✅ 正しい: Domain層でInterfaceを定義
// src/layers/domain/repositories/IUserRepository.ts
export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
}

// ✅ 正しい: Infrastructure層でInterfaceを実装
// src/layers/infrastructure/repositories/implementations/UserRepository.ts
@injectable()
export class UserRepository implements IUserRepository {
  async findById(id: UserId): Promise<User | null> {
    // Prisma等を使用した具体実装
  }
}

// ❌ 禁止: Domain層が具体実装に依存
import { UserRepository } from '@/layers/infrastructure/...'; // 禁止
```

### 2.3 DRY原則（Don't Repeat Yourself）

- [ ] **3回以上の重複** → 共通関数/コンポーネントに抽出
- [ ] **類似ロジック** → ジェネリクスや高階関数で汎用化
- [ ] **定数値の重複** → 定数ファイルに集約

ただし、**早すぎる抽象化は避ける**:

- 2回の重複 → まだ様子を見る
- 文脈が異なる類似コード → 無理に共通化しない

---

## 📦 Phase 3: コンポーネント分離

### 3.1 単一責任の原則（SRP）

各ファイル/クラス/関数は**1つの責任**のみを持つ:

```typescript
// ❌ 悪い例: 複数の責任が混在
class UserService {
  validateEmail(email: string) { /* ... */ }  // バリデーション
  saveUser(user: User) { /* ... */ }          // 永続化
  sendWelcomeEmail(user: User) { /* ... */ }  // 通知
  formatUserName(user: User) { /* ... */ }    // フォーマット
}

// ✅ 良い例: 責任ごとに分離
class EmailValidator { /* バリデーション責任 */ }
class UserRepository { /* 永続化責任 */ }
class NotificationService { /* 通知責任 */ }
class UserFormatter { /* 表示フォーマット責任 */ }
```

### 3.2 React コンポーネント分離基準

```
分離すべきタイミング:
- [ ] コンポーネントが100行を超えた
- [ ] 再利用の必要性が明確
- [ ] 独立したテストが必要
- [ ] 状態管理が複雑化した

配置先:
- features/   → 特定機能に紐づくコンポーネント
- common/     → 複数機能で共有するコンポーネント
- ui/         → 汎用UIパーツ（shadcn/ui拡張）
```

### 3.3 Server/Client分離（ドーナツ構造）

```tsx
// ✅ 推奨: Server Componentで外側を構成
// app/users/page.tsx (Server Component)
export default async function UsersPage() {
  const users = await fetchUsers(); // サーバーでデータ取得
  return (
    <div>
      <h1>ユーザー一覧</h1>
      <UserList users={users} />
      <InteractiveFilter /> {/* Client: 必要な部分のみ */}
    </div>
  );
}
```

### 3.4 UIスタイリング規約

```tsx
// ✅ 必須: クリッカブル要素には cursor-pointer を付与
// ボタン、リンク、クリック可能なカード等

// ❌ 悪い: クリックできるのにカーソルが変わらない
<div onClick={handleClick}>クリックしてね</div>

// ✅ 良い: cursor-pointerでクリック可能を明示
<div onClick={handleClick} className="cursor-pointer">クリックしてね</div>

// ✅ 良い: button/a要素は通常自動適用されるが、明示も推奨
<button className="cursor-pointer">送信</button>
```

```
クリッカブル要素のチェックリスト:
- [ ] onClick ハンドラを持つ要素 → cursor-pointer
- [ ] カスタムボタン/リンクコンポーネント → cursor-pointer
- [ ] クリック可能なカード/リストアイテム → cursor-pointer
- [ ] タブ、アコーディオンヘッダー → cursor-pointer
- [ ] ドロップダウントリガー → cursor-pointer
```

---

## 🛠️ Phase 4: フレームワーク固有の注意事項

### 4.1 Next.js 16: middleware.ts → proxy.ts への変更

**重要**: Next.js 16で `middleware.ts` が `proxy.ts` にリネームされました。

```
src/proxy.ts  # ← middleware.tsではない
```

**主な違い:**

| 項目 | middleware.ts (旧) | proxy.ts (新) |
|------|-------------------|--------------|
| 関数名 | `middleware()` | `proxy()` |
| ランタイム | Edge Runtime対応 | Node.jsのみ（Edge非対応） |
| 用途 | リクエスト/レスポンス改変全般 | ネットワーク境界での認証・リダイレクト・ヘッダー操作 |

**実装例:**

```typescript
// ❌ 禁止: middleware.ts（Next.js 16では動作しない）
// src/middleware.ts
export function middleware(request: NextRequest) {
  // ...
}

// ✅ 正しい: proxy.ts
// src/proxy.ts
export function proxy(request: NextRequest) {
  // 認証チェック、リダイレクト、ヘッダー操作
  return NextResponse.next();
}
```

**参考**: [Next.js proxy.ts Docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

### 4.2 shadcn/ui カスタマイズ済みコンポーネント

以下のコンポーネントは**プロジェクト固有のカスタマイズ**が施されているため、
`pnpm ui:add` で再追加・上書き**禁止**:

```
✅ カスタマイズ済み（追加禁止）:
button, card, input, alert, badge, dialog,
form, label, separator, sonner, toast,
loading, spinner
```

**理由:**
- プロジェクト固有のスタイル適用
- 追加のprops/variantsの実装
- アニメーション・状態管理の拡張

**新規コンポーネント追加時:**

```bash
# ✅ 正しい: カスタマイズされていないコンポーネントの追加
pnpm ui:add dropdown-menu

# ✅ 確認: 利用可能なコンポーネント一覧
pnpm ui:list

# ❌ 禁止: カスタマイズ済みコンポーネントの上書き
pnpm ui:add button  # カスタマイズが失われる
```

---

## 📏 Phase 5: ファイルサイズと構成

### 5.1 適正なファイル長の目安

| ファイル種別 | 推奨行数 | 上限目安 |
|-------------|---------|---------|
| Component   | ~100行  | 200行   |
| UseCase     | ~80行   | 150行   |
| Entity      | ~150行  | 300行   |
| Repository  | ~100行  | 200行   |
| Utility     | ~50行   | 100行   |

### 5.2 ファイルが大きくなった場合

```
上限を超えたら:
1. 責任を分析 → 複数の責任が混在していないか？
2. 機能を分割 → 独立した機能を別ファイルに抽出
3. ヘルパー抽出 → 汎用ロジックをutilsに移動
4. サブコンポーネント化 → UIの論理単位で分離
```

---

## 💬 Phase 6: 日本語コメント規約

### 6.1 コメントの原則

```typescript
// ❌ 悪い: コードの説明（What）
// ユーザーを取得する
const user = await repository.findById(id);

// ✅ 良い: 理由・背景の説明（Why）
// 認証済みユーザーのみアクセス可能なため、存在確認が必須
const user = await repository.findById(id);
if (!user) throw new UnauthorizedError();

// ✅ 良い: 複雑なビジネスルールの説明
// 税率は商品カテゴリと購入者の居住地域により決定
// 参照: https://example.com/tax-rules
const taxRate = calculateTaxRate(product, buyer);
```

### 6.2 TypeScriptでのコメント（型アノテーション不要）

```typescript
// ❌ 冗長: TypeScriptで型は既に定義されている
/**
 * @param {CreateUserRequest} request - リクエスト
 * @returns {Promise<Result<CreateUserResponse>>} レスポンス
 */

// ✅ スマート: Why/背景/注意点のみ記述
/**
 * ユーザーを作成し、ウェルカムメールを送信する
 *
 * - メールアドレスの重複時は既存ユーザーを返す
 * - パスワードは自動的にハッシュ化される
 *
 * @deprecated v2.0で廃止予定、useCreateUserV2を使用
 */
async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>>
```

### 6.3 引数へのインラインコメント（推奨）

```typescript
// ✅ 引数の意味・制約・デフォルト挙動を引数直前に記述
// IDEホバー時に表示され、JSDoc @paramより直感的
function randomNormal(
  /** 標準偏差の基準値（通常は6） */
  stdDevBase: number,
  /** 範囲の開始値 */
  start: number,
  /** 範囲の終了値（省略時はstartが終了値、0が開始値） */
  end?: number,
  /** 平均値（省略時は (start + end) / 2） */
  mean?: number,
  /** trueで小数を返す（デフォルト: 整数） */
  float = false,
): number

// 使いどころ:
// - 引数名だけでは意味が不明確な場合
// - 省略時の挙動を説明したい場合
// - 単位や制約（0-1、ms等）を明示したい場合
```

### 6.4 TODO/FIXME/NOTEの書き方

```typescript
// TODO: 機能説明 - 関連Issue
// TODO: キャッシュ機能を追加 #123

// FIXME: 問題の説明
// FIXME: N+1クエリ問題の解消が必要

// NOTE: 重要な注意事項・背景
// NOTE: 外部APIの制限により同期実行が必須
```

---

## ✅ Phase 7: 実装チェックリスト

### 実装前

- [ ] 要件と目的を明確に理解した
- [ ] 配置するレイヤーを決定した
- [ ] 既存コードとの整合性を確認した
- [ ] 必要なドキュメントを読んだ

### 実装中

- [ ] レイヤー境界を越えた依存がない
- [ ] DIP: 上位レイヤーが下位の具体実装に依存していない
- [ ] DRY: 不必要な重複コードがない
- [ ] SRP: 各ファイル/クラスは単一責任
- [ ] ファイルサイズが適正範囲内
- [ ] 命名が明確で一貫性がある

### 実装後

- [ ] Result型でエラーハンドリングしている（UseCase）
- [ ] 適切な日本語コメントを付与した
- [ ] テストを作成/更新した
- [ ] `pnpm check` が通過する

---

## 🚀 適用方法

上記のベストプラクティスを参照しながら、実装を進めてください。

不明点や設計判断が必要な場合は、実装前に確認・相談してください。
