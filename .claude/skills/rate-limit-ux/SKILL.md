---
name: rate-limit-ux
description: |
  RateLimitService の retryAfterMs をクライアントに公開し、
  UXフレンドリーなレートリミット体験を実現するスキル。
  ActionResult での retryAfterMs 公開パターン、
  クライアント側カウントダウン・ボタン無効化パターンを提供する。

  トリガー例:
  - 「retryAfterMs」「Retry-After」「レートリミット」「rate limit」
  - 「カウントダウン」「ボタン無効化」「429」
  - RateLimitService, RATE_LIMITED, RATE_LIMIT_EXCEEDED
  - サインインフォームのレートリミット対応時
---

# Rate Limit UX Skill

レートリミット時のUXフレンドリーな実装パターンを提供します。

---

## 全体フロー

```
[RateLimitService] retryAfterMs を計算
       ↓
[UseCase] AppUseCaseError の details に retryAfterMs を含めてスロー
       ↓
[mapToAppError] AppError の details にパススルー
       ↓
[resultToActionResult] ActionResult の details にパススルー
       ↓
[Client] details.retryAfterMs を取得してカウントダウン表示 + ボタン無効化
```

---

## Server 側: retryAfterMs を details に含める

ファイル: `src/layers/application/usecases/auth/SignInUseCase.ts`

```typescript
// ✅ RateLimitService のチェック結果から retryAfterMs を取得
if (ipAddress) {
  const rateLimitResult = await this.rateLimitService.checkLimit(ipAddress);
  if (!rateLimitResult.allowed) {
    this.logger.warn('Rate Limit超過: リクエスト拒否', {
      ipAddress,
      current: rateLimitResult.current,
      limit: rateLimitResult.limit,
      retryAfterMs: rateLimitResult.retryAfterMs,
    });

    const retryAfterSeconds = Math.ceil(
      (rateLimitResult.retryAfterMs ?? 60000) / 1000,
    );

    throw new AppUseCaseError(
      `リクエスト数が上限に達しました。${retryAfterSeconds}秒後に再試行してください。`,
      'RATE_LIMIT_EXCEEDED',
      { retryAfterMs: rateLimitResult.retryAfterMs },  // ← details に含める
    );
  }
}
```

### AppUseCaseError の details

`AppUseCaseError` は第3引数に `details?: Record<string, unknown>` を受け取ります。

```typescript
import { AppUseCaseError } from '@/layers/application/utils/useCaseErrorHandler';

throw new AppUseCaseError(
  'エラーメッセージ',
  'RATE_LIMIT_EXCEEDED',
  { retryAfterMs: 60000 },  // クライアントに伝えたいメタデータ
);
```

---

## resultToActionResult の自動パススルー

`resultToActionResult` は `AppError.details` を `ActionResult.details` に自動的にパススルーします。**追加実装は不要です。**

ファイル: `src/app/server-actions/utils/resultToActionResult.ts`

```typescript
// 自動パススルーの実装（参考）
return {
  success: false,
  error: result.error.message,
  code: mapActionErrorCode(result.error.code),
  ...(result.error.details !== undefined
    ? { details: result.error.details }
    : {}),
};
```

---

## Client 側: useRateLimitCountdown カスタムフック

```typescript
// src/hooks/useRateLimitCountdown.ts
import { useCallback, useEffect, useState } from 'react';

interface UseRateLimitCountdownReturn {
  /** 残り秒数（0 = カウントダウン終了） */
  remainingSeconds: number;
  /** レートリミット中かどうか */
  isRateLimited: boolean;
  /** retryAfterMs を受け取ってカウントダウン開始 */
  startCountdown: (retryAfterMs: number) => void;
  /** カウントダウンをリセット */
  resetCountdown: () => void;
}

export function useRateLimitCountdown(): UseRateLimitCountdownReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const startCountdown = useCallback((retryAfterMs: number) => {
    const seconds = Math.ceil(retryAfterMs / 1000);
    setRemainingSeconds(seconds);
  }, []);

  const resetCountdown = useCallback(() => {
    setRemainingSeconds(0);
  }, []);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  return {
    remainingSeconds,
    isRateLimited: remainingSeconds > 0,
    startCountdown,
    resetCountdown,
  };
}
```

---

## Client 側: フォームコンポーネントでの使用例

```typescript
'use client';

import { useRateLimitCountdown } from '@/hooks/useRateLimitCountdown';
import { Button } from '@/components/ui/button';

export function SignInFormClient({ callbackUrl = '/' }: SignInFormProps) {
  const form = useForm<SignInFormValues>({ ... });
  const { remainingSeconds, isRateLimited, startCountdown } = useRateLimitCountdown();

  const { execute, isPending } = useServerAction({ form, defaultErrorMessage: '...' });

  const onSubmit = (values: SignInFormValues) => {
    execute(async () => {
      // サインインアクションを実行（signIn 経由で Server Action が呼ばれる）
      const result = await someSignInAction(values);

      // ✅ RATE_LIMITED の場合にカウントダウンを開始
      if (!result.success && result.code === 'RATE_LIMITED') {
        const retryAfterMs = result.details?.retryAfterMs as number | undefined;
        startCountdown(retryAfterMs ?? 60000);
        form.setError('root', { type: 'server', message: result.error });
      }

      return result;
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... フィールド ... */}

      {/* ✅ レートリミット中はカウントダウン表示 */}
      {isRateLimited && (
        <p className='text-sm text-[var(--color-warning)] mt-2'>
          {remainingSeconds}秒後に再試行できます
        </p>
      )}

      {/* ✅ レートリミット中 or 送信中はボタンを無効化 */}
      <Button
        type='submit'
        disabled={isPending || isRateLimited}
        className='w-full'
      >
        {isPending
          ? 'サインイン中...'
          : isRateLimited
            ? `${remainingSeconds}秒後に再試行`
            : 'サインイン'}
      </Button>
    </form>
  );
}
```

---

## useState + useEffect のインライン実装（フックを作らない場合）

軽量な実装が必要な場合、フックを作らず直接 useState + useEffect を使うこともできます。

```typescript
'use client';

import { useEffect, useState } from 'react';

export function SimpleRateLimitForm() {
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // カウントダウン処理
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const handleResult = (result: ActionResult<unknown>) => {
    if (!result.success && result.code === 'RATE_LIMITED') {
      const retryAfterMs = result.details?.retryAfterMs as number | undefined;
      setRateLimitCountdown(Math.ceil((retryAfterMs ?? 60000) / 1000));
    }
  };

  return (
    <Button disabled={rateLimitCountdown > 0}>
      {rateLimitCountdown > 0 ? `${rateLimitCountdown}秒後に再試行` : '送信'}
    </Button>
  );
}
```

---

## チェックリスト

### Server 側
- [ ] `RateLimitService.checkResult.retryAfterMs` を `AppUseCaseError` の第3引数 `details` に含めている
- [ ] `retryAfterMs` がない場合のフォールバック値（60000ms等）を設定している
- [ ] ユーザー向けメッセージに残り秒数を含めている（`${retryAfterSeconds}秒後に再試行してください`）

### Client 側
- [ ] `result.code === 'RATE_LIMITED'` で分岐している
- [ ] `result.details?.retryAfterMs` を取得してカウントダウンを開始している
- [ ] カウントダウン中はボタンを `disabled` にしている
- [ ] 残り秒数をUIに表示している
- [ ] カウントダウンが0になったら自動的にボタンが有効になる

---

## 関連スキル

- `action-error-granularity` — ActionResult のエラーコード分類
- `security-review` — レートリミットのセキュリティ考慮事項
