---
name: background-jobs
description: |
  バックグラウンドジョブ・非同期処理の実装パターンを提供するスキル。
  Inngest（サーバーレス向け）とTrigger.dev（セルフホスト向け）の選定ガイド、
  メール送信・画像処理・定期実行等のジョブ設計パターンを含む。

  トリガー例:
  - バックグラウンド, ジョブ, キュー, 非同期処理, ワーカー
  - メール送信, 通知, Resend, React Email
  - Inngest, Trigger.dev, BullMQ, cron
  - 「定期実行」「スケジュール」「遅延実行」「リトライ」
---

# background-jobs スキル

## 概要

バックグラウンドジョブが必要なユースケース:
- メール送信（パスワードリセット、ウェルカムメール、通知）
- 画像/ファイル処理（リサイズ、変換、S3アップロード）
- 定期実行（レポート生成、データクリーンアップ）
- 長時間処理（PDF生成、CSV/Excelエクスポート）
- 外部API連携（Webhook受信後の処理）

## ライブラリ選定

### サーバーレス環境（Vercel等）→ Inngest

Inngest はイベント駆動のバックグラウンドジョブプラットフォーム。

**特徴:**
- サーバーレス環境でHTTPベースで動作（別プロセス不要）
- ステップ関数: 各ステップが独立して実行・リトライ
- スリープ: ステップ間で数分〜数日の待機が可能
- 自動リトライ: 失敗時に指数バックオフで再試行
- 無料枠: 50,000 runs/月

**推奨アーキテクチャ（Clean Architecture統合）:**

```typescript
// src/app/api/inngest/route.ts — Inngestエンドポイント
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { functions } from '@/jobs';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

// src/lib/inngest.ts — Inngestクライアント
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'app-name' });

// src/jobs/send-welcome-email.ts — ジョブ定義
import { inngest } from '@/lib/inngest';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email', retries: 3 },
  { event: 'user/created' },
  async ({ event, step }) => {
    // Step 1: メール送信
    await step.run('send-email', async () => {
      // Resend + React Email でメール送信
    });

    // Step 2: 送信ログ記録
    await step.run('log-sent', async () => {
      // DB更新
    });
  }
);

// UseCase からイベント発火
await inngest.send({ name: 'user/created', data: { userId, email } });
```

### セルフホスト環境 → Trigger.dev v3

Trigger.dev v3 は専用コンピュートでジョブを実行。Apache 2.0でセルフホスト無制限。

**特徴:**
- サーバーレス実行時間制限なし（2時間以上のジョブも可）
- チェックポイント機能（中断→再開）
- OpenAI/Resend/Slack等のビルトイン統合
- Docker でセルフホスト可能

**推奨アーキテクチャ:**

```typescript
// src/trigger/send-email.ts
import { task } from '@trigger.dev/sdk/v3';

export const sendEmailTask = task({
  id: 'send-email',
  retry: { maxAttempts: 3 },
  run: async (payload: { to: string; subject: string; body: string }) => {
    // メール送信処理
  },
});

// UseCase からトリガー
await sendEmailTask.trigger({ to: email, subject: '...', body: '...' });
```

### 選定基準

| 基準 | Inngest | Trigger.dev v3 |
|------|---------|----------------|
| デプロイ先 | Vercel/Cloudflare/サーバーレス | セルフホスト/VPS |
| 実行時間制限 | サーバーレス制限に準拠（ステップで回避） | 制限なし |
| セルフホスト | なし | あり (Apache 2.0) |
| 無料枠 | 50K runs/月 | 5K runs/月（セルフホスト無制限） |
| 複雑なワークフロー | ステップ関数 | チェックポイント |

## Clean Architecture への統合

### レイヤー配置ルール

バックグラウンドジョブは **Infrastructure レイヤー**に配置する。ジョブはUseCaseを呼び出す「外側のアダプター」であり、Inngest/Trigger.devはフレームワーク詳細（技術的関心事）であるため。

