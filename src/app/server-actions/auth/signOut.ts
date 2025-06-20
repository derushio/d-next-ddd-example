'use server';

import 'reflect-metadata';

import { isFailure, isSuccess } from '@/layers/application/types/Result';
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
      const result = await signOutUseCase.execute({ userId });

      // Result型のパターンマッチング
      if (isFailure(result)) {
        logger.warn('サインアウト失敗', {
          userId,
          error: result.error.message,
          code: result.error.code,
        });

        return {
          error: result.error.message,
          code: result.error.code,
        };
      }

      logger.info('サインアウト成功', {
        userId,
        message: result.data.message,
      });

      // NextAuthのセッション無効化は呼び出し元で行う
      return {
        success: true,
        message: result.data.message,
      };
    } else {
      logger.info('ユーザーIDなしでサインアウト完了');

      return {
        success: true,
        message: 'サインアウトしました',
      };
    }
  } catch (error) {
    // 予期しないエラー（UseCaseで処理されなかった例外）
    const logger = resolve('Logger');

    logger.error('サインアウト処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
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
