'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentUserCached,
  requireAuthenticationCached,
} from '@/utils/auth/getCurrentUserCached';
import { HEADER_PATH } from '@/proxy';

/**
 * サインインページへリダイレクト（現在のパスをcallbackUrlとして付与）
 */
async function redirectToSignIn(): Promise<never> {
  const headersList = await headers();
  const pathname = headersList.get(HEADER_PATH) || '/';
  redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
}

/**
 * 認証ガード（Server Component専用）
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseで認証チェック（Application層）
 * - Next.jsのredirect機能を使用（Presentation層）
 * - 共通化されたガード機能
 *
 * @returns 認証済みユーザー情報
 * @throws 未認証の場合は自動的にサインインページにリダイレクト
 */
export async function guardAuth(): Promise<{
  id: string;
  email: string;
  name: string;
}> {
  try {
    const result = await requireAuthenticationCached();

    if (!result.isOk()) {
      // 認証失敗の場合：現在のパスを取得してリダイレクト
      return await redirectToSignIn();
    }

    return result.value;
  } catch (_error) {
    // 未認証の場合：現在のパスを取得してリダイレクト
    return await redirectToSignIn();
  }
}

/**
 * 認証チェックのみ（リダイレクトなし）
 *
 * @returns 認証済みユーザー情報 | null
 */
export async function checkAuth(): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  try {
    const result = await getCurrentUserCached();

    if (!result.isOk()) {
      return null;
    }

    return result.value;
  } catch (_error) {
    return null;
  }
}

/**
 * 条件付き認証ガード
 *
 * @param condition 認証が必要な条件
 * @returns 認証済みユーザー情報 | null
 */
export async function conditionalGuardAuth(condition: boolean): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  if (condition) {
    return await guardAuth();
  }
  return await checkAuth();
}
