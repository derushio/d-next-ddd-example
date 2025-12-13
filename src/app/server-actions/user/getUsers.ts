'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isFailure, isSuccess } from '@/layers/application/types/Result';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// バリデーションスキーマ
const getUsersSchema = z.object({
  searchQuery: z.string().optional(),
  minLevel: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'createdAt', 'level']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersParams = z.infer<typeof getUsersSchema>;

/**
 * ユーザー一覧取得 Server Action
 *
 * UseCase パターン対応:
 * - resolve()でGetUsersUseCaseを取得してユーザー一覧取得処理を実行
 * - resolve()でLoggerを取得してログ出力
 * - エラーハンドリングも統合
 *
 * @param params - 検索パラメータ（URLSearchParamsまたは直接パラメータ）
 */
export async function getUsers(params: Partial<GetUsersParams> = {}) {
  try {
    // resolve()で型推論付きサービス取得
    const logger = resolve('Logger'); // ILogger型として推論される

    logger.info('ユーザー一覧取得処理開始', {
      action: 'getUsers',
      params,
      timestamp: new Date().toISOString(),
    });

    // パラメータの検証
    const validatedParams = getUsersSchema.safeParse(params);

    if (!validatedParams.success) {
      logger.warn('ユーザー一覧取得: バリデーションエラー', {
        errors: validatedParams.error.flatten().fieldErrors,
      });
      return {
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        errors: validatedParams.error.flatten().fieldErrors,
      };
    }

    const { searchQuery, minLevel, isActive, page, limit, sortBy, sortOrder } =
      validatedParams.data;

    // resolve()でGetUsersUseCaseを取得してユーザー一覧取得
    const getUsersUseCase = resolve('GetUsersUseCase');

    const result = await getUsersUseCase.execute({
      searchQuery,
      minLevel,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    // Result型のパターンマッチング
    if (isSuccess(result)) {
      logger.info('ユーザー一覧取得成功', {
        userCount: result.data.users.length,
        totalCount: result.data.totalCount,
        currentPage: result.data.currentPage,
        totalPages: result.data.totalPages,
      });

      return {
        success: true,
        data: result.data,
      };
    } else {
      logger.warn('ユーザー一覧取得失敗', {
        error: result.error.message,
        code: result.error.code,
      });

      return {
        error: result.error.message,
        code: result.error.code,
      };
    }
  } catch (error) {
    // 予期しないエラー（UseCaseで処理されなかった例外）
    const logger = resolve('Logger');

    logger.error('ユーザー一覧取得処理中に予期しないエラーが発生', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