```
src/
├── jobs/                          # Infrastructure: ジョブ定義（Inngest/Trigger.dev）
│   ├── index.ts                   # 全ジョブのエクスポート
│   ├── send-welcome-email.ts
│   └── cleanup-expired-tokens.ts
├── lib/
│   └── inngest.ts                 # Infrastructure: Inngestクライアント（or trigger.ts）
├── layers/
│   └── application/
│       └── interfaces/
│           └── IJobScheduler.ts   # Application: ジョブスケジューラーのインターフェース
└── app/api/inngest/
    └── route.ts                   # Presentation: Inngest APIエンドポイント
```

| 要素 | レイヤー | パス |
|------|---------|------|
| IJobScheduler インターフェース | Application | `src/layers/application/interfaces/IJobScheduler.ts` |
| ジョブ定義（Inngest/Trigger.dev） | Infrastructure | `src/jobs/` |
| Inngest クライアント | Infrastructure | `src/lib/inngest.ts` |
| Inngest API エンドポイント | Presentation | `src/app/api/inngest/route.ts` |

### IJobScheduler インターフェース定義

Application レイヤーはInngest/Trigger.devに直接依存せず、インターフェース経由でDIPを守る:

```typescript
// src/layers/application/interfaces/IJobScheduler.ts
export interface IJobScheduler {
  /** ジョブをすぐにエンキュー */
  enqueue<T>(jobName: string, payload: T): Promise<void>;
  /** 指定時刻にジョブをスケジュール */
  schedule<T>(jobName: string, payload: T, at: Date): Promise<void>;
}

// INJECTION_TOKENS への追加
// src/di/tokens.ts
// JobScheduler: Symbol('JobScheduler'),
```

```typescript
// src/layers/infrastructure/jobs/InngestJobScheduler.ts — Inngest実装
import { injectable } from 'tsyringe';
import { inngest } from '@/lib/inngest';
import type { IJobScheduler } from '@/layers/application/interfaces/IJobScheduler';

@injectable()
export class InngestJobScheduler implements IJobScheduler {
  async enqueue<T>(jobName: string, payload: T): Promise<void> {
    await inngest.send({ name: jobName, data: payload as Record<string, unknown> });
  }

  async schedule<T>(jobName: string, payload: T, at: Date): Promise<void> {
    await inngest.send({ name: jobName, data: payload as Record<string, unknown>, ts: at.getTime() });
  }
}
```

```typescript
// UseCase からジョブを発火（Inngest非依存）
@injectable()
export class RegisterUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.JobScheduler)
    private readonly jobScheduler: IJobScheduler,
  ) {}

  async execute(request: RegisterUserRequest) {
    // ... ユーザー作成 ...
    await this.jobScheduler.enqueue('user/created', { userId, email });
    return ok(response);
  }
}
```

### DI統合（ジョブ内でUseCase呼び出し）

ジョブ内でUseCaseを使用する場合はDIコンテナから解決:

```typescript
import { resolve } from '@/di/resolver';

export const processOrder = inngest.createFunction(
  { id: 'process-order' },
  { event: 'order/created' },
  async ({ event, step }) => {
    const useCase = resolve('ProcessOrderUseCase');
    await useCase.execute({ orderId: event.data.orderId });
  }
);
```

## 現在のプロジェクト状況

メール送信は `ResetPasswordUseCase.ts` でコメントアウト例として準備済み:
```typescript
// === メール送信の実装例（将来 Resend + React Email 等で実装） ===
```

バックグラウンドジョブ導入時に、このコメントアウト例をInngest/Trigger.devのイベント発火に置き換える。

## メール送信の推奨スタック

- **Resend**: Next.js向けメール送信API（型安全、React Email統合）
- **React Email**: Reactコンポーネントでメールテンプレート作成
- Inngest/Trigger.dev と組み合わせてバックグラウンドで送信
