import { z } from 'zod';

export const userIdSchema = z
  .string()
  .trim()
  .min(1, 'ユーザーIDが指定されていません');

export const nameSchema = z
  .string()
  .min(1, '名前を入力してください')
  .max(100, '名前は100文字以内で入力してください');
