---
to: src/app/server-actions/<%= domain %>/<%= name %>.ts
---
'use server';

import 'reflect-metadata';

import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const <%= name %>Schema = z.object({
  // TODO: バリデーションスキーマを定義
});

export type <%= h.toPascalCase(name) %>Input = z.infer<typeof <%= name %>Schema>;

export interface <%= h.toPascalCase(name) %>Result {
  success?: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  errors?: Record<string, string[] | undefined>;
}

/**
 * <%= h.toPascalCase(name) %> Server Action
 */
export async function <%= name %>(formData: FormData): Promise<<%= h.toPascalCase(name) %>Result> {
  try {
    const logger = resolve('Logger');

    logger.info('<%= name %> 処理開始', {
      action: '<%= name %>',
      timestamp: new Date().toISOString(),
    });

    // フォームデータの検証
    const validatedFields = <%= name %>Schema.safeParse({
      // TODO: フォームデータを取得
      // example: formData.get('fieldName'),
    });

    if (!validatedFields.success) {
      logger.warn('<%= name %>: バリデーションエラー', {
        errors: validatedFields.error.flatten().fieldErrors,
      });
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    // UseCase実行
    const useCase = resolve('<%= h.toPascalCase(usecase) %>UseCase');
    const result = await useCase.execute(validatedFields.data);

    if (isSuccess(result)) {
      logger.info('<%= name %> 成功');

      // キャッシュの再検証
      revalidatePath('/<%= domain %>');

      return {
        success: true,
        data: result.data,
      };
    }
    logger.warn('<%= name %> 失敗', {
      error: result.error.message,
      code: result.error.code,
    });

    return {
      error: result.error.message,
      code: result.error.code,
    };
  } catch (error) {
    const logger = resolve('Logger');

    logger.error('<%= name %> 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: 'システムエラーが発生しました',
      code: 'SYSTEM_ERROR',
    };
  }
}
