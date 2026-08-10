import { z } from 'zod';
import { nameSchema } from '@/layers/application/schemas/commonFieldSchemas';
import { newPasswordSchema } from '@/layers/application/utils/passwordValidation';

export const createUserInputSchema = z.object({
  name: nameSchema,
  email: z.email('有効なメールアドレスを入力してください'),
  password: newPasswordSchema,
});

export type CreateUserRequest = z.infer<typeof createUserInputSchema>;
