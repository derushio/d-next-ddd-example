import {
  createEntityIdClass,
  generateCuid2,
} from '@/layers/domain/value-objects/EntityId';

/**
 * ユーザーID Value Object
 *
 * ユーザーを一意に識別するためのID。
 * CUID2形式（小文字英数字、7-32文字）を使用。
 *
 * createEntityIdClass ファクトリにより、エラーコード・メッセージを宣言的に定義。
 */
export class UserId extends createEntityIdClass({
  emptyErrorCode: 'USER_ID_REQUIRED',
  invalidFormatErrorCode: 'INVALID_USER_ID_FORMAT',
  emptyMessage: 'User IDは必須です',
  invalidFormatMessage: 'User IDの形式が正しくありません',
}) {}

export const generateUserId = (): UserId => {
  return new UserId(generateCuid2());
};
