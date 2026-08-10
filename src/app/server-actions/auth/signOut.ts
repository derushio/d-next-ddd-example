'use server';

import { resultToActionResult } from '@/app/server-actions/utils/resultToActionResult';
import { withAuth } from '@/app/server-actions/utils/withAuth';
import { resolve } from '@/di/resolver';
import type { ActionResult } from '@/layers/presentation/types/ActionResult';

export interface SignOutData {
  message: string;
}

/**
 * サインアウト Server Action
 *
 * withAuth HOF により以下が自動処理されます:
 * - 認証チェック（requireAuthentication）
 * - 例外キャッチ・統一エラーレスポンス
 *
 * 注意: SignOutUseCase.execute() は同期的な Result<T,E> を返すため await 不要
 */
export const signOut = withAuth(
  'signOut',
  null,
  async (_input, userId): Promise<ActionResult<SignOutData>> => {
    const logger = resolve('Logger');
    const signOutUseCase = resolve('SignOutUseCase');

    // SignOutUseCase.execute() は同期 Result<T,E> を返す（await 不要）
    const result = signOutUseCase.execute({ userId });

    return resultToActionResult(result, logger, 'サインアウト', {
      mapData: (value) => ({ message: value.message }),
      successMeta: () => ({ userId }),
      failureMeta: { userId },
    });
  },
);

/**
 * NextAuth統合サインアウト関数
 * Client Componentから呼び出し用（内部利用向け）
 */
export async function signOutWithUseCase(input?: unknown) {
  // まずUseCaseでビジネスロジック実行
  await signOut(input);

  // その後NextAuthでセッション無効化
  // この関数はClient Componentから呼び出される想定
}
