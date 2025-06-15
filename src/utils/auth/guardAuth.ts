'use server';

import { resolve } from '@/layers/infrastructure/di/resolver';
import { HEADER_PATH } from '@/middleware';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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
    // DDD: Application層のUseCaseで認証チェック
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    return await getCurrentUserUseCase.requireAuthentication();
  } catch (error) {
    // 未認証の場合：現在のパスを取得してリダイレクト
    const headersList = await headers();
    const pathname = headersList.get(HEADER_PATH) || '/';
    const callbackUrl = encodeURIComponent(pathname);

    // Next.js固有機能でリダイレクト（Presentation層の責務）
    redirect(`/auth/sign-in?callbackUrl=${callbackUrl}`);
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
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    return await getCurrentUserUseCase.execute();
  } catch (error) {
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
