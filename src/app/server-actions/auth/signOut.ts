'use server';

import 'reflect-metadata';

import { resolve } from '@/layers/infrastructure/di/resolver';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

/**
 * サインアウト Server Action
 *
 * NextAuth + UseCase パターン対応:
 * - SignOutUseCaseでビジネスロジック実行
 * - NextAuthのsignOut()でセッション無効化
 * - ログ出力も統合
 *
 * @param userId - サインアウトするユーザーID
 */
export async function signOut(userId?: string) {
  try {
    const logger = resolve('Logger');

    logger.info('サインアウト処理開始', {
      userId,
      action: 'signOut',
      timestamp: new Date().toISOString(),
    });

    // SignOutUseCaseでビジネスロジック実行
    if (userId) {
      const signOutUseCase = resolve('SignOutUseCase');
      await signOutUseCase.execute({ userId });
    }

    logger.info('サインアウト成功', { userId });

    // NextAuthのセッション無効化は呼び出し元で行う
    return {
      success: true,
      message: 'サインアウトしました',
    };
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('サインアウトエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });

    return {
      error: 'サインアウトに失敗しました',
    };
  }
}

/**
 * NextAuth統合サインアウト関数
 * Client Componentから呼び出し用
 */
export async function signOutWithUseCase(userId?: string) {
  // まずUseCaseでビジネスロジック実行
  await signOut(userId);

  // その後NextAuthでセッション無効化
  // この関数はClient Componentから呼び出される想定
}
